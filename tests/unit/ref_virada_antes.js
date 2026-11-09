// Cópia congelada do carreira.js de ANTES da etapa F (09/11): a virada de
// temporada, a montagem da Copa e a criação de carreira (com o startCareer
// inteiro) que foram para public/js/motor/virada.js, tal e qual.
// Referência do test_motor_virada.js: não editar.

function defaultSectorTactics() {
  const out = {};
  SECTOR_IDS.forEach((sector) => {
    out[sector] = {};
    SECTOR_INSTRUCTIONS[sector].forEach((instr) => { out[sector][instr.id] = 3; });
  });
  return out;
}

const ALL_COMPETITIONS_ORDER = ["brasileirao", "serie_b", "serie_c"];

function mapPositionGroup(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s) return null;
  if (s.includes("goal") || s.includes("goleiro")) return "G";
  if (s.includes("defen") || s.includes("zagueiro") || s.includes("lateral") || s.includes("back")) return "D";
  if (s.includes("mid") || s.includes("meia") || s.includes("volante")) return "M";
  if (s.includes("attack") || s.includes("forward") || s.includes("ataque") || s.includes("atacante")) return "F";
  return null;
}

function backfillPlayerPotential(p) {
  if (p.potential != null) return;
  p.potential = derivePotentialForAdult(p.overall, p.age, seededRngFromKey(`potential-backfill:${p.id}`));
}

function buildRealPlayer(raw, club, rng) {
  const group = mapPositionGroup(raw.position) || ["D", "M", "F"][Math.floor(rng() * 3)];
  const ratingBase = raw.rating != null ? clamp((raw.rating - 5) / 4, 0, 1) : 0.5;
  const gpg = raw.games ? (raw.goals || 0) / raw.games : 0;
  const apg = raw.games ? (raw.assists || 0) / raw.games : 0;
  const prod = clamp(gpg * 3 + apg * 1.6, 0, 1);
  const clubFactor = (group === "F" || group === "M") ? club.atk : (2 - club.def);
  const overall = Math.round(clamp(56 + ratingBase * 18 + prod * 10 + (clubFactor - 1) * 10 + (rng() * 10 - 5), 42, 92));
  const atk = clamp(Math.round(overall + (group === "F" ? 6 : group === "M" ? 2 : -10) + Math.round(rng() * 6 - 3)), 30, 96);
  const def = clamp(Math.round(overall + (group === "D" || group === "G" ? 6 : -10) + Math.round(rng() * 6 - 3)), 30, 96);
  const phys = clamp(Math.round(58 + rng() * 30), 40, 92);
  // AJUSTE (pedido do usuário: "a idade de todos os atletas está
  // incorreta... buscar a idade na API, pois ela é fundamental pra
  // moral do atleta") — raw.age agora vem de verdade do fornecedor
  // (ver mapPlayerEntry em adapter.js / mapPlayerFromSquad em
  // sportmonks.js) — o sorteio 18-35 continua só como rede de
  // segurança pra quando o fornecedor não tiver esse dado (ex.: Modo
  // Exemplo sem chave configurada, ou resposta incompleta da API).
  const age = Number.isFinite(raw.age) && raw.age > 0 ? Math.round(raw.age) : 18 + Math.floor(rng() * 18);
  // Nova feature (pedido do usuário: "atributos precisam ser mais
  // reais... evolução menos agressiva") — teto de crescimento por
  // idade, ver derivePotentialForAdult (bloco de comentário grande
  // acima de buildRealPlayer).
  const potential = derivePotentialForAdult(overall, age, rng);
  return {
    id: `real_${raw.id}`, name: raw.name || "Jogador", photo: raw.photo || null,
    group, age, overall, atk, def, phys, potential,
    origin: "principal", real: true,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    // FASE 4 (item 1) — relacionamento jogador-técnico, ver bloco de
    // comentário logo acima de applyMoraleAfterMatch.
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    ...computeContractFields(overall, age, potential, rng),
  };
}

async function buildSquad(club) {
  const rng = seededRngFromKey(`squad:${club.id}:${LIVE_SEASON}`); // global de js/data.js
  const raw = await fetchRealPlayers(club.id);
  const realPlayers = raw.slice(0, MAX_PRINCIPAL).map((p) => buildRealPlayer(p, club, rng));
  const missing = Math.max(0, motorTemporada().MIN_PRINCIPAL - realPlayers.length);
  const filler = Array.from({ length: missing }, (_, i) => buildGeneratedProPlayer(club, i, rng));
  const base = Array.from({ length: 16 }, (_, i) => buildBasePlayer(club, i, rng));
  return [...realPlayers, ...filler, ...base];
}

function sponsorshipTier() {
  return motorFinancas().sponsorshipTier((CAREER.seasonHistory || [])[0], !!(CAREER.cup && CAREER.cup.championIsHuman));
}

function generateSponsorProposals(kind) {
  return motorFinancas().sponsorProposals(kind, sponsorshipTier(), Math.random);
}

function initSponsorship() {
  const sign = (kind) => {
    const p = generateSponsorProposals(kind)[0];
    return { empresa: p.empresa, valorTemporada: p.valorTemporada, temporadasRestantes: p.duracao };
  };
  CAREER.sponsorship = { master: sign("master"), material: sign("material") };
  CAREER.sponsorProposals = { master: null, material: null };
}

function advanceSponsorshipSeason() {
  ["master", "material"].forEach((kind) => {
    const deal = CAREER.sponsorship[kind];
    if (deal) {
      deal.temporadasRestantes -= 1;
      if (deal.temporadasRestantes <= 0) {
        CAREER.sponsorship[kind] = null;
        CAREER.sponsorProposals[kind] = generateSponsorProposals(kind);
      }
    } else if (!CAREER.sponsorProposals[kind]) {
      CAREER.sponsorProposals[kind] = generateSponsorProposals(kind);
    }
  });
}

function computeBoardGoal() {
  const leagueSquadsOwnDivision = Object.entries(CAREER.leagueSquads || {})
    .filter(([teamId]) => Object.prototype.hasOwnProperty.call(CAREER.standings, teamId))
    .flatMap(([, squad]) => squad);
  return motorTemporada().computeBoardGoal(CAREER.squad.filter((p) => p.origin === "principal"), leagueSquadsOwnDivision);
}

const CLUB_PROPOSAL_MIN_OVR_GAP = 3;

function maybeGenerateClubProposals() {
  CAREER.clubProposals = CAREER.clubProposals || [];
  if (CAREER.clubProposals.length) return;
  const myOverall = averageOverall(CAREER.squad.filter((p) => p.origin === "principal"));
  const reputation = CAREER.reputation == null ? 50 : CAREER.reputation;
  const rng = seededRngFromKey(`club-proposal:${CAREER.clubId}:${CAREER.seasonYear}`);
  const candidates = LEAGUE_TEAMS.filter((t) => String(t.id) !== String(CAREER.clubId)).map((t) => {
    const theirOverall = squadAvgOverallOf(t.id);
    const gap = theirOverall - myOverall;
    const reputationRequired = clamp(Math.round(55 + gap * 3), 40, 95);
    return { t, gap, reputationRequired };
  }).filter((c) => c.gap >= CLUB_PROPOSAL_MIN_OVR_GAP && reputation >= c.reputationRequired);
  if (!candidates.length) return;
  candidates.sort((a, b) => b.gap - a.gap);
  const chosen = candidates[0];
  const budgetOffered = Math.round(wageBillOf(CAREER.leagueSquads[String(chosen.t.id)] || []) * 1.35 * (0.9 + rng() * 0.3) / 1000) * 1000;
  CAREER.clubProposals.push({
    clubId: String(chosen.t.id), clubName: chosen.t.name,
    reputationRequired: chosen.reputationRequired, budgetOffered, seasonYear: CAREER.seasonYear,
  });
}

const CUP_SEED_COUNT = 4;

function setupCup(fastForwardFromRound) {
  return CAREER.serieDPool ? setupCupExpanded(fastForwardFromRound) : setupCupLegacy(fastForwardFromRound);
}

function setupCupLegacy(fastForwardFromRound) {
  const strengths = LEAGUE_TEAMS.map((t) => ({ id: t.id, avg: squadAvgOverallOf(t.id) }));
  strengths.sort((a, b) => b.avg - a.avg);
  const qualifiers = strengths.slice(0, 16).map((s) => s.id);
  const humanIn = qualifiers.some((id) => String(id) === String(CAREER.clubId));
  const rng = seededRngFromKey(`cup-draw:${CAREER.clubId}:${CAREER.seasonYear}`);
  const shuffled = shuffleWithRng(qualifiers, rng);
  const r16 = [];
  for (let i = 0; i < shuffled.length; i += 2) r16.push({ home: shuffled[i], away: shuffled[i + 1], gh: null, ga: null, winner: null, penalties: false });
  CAREER.cup = {
    expanded: false,
    active: humanIn,
    phase: "r16",
    humanAlive: humanIn,
    humanEliminatedAtRound: null,
    humanEliminatedStage: null,
    champion: null,
    championIsHuman: false,
    ties: { r16, qf: [], sf: [], final: [] },
  };
  // Módulo de Estatísticas completo — conta mais uma edição disputada
  // (histórico do clube), tanto numa virada de temporada normal quanto
  // na migração de um save antigo que nunca teve Copa (a participação
  // NESTA temporada é real nos dois casos).
  if (humanIn) {
    if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
    CAREER.careerTotals.copaEditions = (CAREER.careerTotals.copaEditions || 0) + 1;
  }
  // Migração de save no meio de uma temporada em andamento (ver
  // migrateCareerDefaults): fases cujo round já passou não podem ser
  // "jogadas de verdade" retroativamente — resolve elas por trás
  // (silent:true, sem prêmio nem log) só pra fechar o chaveamento até a
  // fase que ainda está por vir, e a Copa volta ao normal dali em diante.
  if (fastForwardFromRound != null) {
    // Copa inativa (seu clube fora dos 16) nunca é resolvida
    // (resolveCupPhase devolve null sem avançar a fase): sem o
    // `cup.active` aqui, esse laço não terminava e a página travava ao
    // carregar um save antigo depois da rodada 6 (defeito achado na etapa
    // C3, corrigido em 09/11).
    while (CAREER.cup.active && CAREER.cup.phase !== "done" && CUP_ROUNDS[CAREER.cup.phase] < fastForwardFromRound) {
      resolveCupPhase(CUP_ROUNDS[CAREER.cup.phase], { silent: true });
    }
  }
}

function setupCupExpanded(fastForwardFromRound) {
  const allTeams = ALL_TEAMS_FLAT;
  const strengths = allTeams.map((t) => ({ id: String(t.id), avg: squadAvgOverallOf(t.id) }));
  strengths.sort((a, b) => b.avg - a.avg);
  const seeds = strengths.slice(0, CUP_SEED_COUNT).map((s) => s.id);
  const seedSet = new Set(seeds);
  const others = allTeams.map((t) => String(t.id)).filter((id) => !seedSet.has(id));
  const rng = seededRngFromKey(`cup-draw:${CAREER.clubId}:${CAREER.seasonYear}`);
  const shuffled = shuffleWithRng(others, rng);
  const fase1 = [];
  for (let i = 0; i < shuffled.length; i += 2) fase1.push(freshCupTie(shuffled[i], shuffled[i + 1]));
  CAREER.cup = {
    expanded: true,
    active: true,
    phase: "fase1",
    seeds,
    pendingLiveLeg: null,
    humanAlive: true,
    humanEliminatedAtRound: null,
    humanEliminatedStage: null,
    champion: null,
    championIsHuman: false,
    ties: { fase1, r32: [], r16: [], qf: [], sf: [], final: [] },
  };
  if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
  CAREER.careerTotals.copaEditions = (CAREER.careerTotals.copaEditions || 0) + 1;
  // Mesmo espírito do fast-forward legado (ver setupCupLegacy) — fecha
  // por trás (silent) qualquer perna cujo round já passou numa
  // migração no meio da temporada.
  if (fastForwardFromRound != null) {
    let guard = 0; // defensivo — nunca deveria passar de 12 pernas (6 fases x 2)
    while (CAREER.cup.phase !== "done" && guard++ < 20) {
      const rounds = CUP_ROUNDS_EXPANDED[CAREER.cup.phase];
      const nextRound = CAREER.cup.ties[CAREER.cup.phase].some((t) => t.leg1.gh == null) ? rounds.ida : rounds.volta;
      if (nextRound >= fastForwardFromRound) break;
      resolveCupPhase(nextRound, { silent: true });
    }
  }
}

function initialStadium() {
  return { capacityBonus: 0, pendingUpgrade: null, completed: [] };
}

const MAX_SEASON_HISTORY = 15;

function renewLeagueSquad(club, squad) {
  return motorTemporada().renewLeagueSquad({
    club, squad, seasonYear: CAREER.seasonYear, minSize: minSquadSizeFor(club.id),
    evoRng: seededRngFromKey(`cpu-evo:${club.id}:${CAREER.seasonYear}`),
    rng: seededRngFromKey(`renew-league:${club.id}:${CAREER.seasonYear}`),
    env: playerBuildEnv(),
  });
}

function renewHumanSquad() {
  const r = motorTemporada().renewHumanSquad({
    club: teamById(CAREER.clubId), clubName: CAREER.clubName, squad: CAREER.squad, lineup: CAREER.lineup,
    seasonYear: CAREER.seasonYear,
    rng: seededRngFromKey(`renew-human:${CAREER.clubId}:${CAREER.seasonYear}`),
    env: playerBuildEnv(),
  });
  CAREER.squad = r.squad;
  CAREER.lineup.starters = r.starters;
  CAREER.lineup.bench = r.bench;
  return r.summary;
}

function computeSeasonAwards() {
  return motorTemporada().seasonAwards({
    rows: motorTabela().sortRows(CAREER.standings), humanClubId: CAREER.clubId, humanSquad: CAREER.squad,
    leagueSquads: CAREER.leagueSquads, teamName: (id) => teamById(id).name, cup: CAREER.cup, seasonYear: CAREER.seasonYear,
  });
}

function applySeasonAwardMoraleBoost(award) {
  motorTemporada().awardedPlayerIds(award, CAREER.clubId).forEach((id) => {
    const p = CAREER.squad.find((x) => x.id === id);
    if (p) p.morale = clamp((p.morale == null ? 70 : p.morale) + motorTemporada().AWARD_MORALE_BOOST, 0, 100);
  });
}

async function advanceSeason() {
  if (CAREER.currentRound <= 38) return null;
  const finishedYear = CAREER.seasonYear;
  const finishedPos = myLeaguePosition();
  const finishedPts = (CAREER.standings[CAREER.clubId] || {}).pts || 0;
  // FASE 1 (item 3) — checa a meta da temporada que ACABOU de terminar
  // (a que estava valendo o ano inteiro, ver CAREER.boardGoal) antes de
  // sortear a próxima; goalWasMet decide se a sequência de temporadas
  // sem bater meta reseta ou soma mais uma (ver DISMISSAL_STREAK).
  const finishedGoal = CAREER.boardGoal || computeBoardGoal();
  const goalWasMet = boardGoalMet(finishedPos, finishedGoal);
  CAREER.seasonHistory = CAREER.seasonHistory || [];
  CAREER.seasonHistory.unshift({ year: finishedYear, position: finishedPos, points: finishedPts, goalLabel: finishedGoal.label, goalWasMet });
  if (CAREER.seasonHistory.length > MAX_SEASON_HISTORY) CAREER.seasonHistory.length = MAX_SEASON_HISTORY;
  // FASE 4 (item 6) — premiações da temporada que ACABOU de terminar
  // (ver computeSeasonAwards) — guarda mesmo numa temporada de
  // demissão (ver DISMISSAL_STREAK logo abaixo), o que aconteceu NA
  // temporada vale pro hall da fama independente do que acontece com
  // o técnico depois.
  CAREER.seasonAwards = CAREER.seasonAwards || [];
  CAREER.seasonAwards.unshift(computeSeasonAwards());
  if (CAREER.seasonAwards.length > MAX_SEASON_HISTORY) CAREER.seasonAwards.length = MAX_SEASON_HISTORY;
  // FASE 4 (item 4) — reputação reflete o que ACONTECEU nessa temporada
  // mesmo quando ela termina em demissão (a penalidade de demissão em
  // si só entra depois, quando o usuário confirma "Escolher outro
  // clube" — ver endCurrentClubStint).
  applySeasonReputationDelta(goalWasMet, CAREER.seasonAwards[0]);

  // Retenção/Engajamento — igual premiações/reputação acima, o que
  // ACONTECEU nesta temporada vale independente do que vem depois
  // (mesmo numa temporada de demissão): objetivo de "termine entre os
  // 4 primeiros" e as 2 conquistas que só fazem sentido conferir no
  // FIM de uma temporada (gols/faltas acumulados o ano inteiro, ver
  // evaluateSeasonEndAchievements).
  ensureObjectivesFresh();
  const top4Obj = CAREER.objectives.season.find((o) => o.objectiveId === "obj_top4");
  if (top4Obj && top4Obj.status === "in_progress" && finishedPos <= 4) {
    top4Obj.currentProgress = top4Obj.target;
    top4Obj.status = "completed";
    toast({ title: "Objetivo concluído!", detail: top4Obj.title }, { type: "pos" });
  }
  if (finishedPos === 1) CAREER.titlesWonNacional = (CAREER.titlesWonNacional || 0) + 1;
  evaluateSeasonEndAchievements(CAREER.seasonTeamGoals || 0, CAREER.seasonTeamFouls || 0);
  evaluateAlwaysCheckableAchievements();

  CAREER.negativeSeasonsStreak = goalWasMet ? 0 : (CAREER.negativeSeasonsStreak || 0) + 1;
  // FASE 1 (item 3) — demissão: a diretoria não segue com o treinador
  // depois de DISMISSAL_STREAK temporadas seguidas sem bater a meta.
  // Não mexe em MAIS NADA do save (elenco, calendário, teto) — o fim
  // de carreira nesse clube é definitivo (ver showDismissalModal, que
  // apaga o save inteiro quando o usuário confirma).
  if (CAREER.negativeSeasonsStreak >= motorTemporada().DISMISSAL_STREAK) {
    return { dismissed: true, finishedYear, finishedPos, finishedGoal, goalWasMet, streak: CAREER.negativeSeasonsStreak };
  }

  // FASE 4 (item 5) — patrocínio: precisa rodar ANTES de setupCup()
  // resetar CAREER.cup mais abaixo (sponsorshipTier lê
  // cup.championIsHuman da temporada que ACABOU de terminar).
  // Item 4 da lista de melhorias ("compartilhar... título conquistado")
  // — mesmo motivo: guarda ANTES do reset, pro "share card" de campeão
  // da Copa (ver showSeasonModal/shareTitleCard) ainda saber quem foi
  // campeão da temporada que terminou.
  const wasCupChampion = !!(CAREER.cup && CAREER.cup.championIsHuman);
  advanceSponsorshipSeason();
  CAREER.seasonYear += 1;
  // FASE 2 (c) — empréstimos (nos dois sentidos) sempre voltam pro dono
  // de origem na virada de temporada — ANTES da renovação normal, pra
  // quem voltou também envelhecer/ter o contrato checado como qualquer
  // outro jogador do elenco (ver resolveLoanReturns).
  resolveLoanReturns();
  const humanRenewal = renewHumanSquad();
  // FASE 4 (item 6) — efeito em cascata já possível hoje: moral já
  // existe desde a Fase 2 (b), mesmo sem o sistema completo de
  // "relacionamento jogador-técnico" da Fase 4 item 1 ainda existir —
  // prêmio individual pro SEU jogador sobe a moral dele. Depois do
  // reset de moral de renewHumanSquad acima (senão o boost seria
  // parcialmente engolido pela regressão ao neutro da própria virada
  // de temporada). Patrocínio já escala sozinho com título/posição
  // (ver sponsorshipTier), sem precisar de nada extra aqui.
  applySeasonAwardMoraleBoost(CAREER.seasonAwards[0]);
  Object.keys(CAREER.leagueSquads).forEach((clubId) => {
    CAREER.leagueSquads[clubId] = renewLeagueSquad(teamById(clubId), CAREER.leagueSquads[clubId]);
  });

  // Nova feature (pedido do usuário: "reinicie o tema do
  // rebaixamento") — acesso/rebaixamento entre A/B/C + repositório da
  // Série D, ANTES do calendário/tabela da temporada nova serem
  // gerados mais abaixo (ver applyPromotionRelegation) — se o SEU
  // clube subiu ou caiu de divisão, LEAGUE_TEAMS já reflete a divisão
  // nova a partir daqui (sem efeito nenhum em carreira sem o sistema
  // ativado, ver migrateCareerDefaults).
  const promotionRelegation = await applyPromotionRelegation();

  // "Novo orçamento" (pedido do usuário) — teto recalculado pelo
  // elenco renovado; caixa NÃO reseta, transfere pro ano que vem
  // (também pedido do usuário: "com transferência para o próximo ano").
  CAREER.finances.wageCap = Math.round(wageBillOf(CAREER.squad) * 1.35 / 1000) * 1000;

  // Módulo de Estatísticas completo (pedido do usuário) — histórico de
  // campeões do campeonato: sabemos a tabela final de TODOS os clubes
  // (não só a sua), então dá pra registrar quem foi campeão/vice a
  // cada temporada — grava ANTES da tabela resetar pra próxima
  // temporada logo abaixo. seasonsPlayed conta TODA temporada
  // encerrada neste clube (mesmo além do teto de MAX_SEASON_HISTORY
  // que seasonHistory/leagueChampions guardam em detalhe).
  if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
  CAREER.careerTotals.seasonsPlayed = (CAREER.careerTotals.seasonsPlayed || 0) + 1;
  const finishedTable = sortedStandings();
  const championRow = finishedTable[0], viceRow = finishedTable[1];
  if (championRow) {
    CAREER.leagueChampions = CAREER.leagueChampions || [];
    CAREER.leagueChampions.unshift({
      year: finishedYear,
      championId: championRow.id, championName: teamById(championRow.id).name,
      viceId: viceRow ? viceRow.id : null, viceName: viceRow ? teamById(viceRow.id).name : null,
      myPosition: finishedPos,
    });
    if (CAREER.leagueChampions.length > MAX_SEASON_HISTORY) CAREER.leagueChampions.length = MAX_SEASON_HISTORY;
  }

  CAREER.schedule = motorModulo("calendario").generateAllRounds(LEAGUE_TEAMS.map((t) => t.id)); // Fase 12: motor/calendario.js
  const standings = motorTabela().emptyStandings(LEAGUE_TEAMS.map((t) => t.id));
  CAREER.standings = standings;
  CAREER.currentRound = 1;
  CAREER.resultsByRound = {};
  CAREER.recentForm = [];
  // FASE 4 (item 3) — jejum de vitória zera junto com a tabela (é "da
  // temporada", mesmo critério de CAREER.teamStats logo abaixo).
  CAREER.teamWinlessStreak = {};
  CAREER.teamStats = freshTeamStats(); // estatísticas da Estatísticas são "da temporada", zeram junto com a tabela
  // Retenção/Engajamento — contadores "desta temporada" (ver
  // evaluateSeasonEndAchievements acima) e objetivos de temporada,
  // mesmo espírito de reset dos outros campos "por temporada" logo
  // acima.
  CAREER.seasonTeamGoals = 0;
  CAREER.seasonTeamFouls = 0;
  CAREER.objectives.season = freshObjectiveList("season");
  pushTransferLog(`Início da Temporada ${CAREER.seasonYear}.`, 1);

  // FASE 1 (item 3) — meta da temporada nova, já em cima do elenco
  // RENOVADO (reflete quem saiu/chegou agora, não o elenco velho).
  CAREER.boardGoal = computeBoardGoal();
  // FASE 2 (a) — novo chaveamento da Copa do Brasil, mesmo motivo do
  // boardGoal acima (elenco renovado de todo mundo, não só o seu).
  setupCup();
  // FASE 4 (item 4) — checa proposta de outro clube pra temporada que
  // está começando agora (reputação já atualizada acima, elenco já
  // renovado nos dois lados) — ver showSeasonModal/btnSeasonContinue,
  // que abre a notificação depois do resumo da virada de temporada.
  maybeGenerateClubProposals();

  // GE-CALENDAR-001 — toda temporada nova (inclusive a 1ª de uma carreira
  // de antes do calendário) começa em janeiro, nas férias, com a folha
  // de janeiro já cobrada (12 meses por ano, ver applyCalendarMonthlyFinances).
  CAREER.calendar = buildSeasonCalendar(CAREER.seasonYear);
  CAREER.calendar.friendlies = buildFriendlySlots(CAREER.calendar);
  applyCalendarMonthlyFinances(0);
  // P0-IDS-001 — reposição de base/elenco e times vindos da Série D
  // reusam ids (`base_<clube>_<n>`, `gen_<clube>_<n>`) — garante ids
  // únicos de novo antes da temporada nova começar.
  ensureUniquePlayerIds();
  return { dismissed: false, finishedYear, finishedPos, finishedGoal, goalWasMet, newYear: CAREER.seasonYear, humanRenewal, newGoal: CAREER.boardGoal, promotionRelegation, wasCupChampion };
}

async function buildLeagueSquad(club) {
  const rng = seededRngFromKey(`league-squad:${club.id}:${LIVE_SEASON}`);
  // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das 3
  // ligas") — club.competitionId só existe pra times de OUTRA divisão
  // (ver loadOtherCompetitionsTeams); time da própria divisão não tem
  // esse campo, fetchRealPlayers já assume CURRENT_COMPETITION_ID nesse
  // caso (mesmo comportamento de sempre).
  const otherDivision = !!club.competitionId && club.competitionId !== CURRENT_COMPETITION_ID;
  const maxSquad = otherDivision ? MAX_LEAGUE_SQUAD_OTHER_DIVISION : MAX_LEAGUE_SQUAD;
  const minSquad = otherDivision ? MIN_LEAGUE_SQUAD_OTHER_DIVISION : MIN_LEAGUE_SQUAD;
  const raw = await fetchRealPlayers(club.id, club.competitionId).catch(() => []);
  const realPlayers = raw.slice(0, maxSquad).map((p) => buildRealPlayer(p, club, rng));
  const missing = Math.max(0, minSquad - realPlayers.length);
  const filler = Array.from({ length: missing }, (_, i) => buildGeneratedProPlayer(club, i, rng));
  return [...realPlayers, ...filler];
}

async function buildLeagueSquads(humanClubId, teams = LEAGUE_TEAMS) {
  const others = teams.filter((t) => String(t.id) !== String(humanClubId));
  const entries = await Promise.all(others.map(async (club) => [String(club.id), await buildLeagueSquad(club)]));
  return Object.fromEntries(entries);
}

function ensureUniquePlayerIds() {
  if (!CAREER) return 0;
  const used = new Set();
  const renames = []; // { clubId, from, to }
  const claim = (p, clubId) => {
    if (!used.has(p.id)) { used.add(p.id); return; }
    let n = 2;
    while (used.has(`${p.id}~${n}`)) n++;
    const to = `${p.id}~${n}`;
    renames.push({ clubId: clubId == null ? null : String(clubId), from: p.id, to });
    p.id = to;
    used.add(to);
  };
  (CAREER.squad || []).forEach((p) => claim(p, null));
  const squads = Object.entries(CAREER.leagueSquads || {}).sort(([a], [b]) => a.localeCompare(b));
  // Emprestados por você continuam "seus" (voltam pro seu elenco) —
  // reservam o id antes do resto do mundo.
  squads.forEach(([clubId, sq]) => sq.forEach((p) => {
    if (p.onLoanFromClubId && String(p.onLoanFromClubId) === String(CAREER.clubId)) claim(p, clubId);
  }));
  squads.forEach(([clubId, sq]) => sq.forEach((p) => {
    if (!(p.onLoanFromClubId && String(p.onLoanFromClubId) === String(CAREER.clubId))) claim(p, clubId);
  }));
  // Referências por (clube, jogador) a jogador de OUTRO clube — só a
  // ocorrência renomeada NAQUELE clube muda; jogador do seu elenco
  // renomeado (2ª cópia de um id repetido) nunca era o referenciado.
  const renamed = (clubId, id) => {
    const r = renames.find((x) => x.clubId === String(clubId) && x.from === id);
    return r ? r.to : id;
  };
  (CAREER.pendingOffersOut || []).forEach((o) => { o.playerId = renamed(o.clubId, o.playerId); });
  (CAREER.scoutSuggestions || []).forEach((sg) => { sg.playerId = renamed(sg.clubId, sg.playerId); });
  if (CAREER.manMarking && CAREER.manMarking.rivalPlayerId) {
    CAREER.manMarking.rivalPlayerId = renamed(CAREER.manMarking.opponentId, CAREER.manMarking.rivalPlayerId);
  }
  return renames.length;
}

function freshDivisionRound(teams) {
  const ids = teams.map((t) => String(t.id));
  return { schedule: motorModulo("calendario").generateAllRounds(ids), standings: motorTabela().emptyStandings(ids) };
}

function initDivisionSystem() {
  CAREER.divisionTeams = {};
  ALL_COMPETITIONS_ORDER.forEach((compId) => {
    const source = compId === CURRENT_COMPETITION_ID ? LEAGUE_TEAMS : ALL_TEAMS_FLAT.filter((t) => t.competitionId === compId);
    CAREER.divisionTeams[compId] = source.map((t) => ({ ...t, competitionId: compId }));
  });
  CAREER.serieDPool = DEMO_TEAMS_SERIE_D.map((t) => ({ ...t, competitionId: "serie_d" })); // global de js/data.js
  CAREER.otherDivisions = {};
  ALL_COMPETITIONS_ORDER.filter((id) => id !== CURRENT_COMPETITION_ID).forEach((compId) => {
    CAREER.otherDivisions[compId] = freshDivisionRound(CAREER.divisionTeams[compId]);
  });
}

function divisionStandingsFor(compId) {
  if (compId === CURRENT_COMPETITION_ID) return CAREER.standings;
  return (CAREER.otherDivisions && CAREER.otherDivisions[compId] && CAREER.otherDivisions[compId].standings) || {};
}

async function applyPromotionRelegation() {
  if (!CAREER.serieDPool) return null; // carreira sem o sistema ativado — nada a fazer
  // Fase 12, etapa 6: quem sobe, quem cai, o perdão da tradição e a força
  // de quem troca de divisão vêm do motor (motor/temporada.js); aqui só
  // se aplica a força nova nos objetos de clube e se montam as divisões.
  const dPool = CAREER.serieDPool.slice();
  const plan = motorTemporada().promotionRelegation({
    rows: { A: sortedDivisionRows("brasileirao"), B: sortedDivisionRows("serie_b"), C: sortedDivisionRows("serie_c") },
    teams: { A: CAREER.divisionTeams.brasileirao || [], B: CAREER.divisionTeams.serie_b || [], C: CAREER.divisionTeams.serie_c || [] },
    dPool,
    protectedC: CURRENT_COMPETITION_ID === "serie_c" ? CAREER.clubId : null,
    reprieveRng: {
      A: seededRngFromKey(`tradition:brasileirao:${CAREER.seasonYear}`),
      B: seededRngFromKey(`tradition:serie_b:${CAREER.seasonYear}`),
      C: seededRngFromKey(`tradition:serie_c:${CAREER.seasonYear}`),
    },
    rng: Math.random,
  });
  // GE-BALANCE-004 — os objetos de time são os mesmos de
  // CAREER.divisionTeams/serieDPool, então a força nova vai pra
  // temporada seguinte (e pro save).
  plan.strength.forEach(({ team, atk, def }) => { team.atk = atk; team.def = def; });
  const { relegatedA, promotedB, relegatedB, promotedC, relegatedC } = plan;
  const { newA, newB, newC, newDPool, teamsFor, promotedD } = plan.compose();

  const humanNewCompId = newA.some((t) => String(t.id) === String(CAREER.clubId)) ? "brasileirao"
    : newB.some((t) => String(t.id) === String(CAREER.clubId)) ? "serie_b" : "serie_c";
  const divisionChanged = humanNewCompId !== CURRENT_COMPETITION_ID;

  // Time relegado pra Série D não é mais playável — elenco dele some
  // do save (ver marketTeamsPool, que já o exclui do universo de
  // negociação); time promovido de lá ganha elenco novo (mesmo
  // fallback de sempre pra catálogo fictício, ver buildLeagueSquad —
  // sem fonte de dado real nenhuma configurada pra "serie_d"). Mantém
  // o total de elencos em CAREER.leagueSquads sempre em 59 (60 times
  // ativos - o seu), do mesmo jeito que já era antes desta mudança.
  teamsFor(relegatedC).forEach((t) => { delete CAREER.leagueSquads[String(t.id)]; });
  await Promise.all(promotedD.map(async (t) => { CAREER.leagueSquads[String(t.id)] = await buildLeagueSquad(t); }));

  CAREER.divisionTeams = {
    brasileirao: newA.map((t) => ({ ...t, competitionId: "brasileirao" })),
    serie_b: newB.map((t) => ({ ...t, competitionId: "serie_b" })),
    serie_c: newC.map((t) => ({ ...t, competitionId: "serie_c" })),
  };
  CAREER.serieDPool = newDPool.map((t) => ({ ...t, competitionId: "serie_d" }));

  if (divisionChanged) {
    // GE-BALANCE-004 — explica o contexto da força nova (CLAUDE.md §45).
    const promoted = ALL_COMPETITIONS_ORDER.indexOf(humanNewCompId) < ALL_COMPETITIONS_ORDER.indexOf(CURRENT_COMPETITION_ID);
    const divName = COMPETITION_SHORT[humanNewCompId] || humanNewCompId;
    pushNotification("posicao", promoted
      ? `Recém-promovido à ${divName}: o elenco chega abaixo da média da divisão — a diretoria espera permanência, não título.`
      : `Rebaixado à ${divName}: o elenco ainda está entre os mais fortes da divisão nesta temporada — a cobrança é pelo acesso imediato.`);
    CURRENT_COMPETITION_ID = humanNewCompId;
    CAREER.competitionId = humanNewCompId;
  }
  LEAGUE_TEAMS = CAREER.divisionTeams[CURRENT_COMPETITION_ID];
  ALL_TEAMS_FLAT = ALL_COMPETITIONS_ORDER.flatMap((id) => CAREER.divisionTeams[id]);
  CAREER.otherDivisions = {};
  ALL_COMPETITIONS_ORDER.filter((id) => id !== CURRENT_COMPETITION_ID).forEach((compId) => {
    CAREER.otherDivisions[compId] = freshDivisionRound(CAREER.divisionTeams[compId]);
  });

  return {
    relegatedA: teamsFor(relegatedA), promotedB: teamsFor(promotedB),
    relegatedB: teamsFor(relegatedB), promotedC: teamsFor(promotedC),
    relegatedC: teamsFor(relegatedC), promotedD,
    divisionChanged, newCompetitionId: humanNewCompId,
  };
}

const CALENDAR_EXTRA_MONTHS = 12 - 38 / 4;

function buildSeasonCalendar(year) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const firstMonday = new Date(jan1.getTime() + ((8 - jan1.getUTCDay()) % 7) * 86400000);
  const cupRounds = new Set(Object.values(CUP_ROUNDS_EXPANDED).flatMap((leg) => [leg.ida, leg.volta]));
  const weeks = [];
  for (let d = firstMonday; d.getUTCFullYear() === year; d = new Date(d.getTime() + 7 * 86400000)) {
    weeks.push({ d: `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`, p: CALENDAR_PHASE_BY_MONTH[d.getUTCMonth()], r: null });
  }
  let round = 1;
  weeks.forEach((w) => {
    if (w.p === "temporada" && round <= 38) {
      w.r = round;
      if (cupRounds.has(round)) w.c = 1; // semana de 2 jogos
      round++;
    }
  });
  const monthlyCosts = wageBillOf(CAREER.squad) + (CAREER.technicalStaff && CAREER.technicalStaff.hired ? technicalStaffMonthlyCost() : 0) + scoutsMonthlyCost();
  return { year, idx: 0, weeks, tvMonthly: Math.round(monthlyCosts * CALENDAR_EXTRA_MONTHS / 12 / 1000) * 1000 };
}

function resolveLoanReturns() {
  Object.keys(CAREER.leagueSquads).forEach((clubId) => {
    const returning = (CAREER.leagueSquads[clubId] || []).filter((p) => p.onLoanFromClubId && String(p.onLoanFromClubId) === String(CAREER.clubId));
    returning.forEach((p) => settleLoanOut(clubId, p));
  });
  CAREER.squad.filter((p) => p.origin === "loan").forEach((p) => settleLoanIn(p));
}

function autoLineup(squad, formation, includeBase = true) {
  const slots = FORMATIONS[formation];
  const eligible = squad.filter((p) => p.status === "ok" && (includeBase || p.origin !== "base"));
  // "loan" conta junto com "principal" aqui — jogador emprestado é
  // força de verdade do seu elenco enquanto estiver com você (mesmo
  // critério de sempre, ver computeHumanStrength/wageBillOf). Na
  // criação da carreira isso não muda nada (squad novo nunca tem
  // "loan" ainda).
  const principalPool = eligible.filter((p) => p.origin === "principal" || p.origin === "loan").sort((a, b) => b.overall - a.overall);
  const fullPool = eligible.sort((a, b) => b.overall - a.overall);
  const used = new Set();
  // Escolhe o melhor disponível pro grupo pedido; prioriza o elenco
  // principal, só desce pra base se NINGUÉM do principal tiver esse
  // grupo reconhecido (comum pro goleiro quando o fornecedor de dado
  // não informa posição — ver mapPositionGroup — sem esse fallback, a
  // escalação automática colocaria por padrão um jogador de outra
  // posição no gol); nos 2 últimos degraus, quando nem a base tem
  // ninguém daquele grupo sobrando, aceita qualquer jogador só pra não
  // deixar a vaga vazia à toa. Compartilhado entre titulares e banco.
  function pickForGroup(grp) {
    const pick = principalPool.find((p) => !used.has(p.id) && p.group === grp)
      || fullPool.find((p) => !used.has(p.id) && p.group === grp)
      || principalPool.find((p) => !used.has(p.id))
      || fullPool.find((p) => !used.has(p.id));
    if (pick) used.add(pick.id);
    return pick ? pick.id : null;
  }
  const starters = slots.map(([grp]) => pickForGroup(grp));
  // AJUSTE (pedido do usuário: "a escalação automática deve sempre
  // conter 1 goleiro, 4 defensores, 3 meias e 3 atacantes [no banco].
  // Se não tiver atletas liberados para essas posições deve-se chamar
  // atletas da base") — banco de reservas segue essa forma fixa (os
  // mesmos 11 do MAX_BENCH), independente da formação titular
  // escolhida; antes eram só "os próximos melhores do elenco
  // principal" sem nenhuma garantia de posição (um banco podia sair
  // sem reserva de goleiro nenhum). pickForGroup já cai pra base
  // sozinho no 2º degrau quando o principal não tem mais ninguém
  // daquele grupo.
  const BENCH_SHAPE = [["G", 1], ["D", 4], ["M", 3], ["F", 3]];
  const bench = BENCH_SHAPE.flatMap(([grp, count]) => Array.from({ length: count }, () => pickForGroup(grp))).filter(Boolean);
  // AJUSTE (Bloco 2 M3) — tactics nasce com os 4 eixos reais, todos
  // neutros (nível 3/5, centro da barra segmentada — ver TACTIC_AXES).
  return { formation, starters, bench, tactics: { ritmo: 3, pressao: 3, linhaDefensiva: 3, estiloPasse: 3 }, sectorTactics: defaultSectorTactics() };
}

const COMPETITION_SHORT = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };

async function startCareer(clubId) {
  const club = LEAGUE_TEAMS.find((t) => String(t.id) === String(clubId));
  if (!club) return;
  document.getElementById("clubGrid").style.opacity = "0.5";
  document.getElementById("clubGrid").style.pointerEvents = "none";
  document.getElementById("btnConfirmClub").disabled = true;
  try {
    // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das
    // 3 ligas para que transações possam ser feitas entre os 60 times
    // das Séries A, B e C") — carrega os times das OUTRAS 2
    // competições (a da própria carreira já está em LEAGUE_TEAMS) e
    // monta o elenco dos 59 outros times das 3 séries juntas, não só
    // os 19 da divisão escolhida — ver loadOtherCompetitionsTeams/
    // buildLeagueSquads. liveModeByCompetition grava a fonte de dado
    // (real ou exemplo) de CADA UMA das 3, pro mesmo tipo de trava do
    // bug "Time #xxx" (ver loadLeague) valer aqui também, competição
    // por competição, quando essa carreira for retomada depois.
    const [liveModeByCompetition, squad] = await Promise.all([
      loadOtherCompetitionsTeams(CURRENT_COMPETITION_ID),
      buildSquad(club),
    ]);
    // buildLeagueSquads depende de ALL_TEAMS_FLAT (populada por
    // loadOtherCompetitionsTeams acima) — não dá pra paralelizar com
    // ela, só com buildSquad (que não depende de nada disso).
    const leagueSquads = await buildLeagueSquads(club.id, ALL_TEAMS_FLAT);
    const formation = "4-3-3";
    const lineup = autoLineup(squad, formation);
    const schedule = motorModulo("calendario").generateAllRounds(LEAGUE_TEAMS.map((t) => t.id)); // Fase 12: motor/calendario.js
    const standings = motorTabela().emptyStandings(LEAGUE_TEAMS.map((t) => t.id));
    CAREER = {
      version: 1,
      // Etapa B (08/11): versão do save para as migrações numeradas
      // (motor/estado.js). O campo `version` acima é antigo e nunca é lido.
      schemaVersion: motorEstado().SCHEMA_VERSION,
      // BUG CORRIGIDO ("erro 400 — Formato de save inválido." toda vez
      // que tentava salvar, só em produção com dados reais, nunca no
      // Modo Exemplo): careerStore.js exige typeof clubId === "string"
      // (server/src/careerStore.js, isValidCareerShape). Com dados
      // reais (API-Sports/Sportmonks), club.id vem NÚMERO puro da API —
      // no Modo Exemplo os ids já são string ("fla", "pal"...), por
      // isso nunca reproduzia testando aqui. String() garante o mesmo
      // formato nos dois casos (o resto do código já compara clubId com
      // String() dos dois lados em todo lugar, então não muda nada além
      // de deixar de quebrar o save).
      clubId: String(club.id), clubName: club.name, clubShort: club.short || club.name.slice(0, 3).toUpperCase(),
      clubLogo: teamLogoSrc(club), clubColors: { c1: club.c1, c2: club.c2, c3: club.c3 },
      // AJUSTE (pedido do usuário: "acrescentar a Série B, C [ao Modo
      // Carreira] com dados reais") — grava em qual campeonato essa
      // carreira nasceu (ver renderCompetitionPicker/CURRENT_COMPETITION_ID)
      // pra reabrir no campeonato certo da próxima vez (ver
      // enterAfterAuth, que lê isso ANTES de chamar loadLeague de novo).
      competitionId: CURRENT_COMPETITION_ID,
      liveMode: LIVE_MODE, createdAt: Date.now(), updatedAt: Date.now(),
      // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores
      // das 3 ligas") — marca essa carreira como "mercado de 60
      // times" (toda carreira nova passa a nascer assim; carreira já
      // existente antes desta mudança fica sem esse campo — ver
      // migrateCareerDefaults — e continua com o mercado só da
      // própria divisão, por decisão do usuário, sem migração
      // automática). liveModeByCompetition grava a fonte de dado das
      // OUTRAS 2 competições (a própria já está em `liveMode` acima),
      // lido de novo em enterAfterAuth pra decidir forceDemo por
      // competição ao retomar essa carreira.
      marketScope: "multi", liveModeByCompetition,
      squad, lineup, leagueSquads,
      // AJUSTE (pedido do usuário: "vamos evoluir o método de
      // treinos") — nasce no esquema padrão "Equilíbrio Semanal" (ver
      // TRAINING_SCHEMES/defaultTrainingPlan) — nunca aplicado ainda
      // (trainingAppliedForRound null), então a 1ª "Ir para o jogo"
      // já aplica a semana padrão sozinha (ver goToMatch).
      trainingSchemeId: "equilibrio", trainingPlan: defaultTrainingPlan("equilibrio"), trainingAppliedForRound: null,
      schedule, currentRound: 1, standings, resultsByRound: {},
      // Agregado da temporada pra aba Estatísticas (gols já vêm de
      // standings[clubId].gp, não precisa duplicar aqui).
      teamStats: freshTeamStats(),
      // Módulo de Estatísticas completo — soma de TODAS as temporadas
      // nesta passagem pelo clube (nunca zera, ver tallyMatchOutcomeStats/
      // advanceSeason), sequências vivas e histórico de campeões do
      // campeonato.
      careerTotals: freshCareerTotals(), currentWinStreak: 0, currentUnbeatenStreak: 0, leagueChampions: [],
      // FASE 2 (b) — pedido do usuário: contrato/salário/valor com
      // orçamento real limitando ação (ver initialFinances/wageBillOf).
      finances: initialFinances(squad),
      // Bloco 4 (mockups brtreinadorbloco4clube.html/
      // brtreinadorbloco4pendentes.html) — mini-gráfico de caixa (tela
      // Clube) e extrato financeiro estruturado (ver pushCashSnapshot/
      // pushLedger, chamados de finishRoundTail): nascem vazios, vão se
      // populando rodada a rodada — sem histórico retroativo pra
      // reconstruir.
      cashHistory: [], financeLedger: [],
      // FASE 2 (c) — mercado de transferências (ver simulateAiTransfers/
      // maybeGenerateOffer/pushTransferLog).
      transferLog: [], pendingOffer: null,
      // FASE 3 (a) — diretoria (ver askBoard/evaluateBoardRequest).
      lastBoardRequestRound: null, boardDecision: "",
      // FASE 3 (b) — forma recente pro público do estádio (ver
      // pushRecentForm/currentAttendancePct).
      recentForm: [],
      // Bloco 4 — melhorias de estádio (mecânica nova, ver
      // STADIUM_UPGRADES/startStadiumUpgrade/tickStadiumUpgrade).
      stadium: initialStadium(),
      // Bloco 6 (mockups brtreinadorbloco6base.html/
      // brtreinadorbloco6pendentes.html) — olheiros contratados (ver
      // SCOUT_MARKET/hireScout) e promissores encontrados em missão
      // ainda não decididos (ver tickScoutMissions/
      // recruitProspectToBase): nascem vazios, sem staff nenhum de
      // cara — carreira só ganha isso se o técnico contratar.
      scouts: [], scoutMissionProspects: [],
      // Assistente de início (pedido do usuário: "criar perguntas
      // formato onboarding para o treinador montar sua formação
      // favorita, contratar comissão e olheiros e fazer tudo o que for
      // necessário para iniciar o jogo") — controla se já rodou NESTA
      // carreira (persistido, não só em memória — sobrevive a fechar o
      // navegador no meio do assistente, ver maybeOpenStartupWizard/
      // showGameScreen). Toda carreira NOVA nasce com isso false —
      // decisão do usuário: aparece toda vez (1ª carreira, "Reiniciar",
      // "Escolher outro clube"), não só uma vez por conta.
      startupWizardSeen: false,
      // FASE 3 (c) — multitemporadas (ver advanceSeason). seasonYear
      // começa em LIVE_SEASON (a temporada real dos dados) e só sobe
      // quando VOCÊ avança de temporada — LIVE_SEASON em si é fixo.
      seasonYear: LIVE_SEASON, seasonHistory: [],
      // Nova feature — Histórico de confrontos (H2H, ver finishLiveMatch).
      matchLog: [],
      // Nova feature — Meus esquemas (Bloco 2, brtreinadorbloco2pendentes.html):
      // formação+titulares+banco+táticas salvos juntos (ver
      // saveTacticalScheme/applyTacticalScheme). activeSchemeId aponta
      // pro esquema em uso agora — null = "Personalizado" (mesmo
      // conceito já usado em CAREER.trainingSchemeId no módulo de
      // Treinos), fica null sozinho quando o técnico mexe em algo
      // manualmente depois de carregar um esquema (ver markLineupDirty).
      tacticalSchemes: [], activeSchemeId: null,
      // Nova feature — Marcação individual (Bloco 2): designação vale
      // só pro PRÓXIMO jogo (ver applyManMarking/finishRoundTail, que
      // limpa depois de cada rodada — nunca fica "esquecida" de uma
      // rodada pra outra).
      manMarking: null,
      // Nova feature — Comissão Técnica (pedido do usuário: "ajudar nos
      // treinos, escalação, táticas e outras opções pra garantir que
      // sempre o melhor time estará em campo"): assistente que SUGERE,
      // o técnico decide (ver suggestLineup/suggestTraining/
      // suggestTactics/suggestMarket) — nunca decide sozinho. Custa
      // salário mensal quando contratada (technicalStaffMonthlyCost),
      // igual à folha do elenco.
      technicalStaff: { hired: false },
      // Nova feature (Bloco 3, pedido do usuário — mockups
      // brtreinadorbloco3mercado.html/brtreinadorbloco3pendentes.html)
      // — negociação de compra (ver openOfferModal/
      // resolvePendingOffersOutRound) e parcelas de contratações já
      // fechadas (ver finalizeIncomingPurchase/processPendingInstallments).
      pendingOffersOut: [],
      pendingInstallments: [],
      // Nova feature (Bloco 3, 3/4 — pedido do usuário: "colocar à
      // venda") — anúncios de venda ativos (ver openListModal/
      // resolvePendingListingsRound) e parcelas de vendas já fechadas
      // que ainda faltam RECEBER (ver acceptListingOffer/
      // processPendingReceivables — mesmo espírito de
      // pendingInstallments acima, só que o dinheiro entra em vez de
      // sair).
      pendingListings: [],
      pendingReceivables: [],
      // Nova feature (pedido do usuário: "mostrar a posição do atleta
      // e incluir um botão recusar sugestão") — "Indicações dos
      // olheiros": lista de jogadores de outros clubes com espaço real
      // de crescimento (ver searchScoutSuggestions/potential), buscada
      // sob demanda (botão "Buscar indicações", com cooldown de 1x por
      // rodada — ver lastScoutSearchRound) — aceitar abre a mesma
      // proposta real do Mercado, recusar só tira da lista.
      scoutSuggestions: [],
      lastScoutSearchRound: null,
      // FASE 4 (item 3) — jejum de vitória por time, pra manchete
      // "encerra jejum de X jogos" (ver updateWinlessStreaks).
      teamWinlessStreak: {},
      // FASE 4 (item 6) — hall da fama de premiações por temporada (ver
      // computeSeasonAwards).
      seasonAwards: [],
      // FASE 4 (item 4) — reputação e currículo são do TÉCNICO, não do
      // clube: se essa carreira nasceu de uma demissão ou de uma
      // proposta aceita (ver endCurrentClubStint), TECHNICIAN_CARRY
      // carrega reputação e histórico pra frente — "Reiniciar" e a 1ª
      // escolha de clube nascem no neutro (reputação 50, sem currículo).
      reputation: TECHNICIAN_CARRY ? TECHNICIAN_CARRY.reputation : 50,
      clubHistory: TECHNICIAN_CARRY ? TECHNICIAN_CARRY.clubHistory : [],
      clubProposals: [],
      // AJUSTE — feed navegável de notícias (ver renderNewsScreen),
      // nasce vazio (nova carreira, nenhuma rodada simulada ainda).
      newsFeed: [],
      // FASE 4 (item 2) — histórico de coletivas respondidas (ver
      // applyPressAnswer) — "tecnico.historico_coletivas" do documento.
      pressLog: [],
      metaRiskWarnedSeason: null,
      // Retenção/Engajamento (BRDataRetencaoEspecificacao) — objetivos
      // e conquistas nascem do zero numa carreira nova (ver
      // freshObjectivesState/freshAchievementsState); contadores
      // lifetime/temporada começam em 0.
      objectives: freshObjectivesState(), achievements: freshAchievementsState(),
      baseRevealedCount: 0, titlesWonNacional: 0, titlesWonCopa: 0,
      seasonTeamGoals: 0, seasonTeamFouls: 0,
      // Bloco 8 pendentes — Central de notificações (feed real, ver
      // pushNotification) + Configurações (toggles que decidem o que
      // entra nele, mesmos defaults do mockup).
      notifications: [],
      notificationSettings: { partida: true, loja: false, lesao: true },
      // Bloco 7 pendentes — Histórico de compras: registra USO real de
      // item/recompensa (ver applyDailyLoginReward), não uma compra de
      // verdade (a Loja ainda não cobra nada — ver aviso em renderLoja).
      purchaseHistory: [],
    };
    ensureUniquePlayerIds(); // P0-IDS-001 — catálogos de divisões diferentes repetem ids
    // GE-CALENDAR-001 — carreira nova começa na pré-temporada (fevereiro,
    // janela aberta); férias só existem entre uma temporada e outra.
    CAREER.calendar = buildSeasonCalendar(CAREER.seasonYear);
    CAREER.calendar.idx = Math.max(0, CAREER.calendar.weeks.findIndex((w) => w.p === "pre"));
    CAREER.calendar.friendlies = buildFriendlySlots(CAREER.calendar);
    TECHNICIAN_CARRY = null;
    // Nova feature (pedido do usuário: "reinicie o tema do
    // rebaixamento") — só carreira NOVA nasce com o sistema de acesso/
    // rebaixamento ativado (ver initDivisionSystem/migrateCareerDefaults).
    initDivisionSystem();
    // FASE 1 (item 3) — meta da diretoria da 1ª temporada, calculada
    // já com o elenco recém-montado (ver computeBoardGoal).
    CAREER.boardGoal = computeBoardGoal();
    CAREER.negativeSeasonsStreak = 0;
    // FASE 2 (a) — chaveamento da Copa do Brasil da 1ª temporada.
    setupCup();
    // FASE 4 (item 5) — contrato inicial de patrocínio/material
    // esportivo (ver initSponsorship).
    initSponsorship();
    await persistCareer();
    openFirstEntry();
  } finally {
    document.getElementById("clubGrid").style.opacity = "";
    document.getElementById("clubGrid").style.pointerEvents = "";
  }
}

function evaluateAlwaysCheckableAchievements() {
  // "Veterano" usa a data de criação da CONTA (ME), que não é do save.
  return motorRegistro().evaluateAlwaysCheckableAchievements(ME && ME.createdAt);
}

function buildFriendlySlots(cal) {
  const myComp = ALL_COMPETITIONS_ORDER.indexOf(CURRENT_COMPETITION_ID);
  const pool = marketTeamsPool().filter((t) => String(t.id) !== String(CAREER.clubId)
    && leagueSquadFor(t.id).length >= 11
    && ALL_COMPETITIONS_ORDER.indexOf(t.competitionId || CURRENT_COMPETITION_ID) >= myComp);
  const slots = [];
  const addFor = (phase, count, optional) => {
    const idxs = cal.weeks.map((w, i) => (w.p === phase ? i : -1)).filter((i) => i >= 0).slice(-count);
    idxs.forEach((wi) => {
      const rng = seededRngFromKey(`friendly:${CAREER.clubId}:${cal.year}:${wi}`);
      const invites = shuffleWithRng(pool.slice(), rng).slice(0, 3).map((t) => String(t.id));
      if (invites.length) slots.push({ wi, invites, opp: null, optional, played: false, result: null });
    });
  };
  addFor("pre", 3, false);
  addFor("pausa", 2, true);
  return slots;
}
