// MUNDO-001, M11 (25/11/2026): o save do mundo sem compressão no envio.
// Navegador sem CompressionStream (Safari < 16.4, Firefox < 113) manda o save
// em JSON cru, e o do mundo passa de 1 MB (pior caso medido: ~1,2 MB, ver
// test_mundo_validacao_temporadas). Confere, no servidor de verdade:
//  1) PUT /api/career sem gzip com ~1,3 MB: aceito (200) e lido de volta igual;
//  2) PUT sem gzip acima de 3 MB: recusado (413, ou a conexão fechada pelo
//     servidor), e o save anterior fica intacto;
//  3) as outras rotas continuam com o limite de 1 MB (PUT de 1,3 MB no nome do
//     técnico: recusado, sem derrubar o servidor).
const { check } = require("./_check");
const base = "http://localhost:8787";

(async () => {
  const email = `cru${Date.now()}@teste.com`;
  const json = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  await fetch(base + "/api/auth/signup", json({ name: "Teste Cru", email, password: "senha123", phone: "11999999999", plan: "freemium" }));
  const login = await fetch(base + "/api/auth/login", json({ email, password: "senha123" }));
  const cookie = (login.headers.getSetCookie ? login.headers.getSetCookie() : [login.headers.get("set-cookie")]).filter(Boolean).map((c) => c.split(";")[0]).join("; ");
  const put = (corpo) => fetch(base + "/api/career", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: corpo });
  const ler = async () => (await (await fetch(base + "/api/career", { headers: { Cookie: cookie }, cache: "no-store" })).json()).career;

  // ~1,3 MB de JSON que comprime bem (como o save real: elencos repetitivos).
  const save = { clubId: "800000001", squad: [], leagueSquads: Object.fromEntries(Array.from({ length: 66 }, (_, i) => [String(800000100 + i), Array.from({ length: 100 }, (_, k) => ({ id: `p${i}_${k}`, name: `Jogador ${k}`, overall: 60 + (k % 20), age: 20 + (k % 15), group: "M", contractUntil: 2028, wage: 12000 + k * 100, value: 1000000 + k * 50000, status: "ok", condition: 100, morale: 70, goalsCareer: 0, assistsCareer: 0 }))])) };
  const corpo = JSON.stringify(save);
  const r1 = await put(corpo);
  const lido = await ler();
  check("1) Save do mundo sem gzip com ~1,3 MB: aceito e lido de volta igual:", r1.status === 200 && lido && Object.keys(lido.leagueSquads || {}).length === 66 && corpo.length > 1.1 * 1024 * 1024,
    JSON.stringify({ status: r1.status, kb: Math.round(corpo.length / 1024) }));

  const grande = JSON.stringify({ ...save, enchimento: "x".repeat(3.2 * 1024 * 1024) });
  const r2 = await put(grande).catch((e) => ({ status: "erro " + e.message }));
  const depois = await ler();
  // Acima do limite o servidor recusa e fecha a conexão (readBody): 413 ou
  // conexão encerrada, conforme o cliente receba a resposta antes.
  const recusado = (r) => r.status === 413 || /fetch failed/.test(String(r.status));
  check("2) Sem gzip acima de 3 MB: recusado (413) e o save anterior intacto:", recusado(r2) && depois && !depois.enchimento && Object.keys(depois.leagueSquads || {}).length === 66, JSON.stringify({ status: r2.status }));

  const r3 = await fetch(base + "/api/account/name", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ name: "y".repeat(1.3 * 1024 * 1024) }) }).catch((e) => ({ status: "erro " + e.message }));
  const vivo = await fetch(base + "/api/health").then((r) => r.status).catch(() => 0);
  check("3) Outras rotas seguem com 1 MB (corpo de 1,3 MB recusado) e o servidor segue de pé:", r3.status !== 200 && vivo === 200, JSON.stringify({ status: r3.status, vivo }));
})();
