// COPIA-UNICA (14/11) — a cópia da carreira no servidor sobe uma vez só. Com
// uma cópia a caminho (envio lento, 1,5 s), uma leitura da carreira no meio
// (o que a v2 faz ao recarregar os dados) não manda a mesma cópia de novo; e
// duas gravações seguidas terminam com o save mais novo no servidor. Pelo
// repositório do aparelho (motor/repositorio.js) na página da v2, com o
// fetch contado (antes: test_v2_escalacao item 3 falhou no CI do #116 com
// 2 PUTs).
//  1) Gravar + ler no meio do envio: 1 PUT só; servidor e aparelho em dia.
//  1b) O mesmo com duas instâncias do repositório (a v2 tem a do motor e a do
//     build): uma grava, a outra lê no meio do envio; 1 PUT só.
//  2) Duas gravações seguidas (a 2ª durante o envio da 1ª): o servidor fica
//     com a 2ª e o aparelho marcado como sincronizado; no máximo 2 PUTs.
//  3) Sem mudança no save, copiar de novo não manda nada.
//  4) Envio preso (o PUT nunca responde): a leitura seguinte não espera por
//     ele e a gravação seguinte espera no máximo 15 s (grava no aparelho e
//     devolve "andamento").
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, motorPronto } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `copia${Date.now()}@teste.com`);
  await motorPronto(page, { comCarreira: true });

  const r = await page.evaluate(async () => {
    const { criarRepositorio, hashTexto } = await import("/js/motor/repositorio.js");
    let puts = 0;
    const lento = async (url, init = {}) => {
      if (init.method === "PUT" && /\/api\/career$/.test(url)) { puts++; await new Promise((ok) => setTimeout(ok, 1500)); }
      return fetch(url, init);
    };
    const repo = criarRepositorio({ fetch: lento });
    const me = await (await fetch("/api/auth/me")).json();
    const id = String(me.user.id);
    const servidor = async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const base = (await repo.registro(id)).save;
    const out = {};

    // 1) Gravar + ler no meio do envio.
    const s1 = { ...base, testeCopia: 1 };
    puts = 0;
    const [g1] = await Promise.all([repo.gravar(id, s1), espera(300).then(() => repo.ler(id))]);
    const reg1 = await repo.registro(id);
    out.um = { copia: g1.copia, puts, servidor: (await servidor()).testeCopia, sincronizado: reg1.sincronizado === reg1.hash };

    // 1b) Duas instâncias.
    const outro = criarRepositorio({ fetch: lento });
    const sB = { ...base, testeCopia: 11 };
    puts = 0;
    await Promise.all([repo.gravar(id, sB), espera(300).then(() => outro.ler(id))]);
    out.umB = { puts, servidor: (await servidor()).testeCopia };

    // 2) Duas gravações seguidas.
    const s2 = { ...base, testeCopia: 2 }, s3 = { ...base, testeCopia: 3 };
    puts = 0;
    await Promise.all([repo.gravar(id, s2), espera(300).then(() => repo.gravar(id, s3)), espera(600).then(() => repo.ler(id))]);
    const reg2 = await repo.registro(id);
    out.dois = { puts, servidor: (await servidor()).testeCopia, aparelho: reg2.save.testeCopia, sincronizado: reg2.sincronizado === reg2.hash && reg2.hash === hashTexto(JSON.stringify(s3)) };

    // 3) Sem mudança.
    puts = 0;
    const c3 = await repo.copiarParaServidor(id);
    out.tres = { copia: c3, puts };

    // 4) Envio preso.
    const preso = criarRepositorio({ fetch: (url, init = {}) => (init.method === "PUT" && /\/api\/career$/.test(url) ? new Promise(() => {}) : fetch(url, init)) });
    preso.gravar(id, { ...base, testeCopia: 4 });
    await espera(300);
    const t0 = Date.now();
    const lido = await Promise.race([preso.ler(id).then((x) => !!x.career), espera(8000).then(() => "travou")]);
    const msLer = Date.now() - t0;
    const gravado = await Promise.race([preso.gravar(id, { ...base, testeCopia: 5 }).then((x) => x.ok && x.copia), espera(25000).then(() => "travou")]);
    out.quatro = { lido, msLer, gravado, msGravar: Date.now() - t0 - msLer, aparelho: (await preso.registro(id)).save.testeCopia };
    return out;
  });

  check("1) Gravar com uma leitura no meio do envio: 1 PUT só; servidor e aparelho em dia:", r.um.copia === "ok" && r.um.puts === 1 && r.um.servidor === 1 && r.um.sincronizado, JSON.stringify(r.um));
  check("1b) Duas instâncias do repositório (uma grava, a outra lê no meio do envio): 1 PUT só:", r.umB.puts === 1 && r.umB.servidor === 11, JSON.stringify(r.umB));
  check("2) Duas gravações seguidas: o servidor fica com a mais nova, o aparelho sincronizado, no máximo 2 PUTs:", r.dois.servidor === 3 && r.dois.aparelho === 3 && r.dois.sincronizado && r.dois.puts <= 2, JSON.stringify(r.dois));
  check("3) Sem mudança no save, copiar de novo não manda nada:", r.tres.copia === "ok" && r.tres.puts === 0, JSON.stringify(r.tres));
  check("4) Envio preso: a leitura não espera; a gravação grava no aparelho e espera no máximo 15 s:", r.quatro.lido === true && r.quatro.msLer < 8000 && r.quatro.gravado === "andamento" && r.quatro.msGravar < 20000 && r.quatro.aparelho === 5, JSON.stringify(r.quatro));
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
