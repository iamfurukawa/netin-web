import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "../../api/client";
import { createReaction, listAdminReactions, updateReaction, updateReactionAsset, type Reaction } from "../social/social-api";

const queryKey = ["admin", "reactions"] as const;

export function ReactionManager() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [asset, setAsset] = useState<File | null>(null);
  const [displayOrder, setDisplayOrder] = useState("100");
  const reactions = useQuery({ queryKey, queryFn: listAdminReactions });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["reactions"] });
  };
  const create = useMutation({
    mutationFn: ({ input, file }: { input: { name: string; displayOrder: number }; file: File }) => createReaction(input, file),
    onSuccess: () => { setName(""); setAsset(null); refresh(); },
  });
  const update = useMutation({
    mutationFn: async ({ id, input, file }: { id: string; input: Partial<Pick<Reaction, "name" | "displayOrder" | "isActive">>; file: File | null }) => {
      const result = await updateReaction(id, input);
      return file ? updateReactionAsset(id, file) : result;
    },
    onSuccess: refresh,
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && asset) create.mutate({ input: { name: name.trim(), displayOrder: Number(displayOrder) }, file: asset });
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>, reaction: Reaction) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("asset");
    update.mutate({
      id: reaction.id,
      input: {
        name: String(form.get("name") ?? "").trim(),
        displayOrder: Number(form.get("displayOrder")),
        isActive: form.get("isActive") === "on",
      },
      file: file instanceof File && file.size > 0 ? file : null,
    });
  }

  return <section className="reactions-card" aria-labelledby="reactions-title">
    <div className="section-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h2 id="reactions-title">Catálogo de reações</h2></div></div>
    <p className="muted">As reações ativas ficam disponíveis para todos os grupos.</p>
    <form className="reaction-create-form" onSubmit={submitCreate}>
      <input accept="image/jpeg,image/gif" onChange={(event) => setAsset(event.target.files?.[0] ?? null)} type="file" aria-label="Imagem ou GIF" required />
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" maxLength={32} aria-label="Nome" required />
      <input value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} type="number" min="0" max="10000" aria-label="Ordem" required />
      <button className="button--primary" disabled={create.isPending} type="submit">Adicionar</button>
    </form>
    {reactions.isPending && <p className="muted">Carregando reações...</p>}
    <div className="reaction-admin-list">
      {reactions.data?.reactions.map((reaction) => <form key={reaction.id} className="reaction-admin-row" onSubmit={(event) => submitUpdate(event, reaction)}>
        {reaction.assetKind ? <img src={apiUrl(reaction.assetPath)} alt="" /> : <span className="reaction-admin-placeholder">Sem imagem</span>}
        <input defaultValue={reaction.name} name="name" maxLength={32} aria-label={`Nome de ${reaction.name}`} required />
        <input defaultValue={reaction.displayOrder} name="displayOrder" type="number" min="0" max="10000" aria-label={`Ordem de ${reaction.name}`} required />
        <input accept="image/jpeg,image/gif" name="asset" type="file" aria-label={`Trocar imagem de ${reaction.name}`} />
        <label className="toggle-row"><input defaultChecked={reaction.isActive} name="isActive" type="checkbox" /><span>Ativa</span></label>
        <button className="button--secondary" disabled={update.isPending} type="submit">Salvar</button>
      </form>)}
    </div>
    {create.error || update.error || reactions.error ? <p className="form-error" role="alert">Não foi possível atualizar o catálogo.</p> : null}
  </section>;
}
