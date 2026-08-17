import { apiRequest } from "../../api/client";

export type MediaAsset = {
  id: string;
  kind: "image/jpeg" | "image/gif";
  width: number;
  height: number;
  size: number;
  sha256: string;
  state: "ready";
  createdAt: string;
  downloadPath: string;
};

export async function uploadPhoto(file: File) {
  const form = new FormData();
  form.set("file", file);
  return apiRequest<{ asset: MediaAsset }>("/media/photos", { method: "POST", body: form });
}

export function importGiphyGif(giphyId: string) {
  return apiRequest<{ asset: MediaAsset }>(`/media/giphy/${encodeURIComponent(giphyId)}`, { method: "POST" });
}

export function sendMedia(assetId: string, input: { groupId: string; targetUserId?: string }) {
  return apiRequest<{ eventId: string; createdAt: string; recipients: number; delivery: "pending_mqtt" }>(`/media/${assetId}/send`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}
