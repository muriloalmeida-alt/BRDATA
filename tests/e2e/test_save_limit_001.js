// SAVE-LIMIT-001 (issue #29) — teste e2e. Cobre o que a lógica pura de
// careerStore.js (ver test_save_limit_001_careerstore.js) não alcança: o
// fluxo real do cliente (persistCareer() do motor) contra o servidor real,
// a resposta HTTP comprimida (Content-Encoding: gzip em GET /api/career),
// e o cap de CLUB_HISTORY_MAX no cliente (motor/carga.js).
// Lote L2 do plano "testes sem a tela antiga": mesmas verificações, pelo
// motor da v2 (antes, pela tela antiga).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const puts = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/career") && res.request().method() === "PUT") puts.push({ status: res.status(), bytes: Buffer.byteLength(res.request().postData() || "", "utf8") });
  });
  // Carreira nova, ainda na pré-temporada (como na tela antiga).
  await carreiraV2(page, `savelimit001${Date.now()}@teste.com`, { preTemporada: true });

  // 1) Carreira "multi" real (marketScope sempre "multi" hoje) salva
  // sem 413 — o cenário relatado pelo usuário ("save ficou grande
  // demais") era exatamente na criação/1ª tentativa de salvar.
  const first = puts[0] || {};
  check("1) Carreira 'multi' real (~500-600KB de JSON bruto) salva sem 413:",
    puts.length > 0 && puts.every((p) => p.status === 200), JSON.stringify({ putStatus: first.status, putBodyBytes: first.bytes, puts: puts.length }));

  // 2) GET /api/career volta comprimido (Content-Encoding: gzip) e os
  // dados batem 1:1 com o que está em memória no motor.
  const check2 = await noMotor(page, async ({ CAREER }) => {
    const res = await fetch("/api/career");
    const data = await res.json();
    return { contentEncoding: res.headers.get("content-encoding"), matches: JSON.stringify(data.career) === JSON.stringify(CAREER) };
  });
  check("2) GET /api/career comprimido (Content-Encoding: gzip) e os dados batem 1:1:",
    check2.contentEncoding === "gzip" && check2.matches, JSON.stringify(check2));

  // 3) CLUB_HISTORY_MAX: forçar 20 trocas de clube nunca deixa mais de
  // 15 entradas.
  const check3 = await noMotor(page, ({ CAREER, carga, estado }) => {
    for (let i = 0; i < 20; i++) {
      carga.endCurrentClubStint("dismissed");
      CAREER.clubHistory = estado.herancaDoTecnico().clubHistory;
    }
    return { length: CAREER.clubHistory.length };
  });
  check("3) CLUB_HISTORY_MAX capa em 15 mesmo depois de 20 trocas de clube:", check3.length === 15, JSON.stringify(check3));

  // 4) Save antigo (sem o cap novo, > 15 entradas) é normalizado ao
  // carregar (migrateCareerDefaults, a mesma passada da carga do save).
  const check4 = await noMotor(page, ({ CAREER, carga }) => {
    CAREER.clubHistory = Array.from({ length: 30 }, (_, i) => ({ clubId: "x" + i, clubName: "X" + i, seasons: 1, titles: 0, avgPosition: 10, reason: "dismissed" }));
    carga.migrateCareerDefaults();
    return { length: CAREER.clubHistory.length };
  });
  check("4) Save antigo com clubHistory > 15 é normalizado ao carregar (compatibilidade preservada):", check4.length === 15, JSON.stringify(check4));

  // 5) Depois de tudo isso, salvar continua funcionando normalmente.
  const ok5 = await noMotor(page, (M) => M.persistir());
  check("5) persistCareer() continua funcionando normalmente depois de tudo isso:", ok5);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
