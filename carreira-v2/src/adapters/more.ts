// Aba Mais e extras da aba Jogos (fase 10 do plano de independência).
// Comandos da ponte (carreira.js) para o que mexe no save, e os MESMOS
// endpoints que a versão anterior já usa para o que é da conta: ranking e
// amigos (/api/leaderboard, /api/friends/add), loja (/api/loja/checkout),
// notificações push (/api/push/*), nome (/api/account/name) e reiniciar a
// carreira (DELETE /api/career). Nenhum endpoint novo.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";

const SAFE = new Set(["espera", "item-invalido", "compra-recusada", "opcao-invalida", "nome-vazio", "nome-recusado"]);
async function run<T = object>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try {
    const s = await engine.get();
    const r = await s.run<Res<T> | Promise<Res<T>>>(name, ...args);
    if (!r.ok && !SAFE.has(r.motivo || "")) engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" };
  }
}
async function api<T>(url: string, init?: RequestInit): Promise<Res<T>> {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init, headers: { Accept: "application/json", ...(init && init.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, motivo: "api", mensagem: (body && body.error) || `Erro ${res.status}` };
    return { ok: true, ...(body as T) };
  } catch {
    return { ok: false, motivo: "rede", mensagem: "Sem conexão agora. Tente de novo." };
  }
}

export interface Account { id: string; name: string; email?: string; friendCode?: string; creditsBR?: number; pushEnabled?: boolean; createdAt?: number }
export interface Achievement { id: string; titulo: string; descricao: string; categoria: string; nivel: "gold" | "silver" | "bronze"; meta: number; icone: string; progresso: number; desbloqueadaEm: number | null }
export interface RankEntry { userId: string; managerName: string; clubName?: string; score: number; updatedAt?: number }
export interface Package { id: string; name: string; tier: string; priceBRL: number; baseCoins: number; bonusPct: number; totalCoins: number; featured?: boolean }
export interface BoostItem { id: string; name: string; desc: string; duration: string; priceCredits: number; category: string; icon: string }
export interface PurchaseTx { icon: string; name: string; detail?: string; valueLabel?: string; valueType?: string; ts: number }

export const MoreGateway = {
  account: async (): Promise<Account | null> => {
    const r = await api<{ authenticated: boolean; user?: Account }>("/api/auth/me");
    return r.ok && r.authenticated && r.user ? { ...r.user, id: String(r.user.id) } : null;
  },
  // Diretoria: pedido de orçamento (boardRequest).
  budget: () => run<{ espera: number; decisao: string | null; teto: number; caixa: number; intervalo: number }>("orcamento"),
  askBudget: () => run<{ aprovado: boolean; aumentoTeto: number; aporte: number; motivoTexto: string; posicao: number }>("pedirOrcamento"),
  achievements: () => run<{ categorias: Record<string, string>; lista: Achievement[] }>("conquistas"),
  // Ranking: publica a pontuação (computeLeaderboardScore) e lê a lista, como renderRanking.
  async ranking(scope: "all" | "friends") {
    const s = await run<{ pontos: number; detalhe: object; clube: string }>("pontuacaoRanking");
    if (s.ok) await api("/api/leaderboard/publish", { method: "POST", body: JSON.stringify({ clubName: s.clube, score: s.pontos, breakdown: s.detalhe }) });
    return api<{ entries: RankEntry[]; own?: RankEntry }>(`/api/leaderboard?scope=${scope}`);
  },
  addFriend: (code: string) => api<{ friends: string[] }>("/api/friends/add", { method: "POST", body: JSON.stringify({ code }) }),
  shop: () => run<{ pacotes: Package[]; itens: BoostItem[]; categorias: Record<string, string>; historico: PurchaseTx[] }>("loja"),
  buy: (itemId: string) => run<{ creditos: number; efeito: string }>("comprarItem", itemId),
  checkout: (packageId: string) => api<{ checkoutUrl: string }>("/api/loja/checkout", { method: "POST", body: JSON.stringify({ packageId }) }),
  prefs: () => run<{ notificacoes: Record<string, boolean>; som: boolean; reputacao: number }>("preferencias"),
  toggleNotice: (key: string) => run("alternarNotificacao", key),
  setSound: (on: boolean) => run<{ som: boolean }>("somAtivo", on),
  saveName: (name: string) => run<{ nome: string }>("salvarNome", name),
  // Tutorial (item 1, 05/11): o mesmo POST /api/account/onboarding-seen de
  // closeOnboardingOverlay; o assistente, o mesmo startupWizardSeen = true.
  tutorialSeen: () => api("/api/account/onboarding-seen", { method: "POST" }),
  wizardDone: () => run("assistenteVisto"),
  // Reiniciar: mesmo DELETE /api/career do "Apagar e reiniciar".
  restart: () => api("/api/career", { method: "DELETE" }),
};

// Notificações push: mesmo fluxo de enablePushNotifications /
// disablePushNotifications / testPushNotification (carreira.js), com o
// mesmo service worker (/sw.js, escopo "/").
export const pushSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
export const PushGateway = {
  async enable(): Promise<Res> {
    if (!pushSupported()) return { ok: false, mensagem: "Seu navegador não suporta notificações push." };
    const key = await api<{ enabled: boolean; publicKey: string }>("/api/push/vapid-public-key");
    if (!key.ok) return key;
    if (!key.enabled) return { ok: false, mensagem: "Notificações push não configuradas neste host." };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, mensagem: "Permissão de notificação negada — ative pelas configurações do navegador se mudar de ideia." };
    try {
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key.publicKey) });
      return api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
    } catch (e) {
      return { ok: false, mensagem: (e as Error).message || "Não deu pra ativar as notificações agora." };
    }
  },
  async disable(): Promise<Res> {
    try {
      if (pushSupported()) { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); }
    } catch { /* o servidor resolve o essencial */ }
    return api("/api/push/unsubscribe", { method: "POST" });
  },
  test: () => api("/api/push/test", { method: "POST" }),
};
