// ESCUDOS-001 / dados reais (13/11/2026) — com o servidor configurado como a
// produção deve ficar (DATA_PROVIDER=frozen, ENABLED_COMPETITIONS=serie_b,
// serie_c, LIVE_SEASON=2026; perfil de servidor "dados-reais"), uma carreira
// nova tem clubes e elencos reais nas 3 divisões e escudos locais.
//  1) As 3 divisões aparecem na criação com os clubes reais do catálogo.
//  2) Carreira na Série A: modo real; o elenco do clube é o do catálogo.
//  3) As outras divisões (B e C) também são as reais (clubes do catálogo),
//     com elencos reais (não gerados).
//  4) Todos os escudos da Tabela (A, B e C) abrem do próprio jogo
//     (/img/teams), sobre a chapinha clara, sem imagem quebrada.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { contaNova, ateOInicio, noMotor, base } = require("./_v2_carreira");

const snap = (c) => JSON.parse(fs.readFileSync(path.join(__dirname, `../../server/frozen-catalog/snapshot-${c}.json`), "utf8"));
const CAT = { brasileirao: snap("brasileirao"), serie_b: snap("serie_b"), serie_c: snap("serie_c") };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  const externos = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== "localhost" && r.resourceType() === "image") externos.push(u.hostname); });
  await contaNova(page, `dadosreais${Date.now()}@teste.com`);

  // 1) Criação: as 3 divisões com os clubes reais.
  const clubesDe = async (n) => {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
    await page.locator(".ac-opt").nth(n).click();
    await page.click(".ac-foot .cta");
    await page.waitForSelector(".ac-club", { timeout: 40000 });
    return page.evaluate(() => [...document.querySelectorAll(".ac-club")].map((c) => c.textContent));
  };
  const lista = { brasileirao: await clubesDe(0), serie_b: await clubesDe(1), serie_c: await clubesDe(2) };
  const todasReais = Object.entries(lista).every(([c, l]) => l.length === 20 && CAT[c].teams.every((t) => l.some((x) => x.includes(t.name))));
  check("1) Na criação, as 3 divisões listam os 20 clubes reais do catálogo:", todasReais, JSON.stringify(Object.fromEntries(Object.entries(lista).map(([c, l]) => [c, l.length]))));

  // 2) Carreira na Série A.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.locator(".ac-opt").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  await page.locator(".ac-club").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 20000 });
  await page.click(".ac-form .cta");
  await page.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  await ateOInicio(page);
  const c = await noMotor(page, ({ CAREER, estado }) => {
    const nomes = (lista) => (lista || []).map((t) => t.name);
    const elenco = (id) => (CAREER.leagueSquads || {})[String(id)] || [];
    const b = CAREER.divisionTeams.serie_b, cc = CAREER.divisionTeams.serie_c;
    return {
      liveMode: CAREER.liveMode, modo: estado.modoRealPorCompeticao(), clubId: String(CAREER.clubId), elenco: CAREER.squad.map((p) => p.name),
      b: nomes(b), c: nomes(cc), elencoB: elenco(b[0].id).map((p) => p.name), idB: String(b[0].id), elencoC: elenco(cc[0].id).map((p) => p.name), idC: String(cc[0].id),
    };
  });
  const jogadores = (comp, id) => ((CAT[comp].playersByTeamId || {})[id] || []).map((p) => p.name);
  const reaisDoClube = jogadores("brasileirao", c.clubId);
  const doCatalogo = (lista, reais) => reais.length > 0 && lista.filter((n) => reais.includes(n)).length >= Math.min(11, reais.length);
  check("2) Carreira na Série A em modo real, com o elenco do clube vindo do catálogo:", c.liveMode === true && doCatalogo(c.elenco, reaisDoClube), JSON.stringify({ liveMode: c.liveMode, elenco: c.elenco.slice(0, 4), cat: reaisDoClube.slice(0, 4) }));
  const bReais = CAT.serie_b.teams.every((t) => c.b.includes(t.name)), cReais = CAT.serie_c.teams.every((t) => c.c.includes(t.name));
  check("3) As Séries B e C da carreira são as reais (clubes do catálogo, modo real) e os elencos de lá também:",
    bReais && cReais && c.modo.serie_b === true && c.modo.serie_c === true && doCatalogo(c.elencoB, jogadores("serie_b", c.idB)) && doCatalogo(c.elencoC, jogadores("serie_c", c.idC)),
    JSON.stringify({ modo: c.modo, b: c.b.slice(0, 3), elencoB: c.elencoB.slice(0, 3), elencoC: c.elencoC.slice(0, 3) }));

  // 4) Escudos na Tabela das 3 divisões.
  const escudos = {};
  for (const [div, q] of [["A", ""], ["B", "?divisao=serie_b"], ["C", "?divisao=serie_c"]]) {
    await page.goto(base + "/tabela" + q, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tb-more", { timeout: 20000 });
    await page.click(".tb-more");
    await page.waitForFunction(() => document.querySelectorAll(".tb-row").length === 20, null, { timeout: 20000 });
    await page.waitForFunction(() => [...document.querySelectorAll(".tb-row .crest img")].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
    escudos[div] = await page.evaluate(() => [...document.querySelectorAll(".tb-row")].map((r) => {
      const i = r.querySelector(".crest img");
      const nome = (r.querySelector(".tb-name") || {}).textContent;
      if (!i) return `${nome}:monograma`;
      const ok = i.complete && i.naturalWidth > 0 && new URL(i.src).pathname.startsWith("/img/teams/") && !!i.closest(".crest-plate");
      return ok ? "ok" : `${nome}:${i.getAttribute("src")}`;
    }));
  }
  const ruins = Object.values(escudos).flat().filter((x) => x !== "ok");
  check("4) Os 60 escudos da Tabela (A, B e C) abrem do próprio jogo (/img/teams), sobre a chapinha clara, sem site externo:",
    ruins.length === 0 && externos.length === 0, JSON.stringify({ ruins, externos: [...new Set(externos)] }));

  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
