import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { listGroups, listInteractionMembers, type Group } from "../groups/groups-api";
import { giphyAvailable, registerGiphyAction, searchGiphy, type GiphyGif } from "./giphy-api";
import { importGiphyGif, sendMedia, uploadPhoto } from "./media-api";

const maxPhotoBytes = 10 * 1024 * 1024;
const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"];
const maxRecordingSeconds = 8;

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "media_too_large") return "A imagem ultrapassa o limite permitido.";
  if (error instanceof ApiError && error.code === "unsupported_media_type") return "Escolha JPEG, PNG, WebP, GIF, MP4, MOV ou WebM.";
  if (error instanceof ApiError && error.code === "invalid_media") return "Não foi possível processar essa imagem.";
  if (error instanceof ApiError && error.code === "invalid_giphy_gif") return "Não foi possível importar esse GIF do GIPHY.";
  if (error instanceof ApiError && error.code === "group_membership_required") return "Você não está inscrito nesse grupo.";
  return "Não foi possível enviar a mídia. Tente novamente.";
}

export function MediaPanel({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"file" | "record" | "giphy">("file");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [selectedGiphy, setSelectedGiphy] = useState<GiphyGif | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const discardRecordingRef = useRef(false);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const joinedGroups = groups.data?.groups.filter((group) => group.joined) ?? [];
  const members = useQuery({ queryKey: ["media-members", selectedGroupId], queryFn: () => listInteractionMembers(selectedGroupId), enabled: Boolean(selectedGroupId) });
  const targets = members.data?.members.filter((member) => member.id !== userId) ?? [];
  const upload = useMutation({ mutationFn: uploadPhoto });
  const giphySearch = useMutation({ mutationFn: searchGiphy });
  const giphyImport = useMutation({ mutationFn: importGiphyGif });
  const delivery = useMutation({ mutationFn: ({ assetId, groupId, targetUserId }: { assetId: string; groupId: string; targetUserId?: string }) => sendMedia(assetId, { groupId, targetUserId }) });

  useEffect(() => {
    if (!selectedGroupId || !joinedGroups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(joinedGroups[0]?.id ?? "");
  }, [joinedGroups, selectedGroupId]);

  useEffect(() => {
    if (targetUserId && !targets.some((target) => target.id === targetUserId)) setTargetUserId("");
  }, [targetUserId, targets]);

  useEffect(() => () => {
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => {
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
  }, [recordedPreviewUrl]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
  }

  function clearRecording() {
    setFile(null);
    setRecordedPreviewUrl(null);
    setCameraError("");
    setRecordingSeconds(0);
  }

  function stopRecording() {
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCameraError("A gravação de vídeo não é compatível com este navegador. Use Arquivo para enviar um vídeo.");
      return;
    }

    discardRecordingRef.current = false;
    clearRecording();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraStream(stream);

      const preferredMimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        if (discardRecordingRef.current) {
          setRecording(false);
          recorderRef.current = null;
          stopCamera();
          return;
        }
        const type = (recorder.mimeType || chunks[0]?.type || "video/webm").split(";")[0];
        const supportedType = acceptedFileTypes.includes(type) ? type : "video/webm";
        const extension = supportedType === "video/mp4" ? "mp4" : supportedType === "video/quicktime" ? "mov" : "webm";
        const captured = new File([new Blob(chunks, { type: supportedType })], `netin-video-${Date.now()}.${extension}`, { type: supportedType });
        setFile(captured);
        setRecordedPreviewUrl(URL.createObjectURL(captured));
        setRecording(false);
        recorderRef.current = null;
        stopCamera();
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      const startedAt = Date.now();
      recordingIntervalRef.current = setInterval(() => setRecordingSeconds(Math.min(maxRecordingSeconds, Math.ceil((Date.now() - startedAt) / 1000))), 150);
      recordingTimeoutRef.current = setTimeout(stopRecording, maxRecordingSeconds * 1_000);
    } catch {
      stopCamera();
      setCameraError("Não foi possível abrir a câmera. Verifique a permissão do navegador e tente novamente.");
    }
  }

  function selectSource(nextSource: "file" | "record" | "giphy") {
    if (nextSource !== "record") {
      if (recorderRef.current?.state === "recording") {
        discardRecordingRef.current = true;
        recorderRef.current.stop();
      }
      stopCamera();
      if (source === "record") clearRecording();
    }
    if (nextSource === "record" && source !== "record") clearRecording();
    setSource(nextSource);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId || upload.isPending || giphyImport.isPending || delivery.isPending) return;
    if (source !== "giphy" && (!file || file.size > maxPhotoBytes || !acceptedFileTypes.includes(file.type))) return;
    if (source === "giphy" && !selectedGiphy) return;
    try {
      const { asset } = source === "giphy" ? await giphyImport.mutateAsync(selectedGiphy!.id) : await upload.mutateAsync(file!);
      await delivery.mutateAsync({ assetId: asset.id, groupId: selectedGroupId, targetUserId: targetUserId || undefined });
      setFile(null);
      if (selectedGiphy) registerGiphyAction(selectedGiphy.analytics?.onsend?.url);
      setSelectedGiphy(null);
      const input = document.getElementById("media-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch {
      // Mutations retain their error state for the message below.
    }
  }

  const validationError = source !== "giphy" && file && (file.size > maxPhotoBytes || !acceptedFileTypes.includes(file.type));
  const error = upload.error ?? giphyImport.error ?? delivery.error;
  const pending = upload.isPending || giphyImport.isPending || delivery.isPending;

  return <section className="media-card" aria-labelledby="media-title">
    <div className="section-heading"><div><p className="eyebrow">MÍDIA</p><h2 id="media-title">Enviar mídia</h2></div></div>
    <p className="muted">A foto, GIF ou vídeo curto sem áudio (até 8 segundos) é ajustado para a tela do Netin e enviado automaticamente aos dispositivos elegíveis.</p>
    {joinedGroups.length === 0 ? <p className="empty-state">Inscreva-se em um grupo para enviar mídia.</p> : <form className="media-form" onSubmit={submit}>
      <div className="media-source" role="group" aria-label="Origem da mídia">
        <button className={source === "file" ? "button--secondary media-source__active" : "button--secondary"} type="button" onClick={() => selectSource("file")}>Arquivo</button>
        <button className={source === "record" ? "button--secondary media-source__active" : "button--secondary"} type="button" onClick={() => selectSource("record")}>Gravar vídeo</button>
        {giphyAvailable() && <button className={source === "giphy" ? "button--secondary media-source__active" : "button--secondary"} type="button" onClick={() => selectSource("giphy")}>Buscar GIF</button>}
      </div>
      {source === "file" && <>
        <label className="social-field" htmlFor="media-file">Foto, GIF ou vídeo curto
          <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
        </label>
        {file && <p className="muted">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
        {validationError && <p className="form-error" role="alert">Escolha JPEG, PNG, WebP, GIF, MP4, MOV ou WebM de até 10 MB.</p>}
      </>}
      {source === "record" && <div className="recording-panel">
        {!cameraStream && !recordedPreviewUrl && <><p className="muted">Grave até 8 segundos, sem áudio. A câmera traseira será usada quando disponível.</p><button className="button--secondary" type="button" onClick={() => void startRecording()}>Abrir câmera e gravar</button></>}
        {cameraStream && <><video className="recording-preview recording-preview--camera" autoPlay muted playsInline ref={(element) => { if (element && element.srcObject !== cameraStream) element.srcObject = cameraStream; }} /><div className="recording-controls"><span className="recording-timer" aria-live="polite">● Gravando {recordingSeconds}s / {maxRecordingSeconds}s</span><button className="button--secondary" type="button" onClick={stopRecording} disabled={!recording}>Parar</button></div></>}
        {recordedPreviewUrl && <><video className="recording-preview" controls playsInline src={recordedPreviewUrl} /><div className="recording-controls"><p className="muted">Vídeo pronto para enviar{file ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}</p><button className="button--secondary" type="button" onClick={() => { clearRecording(); void startRecording(); }}>Refazer</button></div></>}
        {cameraError && <p className="form-error" role="alert">{cameraError}</p>}
        {validationError && <p className="form-error" role="alert">O vídeo gravado ultrapassou 10 MB. Grave novamente.</p>}
      </div>}
      {source === "giphy" && <>
        <div className="media-search"><input value={giphyQuery} maxLength={50} placeholder="Busque um GIF" onChange={(event) => setGiphyQuery(event.target.value)} /><button className="button--secondary" type="button" disabled={!giphyQuery.trim() || giphySearch.isPending} onClick={() => giphySearch.mutate(giphyQuery.trim())}>{giphySearch.isPending ? "Buscando..." : "Buscar"}</button></div>
        {giphySearch.error && <p className="form-error" role="alert">Não foi possível buscar GIFs agora.</p>}
        {giphySearch.data && <div className="giphy-grid">{giphySearch.data.map((gif) => <button className={selectedGiphy?.id === gif.id ? "giphy-result giphy-result--selected" : "giphy-result"} type="button" key={gif.id} aria-label={`Escolher ${gif.title}`} onClick={() => { setSelectedGiphy(gif); registerGiphyAction(gif.analytics?.onclick?.url); }}><img src={gif.previewUrl} alt="" /></button>)}</div>}
        {selectedGiphy && <p className="muted">GIF selecionado: {selectedGiphy.title}</p>}
        <p className="giphy-attribution">Powered by GIPHY</p>
      </>}
      <label className="social-field" htmlFor="media-group">Grupo
        <select id="media-group" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{joinedGroups.map((group: Group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      </label>
      <label className="social-field" htmlFor="media-target">Enviar para
        <select id="media-target" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={members.isPending}>
          <option value="">Todos no grupo</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.displayName}</option>)}
        </select>
      </label>
      <p className="muted">Ao enviar para todos, cada dispositivo pareado dos membros do grupo receberá a mídia.</p>
      <button className="button--primary" type="submit" disabled={(source === "giphy" ? !selectedGiphy : !file) || !selectedGroupId || Boolean(validationError) || pending}>{pending ? "Preparando envio..." : targetUserId ? "Enviar para pessoa" : "Enviar para todos"}</button>
    </form>}
    {error && <p className="form-error" role="alert">{errorMessage(error)}</p>}
    {delivery.isSuccess && <p className="social-success" role="status">Mídia aceita. A entrega foi colocada na fila para {delivery.data.recipients} dispositivo(s).</p>}
  </section>;
}
