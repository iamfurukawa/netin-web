const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? `api_error_${status}`);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...init.headers },
  });

  if (!response.ok) {
    let code: string | null = null;
    try {
      code = (await response.json() as { error?: string }).error ?? null;
    } catch {
      // A resposta pode não ter corpo JSON em caso de falha do proxy.
    }
    throw new ApiError(response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function checkApi() {
  await apiRequest<{ status: string }>("/health");
}
