// Renovação de contrato — lote L5a, sem a tela antiga. Junta o
// test_contract_renewal, o test_contract_renewal_edge (só imprimia) e o
// test_coletiva_renovacao. As regras pela ponte (ponte.renovar, o mesmo
// comando da tela de renovação da v2); as telas (Contrato e ações, Renovar,
// "Proposta aceita."/"Proposta recusada." e a coletiva avulsa) estão no
// test_v2_elenco_avancado, itens 2 a 4.
//  1) Fora do último ano de contrato, renovar é recusado ("fora-do-prazo").
//  2) Salário abaixo do mínimo pedido: recusa com o motivo ("pelo menos"),
//     nada muda e abre a coletiva de renovação recusada (19).
//  3) Salário sugerido por 2 anos: aceita; o contrato vai até a temporada
//     + 2 e o salário fica o sugerido, gravado no save.
//  4) Jogador de até 23 anos não aceita contrato de 1 ano, nem com salário
//     alto (quer pelo menos 2).
//  5) Proposta que estoura o teto salarial: recusada pelo orçamento ("teto"),
//     sem mudar nada e sem coletiva.
//  6) Moral muito baixa (< 30): recusa na certa, com a coletiva 19 (a
//     pergunta da renovação recusada).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, saveNoServidor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `renovacao${Date.now()}@teste.com`);

  const r = await noMotor(page, async (M) => {
    const { CAREER, ponte, clube } = M;
    const out = {};
    const limpaColetiva = async () => { const c = ponte.coletivaAtual(); if (c.ok) await ponte.responderColetiva(c.respostas[0].letra); };
    const principal = CAREER.squad.filter((p) => p.origin === "principal");
    const vence = (p) => { p.contractUntil = CAREER.seasonYear; };

    // 1) Fora do prazo.
    const longe = principal.find((p) => p.contractUntil > CAREER.seasonYear) || principal[0];
    longe.contractUntil = CAREER.seasonYear + 2;
    out.um = await ponte.renovar(longe.id, longe.wage * 2, 2);

    // 2) Salário abaixo do mínimo.
    const alvo = principal.find((p) => p.age > 26 && p.overall < 80 && p !== longe);
    alvo.morale = 70;
    vence(alvo);
    const antes = { wage: alvo.wage, ate: alvo.contractUntil };
    const r2 = await ponte.renovar(alvo.id, 1, 2);
    out.dois = { r: r2, wage: alvo.wage === antes.wage, ate: alvo.contractUntil === antes.ate, coletiva: ponte.coletivaAtual() };
    await limpaColetiva();

    // 3) Salário sugerido, 2 anos.
    const sugerido = clube.suggestedRenewalWage(alvo);
    const r3 = await ponte.renovar(alvo.id, sugerido, 2);
    out.tres = { r: r3, sugerido, ano: CAREER.seasonYear, id: alvo.id };

    // 4) Jovem, 1 ano.
    const jovem = principal.find((p) => p.age <= 23 && p !== alvo && p !== longe);
    if (jovem) { jovem.morale = 70; vence(jovem); out.quatro = await ponte.renovar(jovem.id, clube.suggestedRenewalWage(jovem) * 3, 1); await limpaColetiva(); }

    // 5) Teto salarial.
    const outro = principal.find((p) => p.age > 26 && p !== alvo && p !== longe && p !== jovem);
    outro.morale = 70;
    vence(outro);
    const antes5 = { wage: outro.wage, ate: outro.contractUntil };
    const r5 = await ponte.renovar(outro.id, CAREER.finances.wageCap * 5, 2);
    out.cinco = { r: r5, igual: outro.wage === antes5.wage && outro.contractUntil === antes5.ate, coletiva: ponte.coletivaAtual().ok };

    // 6) Moral muito baixa.
    outro.morale = 10;
    const r6 = await ponte.renovar(outro.id, clube.suggestedRenewalWage(outro) * 2, 2);
    out.seis = { r: r6, coletiva: ponte.coletivaAtual() };
    await limpaColetiva();
    return out;
  });
  const s = await saveNoServidor(page);
  const gravado = s.squad.find((p) => p.id === r.tres.id);

  check("1) Fora do último ano de contrato, renovar é recusado:", r.um.ok === false && r.um.motivo === "fora-do-prazo", JSON.stringify(r.um));
  check("2) Abaixo do mínimo: recusa com o motivo, nada muda e abre a coletiva de renovação recusada:",
    r.dois.r.ok && r.dois.r.aceita === false && /pelo menos/.test(r.dois.r.motivo) && r.dois.wage && r.dois.ate && r.dois.r.coletiva === true && r.dois.coletiva.ok,
    JSON.stringify(r.dois));
  check("3) Sugerido por 2 anos: aceita; contrato até a temporada + 2 e o salário sugerido, gravados:",
    r.tres.r.ok && r.tres.r.aceita === true && r.tres.r.ate === r.tres.ano + 2 && r.tres.r.salario === r.tres.sugerido && gravado && gravado.contractUntil === r.tres.ano + 2 && gravado.wage === r.tres.sugerido,
    JSON.stringify({ r: r.tres, gravado: gravado && [gravado.contractUntil, gravado.wage] }));
  check("4) Até 23 anos não aceita 1 ano, nem com salário alto:", r.quatro && r.quatro.ok && r.quatro.aceita === false && /mais longo/.test(r.quatro.motivo), JSON.stringify(r.quatro));
  check("5) Acima do teto salarial: recusada pelo orçamento, nada muda e sem coletiva:", r.cinco.r.ok === false && r.cinco.r.motivo === "teto" && r.cinco.igual && !r.cinco.coletiva, JSON.stringify(r.cinco));
  check("6) Moral muito baixa: recusa na certa, com a coletiva da renovação recusada:", r.seis.r.ok && r.seis.r.aceita === false && /infeliz/.test(r.seis.r.motivo) && r.seis.coletiva.ok && /recus/i.test(r.seis.coletiva.pergunta), JSON.stringify(r.seis));
  check("7) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
