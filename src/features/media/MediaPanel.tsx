import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { listGroups, listInteractionMembers, type Group } from "../groups/groups-api";
import { giphyAvailable, registerGiphyAction, searchGiphy, type GiphyGif } from "./giphy-api";
import { importGiphyGif, sendMedia, uploadPhoto } from "./media-api";

const maxPhotoBytes = 10 * 1024 * 1024;

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
  const [source, setSource] = useState<"file" | "giphy">("file");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [selectedGiphy, setSelectedGiphy] = useState<GiphyGif | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId || upload.isPending || giphyImport.isPending || delivery.isPending) return;
    if (source === "file" && (!file || file.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"].includes(file.type))) return;
    if (source === "giphy" && !selectedGiphy) return;
    try {
      const { asset } = source === "file" ? await upload.mutateAsync(file!) : await giphyImport.mutateAsync(selectedGiphy!.id);
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

  const validationError = source === "file" && file && (file.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"].includes(file.type));
  const error = upload.error ?? giphyImport.error ?? delivery.error;
  const pending = upload.isPending || giphyImport.isPending || delivery.isPending;

  return <section className="media-card" aria-labelledby="media-title">
    <div className="section-heading"><div><p className="eyebrow">MÍDIA</p><h2 id="media-title">Enviar mídia</h2></div></div>
    <p className="muted">A foto, GIF ou vídeo curto sem áudio (até 8 segundos) é ajustado para a tela do Netin e enviado automaticamente aos dispositivos elegíveis.</p>
    {joinedGroups.length === 0 ? <p className="empty-state">Inscreva-se em um grupo para enviar mídia.</p> : <form className="media-form" onSubmit={submit}>
      <div className="media-source" role="group" aria-label="Origem da mídia">
        <button className={source === "file" ? "button--secondary media-source__active" : "button--secondary"} type="button" onClick={() => setSource("file")}>Arquivo</button>
        {giphyAvailable() && <button className={source === "giphy" ? "button--secondary media-source__active" : "button--secondary"} type="button" onClick={() => setSource("giphy")}>Buscar GIF</button>}
      </div>
      {source === "file" && <>
        <label className="social-field" htmlFor="media-file">Foto, GIF ou vídeo curto
          <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
        </label>
        {file && <p className="muted">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
        {validationError && <p className="form-error" role="alert">Escolha JPEG, PNG, WebP, GIF, MP4, MOV ou WebM de até 10 MB.</p>}
      </>}
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
      <button className="button--primary" type="submit" disabled={(source === "file" ? !file : !selectedGiphy) || !selectedGroupId || Boolean(validationError) || pending}>{pending ? "Preparando envio..." : targetUserId ? "Enviar para pessoa" : "Enviar para todos"}</button>
    </form>}
    {error && <p className="form-error" role="alert">{errorMessage(error)}</p>}
    {delivery.isSuccess && <p className="social-success" role="status">Mídia aceita. A entrega foi colocada na fila para {delivery.data.recipients} dispositivo(s).</p>}
  </section>;
}
