import { apiRequest } from "../../api/client";

export type Device = {
  id: string;
  hardwareTarget: string;
  pairedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
};

export function listDevices() {
  return apiRequest<{ devices: Device[] }>("/devices");
}

export function pairDevice(code: string) {
  return apiRequest<{ device: Device }>("/devices/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function removeDevice(deviceId: string) {
  return apiRequest<void>(`/devices/${deviceId}`, { method: "DELETE" });
}
