import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createReaction, listAdminReactions, updateReaction, type Reaction } from "../social/social-api";

const queryKey = ["admin", "reactions"] as const;

export function ReactionManager() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [displayOrder, setDisplayOrder] = useState("100");
  const reactions = useQuery({ queryKey, queryFn: listAdminReactions });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["reactions"] });
  };
  const create = useMutation({ mutationFn: createReaction, onSuccess: () => { setName(""); setEmoji(""); refresh(); } });
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<Omit<Reaction, "id">> }) => updateReaction(id, input), onSuccess: refresh });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && emoji.trim()) create.mutate({ name: name.trim(), emoji: emoji.trim(), displayOrder: Number(displayOrder), isActive: true });
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>, reaction: Reaction) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({
      id: reaction.id,
      input: {
        name: String(form.get("name") ?? "").trim(),
        emoji: String(form.get("emoji") ?? "").trim(),
        displayOrder: Number(form.get("displayOrder")),
        isActive: form.get("isActive") === "on",
      },
    });
  }

  return <section className="reactions-card" aria-labelledby="reactions-title">
    <div className="section-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h2 id="reactions-title">Catálogo de reações</h2></div></div>
    <p className="muted">As reações ativas ficam disponíveis para todos os grupos.</p>
    <form className="reaction-create-form" onSubmit={submitCreate}>
      <input value={emoji} onChange={(event) => setEmoji(event.target.value)} placeholder="Emoji" maxLength={16} aria-label="Emoji" required />
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" maxLength={32} aria-label="Nome" required />
      <input value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} type="number" min="0" max="10000" aria-label="Ordem" required />
      <button className="button--primary" disabled={create.isPending} type="submit">Adicionar</button>
    </form>
    {reactions.isPending && <p className="muted">Carregando reações...</p>}
    <div className="reaction-admin-list">
      {reactions.data?.reactions.map((reaction) => <form key={reaction.id} className="reaction-admin-row" onSubmit={(event) => submitUpdate(event, reaction)}>
        <input defaultValue={reaction.emoji} name="emoji" maxLength={16} aria-label={`Emoji de ${reaction.name}`} required />
        <input defaultValue={reaction.name} name="name" maxLength={32} aria-label={`Nome de ${reaction.name}`} required />
        <input defaultValue={reaction.displayOrder} name="displayOrder" type="number" min="0" max="10000" aria-label={`Ordem de ${reaction.name}`} required />
        <label className="toggle-row"><input defaultChecked={reaction.isActive} name="isActive" type="checkbox" /><span>Ativa</span></label>
        <button className="button--secondary" disabled={update.isPending} type="submit">Salvar</button>
      </form>)}
    </div>
    {create.error || update.error || reactions.error ? <p className="form-error" role="alert">Não foi possível atualizar o catálogo.</p> : null}
  </section>;
}
