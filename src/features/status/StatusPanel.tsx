import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { statusOptions, getStatus, updateStatus } from "./status-api";

const statusQueryKey = ["status"] as const;

export function StatusPanel() {
  const queryClient = useQueryClient();
  const current = useQuery({ queryKey: statusQueryKey, queryFn: getStatus });
  const change = useMutation({
    mutationFn: updateStatus,
    onSuccess: (data) => queryClient.setQueryData(statusQueryKey, { status: data.status }),
  });
  const selected = current.data?.status?.status;

  return <section className="status-card" aria-labelledby="status-title">
    <div className="section-heading"><div><p className="eyebrow">PRESENÇA</p><h2 id="status-title">Seu status</h2></div></div>
    <p className="muted">Escolha como você quer aparecer no seu Netin.</p>
    {current.isPending && <p className="muted">Carregando status...</p>}
    {current.error && <p className="form-error" role="alert">Não foi possível carregar seu status.</p>}
    <div className="status-options" aria-label="Escolher status">
      {statusOptions.map(([status, label, color]) => <button key={status} className={selected === status ? "status-option status-option--selected" : "status-option"} type="button" disabled={change.isPending} onClick={() => change.mutate(status)}>
        <span className="status-option__dot" style={{ backgroundColor: color }} aria-hidden="true" />
        <span>{label}</span>
      </button>)}
    </div>
    {change.error && <p className="form-error" role="alert">Não foi possível atualizar seu status.</p>}
    {change.isSuccess && <p className="social-success" role="status">{change.data.delivery === "queued" ? "Status sincronizado e enviado aos dispositivos." : "Status salvo. A entrega ao Netin será retomada quando o canal MQTT estiver disponível."}</p>}
  </section>;
}
