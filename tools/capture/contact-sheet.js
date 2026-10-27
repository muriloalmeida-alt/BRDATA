#!/usr/bin/env node
/* Junta imagens lado a lado (com legenda) numa única PNG — usado pros
   comparativos referência × implementação dos relatórios.
   Uso: node tools/capture/contact-sheet.js <saida.png> <alturaPx> <img1>[::legenda] <img2>[::legenda] ... */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const [outFile, heightArg, ...items] = process.argv.slice(2);
const H = Number(heightArg) || 640;
(async () => {
  const cells = items.map((it) => {
    const [file, label] = it.split("::");
    const b64 = fs.readFileSync(file).toString("base64");
    const ext = path.extname(file).slice(1).replace("jpg", "jpeg");
    return `<figure><img src="data:image/${ext};base64,${b64}"><figcaption>${(label || path.basename(file)).replace(/</g, "&lt;")}</figcaption></figure>`;
  }).join("");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: H + 40 } });
  await page.setContent(`<style>body{margin:0;background:#11161c;font:12px sans-serif;color:#cfd8e3;display:flex;gap:10px;padding:10px;width:max-content}figure{margin:0}img{height:${H}px;display:block;border:1px solid #2a3440}figcaption{padding:4px 2px}</style>${cells}`);
  await page.waitForTimeout(200);
  const size = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
  await page.setViewportSize({ width: size.w, height: size.h });
  await page.screenshot({ path: outFile });
  await browser.close();
  console.log(outFile);
})();
