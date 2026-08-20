import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { getSocialPreferences, setSocialPreferences } from "./social-api";

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.code === "group_membership_required") return "Você precisa estar inscrito neste grupo para enviar uma interação.";
  return "Não foi possível concluir esta ação. Tente novamente.";
}

export function ReceivingPreferences() {
  const queryClient = useQueryClient();
  const preferences = useQuery({ queryKey: ["social-preferences"], queryFn: getSocialPreferences });
  const change = useMutation({
    mutationFn: setSocialPreferences,
    onSuccess: (data) => queryClient.setQueryData(["social-preferences"], data),
  });

  return <section className="social-preferences" aria-labelledby="social-preferences-title">
    <p className="eyebrow">RECEBIMENTO</p><h3 id="social-preferences-title">Interações na placa</h3>
    <label className="toggle-row"><input type="checkbox" checked={preferences.data?.muted ?? false} disabled={preferences.isPending || change.isPending} onChange={(event) => change.mutate(event.target.checked)} /><span>Não perturbe</span></label>
    <p className="muted">Enquanto estiver ativado, novas reações, mensagens e cutucadas não serão entregues aos seus GLaDOS.</p>
    {preferences.error || change.error ? <p className="form-error" role="alert">{messageFor(preferences.error ?? change.error)}</p> : null}
  </section>;
}
