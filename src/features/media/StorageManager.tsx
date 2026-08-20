import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../api/client";

type StorageAsset = { id: string; ownerName: string; mimeType: string; sizeBytes: number; processingState: string; createdAt: string; expiresAt: string; expired: boolean };
type StorageOverview = { count: number; totalBytes: number; assets: StorageAsset[] };

const queryKey = ["admin", "storage", "media"] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function listStorage() {
  return apiRequest<StorageOverview>("/admin/storage/media");
}

function purgeExpired() {
  return apiRequest<{ removed: number; reclaimedBytes: number }>("/admin/storage/media/purge-expired", { method: "POST" });
}

export function StorageManager() {
  const queryClient = useQueryClient();
  const storage = useQuery({ queryKey, queryFn: listStorage });
  const purge = useMutation({ mutationFn: purgeExpired, onSuccess: () => queryClient.invalidateQueries({ queryKey }) });

  return <section className="storage-card" aria-labelledby="storage-title">
    <div className="section-heading"><div><p className="eyebrow">ARMAZENAMENTO</p><h2 id="storage-title">Mídias do servidor</h2></div><button className="button--secondary" type="button" disabled={purge.isPending} onClick={() => purge.mutate()}>{purge.isPending ? "Limpando..." : "Limpar expiradas"}</button></div>
    {storage.data && <p className="muted">{storage.data.count} arquivo(s) usando {formatBytes(storage.data.totalBytes)}. Reações ativas não entram nesta limpeza.</p>}
    {purge.isSuccess && <p className="social-success" role="status">{purge.data.removed === 0 ? "Nenhuma mídia expirada para limpar." : `${purge.data.removed} mídia(s) removida(s), liberando ${formatBytes(purge.data.reclaimedBytes)}.`}</p>}
    {storage.isPending && <p className="muted">Carregando inventário...</p>}
    {storage.error || purge.error ? <p className="form-error" role="alert">Não foi possível consultar ou limpar o armazenamento.</p> : null}
    <ul className="storage-list">{storage.data?.assets.map((asset) => <li key={asset.id}><div><strong>{asset.mimeType === "image/gif" ? "GIF / vídeo" : "Imagem"}</strong><span>{asset.ownerName} · {formatBytes(asset.sizeBytes)} · {new Date(asset.createdAt).toLocaleDateString("pt-BR")}</span></div><small className={asset.expired ? "storage-expired" : ""}>{asset.expired ? "Expirada" : `Expira em ${new Date(asset.expiresAt).toLocaleDateString("pt-BR")}`}</small></li>)}</ul>
  </section>;
}
