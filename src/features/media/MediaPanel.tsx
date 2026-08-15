import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { listGroups, listInteractionMembers, type Group } from "../groups/groups-api";
import { sendMedia, uploadPhoto } from "./media-api";

const maxPhotoBytes = 10 * 1024 * 1024;

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "media_too_large") return "A imagem ultrapassa o limite permitido.";
  if (error instanceof ApiError && error.code === "unsupported_media_type") return "Escolha uma imagem JPEG, PNG ou WebP.";
  if (error instanceof ApiError && error.code === "invalid_media") return "Não foi possível processar essa imagem.";
  if (error instanceof ApiError && error.code === "group_membership_required") return "Você não está inscrito nesse grupo.";
  return "Não foi possível enviar a mídia. Tente novamente.";
}

export function MediaPanel({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const joinedGroups = groups.data?.groups.filter((group) => group.joined) ?? [];
  const members = useQuery({ queryKey: ["media-members", selectedGroupId], queryFn: () => listInteractionMembers(selectedGroupId), enabled: Boolean(selectedGroupId) });
  const targets = members.data?.members.filter((member) => member.id !== userId) ?? [];
  const upload = useMutation({ mutationFn: uploadPhoto });
  const delivery = useMutation({ mutationFn: ({ assetId, groupId, targetUserId }: { assetId: string; groupId: string; targetUserId?: string }) => sendMedia(assetId, { groupId, targetUserId }) });

  useEffect(() => {
    if (!selectedGroupId || !joinedGroups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(joinedGroups[0]?.id ?? "");
  }, [joinedGroups, selectedGroupId]);

  useEffect(() => {
    if (targetUserId && !targets.some((target) => target.id === targetUserId)) setTargetUserId("");
  }, [targetUserId, targets]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !selectedGroupId || upload.isPending || delivery.isPending) return;
    if (file.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    try {
      const { asset } = await upload.mutateAsync(file);
      await delivery.mutateAsync({ assetId: asset.id, groupId: selectedGroupId, targetUserId: targetUserId || undefined });
      setFile(null);
      const input = document.getElementById("media-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch {
      // Mutations retain their error state for the message below.
    }
  }

  const validationError = file && (file.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type));
  const error = upload.error ?? delivery.error;
  const pending = upload.isPending || delivery.isPending;

  return <section className="media-card" aria-labelledby="media-title">
    <div className="section-heading"><div><p className="eyebrow">MÍDIA</p><h2 id="media-title">Enviar foto</h2></div></div>
    <p className="muted">A foto é ajustada para a tela do Netin e enviada automaticamente aos dispositivos elegíveis.</p>
    {joinedGroups.length === 0 ? <p className="empty-state">Inscreva-se em um grupo para enviar uma foto.</p> : <form className="media-form" onSubmit={submit}>
      <label className="social-field" htmlFor="media-file">Foto
        <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
      </label>
      {file && <p className="muted">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
      {validationError && <p className="form-error" role="alert">Escolha JPEG, PNG ou WebP de até 10 MB.</p>}
      <label className="social-field" htmlFor="media-group">Grupo
        <select id="media-group" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{joinedGroups.map((group: Group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      </label>
      <label className="social-field" htmlFor="media-target">Destinatário
        <select id="media-target" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={members.isPending}>
          <option value="">Todo o grupo</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.displayName}</option>)}
        </select>
      </label>
      <button className="button--primary" type="submit" disabled={!file || !selectedGroupId || Boolean(validationError) || pending}>{pending ? "Preparando envio..." : targetUserId ? "Enviar para pessoa" : "Enviar para grupo"}</button>
    </form>}
    {error && <p className="form-error" role="alert">{errorMessage(error)}</p>}
    {delivery.isSuccess && <p className="social-success" role="status">Foto aceita. A entrega foi colocada na fila para {delivery.data.recipients} dispositivo(s).</p>}
  </section>;
}
