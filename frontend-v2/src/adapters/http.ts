// Única porta de rede da v2: mesma origem, cookie de sessão do backend
// atual (HttpOnly), sem token no frontend.
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function fetchJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* corpo vazio ou não-JSON */ }
  if (!res.ok) {
    const msg = (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string")
      ? (body as { error: string }).error : `Erro ${res.status}`;
    throw new HttpError(res.status, msg);
  }
  return body as T;
}
