// Cópia congelada do carreira.js de ANTES da etapa G1a (10/11): os comandos de
// consulta e de gestão da ponte e as funções e constantes da página que só
// eles usavam, que foram para public/js/motor/ponte.js, tal e qual.
// Referência do test_motor_ponte.js: não editar.

const SECTOR_LABEL = { defesa: "Defesa", meio: "Meio", ataque: "Ataque" };

const SPONSOR_KIND_LABEL = { master: "Patrocinador Master", material: "Material Esportivo" };

const LOAN_HALF_SEASON_ROUNDS = 19; // "6 meses" ≈ metade das 38 rodadas

const TRAINING_GROUP_LABEL = { principal: "Elenco", misto: "Misto c/ Sub-20", individual: "Individual" };

const TRAINING_DURATION_MIN = 15, TRAINING_DURATION_MAX = 120, TRAINING_DURATION_STEP = 15;

const ACHIEVEMENT_CATEGORY_LABEL = { carreira: "Carreira", titulos: "Títulos", ofensivo: "Ofensivo", disciplina: "Disciplina", formacao: "Formação", fidelidade: "Fidelidade" };

const CREDIT_PACKAGES = [
  { id: "bronze", name: "Pacote Bronze", tier: "bronze", priceBRL: 4.90, baseCoins: 490, bonusPct: 0, totalCoins: 490 },
  { id: "prata", name: "Pacote Prata", tier: "prata", priceBRL: 14.90, baseCoins: 1600, bonusPct: 5, totalCoins: 1680 },
  { id: "ouro", name: "Pacote Ouro", tier: "ouro", priceBRL: 34.90, baseCoins: 4000, bonusPct: 12, totalCoins: 4480, featured: true },
  { id: "platina", name: "Pacote Platina", tier: "platina", priceBRL: 69.90, baseCoins: 8500, bonusPct: 20, totalCoins: 10200 },
  { id: "diamante", name: "Pacote Diamante", tier: "diamante", priceBRL: 149.90, baseCoins: 19500, bonusPct: 30, totalCoins: 25350 },
];

const BOOST_ITEMS = [
  { id: "recuperacao_instantanea", name: "Recuperação Instantânea", desc: "Zera o tempo de recuperação de condição física de 1 jogador", duration: "IMEDIATO", priceCredits: 90, category: "conveniencia", icon: "⚡" },
  { id: "reset_moral", name: "Reset de Moral", desc: "Leva a moral do elenco para “Feliz” instantaneamente", duration: "IMEDIATO", priceCredits: 120, category: "conveniencia", icon: "☺" },
  { id: "treino_extra", name: "Treino Extra", desc: "1 sessão extra fora do ciclo semanal, sem consumir folga protegida", duration: "DURA 1 SEMANA", priceCredits: 150, category: "conveniencia", icon: "＋" },
  { id: "injecao_moral", name: "Injeção de Moral", desc: "+Moral em todo o elenco, cortesia do patrocinador", duration: "DURA 3 PARTIDAS", priceCredits: 210, category: "patrocinio", icon: "↑" },
  { id: "desconto_contratacao", name: "Desconto de Contratação", desc: "-15% no custo da próxima contratação", duration: "1 JANELA DE TRANSFERÊNCIA", priceCredits: 300, category: "patrocinio", icon: "%" },
  { id: "uniforme_alternativo", name: "Uniforme Alternativo", desc: "Novo uniforme visual, sem efeito de jogo", duration: "PERMANENTE (VISUAL)", priceCredits: 180, category: "cosmetico", icon: "👕" },
];

const BOOST_CATEGORY_LABEL = { conveniencia: "CONVENIÊNCIA", patrocinio: "PATROCÍNIOS", cosmetico: "COSMÉTICOS" };

const MAX_TACTICAL_SCHEMES = 8;

const COMISSAO_COND_DESGASTE = 70, COMISSAO_COND_DESCANSADO = 85, COMISSAO_OVR_TOLERANCIA = 3, COMISSAO_FORMACAO_GANHO = 1.03;

const COMISSAO_POSTURAS = { 4: "Ofensiva", 3: "Equilibrada", 2: "Cautelosa" };

function isProtectedTrainingDay(i) { return motorTreino().isProtectedTrainingDay(i); }

function trainingTargets(entry) { return motorTreino().trainingTargets(entry, CAREER.squad); }

function projectWeekPeakFatigue() {
  const cond = new Map(CAREER.squad.map((p) => [p.id, p.condition == null ? 100 : p.condition]));
  const worst = new Map(cond);
  CAREER.trainingPlan.forEach((entry, i) => {
    if (i === motorTreino().TRAINING_GAME_DAY || !entry || !entry.foco) return;
    if (entry.foco === "descanso") {
      CAREER.squad.forEach((p) => cond.set(p.id, clamp(cond.get(p.id) + 12, 0, 100)));
    } else {
      const mult = motorTreino().TRAINING_INTENSITY_MULT[entry.intensidade] || 1;
      const fatigueCost = Math.round(6 * mult);
      trainingTargets(entry).forEach((p) => cond.set(p.id, clamp(cond.get(p.id) - fatigueCost, 0, 100)));
    }
    cond.forEach((v, id) => { if (v < worst.get(id)) worst.set(id, v); });
  });
  return worst;
}

function saveTacticalScheme(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return { ok: false, reason: "Dê um nome pro esquema." };
  if (CAREER.tacticalSchemes.length >= MAX_TACTICAL_SCHEMES) {
    return { ok: false, reason: `Limite de ${MAX_TACTICAL_SCHEMES} esquemas salvos — apague um antes de criar outro.` };
  }
  const scheme = {
    id: `scheme_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed.slice(0, 30),
    formation: CAREER.lineup.formation,
    starters: [...CAREER.lineup.starters],
    bench: [...CAREER.lineup.bench],
    tactics: { ...CAREER.lineup.tactics },
    createdRound: Math.min(CAREER.currentRound, 38),
  };
  CAREER.tacticalSchemes.push(scheme);
  CAREER.activeSchemeId = scheme.id;
  return { ok: true, scheme };
}

function applyTacticalScheme(id) {
  const scheme = CAREER.tacticalSchemes.find((s) => s.id === id);
  if (!scheme) return false;
  CAREER.lineup.formation = scheme.formation;
  CAREER.lineup.starters = [...scheme.starters];
  CAREER.lineup.bench = [...scheme.bench];
  CAREER.lineup.tactics = { ...scheme.tactics };
  CAREER.activeSchemeId = scheme.id;
  // Redesign Cap. 3 · T04 — "data de uso" real (campo opcional: esquemas
  // salvos antes disto ficam sem e mostram só a rodada em que foram salvos).
  scheme.lastUsedRound = CAREER.currentRound;
  scheme.lastUsedSeason = CAREER.seasonYear;
  return true;
}

function renameTacticalScheme(id, rawName) {
  const scheme = CAREER.tacticalSchemes.find((s) => s.id === id);
  if (!scheme) return { ok: false, error: "Esquema não encontrado." };
  const name = String(rawName || "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Dê um nome ao esquema." };
  if (name.length > 30) return { ok: false, error: "Use no máximo 30 caracteres." };
  if (CAREER.tacticalSchemes.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: "Já existe um esquema com esse nome." };
  scheme.name = name;
  return { ok: true, scheme };
}

function deleteTacticalScheme(id) {
  CAREER.tacticalSchemes = CAREER.tacticalSchemes.filter((s) => s.id !== id);
  if (CAREER.activeSchemeId === id) CAREER.activeSchemeId = null;
}

function nextOpponentId() {
  const round = CAREER.currentRound;
  if (round > 38) return null;
  const fx = (CAREER.schedule[round] || []).find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
  if (!fx) return null;
  return String(fx.home) === String(CAREER.clubId) ? fx.away : fx.home;
}

function comissaoJogador(id) { return id ? CAREER.squad.find((p) => p.id === id) || null : null; }

function comissaoNome(p) { return p ? abbreviateName(p.name) : "—"; }

function comissaoReservasDisponiveis() {
  const titulares = new Set(CAREER.lineup.starters.filter(Boolean));
  return CAREER.squad.filter((p) => p.status === "ok" && !titulares.has(p.id) && (p.origin === "principal" || p.origin === "loan"));
}

function comissaoEscalacao() {
  const f = CAREER.lineup.formation, slots = FORMATIONS[f];
  if (!slots || !CAREER.squad.length) return { estado: "sem-dados" };
  const reservas = comissaoReservasDisponiveis();
  const melhor = (lista) => lista.slice().sort((a, b) => b.overall - a.overall)[0] || null;
  const troca = (idx, sai, entra, motivo, nota) => ({
    estado: "mudanca", resumo: `${comissaoNome(entra)} no lugar de ${sai ? comissaoNome(sai) : "vaga vazia"}`, motivo, nota,
    detalhe: { slot: idx, sai: sai ? { id: sai.id, nome: comissaoNome(sai) } : null, entra: { id: entra.id, nome: comissaoNome(entra) } },
  });
  // 1) Titular indisponível (lesão, suspensão, fora do elenco).
  for (let i = 0; i < slots.length; i++) {
    const p = comissaoJogador(CAREER.lineup.starters[i]);
    if (p && p.status === "ok") continue;
    const cand = melhor(reservas.filter((r) => r.group === slots[i][0]));
    if (!cand) continue;
    const why = !p ? "A vaga está sem titular." : p.status === "contundido" ? `${comissaoNome(p)} está lesionado.` : p.status === "suspenso" ? `${comissaoNome(p)} está suspenso.` : `${comissaoNome(p)} não está disponível.`;
    return troca(i, p, cand, why, "Melhor reserva disponível na posição");
  }
  // 2) Titular desgastado.
  const cond = (p) => (p.condition == null ? 100 : p.condition);
  let pior = null;
  slots.forEach((s, i) => {
    const p = comissaoJogador(CAREER.lineup.starters[i]);
    if (p && cond(p) < COMISSAO_COND_DESGASTE && (!pior || cond(p) < cond(pior.p))) pior = { i, p };
  });
  if (pior) {
    const cand = melhor(reservas.filter((r) => r.group === slots[pior.i][0] && cond(r) >= COMISSAO_COND_DESCANSADO && r.overall >= pior.p.overall - COMISSAO_OVR_TOLERANCIA));
    if (cand) return troca(pior.i, pior.p, cand, `${comissaoNome(pior.p)} está desgastado para começar (condição ${Math.round(cond(pior.p))}%).`, "Mais energia desde o início");
  }
  // 3) Maior ganho de overall da escalação automática.
  const auto = autoLineup(CAREER.squad, f, false);
  const titulares = new Set(CAREER.lineup.starters.filter(Boolean));
  let best = null;
  auto.starters.forEach((id, i) => {
    if (!id || id === CAREER.lineup.starters[i] || titulares.has(id)) return;
    const entra = comissaoJogador(id), sai = comissaoJogador(CAREER.lineup.starters[i]);
    if (!entra || entra.group !== slots[i][0]) return;
    const ganho = entra.overall - (sai ? sai.overall : 0);
    if (ganho > 0 && (!best || ganho > best.ganho)) best = { i, entra, sai, ganho };
  });
  if (best) return troca(best.i, best.sai, best.entra, `${comissaoNome(best.entra)} (${best.entra.overall}) rende mais que ${comissaoNome(best.sai)} (${best.sai ? best.sai.overall : "—"}) nesta posição.`, `+${best.ganho} de overall na posição`);
  return { estado: "manter", resumo: "Manter escalação atual", motivo: "Os titulares estão disponíveis e descansados para esta formação." };
}

function comissaoForca(lineup, club) {
  const original = CAREER.lineup;
  CAREER.lineup = { ...original, formation: lineup.formation, starters: lineup.starters, bench: lineup.bench };
  try { return computeHumanStrength(club); } finally { CAREER.lineup = original; }
}

function comissaoProximoJogo() {
  const round = CAREER.currentRound;
  if (round > 38) return null;
  const fx = (CAREER.schedule[round] || []).find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
  if (!fx) return null;
  const casa = String(fx.home) === String(CAREER.clubId);
  return { adversarioId: casa ? fx.away : fx.home, casa, rodada: round };
}

function comissaoFormacao(jogo) {
  const myClub = teamById(CAREER.clubId), opp = teamById(jogo.adversarioId);
  if (!myClub || !opp || !opp.atk || !opp.def) return { estado: "sem-dados" };
  const razao = (s) => {
    const l = motorPartida().goalLambdas(jogo.casa ? s : { atk: opp.atk, def: opp.def }, jogo.casa ? { atk: opp.atk, def: opp.def } : s);
    return jogo.casa ? l.home / l.away : l.away / l.home;
  };
  const atual = CAREER.lineup.formation;
  const avaliar = (f) => { const a = autoLineup(CAREER.squad, f, false); const s = comissaoForca({ formation: f, starters: a.starters, bench: a.bench }, myClub); return { f, a, s, r: razao(s) }; };
  const base = avaliar(atual);
  let best = base;
  Object.keys(FORMATIONS).forEach((f) => { if (f === atual) return; const v = avaliar(f); if (v.r > best.r) best = v; });
  if (best.f === atual || best.r < base.r * COMISSAO_FORMACAO_GANHO) {
    return { estado: "manter", resumo: "Manter formação atual", motivo: `O ${atual} é a melhor formação para os jogadores disponíveis contra o ${opp.name}.` };
  }
  const pct = (x, y) => Math.round((x / y - 1) * 100);
  const atk = pct(best.s.atk, base.s.atk), def = pct(base.s.def, best.s.def);
  const ganhos = [atk > 0 ? `ataque +${atk}%` : null, def > 0 ? `defesa +${def}%` : null].filter(Boolean);
  const titularesAgora = new Set(CAREER.lineup.starters.filter(Boolean));
  const novos = new Set(best.a.starters.filter(Boolean));
  const entram = best.a.starters.filter((id) => id && !titularesAgora.has(id)).map((id) => comissaoNome(comissaoJogador(id)));
  const saem = CAREER.lineup.starters.filter((id) => id && !novos.has(id)).map((id) => comissaoNome(comissaoJogador(id)));
  return {
    estado: "mudanca", resumo: `${best.f} para este jogo`,
    motivo: `Com os jogadores disponíveis, o ${best.f} rende mais que o ${atual} contra o ${opp.name}${ganhos.length ? ` (${ganhos.join(", ")})` : ""}.`,
    nota: `Gols esperados a favor/contra: ${Math.round((best.r / base.r - 1) * 100)}% melhor`,
    detalhe: { de: atual, para: best.f, entram, saem, starters: best.a.starters, bench: best.a.bench },
  };
}

function comissaoPostura(jogo) {
  const myClub = teamById(CAREER.clubId), opp = teamById(jogo.adversarioId);
  if (!myClub || !opp || !opp.atk || !opp.def) return { estado: "sem-dados" };
  // Mesma conta de suggestTactics (força bruta do catálogo, sem mando).
  const ratio = (myClub.atk * opp.def) / (opp.atk * myClub.def);
  const nivel = ratio > 1.15 ? 4 : ratio < 0.87 ? 2 : 3;
  const motivo = nivel === 4 ? `Seu time é favorito contra o ${opp.name}.` : nivel === 2 ? `O ${opp.name} é favorito neste confronto.` : `Times parelhos contra o ${opp.name}.`;
  const eixos = ["ritmo", "pressao", "linhaDefensiva"];
  const t = CAREER.lineup.tactics || {};
  const antes = Object.fromEntries(eixos.map((id) => [id, t[id] || 3]));
  if (eixos.every((id) => antes[id] === nivel)) return { estado: "manter", resumo: "Manter postura atual", motivo: `${COMISSAO_POSTURAS[nivel]} já está aplicada. ${motivo}` };
  return {
    estado: "mudanca", resumo: `${COMISSAO_POSTURAS[nivel]} para começar`, motivo,
    nota: `Ritmo, pressão e linha defensiva no nível ${nivel}`,
    detalhe: { nivel, nome: COMISSAO_POSTURAS[nivel], antes },
  };
}

function comissaoChave(cat, item) {
  const l = CAREER.lineup;
  const estado = cat === "postura" ? JSON.stringify(l.tactics || {}) : JSON.stringify([l.formation, l.starters, l.bench]);
  return JSON.stringify([cat, item.estado, item.detalhe || null, estado]);
}

function comissaoRecomendacoes() {
  const contratada = !!(CAREER.technicalStaff && CAREER.technicalStaff.hired);
  if (!contratada) return { contratada, jogo: null, itens: [] };
  const jogo = comissaoProximoJogo();
  if (!jogo) return { contratada, jogo: null, itens: [] };
  const opp = teamById(jogo.adversarioId);
  const itens = [["escalacao", comissaoEscalacao()], ["formacao", comissaoFormacao(jogo)], ["postura", comissaoPostura(jogo)]]
    .map(([cat, item]) => ({ categoria: cat, ...item, chave: comissaoChave(cat, item) }));
  return { contratada, jogo: { adversario: opp ? opp.name : "", casa: jogo.casa, rodada: jogo.rodada }, itens };
}

function ponteOpcoesEmprestimo(duracao, clausula, valorClausula) {
  if (!["temporada", "meia"].includes(duracao) || !["nenhuma", "opcional", "obrigatoria"].includes(clausula)) return null;
  const buyValue = Math.max(0, Math.round(Number(valorClausula) || 0));
  const buyOption = clausula === "nenhuma" ? null : { mandatory: clausula === "obrigatoria", value: buyValue };
  const returnRound = duracao === "meia" ? Math.min(CAREER.currentRound + LOAN_HALF_SEASON_ROUNDS, 38) : null;
  return { returnRound, buyOption };
}

Object.assign(window.BRDATA_PONTE, {
    async renovar(id, salario, anos) {
      const p = CAREER && CAREER.squad.find((x) => x.id === id);
      if (!p) return { ok: false, motivo: "jogador-invalido" };
      if (!isContractExpiring(p)) return { ok: false, motivo: "fora-do-prazo" };
      const newWage = Math.max(0, Math.round(Number(salario) || 0));
      const duration = Math.round(Number(anos));
      if (!(duration >= 1 && duration <= 5)) return { ok: false, motivo: "duracao-invalida" };
      const v = renewalVerdict(p, newWage, duration);
      if (v && v.motivo === "teto") return { ok: false, motivo: "teto", mensagem: v.texto };
      if (v) {
        firePressConference("19", CAREER.currentRound, false);
        return { ok: true, aceita: false, motivo: v.texto, salario: newWage, anos: duration, coletiva: !!PENDING_PRESS };
      }
      p.wage = Math.max(p.wage, newWage);
      p.contractUntil = CAREER.seasonYear + duration;
      const r = await ponteGravar();
      return r.ok ? { ok: true, aceita: true, salario: p.wage, anos: duration, ate: p.contractUntil } : r;
    },
    coletivaAtual() {
      const e = PENDING_PRESS && PENDING_PRESS.entry;
      return e ? { ok: true, pergunta: e.pergunta, respostas: e.respostas.map((r) => ({ letra: r.letra, texto: r.texto })) } : { ok: false, motivo: "sem-coletiva" };
    },
    async conversar(id, opcao) {
      const p = CAREER && CAREER.squad.find((x) => x.id === id);
      if (!p) return { ok: false, motivo: "jogador-invalido" };
      if (!canTalkTo(p)) return { ok: false, motivo: "sem-conversa" };
      if (!["apoiar", "prometer", "cobrar"].includes(opcao)) return { ok: false, motivo: "opcao-invalida" };
      const fx = applyTalkEffect(p, opcao);
      const r = await ponteGravar();
      return r.ok ? { ok: true, efeito: fx.applied, texto: fx.resultText, moral: p.morale } : r;
    },
    mercado() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const w = transferWindowStatus(CAREER.currentRound);
      const texto = w.open
        ? (w.closesLabel ? `Janela aberta ${w.closesLabel}` : w.closesAtRound ? `Janela aberta até a rodada ${w.closesAtRound}` : "Janela aberta")
        : (w.opensLabel ? `Janela fechada · ${w.opensLabel}` : w.opensAtRound ? `Janela fechada · reabre na rodada ${w.opensAtRound}` : "Janela fechada · próxima temporada");
      const recusaEmprestimo = [];
      Object.values(CAREER.leagueSquads || {}).forEach((sq) => sq.forEach((p) => { if (isLoanOutRefused(p)) recusaEmprestimo.push(String(p.id)); }));
      CAREER.squad.forEach((p) => { if (isLoanOutRefused(p)) recusaEmprestimo.push(String(p.id)); });
      return {
        ok: true, janela: { aberta: !!w.open, texto }, multi: CAREER.marketScope === "multi",
        clubes: marketTeamsPool().map((t) => ({ id: String(t.id), nome: t.name, sigla: t.short || null, divisao: t.competitionId || CURRENT_COMPETITION_ID })),
        desconto: CAREER.nextSigningDiscountPct || 0, parcelas: [1, 2, 3, 4], esperaRodadas: OFFER_WAIT_ROUNDS,
        recusaEmprestimo,
      };
    },
    async fazerProposta(clubId, playerId, valor, parcelas) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (!transferWindowStatus(CAREER.currentRound).open) return { ok: false, motivo: "janela-fechada", mensagem: "Janela de contratações encerrada — não dá pra propor agora." };
      if (pendingOfferOutFor(playerId)) return { ok: false, motivo: "ja-proposta", mensagem: "Você já tem uma proposta por esse jogador." };
      if (![1, 2, 3, 4].includes(Number(parcelas))) return { ok: false, motivo: "parcelas-invalidas" };
      const r = submitOfferOut(String(clubId), playerId, valor, parcelas);
      if (!r.ok) return { ok: false, motivo: r.motivo, mensagem: r.texto };
      const g = await ponteGravar();
      return g.ok ? { ok: true, id: r.offer.id, valor: r.value } : g;
    },
    async aumentarProposta(offerId, valor) {
      const o = CAREER && (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
      if (!o) return { ok: false, motivo: "proposta-invalida" };
      const v = Math.round(Number(valor) || 0);
      if (v <= o.offerValue) return { ok: false, motivo: "valor-baixo", mensagem: `A nova proposta precisa ser maior que ${fmtBRL(o.offerValue)}.` };
      increaseOffer(offerId, v);
      return ponteGravar();
    },
    async retirarProposta(offerId) {
      if (!CAREER || !(CAREER.pendingOffersOut || []).some((x) => x.id === offerId)) return { ok: false, motivo: "proposta-invalida" };
      withdrawOffer(offerId);
      return ponteGravar();
    },
    previaCompra(offerId) {
      const o = CAREER && (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
      if (!o || o.counterValue == null) return { ok: false, motivo: "proposta-invalida" };
      const p = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
      if (!p) return { ok: false, motivo: "indisponivel", mensagem: `${abbreviateName(o.playerName)} não está mais disponível.` };
      const valor = o.counterValue;
      const perInstallment = Math.round(valor / o.installments / 1000) * 1000;
      const primeira = o.installments === 1 ? valor : perInstallment;
      return { ok: true, valor, parcelas: o.installments, porParcela: perInstallment, primeira, caixaAntes: CAREER.finances.cash, caixaDepois: CAREER.finances.cash - primeira,
        folhaAntes: wageBillOf(CAREER.squad), folhaDepois: wageBillOf(CAREER.squad) + p.wage, teto: CAREER.finances.wageCap };
    },
    async aceitarContraproposta(offerId) {
      const o = CAREER && (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
      if (!o || o.counterValue == null) return { ok: false, motivo: "proposta-invalida" };
      const r = acceptCounterOffer(offerId) || { ok: false, texto: null };
      const g = await ponteGravar();
      if (!g.ok) return g;
      return { ok: true, comprado: !!r.ok, mensagem: r.ok ? null : r.texto, coletiva: !!(r.ok && PENDING_PRESS) };
    },
    async anunciar(playerId, valor) {
      const p = CAREER && CAREER.squad.find((x) => x.id === playerId);
      if (!p) return { ok: false, motivo: "jogador-invalido" };
      if (listingFor(playerId)) return { ok: false, motivo: "ja-anunciado", mensagem: "Esse jogador já está à venda." };
      if (p.origin !== "principal") return { ok: false, motivo: "nao-principal", mensagem: "Só jogadores do elenco principal podem ser anunciados." };
      if (CAREER.squad.filter((x) => x.origin === "principal").length <= 14) return { ok: false, motivo: "minimo", mensagem: "O elenco principal não pode ficar com menos de 14 jogadores." };
      const l = createListing(p, valor);
      const g = await ponteGravar();
      return g.ok ? { ok: true, id: l.id, valor: l.askingValue } : g;
    },
    async retirarAnuncio(listingId) {
      if (!CAREER || !(CAREER.pendingListings || []).some((l) => l.id === listingId)) return { ok: false, motivo: "anuncio-invalido" };
      cancelListing(listingId);
      return ponteGravar();
    },
    previaVenda(listingId, offerId) {
      const l = CAREER && (CAREER.pendingListings || []).find((x) => x.id === listingId);
      const o = l && l.offers.find((x) => x.id === offerId);
      if (!o) return { ok: false, motivo: "proposta-invalida" };
      const p = CAREER.squad.find((x) => x.id === l.playerId);
      const perInstallment = Math.round(o.value / o.installments / 1000) * 1000;
      const primeira = o.installments === 1 ? o.value : perInstallment;
      return { ok: true, valor: o.value, parcelas: o.installments, porParcela: perInstallment, primeira, caixaAntes: CAREER.finances.cash, caixaDepois: CAREER.finances.cash + primeira,
        folhaAntes: wageBillOf(CAREER.squad), folhaDepois: wageBillOf(CAREER.squad) - (p ? p.wage || 0 : 0) };
    },
    async aceitarOfertaVenda(listingId, offerId) {
      const r = CAREER ? acceptListingOffer(listingId, offerId) : null;
      if (!r) return { ok: false, motivo: "sem-carreira" };
      if (!r.ok && /não encontrad/.test(r.texto)) return { ok: false, motivo: "proposta-invalida" };
      const g = await ponteGravar();
      if (!g.ok) return g;
      return { ok: true, vendido: !!r.ok, mensagem: r.ok ? null : r.texto, coletiva: !!(r.ok && PENDING_PRESS) };
    },
    async recusarOfertaVenda(listingId, offerId) {
      const l = CAREER && (CAREER.pendingListings || []).find((x) => x.id === listingId);
      if (!l) return { ok: false, motivo: "anuncio-invalido" };
      const ids = offerId ? [offerId] : l.offers.map((o) => o.id);
      if (!ids.length || ids.some((id) => !l.offers.some((o) => o.id === id))) return { ok: false, motivo: "proposta-invalida" };
      ids.forEach((id) => rejectListingOffer(listingId, id));
      return ponteGravar();
    },
    prepararEmprestimo(playerId) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (!transferWindowStatus(CAREER.currentRound).open) return { ok: false, motivo: "janela-fechada", mensagem: "Janela de contratações encerrada — não dá pra negociar empréstimo agora." };
      const p = CAREER.squad.find((x) => x.id === playerId);
      if (!p) return { ok: false, motivo: "jogador-invalido" };
      if (p.origin !== "principal") return { ok: false, motivo: "nao-principal", mensagem: "Só dá pra emprestar jogador do elenco principal." };
      if (CAREER.squad.filter((x) => x.origin === "principal").length <= 14) return { ok: false, motivo: "minimo", mensagem: "O elenco principal não pode ficar com menos de 14 jogadores." };
      if (isLoanOutRefused(p)) return { ok: false, motivo: "recusa", mensagem: `${abbreviateName(p.name)} não aceita ser emprestado — quer continuar brigando por espaço no elenco principal.` };
      const buyer = findInterestedBuyer(CAREER.clubId, p);
      if (!buyer) { PONTE.emprestimo = null; return { ok: false, motivo: "sem-interessado", mensagem: `Nenhum time demonstrou interesse em pegar ${abbreviateName(p.name)} emprestado agora.` }; }
      PONTE.emprestimo = { playerId, buyer };
      const taxa = (meia) => Math.round((p.value * 0.10 * (meia ? 0.5 : 1)) / 1000) * 1000;
      return { ok: true, clube: { id: String(buyer.id), nome: buyer.name }, taxaTemporada: taxa(false), taxaMeia: taxa(true), valorMercado: p.value };
    },
    async emprestar(playerId, duracao, clausula, valorClausula) {
      if (!CAREER || !PONTE.emprestimo || PONTE.emprestimo.playerId !== playerId) return { ok: false, motivo: "sem-emprestimo" };
      if (!transferWindowStatus(CAREER.currentRound).open) return { ok: false, motivo: "janela-fechada", mensagem: "Janela de contratações encerrada — não dá pra negociar empréstimo agora." };
      const opts = ponteOpcoesEmprestimo(duracao, clausula, valorClausula);
      if (!opts) return { ok: false, motivo: "opcao-invalida" };
      const ok = await finalizeLoanOut(playerId, { ...opts, buyer: PONTE.emprestimo.buyer });
      PONTE.emprestimo = null;
      if (!ok) return { ok: false, motivo: "recusa", mensagem: "O empréstimo não foi feito." };
      return ponteGravar();
    },
    async pegarEmprestado(clubId, playerId, duracao, percentual, clausula, valorClausula) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (!transferWindowStatus(CAREER.currentRound).open) return { ok: false, motivo: "janela-fechada", mensagem: "Janela de contratações encerrada — não dá pra pegar jogador emprestado agora." };
      const p = leagueSquadFor(String(clubId)).find((x) => x.id === playerId);
      if (!p) return { ok: false, motivo: "indisponivel", mensagem: "Esse jogador não está mais disponível." };
      const pct = Number(percentual);
      if (![50, 75, 100].includes(pct)) return { ok: false, motivo: "opcao-invalida" };
      const opts = ponteOpcoesEmprestimo(duracao, clausula, valorClausula);
      if (!opts) return { ok: false, motivo: "opcao-invalida" };
      if (isLoanOutRefused(p)) return { ok: false, motivo: "recusa", mensagem: `${teamById(clubId).name} recusou emprestar ${abbreviateName(p.name)} — é peça importante demais pro clube.` };
      const loanWage = Math.round((p.wage * (pct / 100)) / 100) * 100;
      if (wageBillOf(CAREER.squad) + loanWage > CAREER.finances.wageCap) return { ok: false, motivo: "teto", mensagem: `Pegar esse jogador emprestado estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).` };
      if (CAREER.squad.length >= MAX_PRINCIPAL + 20) return { ok: false, motivo: "elenco-grande", mensagem: "Elenco já está muito grande — dispense ou negocie alguém antes." };
      const ok = await finalizeLoanIn(String(clubId), playerId, { ...opts, wagePct: pct });
      if (!ok) return { ok: false, motivo: "recusa", mensagem: "O empréstimo não foi feito." };
      const g = await ponteGravar();
      return g.ok ? { ok: true, salario: loanWage } : g;
    },
    async propostaPendente(decisao) {
      if (!CAREER || !CAREER.pendingOffer) return { ok: false, motivo: "sem-proposta" };
      if (decisao === "aceitar") acceptOffer();
      else if (decisao === "recusar") declineOffer();
      else return { ok: false, motivo: "decisao-invalida" };
      return ponteGravar();
    },
    async contratarComissao() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (CAREER.technicalStaff && CAREER.technicalStaff.hired) return { ok: false, motivo: "ja-contratada" };
      hireTechnicalStaff();
      return ponteGravar();
    },
    async demitirComissao() {
      if (!CAREER || !(CAREER.technicalStaff && CAREER.technicalStaff.hired)) return { ok: false, motivo: "sem-comissao" };
      fireTechnicalStaff();
      return ponteGravar();
    },
    estadio() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const club = teamById(CAREER.clubId);
      const st = CAREER.stadium || initialStadium();
      return {
        ok: true, nome: (club && club.venue && club.venue.name) || null, capacidade: stadiumCapacityFor(club), caixa: CAREER.finances.cash,
        obra: st.pendingUpgrade ? { id: st.pendingUpgrade.id, nome: st.pendingUpgrade.name, rodadasRestantes: st.pendingUpgrade.roundsLeft } : null,
        melhorias: STADIUM_UPGRADES.map((u) => {
          const req = u.requires ? STADIUM_UPGRADES.find((x) => x.id === u.requires) : null;
          const estado = st.completed.includes(u.id) ? "concluida" : st.pendingUpgrade && st.pendingUpgrade.id === u.id ? "em-obra"
            : u.requires && !st.completed.includes(u.requires) ? "bloqueada" : st.pendingUpgrade ? "aguardando" : "disponivel";
          return { id: u.id, nome: u.name, custo: u.cost, rodadas: u.roundsNeeded, lugares: u.capacityGain, requer: req ? req.name : null, estado };
        }),
      };
    },
    async iniciarObra(id) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const u = STADIUM_UPGRADES.find((x) => x.id === id);
      const st = CAREER.stadium;
      if (!u || !st) return { ok: false, motivo: "obra-invalida" };
      if (st.pendingUpgrade) return { ok: false, motivo: "obra-em-andamento", mensagem: "Já existe uma obra em andamento — espere terminar antes de iniciar outra." };
      if (st.completed.includes(id)) return { ok: false, motivo: "concluida", mensagem: "Essa melhoria já foi concluída." };
      if (u.requires && !st.completed.includes(u.requires)) return { ok: false, motivo: "bloqueada", mensagem: "Essa melhoria depende de outra ainda não concluída." };
      if (CAREER.finances.cash < u.cost) return { ok: false, motivo: "caixa", mensagem: `Caixa insuficiente — a obra custa ${fmtBRL(u.cost)}.` };
      startStadiumUpgrade(id);
      return ponteGravar();
    },
    async patrocinios() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      let gerou = false;
      ["master", "material"].forEach((k) => { if (!CAREER.sponsorship[k] && !CAREER.sponsorProposals[k]) { CAREER.sponsorProposals[k] = generateSponsorProposals(k); gerou = true; } });
      if (gerou) { const g = await ponteGravar(); if (!g.ok) return g; }
      const tipo = (k) => ({ tipo: k, nome: SPONSOR_KIND_LABEL[k], contrato: CAREER.sponsorship[k] || null, propostas: CAREER.sponsorship[k] ? null : CAREER.sponsorProposals[k] });
      return { ok: true, tipos: [tipo("master"), tipo("material")], totalTemporada: sponsorshipSeasonTotal() };
    },
    async assinarPatrocinio(kind, idx) {
      if (!CAREER || !["master", "material"].includes(kind)) return { ok: false, motivo: "tipo-invalido" };
      if (CAREER.sponsorship[kind]) return { ok: false, motivo: "com-contrato" };
      if (!(CAREER.sponsorProposals[kind] || [])[idx]) return { ok: false, motivo: "proposta-invalida" };
      signSponsorProposal(kind, idx);
      return ponteGravar();
    },
    olheiros() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      return {
        ok: true,
        catalogo: SCOUT_MARKET.map((c) => ({ id: c.id, nome: c.name, especialidade: c.specialty, avaliacao: c.evaluation, rede: c.network, salario: c.monthlyCost, regioes: c.regionScope === "any" ? scoutingAvailableRegions() : c.regionScope })),
        regioes: scoutingAvailableRegions().map((r) => ({ id: r, nome: REGION_LABEL[r] })),
        tipos: Object.entries(SCOUT_MISSION_TYPES).map(([id, t]) => ({ id, nome: t.label })),
        duracoes: Object.entries(SCOUT_MISSION_DURATIONS).map(([id, d]) => ({ id, nome: d.label, rodadas: d.rounds, tentativas: d.rolls })),
        permitidas: Object.fromEntries((CAREER.scouts || []).map((sc) => [sc.id, scoutAllowedRegions(sc)])),
        custoMensal: scoutsMonthlyCost(),
      };
    },
    async contratarOlheiro(marketId) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (!SCOUT_MARKET.some((c) => c.id === marketId)) return { ok: false, motivo: "olheiro-invalido" };
      if ((CAREER.scouts || []).some((s) => s.marketId === marketId)) return { ok: false, motivo: "ja-contratado", mensagem: "Esse olheiro já faz parte do seu staff." };
      hireScout(marketId);
      return ponteGravar();
    },
    async dispensarOlheiro(scoutId) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const r = releaseScout(scoutId);
      if (!r.ok) return { ok: false, motivo: r.motivo, mensagem: r.texto };
      return ponteGravar();
    },
    async enviarMissao(scoutId, regiao, tipo, posicao, duracao) {
      const scout = CAREER && (CAREER.scouts || []).find((s) => s.id === scoutId);
      if (!scout) return { ok: false, motivo: "olheiro-invalido" };
      if (scout.mission) return { ok: false, motivo: "em-missao", mensagem: "Esse olheiro já está em missão." };
      if (!SCOUT_MISSION_TYPES[tipo] || !SCOUT_MISSION_DURATIONS[duracao] || (posicao && !SCOUT_GROUP_LABEL[posicao])) return { ok: false, motivo: "opcao-invalida" };
      if (!scoutAllowedRegions(scout).includes(regiao)) return { ok: false, motivo: "regiao-invalida", mensagem: "Esse olheiro não atua nessa região." };
      startScoutMission(scoutId, regiao, { type: tipo, group: posicao || null, duration: duracao });
      return ponteGravar();
    },
    async trazerParaBase(prospectId) {
      if (!CAREER || !(CAREER.scoutMissionProspects || []).some((p) => p.id === prospectId)) return { ok: false, motivo: "prospecto-invalido" };
      recruitProspectToBase(prospectId);
      return ponteGravar();
    },
    async indicacao(id, decisao) {
      const s = CAREER && (CAREER.scoutSuggestions || []).find((x) => x.id === id);
      if (!s) return { ok: false, motivo: "indicacao-invalida" };
      if (!["propor", "recusar"].includes(decisao)) return { ok: false, motivo: "decisao-invalida" };
      CAREER.scoutSuggestions = CAREER.scoutSuggestions.filter((x) => x.id !== id);
      const g = await ponteGravar();
      return g.ok ? { ok: true, alvo: decisao === "propor" ? { clubId: String(s.clubId), playerId: s.playerId } : null } : g;
    },
    async pedirOrcamento() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const r = boardRequest();
      if (!r.ok) return { ok: false, motivo: r.motivo, espera: r.wait, mensagem: r.texto };
      const g = await ponteGravar();
      return g.ok ? { ok: true, aprovado: r.approved, aumentoTeto: r.raise, aporte: r.cashBoost, motivoTexto: r.reason, posicao: r.pos } : g;
    },
    orcamento() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const last = CAREER.lastBoardRequestRound;
      const wait = last != null && CAREER.currentRound - last < BOARD_REQUEST_COOLDOWN ? BOARD_REQUEST_COOLDOWN - (CAREER.currentRound - last) : 0;
      return { ok: true, espera: wait, decisao: CAREER.boardDecision || null, teto: CAREER.finances.wageCap, caixa: CAREER.finances.cash, intervalo: BOARD_REQUEST_COOLDOWN };
    },
    async conquistas() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const antes = JSON.stringify(CAREER.achievements || null);
      evaluateAlwaysCheckableAchievements();
      if (JSON.stringify(CAREER.achievements) !== antes) { const g = await ponteGravar(); if (!g.ok) return g; }
      return {
        ok: true, categorias: ACHIEVEMENT_CATEGORY_LABEL,
        lista: motorRegistro().ACHIEVEMENT_CATALOG.map((t) => { const e = achievementProgressFor(t.achievementId); return { id: t.achievementId, titulo: t.title, descricao: t.description, categoria: t.category, nivel: t.tier, meta: t.target, icone: t.icon, progresso: e.currentProgress || 0, desbloqueadaEm: e.unlockedAt || null }; }),
      };
    },
    pontuacaoRanking() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const { score, breakdown } = computeLeaderboardScore();
      return { ok: true, pontos: score, detalhe: breakdown, clube: CAREER.clubName };
    },
    loja() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      return { ok: true, pacotes: CREDIT_PACKAGES, itens: BOOST_ITEMS, categorias: BOOST_CATEGORY_LABEL, historico: CAREER.purchaseHistory || [] };
    },
    preferencias() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      return { ok: true, notificacoes: CAREER.notificationSettings || { partida: true, loja: false, lesao: true }, som: !!SFX_ENABLED, reputacao: CAREER.reputation == null ? 50 : CAREER.reputation };
    },
    async assistenteVisto() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      CAREER.startupWizardSeen = true;
      return ponteGravar();
    },
    async alternarNotificacao(chave) {
      if (!CAREER || !["partida", "loja", "lesao"].includes(chave)) return { ok: false, motivo: "opcao-invalida" };
      CAREER.notificationSettings = CAREER.notificationSettings || { partida: true, loja: false, lesao: true };
      CAREER.notificationSettings[chave] = !CAREER.notificationSettings[chave];
      return ponteGravar();
    },
    tatica() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const t = CAREER.lineup.tactics || {};
      const st = CAREER.lineup.sectorTactics || defaultSectorTactics();
      return {
        ok: true, formacao: CAREER.lineup.formation,
        eixos: TACTIC_AXES.map((ax) => ({ id: ax.id, nome: ax.label, baixo: ax.lowLabel, alto: ax.highLabel, nivel: t[ax.id] || 3 })),
        setores: SECTOR_IDS.map((sec) => ({ id: sec, nome: SECTOR_LABEL[sec], instrucoes: SECTOR_INSTRUCTIONS[sec].map((i) => ({ id: i.id, nome: i.label, baixo: i.lowLabel, alto: i.highLabel, nivel: (st[sec] || {})[i.id] || 3 })) })),
      };
    },
    comissaoSugestoes() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (LIVE_MATCH && !LIVE_MATCH.finished) return { ok: false, motivo: "partida" };
      return { ok: true, ...comissaoRecomendacoes() };
    },
    async comissaoAplicar(cat, chave) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (LIVE_MATCH && !LIVE_MATCH.finished) return { ok: false, motivo: "partida" };
      const atual = comissaoRecomendacoes();
      const item = atual.itens.find((i) => i.categoria === cat);
      if (!item || item.estado !== "mudanca") return { ok: false, motivo: "sem-sugestao", ...atual };
      if (item.chave !== chave) return { ok: false, motivo: "desatualizada", ...atual };
      const l = CAREER.lineup;
      let desfazer;
      if (cat === "escalacao") {
        const { slot, sai, entra } = item.detalhe;
        const benchIdx = l.bench.indexOf(entra.id);
        desfazer = { categoria: cat, slot, sai: sai ? sai.id : null, entra: entra.id, benchIdx, resumo: item.resumo };
        l.starters[slot] = entra.id;
        if (benchIdx >= 0) { if (sai) l.bench[benchIdx] = sai.id; else l.bench.splice(benchIdx, 1); }
      } else if (cat === "formacao") {
        const d = item.detalhe;
        desfazer = { categoria: cat, antes: { formation: l.formation, starters: [...l.starters], bench: [...l.bench] }, depois: { formation: d.para, starters: [...d.starters], bench: [...d.bench] }, resumo: item.resumo };
        l.formation = d.para; l.starters = [...d.starters]; l.bench = [...d.bench];
      } else {
        const d = item.detalhe;
        l.tactics = l.tactics || {};
        desfazer = { categoria: cat, antes: d.antes, nivel: d.nivel, resumo: item.resumo };
        Object.keys(d.antes).forEach((id) => { l.tactics[id] = d.nivel; });
      }
      markLineupDirty();
      const r = await ponteGravar();
      if (!r.ok) return r;
      return { ok: true, desfazer, ...comissaoRecomendacoes() };
    },
    async comissaoDesfazer(d) {
      if (!CAREER || !d) return { ok: false, motivo: "sem-carreira" };
      if (LIVE_MATCH && !LIVE_MATCH.finished) return { ok: false, motivo: "partida" };
      const l = CAREER.lineup;
      if (d.categoria === "escalacao") {
        if (l.starters[d.slot] !== d.entra || (d.benchIdx >= 0 && d.sai && l.bench[d.benchIdx] !== d.sai)) return { ok: false, motivo: "mudou" };
        l.starters[d.slot] = d.sai;
        if (d.benchIdx >= 0) { if (d.sai) l.bench[d.benchIdx] = d.entra; else l.bench.splice(d.benchIdx, 0, d.entra); }
      } else if (d.categoria === "formacao") {
        if (l.formation !== d.depois.formation || JSON.stringify(l.starters) !== JSON.stringify(d.depois.starters) || JSON.stringify(l.bench) !== JSON.stringify(d.depois.bench)) return { ok: false, motivo: "mudou" };
        l.formation = d.antes.formation; l.starters = [...d.antes.starters]; l.bench = [...d.antes.bench];
      } else if (d.categoria === "postura") {
        const t = l.tactics || {};
        if (!Object.keys(d.antes).every((id) => (t[id] || 3) === d.nivel)) return { ok: false, motivo: "mudou" };
        Object.entries(d.antes).forEach(([id, v]) => { t[id] = v; });
      } else return { ok: false, motivo: "categoria-invalida" };
      markLineupDirty();
      const r = await ponteGravar();
      if (!r.ok) return r;
      return { ok: true, ...comissaoRecomendacoes() };
    },
    async salvarTatica(eixos) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      CAREER.lineup.tactics = CAREER.lineup.tactics || {};
      TACTIC_AXES.forEach((ax) => { const v = Math.round(Number(eixos && eixos[ax.id])); if (v >= 1 && v <= 5) CAREER.lineup.tactics[ax.id] = v; });
      markLineupDirty();
      return ponteGravar();
    },
    async salvarInstrucoesSetor(setor, valores) {
      if (!CAREER || !SECTOR_INSTRUCTIONS[setor]) return { ok: false, motivo: "setor-invalido" };
      if (!CAREER.lineup.sectorTactics) CAREER.lineup.sectorTactics = defaultSectorTactics();
      SECTOR_INSTRUCTIONS[setor].forEach((i) => { const v = Math.round(Number(valores && valores[i.id])); if (v >= 1 && v <= 5) CAREER.lineup.sectorTactics[setor][i.id] = v; });
      return ponteGravar();
    },
    esquemas() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      return { ok: true, max: MAX_TACTICAL_SCHEMES, ativo: CAREER.activeSchemeId || null, lista: (CAREER.tacticalSchemes || []).map((sc) => ({
        id: sc.id, nome: sc.name, formacao: sc.formation, titulares: sc.starters.filter(Boolean).length,
        eixos: TACTIC_AXES.map((ax) => ({ id: ax.id, nome: ax.label, nivel: (sc.tactics || {})[ax.id] || 3 })),
        criadoRodada: sc.createdRound, usadoRodada: sc.lastUsedRound != null ? sc.lastUsedRound : null,
      })) };
    },
    async salvarEsquema(nome) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if ((CAREER.tacticalSchemes || []).some((sc) => sc.name.toLowerCase() === String(nome || "").trim().toLowerCase())) return { ok: false, motivo: "nome-repetido", mensagem: "Já existe um esquema com esse nome." };
      const r = saveTacticalScheme(nome);
      if (!r.ok) return { ok: false, motivo: "invalido", mensagem: r.reason };
      return ponteGravar();
    },
    async aplicarEsquema(id) {
      if (!CAREER || !applyTacticalScheme(id)) return { ok: false, motivo: "esquema-invalido" };
      return ponteGravar();
    },
    async renomearEsquema(id, nome) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const r = renameTacticalScheme(id, nome);
      if (!r.ok) return { ok: false, motivo: "invalido", mensagem: r.error };
      return ponteGravar();
    },
    async excluirEsquema(id) {
      if (!CAREER || !(CAREER.tacticalSchemes || []).some((sc) => sc.id === id)) return { ok: false, motivo: "esquema-invalido" };
      deleteTacticalScheme(id);
      return ponteGravar();
    },
    async escalarAutomaticamente(incluirBase) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const r = autoLineup(CAREER.squad, CAREER.lineup.formation, !!incluirBase);
      CAREER.lineup.starters = r.starters;
      CAREER.lineup.bench = r.bench;
      markLineupDirty();
      return ponteGravar();
    },
    marcacao() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const opp = nextOpponentId();
      if (!opp) return { ok: true, adversario: null };
      const t = teamById(opp) || {};
      const mm = CAREER.manMarking && String(CAREER.manMarking.opponentId) === String(opp) ? CAREER.manMarking : null;
      const meus = CAREER.lineup.starters.map((id) => id && CAREER.squad.find((p) => p.id === id)).filter((p) => p && p.status === "ok" && p.group !== "G")
        .map((p) => ({ id: p.id, nome: p.name, posicao: SUBPOS_LABEL[subPositionOf(p)] || null }));
      const rivais = leagueSquadFor(opp).filter((p) => p.group !== "G").sort((a, b) => b.overall - a.overall).slice(0, 5)
        .map((p) => ({ id: p.id, nome: p.name, posicao: SUBPOS_LABEL[subPositionOf(p)] || null, overall: p.overall }));
      return { ok: true, adversario: { id: String(opp), nome: t.name || "?", sigla: t.short || null }, meus, rivais, atual: mm ? { meu: mm.myPlayerId, rival: mm.rivalPlayerId } : null };
    },
    async salvarMarcacao(meuId, rivalId) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const opp = nextOpponentId();
      if (!opp) return { ok: false, motivo: "sem-jogo" };
      if (meuId == null && rivalId == null) { CAREER.manMarking = null; return ponteGravar(); }
      const m = this.marcacao();
      if (!m.meus.some((p) => p.id === meuId) || !m.rivais.some((p) => p.id === rivalId)) return { ok: false, motivo: "jogador-invalido" };
      CAREER.manMarking = { opponentId: opp, myPlayerId: meuId, rivalPlayerId: rivalId };
      return ponteGravar();
    },
    treino() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const relevant = CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan");
      const cond = (p) => (p.condition == null ? 100 : p.condition);
      const projected = projectWeekPeakFatigue();
      const folgas = [motorTreino().TRAINING_PRE_GAME_DAY, motorTreino().TRAINING_POST_GAME_DAY].filter((d) => { const e = CAREER.trainingPlan[d]; return !e || !e.foco || e.foco === "descanso"; }).length;
      return {
        ok: true,
        dias: CAREER.trainingPlan.map((e, i) => ({
          dia: i, nome: motorTreino().TRAINING_DAY_NAMES[i], jogo: i === motorTreino().TRAINING_GAME_DAY, protegido: isProtectedTrainingDay(i),
          foco: e && e.foco ? e.foco : "descanso", intensidade: e && e.intensidade ? e.intensidade : null, grupo: e && e.grupo ? e.grupo : null,
          duracao: e && e.duracao ? e.duracao : null, jogador: e && e.individualPlayerId ? e.individualPlayerId : null,
        })),
        modelo: CAREER.trainingSchemeId || null,
        modelos: motorTreino().TRAINING_SCHEMES.map((m) => ({ id: m.id, nome: m.name, descricao: m.desc })),
        aplicado: String(CAREER.trainingAppliedForRound) === calendarTurnKey(),
        duracao: { min: TRAINING_DURATION_MIN, max: TRAINING_DURATION_MAX, passo: TRAINING_DURATION_STEP, padrao: motorTreino().TRAINING_DURATION_DEFAULT },
        resumo: {
          fadigaMedia: relevant.length ? Math.round(relevant.reduce((t, p) => t + (100 - cond(p)), 0) / relevant.length) : 0,
          moral: relevant.length ? Math.round(relevant.reduce((t, p) => t + (p.morale == null ? 70 : p.morale), 0) / relevant.length) : 0,
          folgas,
        },
        elenco: relevant.map((p) => ({ id: p.id, nome: p.name, posicao: SUBPOS_LABEL[subPositionOf(p)] || null, condicao: Math.round(cond(p)), fadigaProjetada: Math.round(100 - (projected.get(p.id) ?? cond(p))) })),
      };
    },
    async salvarDiaTreino(dia, entrada) {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const i = Number(dia);
      if (!(i >= 0 && i < 7) || i === motorTreino().TRAINING_GAME_DAY) return { ok: false, motivo: "dia-invalido" };
      const e = entrada || {};
      if (!["tecnico", "fisico", "tatico", "descanso"].includes(e.foco)) return { ok: false, motivo: "foco-invalido" };
      if (e.foco === "descanso") CAREER.trainingPlan[i] = { foco: "descanso" };
      else {
        const intensidade = motorTreino().TRAINING_INTENSITY_MULT[e.intensidade] ? e.intensidade : "moderada";
        const grupo = TRAINING_GROUP_LABEL[e.grupo] ? e.grupo : "principal";
        const duracao = clamp(Math.round((Number(e.duracao) || motorTreino().TRAINING_DURATION_DEFAULT[intensidade]) / TRAINING_DURATION_STEP) * TRAINING_DURATION_STEP, TRAINING_DURATION_MIN, TRAINING_DURATION_MAX);
        const entry = { foco: e.foco, intensidade, grupo, duracao };
        if (grupo === "individual") {
          if (!CAREER.squad.some((p) => p.id === e.jogador)) return { ok: false, motivo: "jogador-invalido" };
          entry.individualPlayerId = e.jogador;
        }
        CAREER.trainingPlan[i] = entry;
      }
      CAREER.trainingSchemeId = null;
      return ponteGravar();
    },
    async aplicarTreino() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const gains = applyWeeklyTraining();
      if (!gains) return { ok: false, motivo: "ja-aplicado" };
      const r = await ponteGravar();
      return r.ok ? { ok: true, evoluiram: gains.size } : r;
    },
    historicoTreinador() {
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const rep = CAREER.reputation == null ? 50 : CAREER.reputation;
      const hist = CAREER.seasonHistory || [];
      const titulos = [];
      (CAREER.seasonAwards || []).forEach((a) => {
        if (a.brasileirao && a.brasileirao.campeao != null && String(a.brasileirao.campeao) === String(CAREER.clubId)) titulos.push({ ano: a.seasonYear, competicao: "brasileirao" });
        if (a.copaDoBrasil && a.copaDoBrasil.disputou && String(a.copaDoBrasil.campeao) === String(CAREER.clubId)) titulos.push({ ano: a.seasonYear, competicao: "copa" });
      });
      const conquistas = (CAREER.achievements || []).filter((a) => a.unlockedAt).map((a) => {
        const tpl = motorRegistro().ACHIEVEMENT_CATALOG.find((t) => t.achievementId === a.achievementId);
        return tpl ? { id: a.achievementId, titulo: tpl.title, data: a.unlockedAt } : null;
      }).filter(Boolean).sort((x, y) => y.data - x.data);
      return {
        ok: true, nome: (ME && ME.name) || null, reputacao: rep, status: reputationLabel(rep), conquistasTotal: motorRegistro().ACHIEVEMENT_CATALOG.length,
        atual: { nome: CAREER.clubName, temporadas: hist.length, melhorPosicao: hist.length ? Math.min(...hist.map((h) => h.position)) : null, titulos: titulos.length },
        anteriores: (CAREER.clubHistory || []).map((h) => ({ nome: h.clubName, temporadas: h.seasons, titulos: h.titles, posicaoMedia: h.avgPosition, saida: h.reason })),
        titulos, conquistas,
      };
    },
});
