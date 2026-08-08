import { apiRequest } from "../../api/client";

export type Group = {
  id: string;
  name: string;
  registrationsOpen: boolean;
  createdAt: string;
  joined: boolean;
};

export type GroupMember = { id: string; displayName: string; email: string; joinedAt: string };

export function listGroups() {
  return apiRequest<{ groups: Group[] }>("/groups");
}

export function joinGroup(groupId: string) {
  return apiRequest<void>(`/groups/${groupId}/join`, { method: "POST" });
}

export function leaveGroup(groupId: string) {
  return apiRequest<void>(`/groups/${groupId}/membership`, { method: "DELETE" });
}

export function createGroup(name: string) {
  return apiRequest<{ group: Group }>("/admin/groups", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  });
}

export function updateGroup(groupId: string, data: { name?: string; registrationsOpen?: boolean }) {
  return apiRequest<{ group: Group }>(`/admin/groups/${groupId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
}

export function archiveGroup(groupId: string) {
  return apiRequest<void>(`/admin/groups/${groupId}`, { method: "DELETE" });
}

export function listGroupMembers(groupId: string) {
  return apiRequest<{ members: GroupMember[] }>(`/admin/groups/${groupId}/members`);
}

export function removeGroupMember(groupId: string, userId: string) {
  return apiRequest<void>(`/admin/groups/${groupId}/members/${userId}`, { method: "DELETE" });
}
