// Cópia congelada do carreira.js de ANTES da etapa G1b (10/11): os comandos de
// partida, pós-jogo, semana e temporada da ponte e as funções de condução da
// página que eles usavam, que foram para public/js/motor/jogo.js, tal e qual.
// Referência do test_motor_jogo.js: não editar.

const CUP_PHASE_LABEL = { fase1: "1ª fase", r32: "2ª fase", r16: "Oitavas de final", qf: "Quartas de final", sf: "Semifinal", final: "Final" };

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function calendarDateLabel(w, plusDays = 0) {
  const [m, d] = w.d.split("-").map(Number);
  const dt = new Date(Date.UTC(CAREER.calendar.year, m - 1, d + plusDays));
  return `${String(dt.getUTCDate()).padStart(2, "0")}/${MONTH_SHORT[dt.getUTCMonth()]}`;
}

function simulateRound() {
  // Etapa D1: motor/aovivo.js; com jogo seu, ele abre a partida ao vivo aqui.
  return motorAoVivo().simulateRound(startLiveMatch);
}

function startLiveMatch(round, fixtures, humanFx, standingsBefore) {
  // Adversário, XI dele, os outros jogos da rodada e o LIVE_MATCH: motor/aovivo.js.
  motorAoVivo().iniciarPartida(round, fixtures, humanFx, standingsBefore);
  renderLiveMatch();
  document.getElementById("liveMatchOverlay").classList.add("open");
  playWhistle(1);
  startCrowdAmbience();
  // GE-BALANCE-001 (issue #26) — princípio de explicabilidade (CLAUDE.md
  // §45): o bônus de motivação do adversário (ver opponentMotivationMod)
  // não deve ser um efeito silencioso — avisa ANTES da partida começar,
  // só quando ele está de fato ativo pra essa sequência.
  const preMatchMotivation = opponentMotivationMod();
  if (preMatchMotivation > 1) {
    toast({ title: "Adversário motivado", detail: `Você chega com ${CAREER.currentUnbeatenStreak} jogos de invencibilidade — o rival hoje entra mais ligado para tentar frear a sequência.` }, { durationMs: 5000, type: "warn" });
  }
  scheduleNextChunk();
}

function scheduleNextChunk() {
  const lm = LIVE_MATCH;
  if (!lm || lm.finished || lm.paused) return;
  // AJUSTE (Play-by-Play v1) — "1x/2x" controla a velocidade de
  // REVELAÇÃO dos tempos (ver .mt-live-speed), não o motor por trás —
  // o cálculo de cada tempo continua sendo o mesmo de sempre, só o
  // atraso real entre um tempo e o próximo muda.
  const delay = lm.speed === 2 ? 450 : 900;
  lm.timerId = setTimeout(resolveLiveChunk, delay);
}

function pauseLiveMatch() {
  if (!LIVE_MATCH) return;
  LIVE_MATCH.paused = true;
  clearTimeout(LIVE_MATCH.timerId);
}

function resumeLiveMatch() {
  if (!LIVE_MATCH || LIVE_MATCH.finished) return;
  // AJUSTE — se ainda está no intervalo (ver resolveLiveChunk), fechar
  // substituição/tática NÃO deve destravar o 2º tempo sozinho — só o
  // botão "Prosseguir" faz isso (ver continueFromHalftime). Sem essa
  // trava, abrir e fechar o sub-modal de substituição durante o
  // intervalo já reiniciava o jogo por baixo, sem o técnico ter clicado
  // em nada.
  if (LIVE_MATCH.halftime) return;
  LIVE_MATCH.paused = false;
  scheduleNextChunk();
}

function continueFromHalftime() {
  if (!LIVE_MATCH) return;
  LIVE_MATCH.halftime = false;
  LIVE_MATCH.paused = false;
  scheduleNextChunk();
  renderLiveMatch();
}

function resolveLiveChunk() {
  const lm = LIVE_MATCH;
  if (!lm || lm.finished) return;
  // Força, gols, chances, cartões, lesões, desgaste e estatísticas do bloco:
  // motor/aovivo.js (resolverBloco), com o texto e os comentários de antes.
  const { minute, chunkEvents } = motorAoVivo().resolverBloco();
  renderLiveMatch();
  const advanceAfterChunk = () => {
    if (lm.chunkIndex >= LIVE_MATCH_CHUNK_MINUTES.length) {
      // "⏩ Pular pro fim" (ver skipLiveMatch) não espera o delay de
      // sempre — quem não quer acompanhar minuto a minuto não devia ficar
      // preso a ele.
      if (lm.skipping) finishLiveMatch(); else setTimeout(finishLiveMatch, 500);
    } else if (minute === 45 && !lm.skipping) {
      // AJUSTE (pedido do usuário: "o jogo deve pausar no intervalo e
      // aguardar que o técnico clique em prosseguir") — pausa automática
      // igual uma pausa manual (ver pauseLiveMatch), só que sem
      // depender do usuário ter aberto substituição/tática — os dois
      // continuam disponíveis normalmente durante o intervalo (é
      // exatamente quando um técnico de verdade mexeria no time), quem
      // libera o 2º tempo é o botão "Prosseguir" (ver
      // continueFromHalftime/renderLiveMatch).
      lm.paused = true;
      lm.halftime = true;
      renderLiveMatch();
    } else if (!lm.skipping) {
      scheduleNextChunk();
    }
  };
  // AJUSTE (Play-by-Play v1, documento seção 6 e Tela hifi-02) — gol
  // pausa a narrativa por um destaque em tela cheia antes de seguir
  // pro próximo tempo (nunca durante "Pular pro fim" — ninguém quer
  // ver o overlay de gol travando um avanço que o próprio técnico
  // pediu pra pular).
  const goalsThisChunk = chunkEvents.filter((e) => e.type === "gol");
  if (goalsThisChunk.length && !lm.skipping) queueGoalHighlights(goalsThisChunk, advanceAfterChunk);
  else advanceAfterChunk();
}

function queueGoalHighlights(goals, onDone) {
  const lm = LIVE_MATCH;
  lm.goalHighlightQueue = goals.slice();
  lm.goalHighlightOnDone = onDone;
  showNextGoalHighlight();
}

function showNextGoalHighlight() {
  const lm = LIVE_MATCH;
  if (!lm) return;
  if (!lm.goalHighlightQueue.length) {
    const onDone = lm.goalHighlightOnDone;
    lm.goalHighlightOnDone = null;
    if (onDone) onDone();
    return;
  }
  const e = lm.goalHighlightQueue.shift();
  renderGoalHighlight(e);
  playGoal(e.mine);
  document.getElementById("goalHighlightOverlay").classList.add("open");
  clearTimeout(lm.goalHighlightTimer);
  lm.goalHighlightTimer = setTimeout(dismissGoalHighlight, 2600);
}

function dismissGoalHighlight() {
  const lm = LIVE_MATCH;
  if (lm) clearTimeout(lm.goalHighlightTimer);
  document.getElementById("goalHighlightOverlay").classList.remove("open");
  if (!lm) return;
  showNextGoalHighlight();
}

function skipLiveMatch() {
  const lm = LIVE_MATCH;
  if (!lm || lm.finished) return;
  clearTimeout(lm.timerId);
  lm.paused = false;
  lm.skipping = true;
  // AJUSTE (Play-by-Play v1) — se um destaque de gol estiver na tela
  // no instante em que o técnico clica "Pular pro fim" (ou no X),
  // descarta a fila e o "onDone" pendente na hora — o while abaixo já
  // resolve o resto da partida de uma vez, sem precisar esperar o
  // destaque ser dispensado primeiro.
  clearTimeout(lm.goalHighlightTimer);
  lm.goalHighlightQueue = [];
  lm.goalHighlightOnDone = null;
  document.getElementById("goalHighlightOverlay").classList.remove("open");
  while (lm.chunkIndex < LIVE_MATCH_CHUNK_MINUTES.length && !lm.finished) resolveLiveChunk();
}

async function finishLiveMatch() {
  const lm = LIVE_MATCH;
  // GE-COPA-001 — mesmo motor de partida ao vivo (resolveLiveChunk/
  // pause/resume/skip/substituição/tática — tudo genérico, sem
  // depender de rodada de Brasileirão nenhuma) reaproveitado tal e
  // qual pras pernas da Copa; só o que acontece QUANDO a partida
  // termina é diferente (agregado/chaveamento em vez de tabela de
  // pontos corridos) — ver finishCupLegLive.
  if (lm.cupContext) return finishCupLegLive();
  if (lm.friendlyContext) return finishFriendlyLive(); // GE-CALENDAR-001 (B2)
  playWhistle(3);
  stopCrowdAmbience();
  // Placar na tabela, estatísticas, renda, histórico, forma, moral,
  // objetivos, evolução, fechamento da rodada e a coletiva que o jogo pede:
  // motor/aovivo.js (encerrarPartida).
  const { summary, trigger } = motorAoVivo().encerrarPartida();
  if (trigger) firePressConference(trigger.id, lm.round, true);
  document.getElementById("liveMatchOverlay").classList.remove("open");
  LIVE_MATCH = null;
  // Modo ponte: o resumo fica guardado ANTES da gravação, mesmo que ela
  // falhe — "Tentar salvar novamente" na v2 (BRDATA_PONTE.salvarDeNovo)
  // só repete o PUT deste mesmo save, sem simular nem aplicar nada de novo.
  if (V2_PONTE) PONTE.resumo = summary;
  const saved = await persistCareer();
  ponteFim(saved);
  const btn = document.getElementById("btnSimulate");
  if (!saved) { if (btn) btn.disabled = false; return; }
  renderAll();
  // Modo ponte: a v2 mostra o Resultado; o detalhe e a sequência de
  // sempre (coletiva, notícias, rodada, Copa, proposta, tabela) só seguem
  // quando ela pedir (BRDATA_PONTE.continuarPosJogo).
  if (V2_PONTE) { ponteAvisar(); return; }
  showMatchDetailModal(summary);
}

function startCupLegLive(tie, phase, leg, round) {
  // Adversário, XI dele e o LIVE_MATCH da perna: motor/posjogo.js.
  const { isHome, home, away } = motorPosJogo().iniciarPernaCopa(tie, phase, leg, round);
  renderLiveMatch();
  document.getElementById("liveMatchOverlay").classList.add("open");
  playWhistle(1);
  startCrowdAmbience();
  // Nenhum aviso de "adversário motivado" aqui — GE-BALANCE-001 é
  // deliberadamente só Brasileirão (ver opponentMotivationMod), a
  // sequência de invencibilidade não é lida nem afetada pela Copa.
  toast({ title: `Copa do Brasil — ${leg === 1 ? "Ida" : "Volta"}`, detail: `${CUP_PHASE_LABEL[phase]} contra ${isHome ? away.name : home.name}.` }, { type: "info" });
  scheduleNextChunk();
}

async function finishCupLegLive() {
  const lm = LIVE_MATCH;
  const { tie, phase, leg } = lm.cupContext;
  playWhistle(3);
  stopCrowdAmbience();
  // Placar no confronto, recuperação, renda, evolução e a decisão da fase:
  // motor/posjogo.js (encerrarPernaCopa).
  const { legScore, summaryEvents, finalResult } = motorPosJogo().encerrarPernaCopa();
  document.getElementById("liveMatchOverlay").classList.remove("open");
  LIVE_MATCH = null;
  ponteFim(await persistCareer());
  renderAll();
  // Explicabilidade (CLAUDE.md §45) — resumo por toast em vez de um
  // modal dedicado (fora de escopo — "não misturar engine com redesign
  // visual", ver checkpoint aprovado): placar da perna + o que
  // significa pro chaveamento.
  const isHomeTieNow = String(tie.home) === String(CAREER.clubId);
  const myLegGoals = isHomeTieNow ? legScore.gh : legScore.ga, oppLegGoals = isHomeTieNow ? legScore.ga : legScore.gh;
  let detail = `${myLegGoals} x ${oppLegGoals}${summaryEvents.some((e) => e.type !== "gol") ? " — ver Copa do Brasil pra detalhes de cartão" : ""}.`;
  if (leg === 2) {
    const won = String(tie.winner) === String(CAREER.clubId);
    const aggMine = isHomeTieNow ? tie.leg1.gh + tie.leg2.gh : tie.leg1.ga + tie.leg2.ga;
    const aggOpp = isHomeTieNow ? tie.leg1.ga + tie.leg2.ga : tie.leg1.gh + tie.leg2.gh;
    detail = `Agregado ${aggMine} x ${aggOpp}${tie.penalties ? " (pênaltis)" : ""} — ${won ? (phase === "final" ? "campeão da Copa do Brasil! 🏆" : "classificado") : "eliminado"}.`;
  }
  toast({ title: `Copa do Brasil — ${leg === 1 ? "Ida" : "Volta"} decidida`, detail }, { type: leg === 2 && String(tie.winner) !== String(CAREER.clubId) ? "warn" : "pos" });
  // Continua a mesma cadeia de sempre depois de "Resultados da rodada"
  // (ver btnRoundResultsContinue) — a perna ao vivo intercala ANTES
  // dela, não substitui o resto do fluxo. Carreira 2.0 (fase 4): no
  // pós-jogo da v2 a cadeia é da v2 (ponte posJogo), não destes modais.
  if (V2_PONTE && PONTE.seq) return;
  if (CAREER.pendingOffer) openPlayerOfferModal();
  else openTabelaModal();
}

function maybeStartPendingCupLegLive() {
  const cup = CAREER.cup;
  if (!cup || !cup.pendingLiveLeg) return false;
  const { phase, leg, round } = cup.pendingLiveLeg;
  const tie = (cup.ties[phase] || []).find((t) => String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId));
  cup.pendingLiveLeg = null; // limpa já — startCupLegLive é quem decide o resto
  if (!tie) return false; // defensivo, não deveria acontecer
  startCupLegLive(tie, phase, leg, round);
  return true;
}

function friendlySlotThisWeek() {
  if (!calendarOn() || !CAREER.calendar.friendlies) return null;
  return CAREER.calendar.friendlies.find((f) => f.wi === CAREER.calendar.idx && !f.played) || null;
}

function startFriendlyLive(slot) {
  commitLineupTactics();
  // Adversário (o 1º convite se nenhum foi escolhido), o que o amistoso não
  // pode mudar e o LIVE_MATCH: motor/posjogo.js.
  const { home, away } = motorPosJogo().iniciarAmistoso(slot);
  renderLiveMatch();
  document.getElementById("liveMatchOverlay").classList.add("open");
  playWhistle(1);
  startCrowdAmbience();
  toast({ title: "Amistoso", detail: `${home.name} x ${away.name} — não vale pontos.` }, { type: "info" });
  scheduleNextChunk();
}

async function finishFriendlyLive() {
  const lm = LIVE_MATCH;
  playWhistle(3);
  stopCrowdAmbience();
  // Recuperação, evolução, lesões (só metade vale), cartões e números que
  // voltam, bilheteria, resultado e a notificação: motor/posjogo.js.
  const { injuriesKept, ticket, opp } = motorPosJogo().encerrarAmistoso();
  document.getElementById("liveMatchOverlay").classList.remove("open");
  LIVE_MATCH = null;
  // O amistoso é o jogo da semana — fecha a semana (treino, prazos, mês).
  const weekTurn = runCalendarOffWeek();
  // Carreira 2.0 (fase 3): resumo da semana para a tela "Semana concluída".
  if (V2_PONTE && PONTE.antesSemana) {
    PONTE.semana = ponteResumoSemana(PONTE.antesSemana, [weekTurn], { amistososPerdidos: 0, amistoso: { adversario: opp.name, gh: lm.gh, ga: lm.ga, lesoes: injuriesKept, bilheteria: ticket } });
    PONTE.antesSemana = null;
  }
  ponteFim(await persistCareer());
  renderAll();
  toast({ title: `Amistoso: ${lm.gh} x ${lm.ga}`, detail: `Contra o ${opp.name} — não vale pontos${injuriesKept ? `; ${injuriesKept} lesão confirmada` : ""}. Semana concluída.` }, { type: lm.gh >= lm.ga ? "pos" : "info" });
}

async function goToMatch() {
  closePreMatchConfirm();
  closeAdjustLineupModal();
  commitLineupTactics();
  // AJUSTE (pedido do usuário: "vamos evoluir o método de treinos") —
  // rede de segurança: se o treinador nunca abriu a tela de Treinos
  // (ou abriu mas não clicou "Aplicar") pra essa rodada, a semana
  // configurada é aplicada aqui sozinha — idempotente (applyWeeklyTraining
  // não faz nada se já tiver sido aplicada), mesmo espírito de
  // commitLineupTactics logo acima (tática mudada sem salvar não pode
  // se perder em silêncio).
  applyWeeklyTraining();
  const btn = document.getElementById("btnSimulate");
  btn.disabled = true;
  const summary = simulateRound();
  // FASE 3 (itens 1 e 2) — existindo jogo seu na rodada, simulateRound()
  // já abriu a tela Ao Vivo e devolve o sentinela "live" — o resto do
  // fluxo (persistir/renderizar/mostrar os modais de sempre) roda
  // sozinho quando a partida termina, ver finishLiveMatch. Só reabilita
  // o botão se o fluxo antigo (sem jogo seu, ver resolveRoundInstant)
  // rodou de verdade.
  if (summary === "live") return;
  const saved = await persistCareer();
  // Se não deu pra salvar (ex.: sessão expirada — ver persistCareer),
  // não mostra o modal do jogo por cima da tela de login: ela já foi
  // trocada lá dentro, e ao logar de novo o save do servidor (sem essa
  // rodada) é recarregado mesmo.
  if (!saved) { btn.disabled = false; return; }
  renderAll();
  if (summary) showMatchDetailModal(summary);
}

function humanDivisionMove(pr) {
  const mine = (list) => list.some((t) => String(t.id) === String(CAREER.clubId));
  if (mine(pr.relegatedA)) return { text: "Rebaixado(a): Série A → Série B.", positive: false };
  if (mine(pr.promotedB)) return { text: "Acesso! Série B → Série A.", positive: true };
  if (mine(pr.relegatedB)) return { text: "Rebaixado(a): Série B → Série C.", positive: false };
  if (mine(pr.promotedC)) return { text: "Acesso! Série C → Série B.", positive: true };
  return null;
}

function ponteAvisar() {
  if (!V2_PONTE) return;
  PONTE.ouvintes.forEach((cb) => { try { cb(); } catch (err) { console.error("[ponte]", err); } });
}

function ponteFim(salvo) {
  if (!V2_PONTE) return;
  PONTE.fim = { salvo: !!salvo, erro: salvo ? null : (PONTE.erroGravacao || "falha") };
  ponteAvisar();
}

function ponteEtapaPosJogo() {
  const seq = PONTE.seq;
  if (!seq) return { etapa: "nenhuma" };
  const sm = seq.resumo;
  if (PENDING_PRESS && !seq.feitas.has("coletiva")) {
    const { entry } = PENDING_PRESS;
    return { etapa: "coletiva", pergunta: entry.pergunta, respostas: entry.respostas.map((r) => ({ letra: r.letra, texto: r.texto })) };
  }
  if (!seq.feitas.has("noticias")) {
    const feed = CAREER.newsFeed || [];
    const manchetes = feed.filter((n) => n.round === sm.round).slice(0, 3).map((n) => ({ texto: n.texto, tipo: n.type || "generico", meu: !!n.mine }));
    return {
      etapa: "noticias", rodada: sm.round, manchetes,
      financas: { salarios: sm.wagePaid || 0, patrocinio: sm.sponsorIncome || 0, parcelasPagas: sm.installmentsPaid || 0, parcelasRecebidas: sm.installmentsReceived || 0, caixa: CAREER.finances.cash },
    };
  }
  if (!seq.feitas.has("resultados")) {
    const nome = (id) => { const t = teamById(id) || {}; return { id: String(id), nome: t.name || "?" }; };
    const cup = sm.cup;
    return {
      etapa: "resultados", rodada: sm.round,
      jogos: (sm.allResults || []).map((r) => ({ mandante: nome(r.home), visitante: nome(r.away), gh: r.gh, ga: r.ga })),
      mudancas: sm.lineupChanges || [],
      copa: cup ? {
        fase: cup.phase, perna: CAREER.cup && CAREER.cup.expanded ? cup.leg : null, adiado: !!cup.deferred,
        jogos: (cup.results || []).filter((t) => !(cup.deferred && (String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId)))).map((t) => {
          const sc = CAREER.cup && CAREER.cup.expanded ? (cup.leg === 1 ? t.leg1 : t.leg2) : t;
          return { mandante: nome(t.home), visitante: nome(t.away), gh: sc.gh, ga: sc.ga, penaltis: (!(CAREER.cup && CAREER.cup.expanded) || cup.leg === 2) && !!t.penalties };
        }),
      } : null,
    };
  }
  const leg = CAREER.cup && CAREER.cup.pendingLiveLeg;
  if (leg && !seq.feitas.has("copa")) {
    const tie = (CAREER.cup.ties[leg.phase] || []).find((t) => String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId));
    const opp = tie ? teamById(String(tie.home) === String(CAREER.clubId) ? tie.away : tie.home) : null;
    return { etapa: "copa", fase: leg.phase, perna: leg.leg, adversario: opp ? opp.name : null };
  }
  const offer = CAREER.pendingOffer;
  if (offer && !seq.feitas.has("proposta")) {
    const p = CAREER.squad.find((x) => x.id === offer.playerId);
    const club = teamById(offer.clubId) || {};
    if (p) {
      return {
        etapa: "proposta",
        jogador: { id: p.id, nome: p.name, posicao: SUBPOS_LABEL[subPositionOf(p)] || null, idade: p.age != null ? p.age : null, valorMercado: p.value != null ? p.value : null },
        clube: { id: String(offer.clubId), nome: offer.clubName, sigla: club.short || null },
        valor: offer.fee, parcelas: 1,
      };
    }
  }
  return { etapa: "fim" };
}

function ponteFotoSemana() {
  return {
    condicao: new Map(CAREER.squad.map((p) => [p.id, p.condition == null ? 100 : p.condition])),
    janela: transferWindowStatus(CAREER.currentRound).open,
    caixa: CAREER.finances.cash,
  };
}

function ponteResumoSemana(antes, giros, extra) {
  const ok = giros.filter(Boolean);
  const soma = (k) => ok.reduce((t, r) => t + (r[k] || 0), 0);
  const treinadas = ok.filter((r) => r.phase !== "ferias").length;
  const sessoes = CAREER.trainingPlan
    .map((e, i) => (i !== motorTreino().TRAINING_GAME_DAY && e && e.foco ? { foco: e.foco, intensidade: e.foco === "descanso" ? null : (e.intensidade || "moderada") } : null))
    .filter(Boolean);
  const jogadores = CAREER.squad.map((p) => {
    const a = antes.condicao.has(p.id) ? antes.condicao.get(p.id) : null;
    const d = p.condition == null ? 100 : p.condition;
    return a == null ? null : { id: p.id, nome: p.name, antes: a, depois: d };
  }).filter(Boolean);
  const media = (k) => (jogadores.length ? Math.round(jogadores.reduce((t, j) => t + j[k], 0) / jogadores.length) : null);
  const win = transferWindowStatus(CAREER.currentRound);
  const week = calendarWeek();
  return {
    semanas: ok.length,
    agora: week ? { fase: CALENDAR_PHASE_LABEL[week.p], semanaDe: calendarDateLabel(week), temJogo: !!week.r } : null,
    treino: treinadas ? { semanas: treinadas, sessoes } : null,
    condicao: { mediaAntes: media("antes"), mediaDepois: media("depois"), jogadores },
    janela: win.open !== antes.janela ? { aberta: win.open, texto: win.open ? `Aberta ${win.closesLabel}` : `Fechada (${win.opensLabel})` } : null,
    salarios: soma("wagePaid"), patrocinio: soma("sponsorIncome"),
    parcelasPagas: soma("installmentsPaid"), parcelasRecebidas: soma("installmentsReceived"),
    caixa: CAREER.finances.cash,
    ...extra,
  };
}

Object.assign(window.BRDATA_PONTE, {
    iniciar() {
      if (!PONTE.pronta) return { ok: false, motivo: "carregando" };
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      const w = calendarWeek();
      if ((w && !w.r) || CAREER.currentRound > 38) return { ok: false, motivo: "sem-jogo" };
      PONTE.ultimo = null; PONTE.fim = null; PONTE.resumo = null; PONTE.posJogo = false; PONTE.erroGravacao = null;
      goToMatch();
      return { ok: true, aoVivo: !!LIVE_MATCH };
    },
    pausar() { if (LIVE_MATCH && !LIVE_MATCH.finished) { pauseLiveMatch(); ponteAvisar(); } },
    retomar() { if (LIVE_MATCH && !LIVE_MATCH.finished && !LIVE_MATCH.halftime) { resumeLiveMatch(); ponteAvisar(); } },
    continuarIntervalo() { if (LIVE_MATCH && LIVE_MATCH.halftime) continueFromHalftime(); },
    velocidade(v) { if (LIVE_MATCH) { LIVE_MATCH.speed = v === 2 ? 2 : 1; ponteAvisar(); } },
    pularParaFim() { if (LIVE_MATCH && !LIVE_MATCH.finished) skipLiveMatch(); },
    substituir(saiId, entraId) {
      const lm = LIVE_MATCH;
      if (!lm || lm.finished) return { ok: false, motivo: "sem-partida" };
      if (lm.subsUsed >= MAX_SUBS_PER_MATCH + lm.subsBonus) return { ok: false, motivo: "sem-substituicoes" };
      if (!CAREER.lineup.starters.includes(saiId)) return { ok: false, motivo: "nao-esta-em-campo" };
      const entra = CAREER.squad.find((p) => p.id === entraId);
      if (!entra || !CAREER.lineup.bench.includes(entraId) || entra.status !== "ok") return { ok: false, motivo: "reserva-indisponivel" };
      const wasHalftime = !!lm.halftime;
      pauseLiveMatch(); // o que abrir o modal fazia
      applyLiveSub(lm, saiId, entraId);
      renderLiveMatch();
      resumeLiveMatch();
      if (!wasHalftime) pauseLiveMatch();
      ponteAvisar();
      return { ok: true };
    },
    aplicarTatica({ formacao, eixos }) {
      const lm = LIVE_MATCH;
      if (!lm || lm.finished) return { ok: false, motivo: "sem-partida" };
      if (!FORMATIONS[formacao]) return { ok: false, motivo: "formacao-invalida" };
      const wasHalftime = !!lm.halftime;
      pauseLiveMatch(); // o que abrir o modal fazia
      // Os 4 eixos como o modal os montava: o valor pedido (1 a 5) ou o atual
      // (3 se faltar).
      const axes = {};
      TACTIC_AXES.forEach((ax) => {
        const v = eixos && eixos[ax.id];
        axes[ax.id] = v >= 1 && v <= 5 ? Math.round(v) : (CAREER.lineup.tactics[ax.id] || 3);
      });
      applyLiveTactics(lm, formacao, axes);
      resumeLiveMatch();
      if (!wasHalftime) pauseLiveMatch();
      ponteAvisar();
      return { ok: true };
    },
    descartar() {
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      PONTE.ultimo = null; PONTE.fim = null; PONTE.resumo = null; PONTE.posJogo = false; PONTE.erroGravacao = null;
      ponteAvisar();
      return { ok: true };
    },
    iniciarPosJogo() {
      if (!PONTE.resumo || PONTE.posJogo) return { ok: false, motivo: "sem-resumo" };
      if (!PONTE.fim || !PONTE.fim.salvo) return { ok: false, motivo: "nao-salvo" };
      PONTE.seq = { resumo: PONTE.resumo, feitas: new Set() };
      return { ok: true, ...ponteEtapaPosJogo() };
    },
    posJogo() { return ponteEtapaPosJogo(); },
    concluirEtapa(nome) {
      if (!PONTE.seq || !["noticias", "resultados"].includes(nome)) return { ok: false, motivo: "etapa-invalida" };
      PONTE.seq.feitas.add(nome);
      return { ok: true, ...ponteEtapaPosJogo() };
    },
    async responderColetiva(letra) {
      // Fase 7: também a coletiva avulsa (renovação recusada), sem
      // sequência de pós-jogo.
      if (!PENDING_PRESS) return { ok: false, motivo: "sem-coletiva" };
      const { entry, roundPlayed } = PENDING_PRESS;
      let efeito = null;
      if (letra != null) {
        efeito = applyPressEffects(entry, roundPlayed, letra);
        if (!efeito) return { ok: false, motivo: "resposta-invalida" };
      }
      PENDING_PRESS = null;
      if (PONTE.seq) PONTE.seq.feitas.add("coletiva");
      const salvo = efeito ? await persistCareer() : true;
      if (!salvo) return { ok: false, motivo: PONTE.erroGravacao || "falha" };
      return { ok: true, reputacao: efeito ? efeito.repDelta : null, moral: efeito ? efeito.moralDelta : null, ...ponteEtapaPosJogo() };
    },
    iniciarPernaCopa() {
      if (!PONTE.seq) return { ok: false, motivo: "sem-pos-jogo" };
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      PONTE.ultimo = null; PONTE.fim = null; PONTE.resumo = null; PONTE.erroGravacao = null;
      PONTE.seq.feitas.add("copa");
      if (!maybeStartPendingCupLegLive()) return { ok: false, motivo: "sem-copa" };
      return { ok: true, aoVivo: !!LIVE_MATCH };
    },
    async responderProposta(decisao) {
      if (!PONTE.seq) return { ok: false, motivo: "sem-pos-jogo" };
      if (!CAREER.pendingOffer) { PONTE.seq.feitas.add("proposta"); return { ok: true, ...ponteEtapaPosJogo() }; }
      if (decisao === "aceitar") acceptOffer();
      else if (decisao === "recusar") declineOffer();
      else if (decisao !== "depois") return { ok: false, motivo: "decisao-invalida" };
      PONTE.seq.feitas.add("proposta");
      const salvo = decisao === "depois" ? true : await persistCareer();
      if (!salvo) return { ok: false, motivo: PONTE.erroGravacao || "falha" };
      return { ok: true, ...ponteEtapaPosJogo() };
    },
    encerrarPosJogo() {
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      PONTE.seq = null; PONTE.ultimo = null; PONTE.fim = null; PONTE.resumo = null; PONTE.posJogo = false; PONTE.erroGravacao = null;
      PENDING_PRESS = null; PENDING_ROUND_SUMMARY = null;
      ponteAvisar();
      return { ok: true };
    },
    async avancarSemana(ateJogo) {
      if (!PONTE.pronta || !CAREER) return { ok: false, motivo: "carregando" };
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      const w = calendarWeek();
      if (!w || w.r || CAREER.currentRound > 38) return { ok: false, motivo: "sem-semana" };
      const fr = friendlySlotThisWeek();
      if (!ateJogo && fr && (!fr.optional || fr.opp)) return { ok: false, motivo: "amistoso" };
      if (PONTE.avancando) return { ok: false, motivo: "em-andamento" };
      PONTE.avancando = true;
      try {
        const antes = ponteFotoSemana();
        const giros = [];
        let perdidos = 0;
        do {
          const skipped = friendlySlotThisWeek();
          if (skipped) { if (!skipped.optional || skipped.opp) perdidos++; skipped.played = true; }
          const r = runCalendarOffWeek();
          if (!r) break;
          giros.push(r);
        } while (ateJogo && !(calendarWeek() || {}).r && giros.length < 60);
        const resumo = ponteResumoSemana(antes, giros, { amistososPerdidos: perdidos, amistoso: null });
        const salvo = await persistCareer();
        if (salvo) renderAll();
        return salvo ? { ok: true, resumo } : { ok: false, motivo: PONTE.erroGravacao || "falha" };
      } finally {
        PONTE.avancando = false;
      }
    },
    async escolherAmistoso(clubId) {
      const slot = friendlySlotThisWeek();
      if (!slot) return { ok: false, motivo: "sem-amistoso" };
      if (!slot.invites.includes(String(clubId))) return { ok: false, motivo: "convite-invalido" };
      slot.opp = String(clubId);
      const salvo = await persistCareer();
      return salvo ? { ok: true } : { ok: false, motivo: PONTE.erroGravacao || "falha" };
    },
    iniciarAmistoso() {
      if (!PONTE.pronta || !CAREER) return { ok: false, motivo: "carregando" };
      if (LIVE_MATCH) return { ok: false, motivo: "em-andamento" };
      const slot = friendlySlotThisWeek();
      if (!slot || (slot.optional && !slot.opp)) return { ok: false, motivo: "sem-amistoso" };
      PONTE.ultimo = null; PONTE.fim = null; PONTE.resumo = null; PONTE.posJogo = false; PONTE.erroGravacao = null;
      PONTE.semana = null;
      PONTE.antesSemana = ponteFotoSemana();
      startFriendlyLive(slot);
      return { ok: true, aoVivo: !!LIVE_MATCH };
    },
    resumoSemana() { return PONTE.semana || null; },
    async proximaTemporada() {
      if (!CAREER || CAREER.currentRound <= 38) return { ok: false, motivo: "temporada-em-andamento" };
      if (PONTE.avancando) return { ok: false, motivo: "em-andamento" };
      PONTE.avancando = true;
      try {
        const r = await advanceSeason();
        if (!r) return { ok: false, motivo: "temporada-em-andamento" };
        const salvo = await persistCareer();
        if (!salvo) return { ok: false, motivo: PONTE.erroGravacao || "falha" };
        renderAll();
        if (r.dismissed) {
          const t = CAREER.careerTotals || {};
          const titulos = (CAREER.seasonAwards || []).reduce((n, a) => n + countTitlesThisSeason(a), 0);
          return { ok: true, demitido: true, clube: CAREER.clubName, ano: r.finishedYear, posicao: r.finishedPos, meta: r.finishedGoal ? r.finishedGoal.label : null, seguidas: r.streak,
            passagem: { jogos: t.j || 0, vitorias: t.v || 0, titulos } };
        }
        const mine = r.promotionRelegation ? humanDivisionMove(r.promotionRelegation) : null;
        return {
          ok: true, demitido: false, ano: r.newYear, anoAnterior: r.finishedYear, posicao: r.finishedPos,
          metaAnterior: r.finishedGoal ? r.finishedGoal.label : null, metaBatida: !!r.goalWasMet,
          envelhecidos: CAREER.squad.length, saidas: r.humanRenewal.leavingNames.slice(),
          novosBase: r.humanRenewal.newBaseCount, contratacoes: r.humanRenewal.newPrincipalCount,
          divisao: mine ? { texto: mine.text, subiu: !!mine.positive } : null,
          meta: r.newGoal ? r.newGoal.label : null, teto: CAREER.finances.wageCap, caixa: CAREER.finances.cash,
          propostas: (CAREER.clubProposals || []).length,
        };
      } finally {
        PONTE.avancando = false;
      }
    },
    async recusarPropostaClube() {
      if (!CAREER || !(CAREER.clubProposals || []).length) return { ok: false, motivo: "sem-proposta" };
      CAREER.clubProposals = CAREER.clubProposals.slice(1);
      const salvo = await persistCareer();
      return salvo ? { ok: true } : { ok: false, motivo: PONTE.erroGravacao || "falha" };
    },
});
