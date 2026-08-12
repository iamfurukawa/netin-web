import { apiRequest } from "../../api/client";

export type SocialPreferences = { muted: boolean };
export type InteractionInput =
  | { type: "reaction"; reaction: "👍" | "❤️" | "😂" | "🎉" | "👋" | "👏" | "🔥" | "✨" }
  | { type: "message"; text: string }
  | { type: "poke" };

export function getSocialPreferences() {
  return apiRequest<SocialPreferences>("/social-preferences");
}

export function setSocialPreferences(muted: boolean) {
  return apiRequest<SocialPreferences>("/social-preferences", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ muted }),
  });
}

export function sendGroupInteraction(groupId: string, interaction: InteractionInput) {
  return apiRequest<{ eventId: string; createdAt: string; delivery: "pending_mqtt" }>(`/groups/${groupId}/interactions`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interaction),
  });
}
