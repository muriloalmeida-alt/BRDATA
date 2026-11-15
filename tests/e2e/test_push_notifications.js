// Notificações push de verdade (lembrete de sequência de login, opt-in nas
// Configurações), na carreira oficial (v2, /configuracoes). Valida o fluxo
// real: o interruptor liga/desliga, o servidor grava/apaga a assinatura, o
// botão de teste e os handlers push/notificationclick do service worker.
//
// NOTA AMBIENTAL: pushManager.subscribe() de verdade precisa alcançar o
// serviço de push do navegador (FCM, no Chromium), bloqueado pelo proxy
// deste sandbox. Usa launchPersistentContext (o Push API é bloqueado em
// contexto anônimo, crbug.com/401439) e aceita os DOIS desfechos do
// "ativar": assinatura completa OU falha tratada (aviso na tela,
// interruptor desligado, nada trava).
// L6a (sem a tela antiga): mesmas checagens do teste anterior, pela v2.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, base } = require("./_v2_carreira");
const path = require("path");
const fs = require("fs");

(async () => {
  const userDataDir = path.join(__dirname, ".chrome-profile-push-test");
  fs.rmSync(userDataDir, { recursive: true, force: true }); // perfil descartável
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
    viewport: { width: 390, height: 900 },
    permissions: ["notifications"],
    args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"],
  });
  const page = context.pages()[0] || await context.newPage();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `pushui${Date.now()}@teste.com`);
  const pushNaConta = () => page.evaluate(async () => !!((await (await fetch("/api/auth/me", { cache: "no-store" })).json()).user || {}).pushEnabled);
  const toggle = () => page.locator('button[role="switch"]', { hasText: "Ativar notificações push" });

  await page.goto(base + "/configuracoes", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-toggle", { timeout: 30000 });
  await toggle().waitFor({ timeout: 15000 });

  // 1) Interruptor presente, habilitado e desligado.
  const t1 = { on: await toggle().getAttribute("aria-checked"), off: await toggle().isDisabled() };
  check("1) Interruptor de push presente, habilitado (navegador suporta) e começa desligado:", t1.on === "false" && !t1.off, JSON.stringify(t1));

  // 2/3) Ativar: assinatura completa ou falha tratada.
  await toggle().click();
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button[role="switch"]')].find((x) => /Ativar notificações push/.test(x.textContent));
    return b && !b.disabled && (b.getAttribute("aria-checked") === "true" || !!document.querySelector(".inline-error"));
  }, null, { timeout: 20000 }).catch(() => {});
  const ligado = (await toggle().getAttribute("aria-checked")) === "true";
  const contaLigada = await pushNaConta();
  if (ligado) {
    const linhaTeste = await page.locator("button.pr-row", { hasText: "Enviar notificação de teste" }).count();
    check("2) Assinatura de push bem-sucedida (a rede alcançou o serviço de push):", contaLigada === true && linhaTeste === 1, JSON.stringify({ contaLigada, linhaTeste }));
    const sub = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.getSubscription();
      return s ? { endpoint: !!s.endpoint, chaves: !!(s.toJSON().keys || {}).p256dh } : null;
    });
    check("3) A assinatura real do navegador tem endpoint e chaves:", !!sub && sub.endpoint && sub.chaves, JSON.stringify(sub));
  } else {
    const aviso = await page.evaluate(() => ((document.querySelector(".inline-error") || {}).textContent || "").trim());
    check("2) [sandbox sem acesso ao serviço de push] Falha tratada: interruptor continua desligado, conta sem push, sem travar:", contaLigada === false, JSON.stringify({ contaLigada }));
    check("3) Aviso na tela em vez de travar:", aviso.length > 0, aviso);
  }

  // 4) Desativar é seguro e idempotente.
  if (ligado) { await toggle().click(); await page.waitForTimeout(800); }
  const desliga = await page.evaluate(async () => (await fetch("/api/push/unsubscribe", { method: "POST" })).status);
  const contaFim = await pushNaConta();
  check("4) Desativar continua seguro e idempotente (pushEnabled false no fim):", desliga < 400 && contaFim === false, JSON.stringify({ desliga, contaFim }));

  // 5) Handlers do service worker.
  const sw = await page.evaluate(async () => (await (await fetch("/sw.js")).text()));
  check("5) O sw.js servido tem os handlers de 'push' e 'notificationclick':", sw.includes('addEventListener("push"') && sw.includes('addEventListener("notificationclick"'));

  // 6) O resto do app segue funcionando.
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Elenco" && document.querySelectorAll(".sq-row").length > 0, null, { timeout: 30000 }).catch(() => {});
  const elenco = await page.evaluate(() => ({ h1: (document.querySelector("h1") || {}).textContent, linhas: document.querySelectorAll(".sq-row").length }));
  check("6) O resto do app continua funcional (Elenco renderiza normal):", elenco.h1 === "Elenco" && elenco.linhas > 0, JSON.stringify(elenco));

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
