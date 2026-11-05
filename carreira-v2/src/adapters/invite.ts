// Convite de amigo por link (fase 11): /?convite=CODIGO. Mesma mecânica de
// capturePendingInviteFromUrl / consumePendingInviteIfAny (carreira.js):
// guarda o código na sessão da aba (sobrevive a login/cadastro), limpa a URL
// e, com a conta conhecida, usa o mesmo POST /api/friends/add, uma vez só.
const KEY = "mt_pending_invite_code";
export function captureInvite() {
  try {
    const p = new URLSearchParams(location.search);
    const code = p.get("convite");
    if (!code) return;
    sessionStorage.setItem(KEY, code.trim().toUpperCase());
    p.delete("convite");
    history.replaceState(history.state, "", location.pathname + (p.toString() ? `?${p}` : "") + location.hash);
  } catch { /* sem sessionStorage: ainda dá para adicionar pelo código no Ranking */ }
}
export async function consumeInvite(myCode?: string | null) {
  let code: string | null = null;
  try { code = sessionStorage.getItem(KEY); if (code) sessionStorage.removeItem(KEY); } catch { return; }
  if (!code || (myCode && code === myCode)) return;
  await fetch("/api/friends/add", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => {});
}
