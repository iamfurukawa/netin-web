import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSocialPreferences, setSocialPreferences } from "../social/social-api";
import { getStatus, statusOptions, updateStatus } from "./status-api";

export function PresenceMenu() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["status"], queryFn: getStatus });
  const preferences = useQuery({ queryKey: ["social-preferences"], queryFn: getSocialPreferences });
  const updatePresence = useMutation({
    mutationFn: updateStatus,
    onSuccess: (data) => queryClient.setQueryData(["status"], { status: data.status }),
  });
  const updateMuted = useMutation({
    mutationFn: setSocialPreferences,
    onSuccess: (data) => queryClient.setQueryData(["social-preferences"], data),
  });
  const current = statusOptions.some(([value]) => value === status.data?.status?.status) ? status.data!.status!.status : "available";
  const disabled = status.isPending || preferences.isPending || updatePresence.isPending || updateMuted.isPending;

  return <label className="presence-menu"><span className="sr-only">Status e não perturbe</span><select value={current} disabled={disabled} onChange={(event) => {
    if (event.target.value === "__toggle-muted") updateMuted.mutate(!(preferences.data?.muted ?? false));
    else updatePresence.mutate(event.target.value as typeof current);
  }}>
    {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    <option disabled value="__separator">────────</option>
    <option value="__toggle-muted">{preferences.data?.muted ? "✓ Não perturbe" : "Não perturbe"}</option>
  </select></label>;
}
