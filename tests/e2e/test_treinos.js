// Treino da semana — lote L5b, sem a tela antiga. As regras pela ponte (os
// mesmos comandos da tela Treino da semana da v2: treino, aplicarModeloTreino,
// salvarDiaTreino, aplicarTreino). A tela da v2 (dias, folha do dia, folga
// ocupada com aviso, modelo da semana, "Aplicar treino da semana" 1x) está no
// test_v2_tatica_treino item 7. A navegação da tela antiga (Treinos no menu
// "Mais", Tabela pelo menu) saiu: não existe na v2.
//  1) A semana nasce no modelo "Equilíbrio Semanal", com 5 modelos e 7 dias.
//  2) Sábado é o dia de jogo: não aceita treino.
//  3) Trocar de modelo aplica o plano inteiro (Pré-Temporada Física: físico
//     intenso na segunda).
//  4) Editar um dia deixa a semana "Personalizada" (sem modelo).
//  5) Ocupar a folga protegida (sexta) fica marcado como folga ocupada.
//  6) Treino individual grava o jogador escolhido, sem mexer na escalação.
//  7) Aplicar o treino marca a semana como feita; aplicar de novo na mesma
//     semana é recusado e não muda nada (idempotente).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `treinos${Date.now()}@teste.com`);

  const r = await noMotor(page, async ({ CAREER, ponte }) => {
    const out = {};
    const t0 = ponte.treino();
    out.um = { modelo: t0.modelo, modelos: t0.modelos.length, dias: t0.dias.length, jogo: t0.dias.filter((d) => d.jogo).map((d) => d.dia), protegidos: t0.dias.filter((d) => d.protegido).map((d) => d.dia) };
    out.dois = await ponte.salvarDiaTreino(5, { foco: "tecnico", intensidade: "leve" });
    await ponte.aplicarModeloTreino("pretemporada");
    const t3 = ponte.treino();
    out.tres = { modelo: t3.modelo, dia0: t3.dias[0] };
    await ponte.salvarDiaTreino(0, { foco: "tecnico", intensidade: "moderada", grupo: "principal" });
    const t4 = ponte.treino();
    out.quatro = { modelo: t4.modelo, dia0: t4.dias[0] };
    await ponte.salvarDiaTreino(4, { foco: "fisico", intensidade: "leve", grupo: "principal" });
    const t5 = ponte.treino();
    out.cinco = { dia4: t5.dias[4], folgas: t5.resumo.folgas };
    await ponte.salvarDiaTreino(4, { foco: "descanso" });
    const escalacaoAntes = JSON.stringify(CAREER.lineup);
    const jogador = CAREER.squad.find((p) => p.origin === "principal" && !CAREER.lineup.starters.includes(p.id)) || CAREER.squad[0];
    const r6 = await ponte.salvarDiaTreino(0, { foco: "tecnico", intensidade: "moderada", grupo: "individual", jogador: jogador.id });
    out.seis = { r6, gravado: CAREER.trainingPlan[0].individualPlayerId === jogador.id, escalacaoIgual: JSON.stringify(CAREER.lineup) === escalacaoAntes };
    await ponte.salvarDiaTreino(0, { foco: "tecnico", intensidade: "moderada", grupo: "principal" });
    const a1 = await ponte.aplicarTreino();
    const cond = JSON.stringify(CAREER.squad.map((p) => [p.condition, p.overall]));
    const aplicado = ponte.treino().aplicado;
    const a2 = await ponte.aplicarTreino();
    out.sete = { a1, aplicado, a2, igual: JSON.stringify(CAREER.squad.map((p) => [p.condition, p.overall])) === cond };
    return out;
  });

  check("1) A semana nasce no modelo 'Equilíbrio Semanal', com 5 modelos e 7 dias (sábado jogo; sexta e domingo folgas protegidas):",
    r.um.modelo === "equilibrio" && r.um.modelos === 5 && r.um.dias === 7 && JSON.stringify(r.um.jogo) === "[5]" && JSON.stringify(r.um.protegidos) === "[4,6]", JSON.stringify(r.um));
  check("2) Sábado (jogo) não aceita treino:", r.dois.ok === false && r.dois.motivo === "dia-invalido", JSON.stringify(r.dois));
  check("3) Trocar de modelo aplica o plano inteiro (Pré-Temporada Física: físico intenso na segunda):", r.tres.modelo === "pretemporada" && r.tres.dia0.foco === "fisico" && r.tres.dia0.intensidade === "intensa", JSON.stringify(r.tres));
  check("4) Editar um dia deixa a semana personalizada (sem modelo):", r.quatro.modelo === null && r.quatro.dia0.foco === "tecnico", JSON.stringify(r.quatro));
  check("5) Ocupar a folga protegida (sexta): o dia fica marcado como protegido e a semana passa a ter 1 folga:", r.cinco.dia4.protegido && r.cinco.dia4.foco === "fisico" && r.cinco.folgas === 1, JSON.stringify(r.cinco));
  check("6) Treino individual grava o jogador escolhido, sem mexer na escalação:", r.seis.r6.ok && r.seis.gravado && r.seis.escalacaoIgual, JSON.stringify(r.seis));
  check("7) Aplicar marca a semana como feita; aplicar de novo é recusado e não muda nada:", r.sete.a1.ok && r.sete.aplicado && r.sete.a2.ok === false && r.sete.a2.motivo === "ja-aplicado" && r.sete.igual, JSON.stringify(r.sete));
  check("8) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
