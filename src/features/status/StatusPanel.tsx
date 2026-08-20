import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { statusOptions, getStatus, updateStatus } from "./status-api";
import { ReceivingPreferences } from "../social/ReceivingPreferences";

const statusQueryKey = ["status"] as const;

export function StatusPanel() {
  const queryClient = useQueryClient();
  const current = useQuery({ queryKey: statusQueryKey, queryFn: getStatus });
  const change = useMutation({
    mutationFn: updateStatus,
    onSuccess: (data) => queryClient.setQueryData(statusQueryKey, { status: data.status }),
  });
  const selected = current.data?.status?.status;
  const selectedOption = statusOptions.find(([status]) => status === selected) ?? statusOptions[0];

  return <section className="status-card" aria-labelledby="status-title">
    <div className="section-heading"><div><p className="eyebrow">PRESENÇA</p><h2 id="status-title">Status e recebimento</h2></div></div>
    <p className="muted">Escolha como você quer aparecer no seu Netin.</p>
    {current.isPending && <p className="muted">Carregando status...</p>}
    {current.error && <p className="form-error" role="alert">Não foi possível carregar seu status.</p>}
    <label className="status-selector">Status
      <span className="status-selector__control"><span className="status-option__dot" style={{ backgroundColor: selectedOption[2] }} aria-hidden="true" /><select value={selectedOption[0]} disabled={current.isPending || change.isPending} onChange={(event) => change.mutate(event.target.value as typeof selectedOption[0])}>{statusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></span>
    </label>
    {change.error && <p className="form-error" role="alert">Não foi possível atualizar seu status.</p>}
    {change.isSuccess && <p className="social-success" role="status">{change.data.delivery === "queued" ? "Status sincronizado e enviado aos dispositivos." : "Status salvo. A entrega ao Netin será retomada quando o canal MQTT estiver disponível."}</p>}
    <ReceivingPreferences />
  </section>;
}
