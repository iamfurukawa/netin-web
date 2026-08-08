import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import type { User } from "../auth/auth-api";
import { archiveGroup, createGroup, joinGroup, leaveGroup, listGroupMembers, listGroups, removeGroupMember, updateGroup, type Group } from "./groups-api";

const groupsQueryKey = ["groups"] as const;

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "group_registrations_closed") return "As inscrições deste grupo estão fechadas.";
  if (error instanceof ApiError && error.code === "admin_required") return "Esta ação exige uma conta administradora.";
  return "Não foi possível concluir esta ação. Tente novamente.";
}

export function GroupsPanel({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const groups = useQuery({ queryKey: groupsQueryKey, queryFn: listGroups });
  const refresh = () => queryClient.invalidateQueries({ queryKey: groupsQueryKey });
  const membership = useMutation({ mutationFn: ({ group, join }: { group: Group; join: boolean }) => join ? joinGroup(group.id) : leaveGroup(group.id), onSuccess: refresh });
  const create = useMutation({ mutationFn: () => createGroup(newName.trim()), onSuccess: async () => { setNewName(""); await refresh(); } });
  const update = useMutation({ mutationFn: ({ groupId, data }: { groupId: string; data: { name?: string; registrationsOpen?: boolean } }) => updateGroup(groupId, data), onSuccess: refresh });
  const archive = useMutation({ mutationFn: archiveGroup, onSuccess: async () => { setSelectedGroup(null); await refresh(); } });
  const members = useQuery({ queryKey: ["groups", selectedGroup?.id, "members"], queryFn: () => listGroupMembers(selectedGroup!.id), enabled: Boolean(selectedGroup && user.isAdmin) });
  const removeMember = useMutation({ mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => removeGroupMember(groupId, userId), onSuccess: () => members.refetch() });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newName.trim()) create.mutate();
  }

  function rename(group: Group) {
    const name = window.prompt("Novo nome do grupo", group.name)?.trim();
    if (name && name !== group.name) update.mutate({ groupId: group.id, data: { name } }, {
      onSuccess: () => setSelectedGroup((current) => current ? { ...current, name } : current),
    });
  }

  return <section className="groups-card" aria-labelledby="groups-title">
    <div className="section-heading"><div><p className="eyebrow">COMUNIDADE</p><h2 id="groups-title">Grupos</h2></div></div>
    <p className="muted">Inscreva-se nos grupos que quiser acompanhar. As interações sociais serão liberadas quando o canal de entrega estiver ativo.</p>
    {groups.isPending && <p className="muted">Carregando grupos...</p>}
    {groups.error && <p className="form-error" role="alert">Não foi possível carregar os grupos.</p>}
    {groups.data?.groups.length === 0 && <p className="empty-state">Ainda não há grupos disponíveis.</p>}
    <ul className="group-list">
      {groups.data?.groups.map((group) => <li key={group.id} className="group-item">
        <div><strong>{group.name}</strong><span>{group.joined ? "Inscrito" : group.registrationsOpen ? "Inscrições abertas" : "Inscrições fechadas"}</span></div>
        {group.joined
          ? <button className="button--secondary" type="button" disabled={membership.isPending} onClick={() => membership.mutate({ group, join: false })}>Sair</button>
          : <button className="button--primary" type="button" disabled={!group.registrationsOpen || membership.isPending} onClick={() => membership.mutate({ group, join: true })}>Inscrever-se</button>}
        {user.isAdmin && <button className="button--danger" type="button" onClick={() => setSelectedGroup(group)}>Gerir</button>}
      </li>)}
    </ul>
    {membership.error && <p className="form-error" role="alert">{errorMessage(membership.error)}</p>}

    {user.isAdmin && <section className="admin-groups" aria-labelledby="admin-groups-title">
      <p className="eyebrow">ADMINISTRAÇÃO</p><h3 id="admin-groups-title">Criar grupo</h3>
      <form className="group-create-form" onSubmit={submitCreate}>
        <input aria-label="Nome do grupo" value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} placeholder="Ex.: Café da tarde" required />
        <button className="button--primary" type="submit" disabled={create.isPending}>{create.isPending ? "Criando..." : "Criar"}</button>
      </form>
      {create.error && <p className="form-error" role="alert">{errorMessage(create.error)}</p>}
    </section>}

    {user.isAdmin && selectedGroup && <section className="admin-groups admin-groups--detail" aria-labelledby="group-management-title">
      <div className="section-heading"><h3 id="group-management-title">Gerir {selectedGroup.name}</h3><button className="button--danger" type="button" onClick={() => setSelectedGroup(null)}>Fechar</button></div>
      <div className="admin-actions">
        <button className="button--secondary" type="button" onClick={() => rename(selectedGroup)}>Renomear</button>
        <button className="button--secondary" type="button" onClick={() => {
          const registrationsOpen = !selectedGroup.registrationsOpen;
          update.mutate({ groupId: selectedGroup.id, data: { registrationsOpen } }, {
            onSuccess: () => setSelectedGroup((current) => current ? { ...current, registrationsOpen } : current),
          });
        }}>{selectedGroup.registrationsOpen ? "Fechar inscrições" : "Abrir inscrições"}</button>
        <button className="button--danger" type="button" onClick={() => { if (window.confirm(`Arquivar ${selectedGroup.name}?`)) archive.mutate(selectedGroup.id); }}>Arquivar</button>
      </div>
      {update.error || archive.error ? <p className="form-error" role="alert">{errorMessage(update.error ?? archive.error)}</p> : null}
      <h4>Membros</h4>
      {members.isPending && <p className="muted">Carregando membros...</p>}
      {members.data?.members.length === 0 && <p className="empty-state">Nenhum membro inscrito.</p>}
      <ul className="member-list">{members.data?.members.map((member) => <li key={member.id}><span><strong>{member.displayName}</strong><small>{member.email}</small></span><button className="button--danger" type="button" disabled={removeMember.isPending} onClick={() => removeMember.mutate({ groupId: selectedGroup.id, userId: member.id })}>Remover</button></li>)}</ul>
    </section>}
  </section>;
}
