// D6 (20/11, decisão do Murilo "Comprimir o envio"): o save vai ao servidor
// em gzip (~10x menor). Na página da v2 (CompressionStream de verdade), pelo
// repositório do aparelho (motor/repositorio.js) e pela rota PUT /api/career.
//  1) A cópia ao servidor vai em gzip (Content-Encoding) e bem menor que o
//     JSON; o servidor guarda o save.
//  2) PUT em gzip direto: 200 e o GET devolve o mesmo save.
//  3) gzip quebrado: 400, sem mexer no save do servidor.
//  4) "zip bomb" (abre para mais de 8 MB): 413, sem mexer no save.
//  5) JSON puro (sem gzip) continua aceito.
//  6) Servidor que não abre gzip (responde 400): a cópia vai de novo sem
//     compressão, uma vez, e chega.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, motorPronto } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `gzip${Date.now()}@teste.com`);
  await motorPronto(page, { comCarreira: true });

  const r = await page.evaluate(async () => {
    const { criarRepositorio } = await import("/js/motor/repositorio.js");
    const gzip = async (texto) => new Response(new Blob([texto]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    const servidor = async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const me = await (await fetch("/api/auth/me")).json();
    const id = String(me.user.id);
    const out = {};
    let puts = [];
    const contado = (falharGzip) => async (url, init = {}) => {
      if (init.method === "PUT" && /\/api\/career$/.test(url)) {
        const enc = (init.headers || {})["Content-Encoding"] || null;
        puts.push({ enc, bytes: typeof init.body === "string" ? init.body.length : init.body.byteLength });
        if (falharGzip && enc) return new Response(JSON.stringify({ error: "Formato de save inválido." }), { status: 400 });
      }
      return fetch(url, init);
    };
    const repo = criarRepositorio({ fetch: contado(false) });
    const base = (await repo.registro(id)).save;

    // 1) Cópia em gzip.
    const s1 = { ...base, testeGzip: 1 };
    const g1 = await repo.gravar(id, s1);
    out.um = { copia: g1.copia, puts: puts.slice(), json: JSON.stringify(s1).length, servidor: (await servidor()).testeGzip };

    // 2) PUT em gzip direto.
    const s2 = { ...base, testeGzip: 2 };
    const p2 = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" }, body: await gzip(JSON.stringify(s2)) });
    out.dois = { status: p2.status, servidor: (await servidor()).testeGzip };

    // 3) gzip quebrado.
    const p3 = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" }, body: new Uint8Array([31, 139, 8, 0, 1, 2, 3, 4, 5]) });
    out.tres = { status: p3.status, servidor: (await servidor()).testeGzip };

    // 4) zip bomb.
    const p4 = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" }, body: await gzip(JSON.stringify({ ...base, lixo: "a".repeat(9 * 1024 * 1024) })) });
    out.quatro = { status: p4.status, servidor: (await servidor()).testeGzip };

    // 5) JSON puro.
    const p5 = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, testeGzip: 5 }) });
    out.cinco = { status: p5.status, servidor: (await servidor()).testeGzip };

    // 6) Servidor sem gzip: vai de novo sem compressão.
    puts = [];
    const antigo = criarRepositorio({ fetch: contado(true) });
    const g6 = await antigo.gravar(id, { ...base, testeGzip: 6 });
    out.seis = { copia: g6.copia, puts: puts.slice(), servidor: (await servidor()).testeGzip };
    return out;
  });

  check("1) A cópia ao servidor vai em gzip e bem menor que o JSON (menos de 1/4); o servidor guarda o save:",
    r.um.copia === "ok" && r.um.puts.length === 1 && r.um.puts[0].enc === "gzip" && r.um.puts[0].bytes < r.um.json / 4 && r.um.servidor === 1, JSON.stringify(r.um));
  check("2) PUT em gzip direto: 200 e o GET devolve o mesmo save:", r.dois.status === 200 && r.dois.servidor === 2, JSON.stringify(r.dois));
  check("3) gzip quebrado: 400, sem mexer no save do servidor:", r.tres.status === 400 && r.tres.servidor === 2, JSON.stringify(r.tres));
  check("4) gzip que abre para mais de 8 MB: 413, sem mexer no save:", r.quatro.status === 413 && r.quatro.servidor === 2, JSON.stringify(r.quatro));
  check("5) JSON puro (sem gzip) continua aceito:", r.cinco.status === 200 && r.cinco.servidor === 5, JSON.stringify(r.cinco));
  check("6) Servidor que não abre gzip (400): a cópia vai de novo sem compressão, uma vez, e chega:",
    r.seis.copia === "ok" && r.seis.puts.length === 2 && r.seis.puts[0].enc === "gzip" && r.seis.puts[1].enc === null && r.seis.servidor === 6, JSON.stringify(r.seis));

  await browser.close();
  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
