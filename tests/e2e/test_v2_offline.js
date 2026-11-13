// OFFLINE-001 (13/11/2026) — matriz de cenários offline, só pela v2.
// Decisões do Murilo (13/11): o save do aparelho é o principal (cópia no
// servidor com rede e conta); recompensa e loja só com rede; tudo num PR.
//  1) Service worker: nenhuma resposta privada da API em cache (conta,
//     carreira), cache antigo v1 apagado; fontes do jogo locais (sem Google).
//  2) Abertura a frio sem rede: o Início abre com a carreira do aparelho, e
//     uma subrota nunca aberta online também.
//  3) Rodada inteira sem rede: grava no aparelho; o servidor não muda.
//  4) A rede volta: a cópia vai ao servidor (servidor = aparelho).
//  5) Loja e ranking sem rede: aviso e ações inativas.
//  6) Checkpoint: recarregar no meio da partida volta à Partida, pausada,
//     no mesmo minuto e placar; terminar anda a rodada uma vez só.
//  7) Duas abas: a que abre por último toma a vez; a outra mostra "aberta
//     em outra aba", para de gravar e pode tomar a vez de volta ("Jogar aqui").
//  8) Exportar: arquivo com formato, hash e o save do aparelho; arquivo
//     alterado é recusado sem mexer em nada; arquivo válido substitui
//     (depois de confirmar) e a cópia vai ao servidor.
//  9) Conflito (a conta avançou em outro aparelho e este também): nada é
//     sobrescrito sozinho; aviso; em Saves, trazer a da conta ou enviar a daqui.
// 10) Sem erro na página; 360 px sem rolagem horizontal em Saves.
const fs = require("fs");
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, base, saveNoServidor, saveNoAparelho, jogarRodadaV2, iniciarPeloPreJogo, continueToHome, sameSave } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  const externos = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== "localhost") externos.push(u.hostname); });

  await carreiraV2(page, `v2off${Date.now()}@teste.com`);
  // Service worker instalado e no controle da página.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  // 1) Cache sem dado privado e fontes locais.
  const sw = await page.evaluate(async () => {
    const keys = await caches.keys();
    const privados = [];
    for (const k of keys) {
      const c = await caches.open(k);
      for (const req of await c.keys()) {
        const p = new URL(req.url).pathname;
        if (/^\/api\/(auth|career$|account|daily-login|loja|friends|leaderboard|push\/(subscribe|test))/.test(p)) privados.push(`${k} ${p}`);
      }
    }
    const fonte = [...document.styleSheets].map((s) => s.href || "").filter(Boolean);
    return { keys, privados, fonte, barlow: document.fonts.check('600 16px "Barlow"') && document.fonts.check('700 16px "Barlow Condensed"') };
  });
  check("1) Service worker sem resposta privada da API em cache (sem o cache v1) e fontes do jogo locais (sem Google Fonts):",
    sw.privados.length === 0 && !sw.keys.includes("brdata-api-v1") && sw.barlow && sw.fonte.some((h) => h.endsWith("/fonts/barlow.css")) && !externos.some((h) => /fonts\.(googleapis|gstatic)/.test(h)),
    JSON.stringify({ ...sw, externos: [...new Set(externos)] }));

  // 2) Abertura a frio sem rede.
  const antes = await saveNoServidor(page);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const frio = await page.waitForSelector(".home", { timeout: 30000 }).then(() => true, () => false);
  const linha = await page.evaluate(() => document.querySelector(".home-date")?.textContent || "");
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" }).catch(() => {});
  const subrota = await page.waitForSelector("h1", { timeout: 20000 }).then(() => page.evaluate(() => ({ path: location.pathname, h1: document.querySelector("h1").textContent, alerta: document.querySelector('.state[role="alert"]')?.textContent || "" })), () => null);
  check("2) Sem rede: o Início abre a frio com a carreira do aparelho, e uma subrota (/elenco) também:",
    frio && linha.endsWith(`RODADA ${antes.currentRound}`) && subrota && subrota.path === "/elenco" && !subrota.alerta, JSON.stringify({ linha, subrota }));

  // 3) Rodada inteira sem rede.
  const r3 = await jogarRodadaV2(page);
  const ap3 = await saveNoAparelho(page);
  await ctx.setOffline(false);
  const sv3 = await saveNoServidor(page);
  check("3) Sem rede, uma rodada inteira grava no aparelho (rodada + 1) e o servidor não muda:",
    r3.ok && ap3.save.currentRound === antes.currentRound + 1 && sv3.currentRound === antes.currentRound && ap3.hash !== ap3.sincronizado,
    JSON.stringify({ passos: r3.passos, aparelho: ap3.save.currentRound, servidor: sv3.currentRound }));

  // 4) A rede volta: a cópia vai (evento "online" e reabertura).
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  await page.waitForTimeout(800);
  const sv4 = await saveNoServidor(page);
  const ap4 = await saveNoAparelho(page);
  check("4) Com a rede de volta, a cópia chega ao servidor (servidor = aparelho, rodada + 1):",
    sv4.currentRound === antes.currentRound + 1 && sameSave(sv4, ap4.save) && ap4.hash === ap4.sincronizado, JSON.stringify({ servidor: sv4.currentRound, aparelho: ap4.save.currentRound }));

  // 5) Loja e ranking sem rede.
  await ctx.setOffline(true);
  await page.goto(base + "/loja", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-offline", { timeout: 20000 }).catch(() => {});
  const loja = await page.evaluate(() => ({ nota: document.querySelector(".mo-offline")?.textContent || "", ativos: [...document.querySelectorAll(".mo-item .state-btn")].filter((b) => !b.disabled).length }));
  await page.goto(base + "/ranking", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-offline", { timeout: 20000 }).catch(() => {});
  const rank = await page.evaluate(() => ({ nota: document.querySelector(".mo-offline")?.textContent || "", add: document.querySelector(".mo-add .state-btn")?.disabled }));
  await ctx.setOffline(false);
  check("5) Sem rede, loja e ranking avisam que precisam de internet e as ações ficam inativas:",
    /Sem conexão/.test(loja.nota) && loja.ativos === 0 && /Sem conexão/.test(rank.nota) && rank.add === true, JSON.stringify({ loja, rank }));

  // 6) Checkpoint da partida em andamento.
  const antes6 = await saveNoServidor(page);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  await page.click(".home-main .cta");
  await iniciarPeloPreJogo(page);
  await page.waitForSelector(".mt-skip", { timeout: 40000 });
  await page.waitForFunction(() => { const t = (document.querySelector(".mt-min") || {}).textContent || ""; return parseInt(t, 10) >= 30; }, null, { timeout: 60000 });
  // Pausa (a partida não anda enquanto o checkpoint é lido).
  await page.evaluate(async () => { const mods = await import("/js/motor/jogo.js"); mods.pauseLiveMatch(); });
  await page.waitForTimeout(600);
  const foto = await page.evaluate(() => ({ min: document.querySelector(".mt-min").textContent, gols: document.querySelector(".mt-goals").textContent }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/partida/, { timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".mt-min", { timeout: 40000 }).catch(() => {});
  const volta = await page.evaluate(() => ({ path: location.pathname, min: document.querySelector(".mt-min")?.textContent || "", gols: document.querySelector(".mt-goals")?.textContent || "", botao: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /Retomar|Começar 2º tempo/.test(t)) }));
  check("6) Recarregar no meio da partida volta à Partida, pausada, no mesmo minuto e placar:",
    volta.path === "/partida" && volta.min === foto.min && volta.gols === foto.gols && volta.botao.length > 0, JSON.stringify({ foto, volta }));
  await page.click(".mt-skip");
  await page.waitForSelector('.pz-foot .cta[data-save="saved"]', { timeout: 30000 });
  await continueToHome(page);
  const sv6 = await saveNoServidor(page);
  const cp6 = await page.evaluate(async () => { const db = await new Promise((r) => { const q = indexedDB.open("brdata-carreira"); q.onsuccess = () => r(q.result); }); const all = await new Promise((r) => { const q = db.transaction("perfil").objectStore("perfil").getAllKeys(); q.onsuccess = () => r(q.result); }); db.close(); return all.filter((k) => String(k).startsWith("partida:")); });
  check("6b) Terminada a partida retomada, a rodada anda uma vez só e o checkpoint é apagado:",
    sv6.currentRound === antes6.currentRound + 1 && sv6.matchLog.length === antes6.matchLog.length + 1 && cp6.length === 0, JSON.stringify({ antes: antes6.currentRound, depois: sv6.currentRound, cp6 }));

  // 7) Duas abas: a que abre por último toma a vez.
  const p2 = await ctx.newPage();
  p2.on("pageerror", (err) => erros.push("p2: " + err.message));
  await p2.goto(base + "/", { waitUntil: "domcontentloaded" });
  const abriu2 = await p2.waitForSelector(".home", { timeout: 30000 }).then(() => true, () => false);
  const aviso1 = await page.waitForFunction(() => /aberta em outra aba/.test(document.body.textContent), null, { timeout: 20000 }).then(() => true, () => false);
  // "Jogar aqui" na primeira toma a vez de volta; a segunda mostra o aviso.
  await page.click(".state-btn");
  await page.waitForSelector(".home", { timeout: 30000 });
  const aviso2 = await p2.waitForFunction(() => /aberta em outra aba/.test(document.body.textContent), null, { timeout: 20000 }).then(() => true, () => false);
  await p2.click(".state-btn");
  await p2.waitForSelector(".home", { timeout: 30000 });
  await page.waitForFunction(() => /aberta em outra aba/.test(document.body.textContent), null, { timeout: 20000 }).catch(() => {});
  const recusa1 = await page.evaluate(async () => {
    const m = await import("/js/motor/repositorio.js");
    const me = await fetch("/api/auth/me").then((r) => r.json());
    const repo = m.criarRepositorio();
    const reg = await repo.registro(String(me.user.id));
    return repo.gravar(String(me.user.id), { ...reg.save, currentRound: 1 });
  });
  check("7) Duas abas: a que abre por último toma a vez e a outra mostra 'aberta em outra aba' e para de gravar; 'Jogar aqui' toma a vez de volta:",
    abriu2 && aviso1 && aviso2 && recusa1.ok === false && recusa1.motivo === "outra-aba", JSON.stringify({ abriu2, aviso1, aviso2, recusa1 }));
  await page.close();

  // 8) Exportar e importar (na aba que ficou).
  await p2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".sv-file", { timeout: 20000 });
  const [dl] = await Promise.all([p2.waitForEvent("download", { timeout: 20000 }), p2.click('button.pr-row:has-text("Exportar carreira")')]);
  const arq = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  const ap8 = await saveNoAparelho(p2);
  const confere = await p2.evaluate(async (a) => (await import("/js/motor/repositorio.js")).conferirArquivo(a).ok, arq);
  const exportOk = arq.formato === "brdata-carreira" && arq.versaoArquivo === 1 && confere && sameSave(arq.save, ap8.save) && /^brdata-.+\.json$/.test(dl.suggestedFilename()) && !JSON.stringify(arq).includes("@teste.com");
  // Arquivo alterado: recusado, nada muda.
  const alterado = JSON.parse(JSON.stringify(arq)); alterado.save.finances.cash += 1e9;
  await p2.setInputFiles(".sv-file input", { name: "alterado.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(alterado)) });
  await p2.waitForSelector(".inline-error, [role='alert']", { timeout: 10000 }).catch(() => {});
  const errAlt = await p2.evaluate(() => [...document.querySelectorAll(".inline-error, .pr-err, [role='alert']")].map((e) => e.textContent).join(" | "));
  const ap8b = await saveNoAparelho(p2);
  // Arquivo válido de antes de uma rodada: substitui depois de confirmar.
  await jogarRodadaV2(p2);
  await p2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".sv-file", { timeout: 20000 });
  await p2.setInputFiles(".sv-file input", { name: "carreira.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(arq)) });
  await p2.waitForSelector("#sv-rt", { timeout: 10000 });
  const sheet = await p2.evaluate(() => document.querySelector("#sv-rd").textContent);
  await p2.click('[role="alertdialog"] .pr-danger-text, [role="dialog"] .pr-danger-text');
  await p2.waitForSelector(".home", { timeout: 40000 });
  await p2.waitForTimeout(800);
  const ap8c = await saveNoAparelho(p2);
  const sv8 = await saveNoServidor(p2);
  check("8) Exportar gera o arquivo (formato, hash, sem dados da conta); arquivo alterado é recusado sem mudar nada; arquivo válido substitui depois de confirmar e a cópia vai ao servidor:",
    exportOk && /alterado|incompleto/.test(errAlt) && sameSave(ap8b.save, ap8.save) && /rodada/.test(sheet)
      && sameSave(ap8c.save, arq.save) && sameSave(sv8, arq.save),
    JSON.stringify({ exportOk, errAlt, sheet, rodadas: { arquivo: arq.save.currentRound, aparelho: ap8c.save.currentRound, servidor: sv8.currentRound } }));

  // 9) Conflito: a conta avançou "em outro aparelho" (PUT direto no servidor)
  // e este aparelho também mudou. Nada é sobrescrito sozinho; em Saves o
  // técnico escolhe: trazer a da conta, ou enviar a deste aparelho.
  const divergir = (sufixo) => p2.evaluate(async (sufixo) => {
    const m = await import("/js/motor/repositorio.js");
    const me = await fetch("/api/auth/me").then((r) => r.json());
    const repo = m.criarRepositorio();
    const reg = await repo.registro(String(me.user.id));
    await repo.guardar(String(me.user.id), { ...reg.save, clubName: reg.save.clubName.replace(/ \(.*\)$/, "") + " (aparelho" + sufixo + ")" });
    const outro = { ...reg.save, clubName: reg.save.clubName.replace(/ \(.*\)$/, "") + " (conta" + sufixo + ")" };
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(outro) });
  }, sufixo);
  await divergir("1");
  await p2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".sv-file", { timeout: 20000 });
  await p2.waitForFunction(() => document.body.textContent.includes("Diferente"), null, { timeout: 10000 }).catch(() => {});
  const situacao = await p2.evaluate(() => document.body.textContent.includes("Diferente: a conta avançou em outro aparelho"));
  const sv9a = await saveNoServidor(p2);
  await p2.click('button.pr-row:has-text("Trazer a cópia da conta")');
  await p2.waitForSelector("#sv-rt", { timeout: 10000 });
  await p2.click('[role="alertdialog"] .pr-danger-text, [role="dialog"] .pr-danger-text');
  await p2.waitForSelector(".home", { timeout: 40000 });
  const ap9 = await saveNoAparelho(p2);
  const sv9 = await saveNoServidor(p2);
  check("9) Conflito (a conta avançou em outro aparelho e este também): a cópia da conta não é sobrescrita; 'Trazer a cópia da conta' (com confirmação) traz a da conta:",
    situacao && /\(conta1\)/.test(sv9a.clubName) && sameSave(ap9.save, sv9) && /\(conta1\)/.test(ap9.save.clubName) && ap9.hash === ap9.sincronizado && !ap9.conflito,
    JSON.stringify({ situacao, servidorAntes: sv9a.clubName, aparelho: ap9.save.clubName }));
  await divergir("2");
  await p2.goto(base + "/", { waitUntil: "domcontentloaded" });
  const avisoConflito = await p2.waitForSelector("#cf-t", { timeout: 20000 }).then(() => true, () => false);
  await p2.click('[role="dialog"] .cta');
  await p2.waitForSelector(".sv-file", { timeout: 20000 });
  await p2.click('button.pr-row:has-text("Enviar a deste aparelho para a conta")');
  await p2.waitForSelector("#sv-rt", { timeout: 10000 });
  await p2.click('[role="alertdialog"] .pr-danger-text, [role="dialog"] .pr-danger-text');
  await p2.waitForSelector(".home", { timeout: 40000 });
  const ap9b = await saveNoAparelho(p2);
  const sv9b = await saveNoServidor(p2);
  check("9b) Ao abrir com conflito, um aviso leva a Saves; 'Enviar a deste aparelho para a conta' (com confirmação) faz a conta = aparelho:",
    avisoConflito && /\(aparelho2\)/.test(sv9b.clubName) && sameSave(ap9b.save, sv9b) && !ap9b.conflito, JSON.stringify({ avisoConflito, servidor: sv9b.clubName }));

  // 10) Erros e 360 px.
  await p2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".sv-file", { timeout: 20000 });
  await p2.setViewportSize({ width: 360, height: 780 });
  const ov = await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check("10) Sem erro na página e 360 px sem rolagem horizontal em Saves:", erros.length === 0 && ov <= 0, JSON.stringify({ erros: erros.slice(0, 3), ov }));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
