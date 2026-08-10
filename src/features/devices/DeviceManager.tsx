import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { listDevices, pairDevice, removeDevice, type Device } from "./devices-api";

const devicesQueryKey = ["devices"] as const;

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.code === "invalid_or_expired_pairing_code") {
    return "Código inválido ou expirado. Gere um novo código na placa.";
  }
  return "Não foi possível concluir esta ação. Tente novamente.";
}

function deviceName(device: Device) {
  return device.hardwareTarget === "esp32-2432s024" ? "Netin" : device.hardwareTarget;
}

export function DeviceManager() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const devices = useQuery({ queryKey: devicesQueryKey, queryFn: listDevices, refetchInterval: 30_000 });
  const pairMutation = useMutation({
    mutationFn: () => pairDevice(code),
    onSuccess: async () => {
      setCode("");
      await queryClient.invalidateQueries({ queryKey: devicesQueryKey });
    },
  });
  const removeMutation = useMutation({
    mutationFn: removeDevice,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: devicesQueryKey }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pairMutation.reset();
    void pairMutation.mutateAsync().catch(() => undefined);
  }

  return <section className="devices-card" aria-labelledby="devices-title">
    <div className="section-heading"><div><p className="eyebrow">DISPOSITIVOS</p><h2 id="devices-title">Seus Netins</h2></div></div>
    <p className="muted">Na placa, abra Ajustes → Dispositivo para gerar um código temporário.</p>
    <form className="pair-form" onSubmit={submit}>
      <label htmlFor="pairing-code">Código de pareamento</label>
      <div className="pair-form__row">
        <input id="pairing-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" pattern="[A-Z2-9]{4}-[A-Z2-9]{4}" maxLength={9} required />
        <button className="button--primary" type="submit" disabled={pairMutation.isPending}>{pairMutation.isPending ? "Conectando..." : "Adicionar"}</button>
      </div>
      {pairMutation.error && <p className="form-error" role="alert">{messageFor(pairMutation.error)}</p>}
    </form>
    {devices.isPending && <p className="muted">Carregando dispositivos...</p>}
    {devices.error && <p className="form-error" role="alert">Não foi possível carregar seus dispositivos.</p>}
    {devices.data?.devices.length === 0 && <p className="empty-state">Nenhum Netin pareado ainda.</p>}
    <ul className="device-list">
      {devices.data?.devices.map((device) => <li key={device.id} className="device-item">
        <span className={`device-indicator device-indicator--${deviceState(device)}`} aria-hidden="true" />
        <div><strong>{deviceName(device)}</strong><span>{device.id.slice(0, 8)} · {deviceStateLabel(device)}</span></div>
        <button className="button--danger" type="button" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(device.id)}>Remover</button>
      </li>)}
    </ul>
  </section>;
}

function deviceState(device: Device) {
  if (!device.lastSeenAt) return "pending";
  return Date.now() - new Date(device.lastSeenAt).getTime() < 90_000 ? "online" : "offline";
}

function deviceStateLabel(device: Device) {
  return { online: "Conectado", offline: "Desconectado", pending: "Aguardando conexão" }[deviceState(device)];
}
