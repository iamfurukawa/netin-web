import { apiRequest } from "../../api/client";

export const statusOptions = [
  ["available", "Disponível", "#57c778"],
  ["busy", "Ocupado", "#e05d63"],
  ["focused", "Focado", "#a26bff"],
  ["away", "Ausente", "#e3af38"],
  ["invisible", "Invisível", "#98a2b3"],
  ["in_call", "Em chamada", "#55b9ef"],
  ["gaming", "Jogando", "#5c8dff"],
  ["sleeping", "Dormindo", "#4a7a5a"],
  ["do_not_disturb", "Não perturbe", "#73727d"],
] as const;

export type PresenceStatus = (typeof statusOptions)[number][0];
export type StatusRecord = { status: PresenceStatus; globalVersion: number; updatedAt: string };

export function getStatus() {
  return apiRequest<{ status: StatusRecord | null }>("/status");
}

export function updateStatus(status: PresenceStatus) {
  return apiRequest<{ status: StatusRecord; delivery: "queued" | "unavailable" }>("/status", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });
}
