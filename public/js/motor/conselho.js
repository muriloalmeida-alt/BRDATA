/* ===================================================================
   MOTOR — CONSELHO DO INTERVALO (CONSELHO-INTERVALO, 16/11/2026)
   -------------------------------------------------------------------
   Pedido do Murilo: "O assistente deve opinar no intervalo. Sugerir
   mudanças táticas, alterações e dicas sobre o time." Decisões (16/11):
   quem opina é a comissão técnica, se contratada; os conselhos cobrem a
   tática pelo placar, cansaço e cartões, o desempenho do 1º tempo e a
   formação; cada conselho com mudança se aplica com um toque.
   Só lê a partida e a carreira; aplicar usa as mesmas operações da
   partida ao vivo (applyLiveSub / applyLiveTactics).
=================================================================== */
import { carreiraAtual, timePorId } from "./estado.js";
import { MAX_SUBS_PER_MATCH, applyLiveSub, applyLiveTactics } from "./aovivo.js";
import { FORMATIONS, computeHumanStrength, forcaDaCpu, tacticModDe } from "./fechamento.js";
import { autoLineup } from "./virada.js";
import { abbreviateName } from "./texto.js";
import * as partida from "./partida.js";

export const CONSELHO_COND_CANSADO = 60; // condição (%) a partir da qual o titular "não aguenta" o 2º tempo
export const CONSELHO_FORMACAO_GANHO = 1.05; // a formação nova precisa render 5% a mais (gols a favor/contra)
export const CONSELHO_EIXOS_ATACAR = { ritmo: 4, pressao: 4, linhaDefensiva: 4 };
export const CONSELHO_EIXOS_SEGURAR = { ritmo: 2, pressao: 3, linhaDefensiva: 2 };

const nome = (p) => (p ? abbreviateName(p.name) : "—");
const jogador = (id) => (carreiraAtual().squad || []).find((p) => p.id === id) || null;
const cond = (p) => (p.condition == null ? 100 : p.condition);

// Força do seu time com uma escalação no lugar da atual (sem mudar nada).
function forcaCom(lineup, club) {
  const c = carreiraAtual();
  const original = c.lineup;
  c.lineup = { ...original, formation: lineup.formation, starters: lineup.starters, bench: lineup.bench };
  try { return computeHumanStrength(club); } finally { c.lineup = original; }
}
// Gols esperados a favor ÷ contra, do seu ponto de vista.
function razao(lm, s) {
  const adv = lm.isHome ? lm.away : lm.home;
  // PARIDADE-CPU · E1a, PR2: a força do adversário na partida, a mesma que o
  // jogo usa (o XI dele e os expulsos dele); sem a regra, a do clube.
  const pf = lm.cpuPostura || { formation: undefined, tactics: {} };
  const outro = forcaDaCpu(lm.isHome ? lm.humanFx.away : lm.humanFx.home, adv, lm.cpuXI || [], lm.expulsosCpu || 0, pf.formation, tacticModDe(pf.tactics));
  const l = partida.goalLambdas(lm.isHome ? s : outro, lm.isHome ? outro : s);
  return lm.isHome ? l.home / l.away : l.away / l.home;
}

// 1) Tática pelo placar: perdendo, partir para cima; ganhando, segurar.
export function conselhoPlacar(lm) {
  const c = carreiraAtual();
  const meus = lm.isHome ? lm.gh : lm.ga, deles = lm.isHome ? lm.ga : lm.gh;
  const t = c.lineup.tactics || {};
  if (meus === deles) return { estado: "manter", resumo: "Seguir o plano", motivo: `Empate em ${meus} x ${deles}: a comissão manteria a postura e decidiria pelas mudanças de peças.` };
  const perdendo = deles > meus;
  const alvo = perdendo ? CONSELHO_EIXOS_ATACAR : CONSELHO_EIXOS_SEGURAR;
  const antes = Object.fromEntries(Object.keys(alvo).map((id) => [id, t[id] || 3]));
  const placar = `${meus} x ${deles}`;
  if (Object.keys(alvo).every((id) => antes[id] === alvo[id])) {
    return { estado: "manter", resumo: perdendo ? "Já está atacando" : "Já está segurando", motivo: `${perdendo ? "Perdendo" : "Ganhando"} por ${placar}: a postura já é a indicada.` };
  }
  return {
    estado: "mudanca",
    resumo: perdendo ? "Partir para cima" : "Segurar o resultado",
    motivo: perdendo ? `Perdendo por ${placar}: precisamos do gol. Mais ritmo, pressão alta e linha adiantada.` : `Ganhando por ${placar}: baixar o ritmo e a linha para fechar os espaços.`,
    nota: `Ritmo ${alvo.ritmo}, pressão ${alvo.pressao} e linha defensiva ${alvo.linhaDefensiva}`,
    detalhe: { eixos: alvo, antes },
  };
}

// 2) Cansaço e cartões: o titular em mais risco sai para o melhor reserva
// da posição no banco.
export function conselhoCansaco(lm) {
  const c = carreiraAtual();
  const restam = MAX_SUBS_PER_MATCH + (lm.subsBonus || 0) - (lm.subsUsed || 0);
  if (restam <= 0) return { estado: "manter", resumo: "Sem substituições", motivo: "As substituições já foram usadas." };
  const amarelos = new Set((lm.events || []).filter((e) => e.mine && e.type === "amarelo" && e.playerId).map((e) => e.playerId));
  const emCampo = c.lineup.starters.map(jogador).filter((p) => p && p.status === "ok");
  const risco = emCampo.map((p) => {
    const cansado = cond(p) < CONSELHO_COND_CANSADO, pendurado = amarelos.has(p.id);
    return { p, cansado, pendurado, peso: (pendurado ? 2 : 0) + (cansado ? 1 : 0) + (100 - cond(p)) / 1000 };
  }).filter((x) => x.cansado || x.pendurado).sort((a, b) => b.peso - a.peso);
  if (!risco.length) return { estado: "manter", resumo: "Ninguém em risco", motivo: "Os titulares estão sem cartão e com fôlego para o 2º tempo." };
  const banco = (c.lineup.bench || []).map(jogador).filter((p) => p && p.status === "ok");
  for (const r of risco) {
    const entra = banco.filter((b) => b.group === r.p.group).sort((a, b) => (b.overall - a.overall) || (cond(b) - cond(a)))[0];
    if (!entra) continue;
    const porque = [r.pendurado ? "tem amarelo (risco de expulsão)" : null, r.cansado ? `está cansado (condição ${Math.round(cond(r.p))}%)` : null].filter(Boolean).join(" e ");
    return {
      estado: "mudanca", resumo: `${nome(entra)} no lugar de ${nome(r.p)}`,
      motivo: `${nome(r.p)} ${porque}. ${nome(entra)} entra descansado na mesma posição.`,
      nota: `Usa 1 das ${restam} substituiç${restam === 1 ? "ão" : "ões"} restantes`,
      detalhe: { sai: { id: r.p.id, nome: nome(r.p) }, entra: { id: entra.id, nome: nome(entra) } },
    };
  }
  return { estado: "manter", resumo: "Sem reposição no banco", motivo: `${nome(risco[0].p)} preocupa, mas não há reserva da posição no banco.` };
}

// 3) Desempenho do 1º tempo pelas estatísticas (só leitura).
export function conselhoDesempenho(lm) {
  const s = lm.stats;
  if (!s || !s.shots) return { estado: "info", resumo: "Sem números ainda", motivo: "As estatísticas do jogo ainda não estão disponíveis." };
  const lado = lm.isHome ? "home" : "away", outro = lm.isHome ? "away" : "home";
  const fm = s.shots[lado] || 0, ft = s.shots[outro] || 0, gm = s.shotsOnTarget[lado] || 0, gt = s.shotsOnTarget[outro] || 0;
  const posseCasa = s.chunkShareSum ? s.possWeightHome / s.chunkShareSum : 0.5;
  const posse = Math.round((lm.isHome ? posseCasa : 1 - posseCasa) * 100);
  const meus = lm.isHome ? lm.gh : lm.ga, deles = lm.isHome ? lm.ga : lm.gh;
  const leitura = ft >= fm + 3 ? "O adversário finaliza bem mais: a defesa está sendo pressionada."
    : fm >= ft + 3 && meus <= deles ? "Criamos mais, mas falta pontaria."
    : posse < 40 ? "Pouca bola: o meio-campo precisa segurar mais a posse."
    : fm >= ft + 3 ? "O time domina e cria mais chances."
    : "Jogo equilibrado até aqui.";
  return { estado: "info", resumo: leitura, motivo: `1º tempo: ${fm} finalizaç${fm === 1 ? "ão" : "ões"} (${gm} no gol) contra ${ft} (${gt}); posse de ${posse}%.` };
}

// 4) Formação: com os mesmos 11 em campo (cada um na sua posição), a
// formação que mais rende contra este adversário.
export function conselhoFormacao(lm) {
  const c = carreiraAtual();
  const club = timePorId(c.clubId);
  const adv = lm.isHome ? lm.away : lm.home;
  if (!club || !adv || !adv.atk || !adv.def) return { estado: "manter", resumo: "Manter formação", motivo: "Sem dados do adversário para comparar formações." };
  const emCampo = c.lineup.starters.map(jogador).filter((p) => p && p.status === "ok");
  const ids = new Set(emCampo.map((p) => p.id));
  const atual = c.lineup.formation;
  const base = razao(lm, forcaCom(c.lineup, club));
  let melhor = null;
  Object.keys(FORMATIONS).forEach((f) => {
    if (f === atual) return;
    const slots = FORMATIONS[f];
    const a = autoLineup(emCampo, f, true);
    // Só vale se os mesmos jogadores ocupam vagas da própria posição.
    const ok = a.starters.length === slots.length && a.starters.every((id, i) => id && ids.has(id) && (jogador(id) || {}).group === slots[i][0]);
    if (!ok || new Set(a.starters).size !== ids.size) return;
    const r = razao(lm, forcaCom({ formation: f, starters: a.starters, bench: c.lineup.bench }, club));
    if (!melhor || r > melhor.r) melhor = { f, starters: a.starters, r };
  });
  if (!melhor || melhor.r < base * CONSELHO_FORMACAO_GANHO) {
    return { estado: "manter", resumo: "Manter formação", motivo: `O ${atual} segue a melhor opção com quem está em campo.` };
  }
  return {
    estado: "mudanca", resumo: `Mudar para o ${melhor.f}`,
    motivo: `Com os mesmos jogadores, o ${melhor.f} rende ${Math.round((melhor.r / base - 1) * 100)}% mais que o ${atual} contra o ${adv.name || "adversário"}.`,
    nota: "Trocar o esquema custa um pouco de efetividade até o time se ajustar",
    detalhe: { de: atual, para: melhor.f, starters: melhor.starters },
  };
}

const CATEGORIAS = [["placar", conselhoPlacar], ["cansaco", conselhoCansaco], ["desempenho", conselhoDesempenho], ["formacao", conselhoFormacao]];
// Chave do conselho: muda se a partida ou o time mudarem (para não aplicar
// um conselho velho).
export function chaveDoConselho(lm, cat, item) {
  const l = carreiraAtual().lineup;
  return JSON.stringify([cat, item.estado, item.detalhe || null, l.formation, l.starters, l.bench, l.tactics, lm.gh, lm.ga, lm.subsUsed]);
}
// Os conselhos do intervalo. Só no intervalo e com a comissão contratada.
export function conselhosDoIntervalo(lm) {
  const c = carreiraAtual();
  const contratada = !!(c.technicalStaff && c.technicalStaff.hired);
  if (!lm || !lm.halftime) return { ok: false, motivo: "fora-do-intervalo", contratada };
  if (!contratada) return { ok: true, contratada, itens: [] };
  const itens = CATEGORIAS.map(([cat, fn]) => { const item = fn(lm); return { categoria: cat, ...item, chave: chaveDoConselho(lm, cat, item) }; });
  return { ok: true, contratada, itens };
}
// Aplica um conselho com mudança (a chave confere que ele ainda vale).
export function aplicarConselho(lm, cat, chave) {
  const atual = conselhosDoIntervalo(lm);
  if (!atual.ok) return atual;
  if (!atual.contratada) return { ok: false, motivo: "sem-comissao" };
  const item = atual.itens.find((i) => i.categoria === cat);
  if (!item || item.estado !== "mudanca") return { ok: false, motivo: "sem-sugestao", ...atual };
  if (item.chave !== chave) return { ok: false, motivo: "desatualizada", ...atual };
  const c = carreiraAtual();
  if (cat === "placar") applyLiveTactics(lm, c.lineup.formation, { ...c.lineup.tactics, ...item.detalhe.eixos });
  else if (cat === "cansaco") applyLiveSub(lm, item.detalhe.sai.id, item.detalhe.entra.id);
  else if (cat === "formacao") { c.lineup.starters = [...item.detalhe.starters]; applyLiveTactics(lm, item.detalhe.para, { ...c.lineup.tactics }); }
  return { ok: true, aplicado: { categoria: cat, resumo: item.resumo }, ...conselhosDoIntervalo(lm) };
}
