import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { listGroups, listInteractionMembers, type Group } from "../groups/groups-api";
import { getSocialPreferences, sendGroupInteraction, setSocialPreferences, type InteractionInput } from "./social-api";

const reactions = ["👍", "❤️", "😂", "🎉", "👋", "👏", "🔥", "✨"] as const;

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.code === "group_membership_required") return "Você precisa estar inscrito neste grupo para enviar uma interação.";
  if (error instanceof ApiError && error.code === "invalid_poke_target") return "Essa pessoa não está mais inscrita neste grupo.";
  return "Não foi possível concluir esta ação. Tente novamente.";
}

export function SocialPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [message, setMessage] = useState("");
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const preferences = useQuery({ queryKey: ["social-preferences"], queryFn: getSocialPreferences });
  const joinedGroups = groups.data?.groups.filter((group) => group.joined) ?? [];
  const members = useQuery({
    queryKey: ["interaction-members", selectedGroupId],
    queryFn: () => listInteractionMembers(selectedGroupId),
    enabled: Boolean(selectedGroupId),
  });
  const pokeTargets = members.data?.members.filter((member) => member.id !== userId) ?? [];
  const [selectedPokeTargetId, setSelectedPokeTargetId] = useState("");
  const preferencesMutation = useMutation({
    mutationFn: setSocialPreferences,
    onSuccess: (data) => queryClient.setQueryData(["social-preferences"], data),
  });
  const interaction = useMutation({ mutationFn: ({ groupId, input }: { groupId: string; input: InteractionInput }) => sendGroupInteraction(groupId, input) });

  useEffect(() => {
    if (!selectedGroupId || !joinedGroups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(joinedGroups[0]?.id ?? "");
  }, [joinedGroups, selectedGroupId]);

  useEffect(() => {
    if (!selectedPokeTargetId || !pokeTargets.some((member) => member.id === selectedPokeTargetId)) setSelectedPokeTargetId(pokeTargets[0]?.id ?? "");
  }, [pokeTargets, selectedPokeTargetId]);

  function send(input: InteractionInput) {
    if (selectedGroupId) interaction.mutate({ groupId: selectedGroupId, input });
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || !selectedGroupId) return;
    interaction.mutate({ groupId: selectedGroupId, input: { type: "message", text } }, { onSuccess: () => setMessage("") });
  }

  return <section className="social-card" aria-labelledby="social-title">
    <div className="section-heading"><div><p className="eyebrow">INTERAÇÕES</p><h2 id="social-title">Enviar ao grupo</h2></div></div>
    <p className="muted">O evento é validado e registrado agora. A entrega na placa será ativada junto com o canal MQTT.</p>
    {joinedGroups.length === 0 ? <p className="empty-state">Inscreva-se em um grupo para enviar interações.</p> : <>
      <label className="social-field" htmlFor="interaction-group">Grupo
        <select id="interaction-group" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{joinedGroups.map((group: Group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      </label>
      <div className="reaction-list" aria-label="Escolher reação">{reactions.map((reaction) => <button key={reaction} className="reaction-button" type="button" disabled={interaction.isPending} onClick={() => send({ type: "reaction", reaction })}>{reaction}</button>)}</div>
      <button className="button--secondary" type="button" disabled={interaction.isPending} onClick={() => send({ type: "poke" })}>{interaction.isPending ? "Enviando..." : "Cutucar grupo"}</button>
      <div className="poke-target">
        <label className="social-field" htmlFor="poke-target">Cutucar uma pessoa
          <select id="poke-target" value={selectedPokeTargetId} onChange={(event) => setSelectedPokeTargetId(event.target.value)} disabled={members.isPending || pokeTargets.length === 0}>
            {pokeTargets.length === 0 ? <option value="">Nenhuma outra pessoa no grupo</option> : pokeTargets.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
          </select>
        </label>
        <button className="button--secondary" type="button" disabled={interaction.isPending || !selectedPokeTargetId} onClick={() => send({ type: "poke", targetUserId: selectedPokeTargetId })}>
          {interaction.isPending ? "Enviando..." : "Cutucar pessoa"}
        </button>
      </div>
      <form className="message-form" onSubmit={submitMessage}>
        <label className="social-field" htmlFor="group-message">Mensagem curta
          <textarea id="group-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={160} placeholder="Escreva uma mensagem" required />
        </label>
        <div className="message-form__footer"><span>{message.length}/160</span><button className="button--primary" type="submit" disabled={interaction.isPending || !message.trim()}>{interaction.isPending ? "Enviando..." : "Enviar"}</button></div>
      </form>
    </>}
    {interaction.error && <p className="form-error" role="alert">{messageFor(interaction.error)}</p>}
    {interaction.isSuccess && <p className="social-success" role="status">Interação registrada. A entrega para dispositivos depende do MQTT.</p>}

    <section className="social-preferences" aria-labelledby="social-preferences-title">
      <p className="eyebrow">PREFERÊNCIAS</p><h3 id="social-preferences-title">Recebimento</h3>
      <label className="toggle-row"><input type="checkbox" checked={preferences.data?.muted ?? false} disabled={preferences.isPending || preferencesMutation.isPending} onChange={(event) => preferencesMutation.mutate(event.target.checked)} /><span>Silenciar interações recebidas</span></label>
      <p className="muted">Quando ativado, o servidor não criará novas entregas para os seus Netins.</p>
      {preferences.error || preferencesMutation.error ? <p className="form-error" role="alert">{messageFor(preferences.error ?? preferencesMutation.error)}</p> : null}
    </section>
  </section>;
}
