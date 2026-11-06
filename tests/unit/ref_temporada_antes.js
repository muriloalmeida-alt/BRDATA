// Cópia congelada das regras da virada de temporada em public/js/carreira.js
// ANTES da Fase 12, etapa 6 (06/11), tal e qual. Referência do
// test_motor_temporada.js: não editar (é o "antes" da equivalência).

function computeContractFields(overall, age, potential, rng) {
  let ageMult = 1;
  if (age <= 20) ageMult = 0.8;
  else if (age <= 23) ageMult = 1.0;
  else if (age <= 27) ageMult = 1.25;
  else if (age <= 30) ageMult = 1.0;
  else if (age <= 33) ageMult = 0.6;
  else ageMult = 0.35;
  const potBoost = potential ? 1 + clamp(potential - overall, 0, 40) / 40 * 0.5 : 1;
  const wage = Math.round(Math.pow(1.145, overall - 50) * 2500 * ageMult / 100) * 100;
  const value = Math.round(Math.pow(1.16, overall - 50) * 120000 * ageMult * potBoost / 1000) * 1000;
  const contractUntil = LIVE_SEASON + 1 + Math.floor(rng() * 4); // 1 a 4 temporadas de contrato
  return { wage, value, contractUntil };
}
function fairWageFor(p) {
  // Mesma fórmula de sempre (ver computeContractFields) só que sem
  // sortear duração de contrato nenhuma — quer só o salário "de
  // mercado" nominal pro overall/idade atual do jogador, pra comparar
  // contra o que ele realmente ganha.
  return computeContractFields(p.overall, p.age, p.potential || null, () => 0.5).wage;
}
function applySeasonMoraleReset(squad) {
  squad.forEach((p) => {
    const base = p.morale == null ? 70 : p.morale;
    let m = Math.round(base + (70 - base) * 0.3);
    if (p.origin === "principal") {
      const fair = fairWageFor(p);
      const ratio = fair ? p.wage / fair : 1;
      if (ratio < 0.85) m -= 6;
      else if (ratio > 1.15) m += 4;
    }
    p.morale = clamp(m, 0, 100);
  });
}
function derivePotentialForAdult(overall, age, rng) {
  let room;
  if (age <= 20) room = 8 + rng() * 10;       // 8-18: base jovem ainda tem margem real
  else if (age <= 23) room = 4 + rng() * 8;   // 4-12
  else if (age <= 26) room = 1 + rng() * 5;   // 1-6
  else if (age <= 29) room = rng() * 3;       // 0-3
  else room = 0;                               // 30+: sem mais espaço de crescimento por treino
  // GE-BALANCE-005 (issue #38) — quem já nasce em faixa alta tem menos
  // espaço (um 82 de 19 anos com teto 100 enchia o elenco de 90+).
  room *= highBandGainFactor(overall);
  return Math.round(clamp(overall + room, overall, 99));
}
function recordSeasonGain(p, attr, gain) {
  if (!gain) return;
  p.seasonGain = p.seasonGain || {};
  p.seasonGain[attr] = (p.seasonGain[attr] || 0) + gain;
}
function potentialDeclineFor(age, group) {
  const declineAge = group === "G" ? 32 : 30;
  if (age < declineAge) return 0;
  return Math.min(3, 1 + Math.floor((age - declineAge) / 2));
}
function youthPotentialRoll(rng, bonus) {
  return Math.round(clamp(48 + rng() * 22 + Math.pow(rng(), 8) * 22 + bonus, 35, 94));
}
function applyCpuAnnualEvolution(p, rng) {
  const declineAge = p.group === "G" ? 32 : 30;
  let delta = 0;
  if (p.age >= declineAge) {
    const expected = (0.05 + (p.age - declineAge) * 0.01) * 38;
    delta = -Math.round(expected * (0.6 + rng() * 0.8));
  } else {
    const room = (p.potential != null ? p.potential : 99) - p.overall;
    if (room > 0) {
      const cap = seasonGainBaseCap(p.age) * playTimeGainFactor(p.appsSeason, 38);
      delta = Math.min(room, Math.round(cap * (0.5 + rng() * 0.5) * highBandGainFactor(p.overall)));
    }
  }
  if (!delta) return;
  ["overall", "atk", "def", "phys"].forEach((attr) => { p[attr] = clamp(p[attr] + delta, 20, 99); });
}
const BASE_COMPOSITION = ["G", "G", "D", "D", "D", "D", "D", "M", "M", "M", "M", "M", "F", "F", "F", "F"];
function buildBasePlayer(club, idx, rng) {
  const group = BASE_COMPOSITION[idx % BASE_COMPOSITION.length];
  // Bloco 6 (mockups brtreinadorbloco6base.html/brtreinadorbloco6pendentes.html
  // — "Categorias de base") — ampliado de 16-20 pra 15-20 pra a aba
  // Sub-15 da nova tela ter gente de verdade (era sempre vazia antes).
  // Só afeta jogadores gerados daqui pra frente — saves antigos mantêm
  // a idade já salva.
  const age = 15 + Math.floor(rng() * 6);
  // GE-BALANCE-005 (issue #38) — era uniforme 42-92 (~10% de cada safra
  // com teto 85+); agora enviesado, ver youthPotentialRoll.
  const potential = youthPotentialRoll(rng, (club.atk - 1) * 6);
  const overall = Math.round(clamp(potential * (0.42 + rng() * 0.28), 26, 60));
  const atk = clamp(overall + (group === "F" ? 5 : group === "M" ? 2 : -8) + Math.round(rng() * 6 - 3), 18, 78);
  const def = clamp(overall + (group === "D" || group === "G" ? 5 : -8) + Math.round(rng() * 6 - 3), 18, 78);
  const phys = clamp(Math.round(52 + rng() * 32), 32, 88);
  const first = DEMO_FIRST_NAMES[Math.floor(rng() * DEMO_FIRST_NAMES.length)];
  const last = DEMO_LAST_NAMES[Math.floor(rng() * DEMO_LAST_NAMES.length)];
  return {
    id: `base_${club.id}_${idx}`, name: `${first} ${last}`, photo: null,
    group, age, overall, atk, def, phys, potential,
    origin: "base", real: false,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    ...computeContractFields(overall, age, potential, rng),
  };
}
const FILLER_COMPOSITION = ["G", "D", "D", "D", "D", "D", "M", "M", "M", "M", "M", "M", "F", "F", "F", "F"];
function buildGeneratedProPlayer(club, idx, rng) {
  const group = FILLER_COMPOSITION[idx % FILLER_COMPOSITION.length];
  const age = 19 + Math.floor(rng() * 16); // 19-34, faixa normal de elenco profissional
  const clubFactor = (group === "F" || group === "M") ? club.atk : (2 - club.def);
  const overall = Math.round(clamp(52 + (clubFactor - 1) * 14 + (rng() * 16 - 8), 40, 82));
  const atk = clamp(overall + (group === "F" ? 6 : group === "M" ? 2 : -10) + Math.round(rng() * 6 - 3), 28, 90);
  const def = clamp(overall + (group === "D" || group === "G" ? 6 : -10) + Math.round(rng() * 6 - 3), 28, 90);
  const phys = clamp(Math.round(55 + rng() * 30), 38, 90);
  const first = DEMO_FIRST_NAMES[Math.floor(rng() * DEMO_FIRST_NAMES.length)];
  const last = DEMO_LAST_NAMES[Math.floor(rng() * DEMO_LAST_NAMES.length)];
  // Nova feature (pedido do usuário: "atributos precisam ser mais
  // reais... evolução menos agressiva") — mesmo teto por idade de
  // buildRealPlayer, ver derivePotentialForAdult.
  const potential = derivePotentialForAdult(overall, age, rng);
  return {
    id: `gen_${club.id}_${idx}`, name: `${first} ${last}`, photo: null,
    group, age, overall, atk, def, phys, potential,
    origin: "principal", real: false,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    ...computeContractFields(overall, age, potential, rng),
  };
}
const MIN_PRINCIPAL = 18;
function computeBoardGoal() {
  const myAvg = averageOverall(CAREER.squad.filter((p) => p.origin === "principal"));
  const leagueSquadsOwnDivision = Object.entries(CAREER.leagueSquads || {})
    .filter(([teamId]) => Object.prototype.hasOwnProperty.call(CAREER.standings, teamId))
    .flatMap(([, squad]) => squad);
  const leagueAvg = averageOverall(leagueSquadsOwnDivision);
  const diff = myAvg - leagueAvg;
  if (diff >= 4) return { type: "posicao_tabela", target: 6, label: "Terminar entre os 6 primeiros" };
  if (diff <= -4) return { type: "posicao_tabela", target: 16, label: "Não cair (terminar fora do Z4)" };
  return { type: "posicao_tabela", target: 10, label: "Terminar na primeira metade da tabela" };
}
function boardGoalMet(position, goal) {
  return !!goal && position > 0 && position <= goal.target;
}
const DISMISSAL_STREAK = 3;
const REPUTATION_META_WEIGHT = 0.5;
const REPUTATION_TITLE_WEIGHT = 0.2;
const REPUTATION_META_POINTS = { met: 14, missed: -10 };
const REPUTATION_TITLE_POINTS = 30; // por título (Brasileirão e Copa do Brasil contam separado)
function countTitlesThisSeason(award) {
  let n = 0;
  if (award.brasileirao.campeao != null && String(award.brasileirao.campeao) === String(CAREER.clubId)) n++;
  if (award.copaDoBrasil.disputou && String(award.copaDoBrasil.campeao) === String(CAREER.clubId)) n++;
  return n;
}
function applySeasonReputationDelta(goalWasMet, award) {
  const metaDelta = (goalWasMet ? REPUTATION_META_POINTS.met : REPUTATION_META_POINTS.missed) * REPUTATION_META_WEIGHT;
  const titleDelta = countTitlesThisSeason(award) * REPUTATION_TITLE_POINTS * REPUTATION_TITLE_WEIGHT;
  const base = CAREER.reputation == null ? 50 : CAREER.reputation;
  CAREER.reputation = clamp(Math.round(base + metaDelta + titleDelta), 0, 100);
}
function reputationLabel(rep) {
  return rep >= 85 ? "Lendário" : rep >= 70 ? "Renomado" : rep >= 50 ? "Estabelecido" : rep >= 30 ? "Em dúvida" : "Contestado";
}
const MAX_PLAYER_SEASON_HISTORY = 15;
function snapshotPlayerSeasonHistory(p, clubName) {
  if (!p.seasonHistory) p.seasonHistory = [];
  p.seasonHistory.unshift({
    year: CAREER.seasonYear, clubName,
    apps: p.appsSeason || 0, goals: p.goalsSeason || 0, assists: p.assistsSeason || 0,
    // Carreira 2.0, fase 6 (decisão de 04/11): overall ao fim da temporada,
    // para "Overall por temporada" na Evolução. Campo novo e opcional:
    // entradas antigas ficam sem ele (a tela mostra só as que têm).
    overall: p.overall,
  });
  if (p.seasonHistory.length > MAX_PLAYER_SEASON_HISTORY) p.seasonHistory.length = MAX_PLAYER_SEASON_HISTORY;
}
function renewLeagueSquad(club, squad) {
  // BUG CORRIGIDO (achado ao alargar a duração da lesão pra Fase 1 item
  // 4 — lesão grave passou a poder chegar a 14 rodadas): sem resetar
  // status/outUntilRound na virada de temporada, um jogador machucado
  // ou suspenso nas últimas rodadas do ano carregava esse afastamento
  // pra rodada 1 da temporada NOVA (currentRound volta a 1, mas
  // outUntilRound continuava um número alto de quando a lesão
  // aconteceu) — ficava fora de combate o ano inteiro sem chance
  // nenhuma de voltar, mesmo o campeonato tendo terminado fazia tempo.
  // Entressafra é tempo de sobra pra qualquer lesão/suspensão resolver.
  // FASE 4 (item 6) — goalsSeason/assistsSeason também zeram aqui (são
  // "da temporada", ver attributeGoals/computeSeasonAwards). appsSeason
  // (item 6 da lista de melhorias) reseta junto pelo mesmo motivo, mas
  // SEM snapshot de seasonHistory aqui — time CPU o técnico não
  // gerencia, não faz sentido guardar histórico individual (ver
  // renewHumanSquad, único lugar que snapshota de verdade).
  // GE-BALANCE-005 (issue #38) — evolução anual agregada (idade/
  // minutagem da temporada que ACABOU, por isso antes do age += 1 e do
  // reset de appsSeason) + queda do potencial já com a idade nova.
  const evoRng = seededRngFromKey(`cpu-evo:${club.id}:${CAREER.seasonYear}`);
  squad.forEach((p) => {
    applyCpuAnnualEvolution(p, evoRng);
    p.age += 1; p.status = "ok"; p.outUntilRound = null; p.injurySeverity = null; p.yellowCards = 0; p.goalsSeason = 0; p.assistsSeason = 0; p.appsSeason = 0;
    delete p.seasonGain; // jogador vendido pelo humano chega com o contador da temporada dele
    if (p.potential != null) p.potential = clamp(p.potential - potentialDeclineFor(p.age, p.group), 20, 99);
  });
  const kept = squad.filter((p) => p.contractUntil >= CAREER.seasonYear);
  const rng = seededRngFromKey(`renew-league:${club.id}:${CAREER.seasonYear}`);
  // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das 3
  // ligas") — piso certo por time (ver minSquadSizeFor) — repor sempre
  // até MIN_LEAGUE_SQUAD (16) reencheria de mais um time de outra
  // divisão (piso menor de propósito, 12 — ver
  // MIN_LEAGUE_SQUAD_OTHER_DIVISION), voltando a inflar o save a cada
  // virada de temporada mesmo sem nenhuma negociação de verdade.
  const missing = Math.max(0, minSquadSizeFor(club.id) - kept.length);
  const fresh = Array.from({ length: missing }, (_, i) => buildGeneratedProPlayer(club, i, rng));
  return [...kept, ...fresh];
}
function renewHumanSquad() {
  // BUG CORRIGIDO — mesmo problema/motivo do renewLeagueSquad acima.
  // FASE 4 (item 6) — goalsSeason/assistsSeason também zeram aqui.
  // Item 6 da lista de melhorias — snapshot do ANO QUE TERMINOU pro
  // histórico individual (ver snapshotPlayerSeasonHistory) ANTES de
  // zerar goalsSeason/assistsSeason/appsSeason pra temporada nova;
  // roda pra todo mundo AINDA no elenco (inclusive quem sai duas
  // linhas abaixo por fim de contrato — a temporada que passou com
  // esse clube conta pro histórico dele mesmo saindo agora).
  // GE-BALANCE-005 (issue #38) — teto de ganho da temporada zera
  // (seasonGain) e o potencial começa a cair a partir do pico.
  CAREER.squad.forEach((p) => {
    snapshotPlayerSeasonHistory(p, CAREER.clubName); p.age += 1; p.status = "ok"; p.outUntilRound = null; p.injurySeverity = null; p.yellowCards = 0; p.goalsSeason = 0; p.assistsSeason = 0; p.appsSeason = 0;
    delete p.seasonGain;
    if (p.potential != null) p.potential = clamp(p.potential - potentialDeclineFor(p.age, p.group), 20, 99);
  });
  const leavingNames = [];
  CAREER.squad = CAREER.squad.filter((p) => {
    if (p.contractUntil < CAREER.seasonYear) { leavingNames.push(p.name); return false; }
    return true;
  });
  const remainingIds = new Set(CAREER.squad.map((p) => p.id));
  CAREER.lineup.starters = CAREER.lineup.starters.map((id) => (id && remainingIds.has(id) ? id : null));
  CAREER.lineup.bench = CAREER.lineup.bench.filter((id) => remainingIds.has(id));
  // FASE 2 (b) — regressão pro neutro + efeito de salário justo/injusto
  // (só quem sobreviveu à saída por fim de contrato acima — quem chega
  // novo já nasce em 70, ver builders).
  applySeasonMoraleReset(CAREER.squad);

  const club = teamById(CAREER.clubId);
  const rng = seededRngFromKey(`renew-human:${CAREER.clubId}:${CAREER.seasonYear}`);
  const baseCount = CAREER.squad.filter((p) => p.origin === "base").length;
  const newBase = Array.from({ length: Math.max(0, 16 - baseCount) }, (_, i) => buildBasePlayer(club, i, rng));
  const principalCount = CAREER.squad.filter((p) => p.origin === "principal").length;
  const newPrincipal = Array.from({ length: Math.max(0, MIN_PRINCIPAL - principalCount) }, (_, i) => buildGeneratedProPlayer(club, i, rng));
  CAREER.squad.push(...newBase, ...newPrincipal);
  return { leavingNames, newBaseCount: newBase.length, newPrincipalCount: newPrincipal.length };
}
function computeSeasonAwards() {
  const sortedStandings = motorTabela().sortRows(CAREER.standings);
  const campeao = sortedStandings[0] ? sortedStandings[0].id : null;
  const vice = sortedStandings[1] ? sortedStandings[1].id : null;

  const allPlayers = [];
  CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan").forEach((p) => allPlayers.push({ p, clubId: CAREER.clubId }));
  Object.entries(CAREER.leagueSquads || {}).forEach(([clubId, squad]) => {
    squad.forEach((p) => allPlayers.push({ p, clubId }));
  });
  const awardEntry = (e, valor) => ({ jogadorId: e.p.id, nome: e.p.name, clubeId: e.clubId, clubeName: teamById(e.clubId).name, valor });
  const pickBestBy = (statKey) => {
    const withStat = allPlayers.filter((e) => (e.p[statKey] || 0) > 0);
    if (!withStat.length) return null;
    withStat.sort((a, b) => (b.p[statKey] - a.p[statKey]) || ((a.p.apps || 0) - (b.p.apps || 0)));
    return awardEntry(withStat[0], withStat[0].p[statKey]);
  };
  const artilheiro = pickBestBy("goalsSeason");
  const assistencias = pickBestBy("assistsSeason");
  const melhorRanked = allPlayers.slice().sort((a, b) => (b.p.overall - a.p.overall) || ((a.p.apps || 0) - (b.p.apps || 0)));
  const melhorJogador = melhorRanked.length ? awardEntry(melhorRanked[0], melhorRanked[0].p.overall) : null;

  const cup = CAREER.cup;
  const cupDone = !!(cup && cup.active && cup.phase === "done" && cup.ties.final[0]);
  const copaDoBrasil = cupDone
    ? { disputou: true, campeao: cup.champion, vice: String(cup.ties.final[0].home) === String(cup.champion) ? cup.ties.final[0].away : cup.ties.final[0].home }
    : { disputou: false, campeao: null, vice: null };

  return { seasonYear: CAREER.seasonYear, brasileirao: { campeao, vice, artilheiro, assistencias, melhorJogador }, copaDoBrasil };
}
function applySeasonAwardMoraleBoost(award) {
  const b = award.brasileirao;
  [b.artilheiro, b.assistencias, b.melhorJogador].forEach((entry) => {
    if (!entry || String(entry.clubeId) !== String(CAREER.clubId)) return;
    const p = CAREER.squad.find((x) => x.id === entry.jogadorId);
    if (p) p.morale = clamp((p.morale == null ? 70 : p.morale) + 15, 0, 100);
  });
}
const RELEGATION_N = 4; // mesmo tamanho da zona de rebaixamento já usada na Tabela (ver .mt-zone-dot)
function freshDivisionRound(teams) {
  const ids = teams.map((t) => String(t.id));
  return { schedule: motorModulo("calendario").generateAllRounds(ids), standings: motorTabela().emptyStandings(ids) };
}
function sortedDivisionRows(compId) {
  return motorTabela().sortRows(divisionStandingsFor(compId));
}
function divisionStandingsFor(compId) {
  if (compId === CURRENT_COMPETITION_ID) return CAREER.standings;
  return (CAREER.otherDivisions && CAREER.otherDivisions[compId] && CAREER.otherDivisions[compId].standings) || {};
}
function relegationZoneIds(sortedRows, n, protectedId) {
  return motorTabela().relegationZoneIds(sortedRows, n, protectedId); // Fase 12: motor/tabela.js
}
function accessZoneIds(sortedRows, n) {
  return motorTabela().accessZoneIds(sortedRows, n);
}
const CLUB_TRADITION_IDS = new Set(["fla", "cor", "pal", "sao", "san", "vas", "flu", "bot", "gre", "int", "cru", "cam"]);
const TRADITION_REPRIEVE_CHANCE = 0.5;
function applyTraditionReprieve(zone, sortedRows, seedKey) {
  const ids = sortedRows.map((r) => String(r.id));
  const rng = seededRngFromKey(seedKey);
  const n = zone.length;
  let currentZone = zone.slice();
  zone.forEach((id) => {
    if (!CLUB_TRADITION_IDS.has(id) || !currentZone.includes(id)) return;
    if (rng() >= TRADITION_REPRIEVE_CHANCE) return; // continua rebaixado — mérito esportivo prevalece
    // GAP CORRIGIDO (achado pela simulação de validação,
    // tests/e2e/sim_ge_balance_002.js): a 1ª versão pegava sempre o
    // time logo ACIMA da linha, não importa quem fosse — como boa parte
    // da Série A já É de tradição (12 dos 20 clubes reais), o "próximo
    // da linha" também costumava ser tradicional, e trocar 1 tradicional
    // por outro não reduz nada o total. Agora procura, de baixo pra
    // cima a partir da linha, o clube NÃO-tradicional mais próximo —
    // só recorre a outro tradicional (fallback) se a tabela inteira
    // acima da zona for só de clubes de tradição (praticamente
    // impossível com 12 tradicionais em 60 clubes no total).
    const zoneSet = new Set(currentZone);
    const above = [];
    for (let i = ids.length - n - 1; i >= 0; i--) { if (!zoneSet.has(ids[i])) above.push(ids[i]); }
    const replacement = above.find((rid) => !CLUB_TRADITION_IDS.has(rid)) || above[0];
    if (!replacement) return; // sem substituto disponível (não deveria acontecer com 20 times) — mantém como estava
    currentZone = currentZone.filter((zid) => zid !== id);
    currentZone.push(replacement);
  });
  return currentZone;
}
const STRENGTH_DIVISION_GAP_SD = 2.0;
function divisionStrengthScale(teams) {
  const atks = teams.map((t) => t.atk).filter(Number.isFinite);
  const defs = teams.map((t) => t.def).filter(Number.isFinite);
  const mean = (arr) => arr.reduce((a, v) => a + v, 0) / (arr.length || 1);
  const sd = (arr, m) => Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length || 1)) || 1;
  const meanAtk = mean(atks), meanDef = mean(defs);
  return { meanAtk, meanDef, sdAtk: sd(atks, meanAtk), sdDef: sd(defs, meanDef) };
}
function repositionArrivals(arrivals, stayers, direction, originScale) {
  const dest = divisionStrengthScale(stayers);
  const gap = direction === "promoted" ? -STRENGTH_DIVISION_GAP_SD : STRENGTH_DIVISION_GAP_SD;
  arrivals.forEach((t) => {
    const zAtk = (t.atk - originScale.meanAtk) / originScale.sdAtk + gap;
    const zDef = (t.def - originScale.meanDef) / originScale.sdDef - gap; // def alto = pior
    t.atk = Math.round(clamp(dest.meanAtk + zAtk * dest.sdAtk, 0.35, 2.6) * 1000) / 1000;
    t.def = Math.round(clamp(dest.meanDef + zDef * dest.sdDef, 0.3, 2.6) * 1000) / 1000;
  });
}
async function applyPromotionRelegation() {
  if (!CAREER.serieDPool) return null; // carreira sem o sistema ativado — nada a fazer
  const rowsA = sortedDivisionRows("brasileirao");
  const rowsB = sortedDivisionRows("serie_b");
  const rowsC = sortedDivisionRows("serie_c");
  // GE-BALANCE-002 (issue #27) — reprieve de tradição roda DEPOIS do
  // swap de proteção do clube humano (relegationZoneIds/protectedId,
  // só existe na Série C) — nessa altura o humano, se protegido, já
  // nem está mais na zona recebida por applyTraditionReprieve.
  const relegatedA = applyTraditionReprieve(relegationZoneIds(rowsA, RELEGATION_N), rowsA, `tradition:brasileirao:${CAREER.seasonYear}`);
  const promotedB = accessZoneIds(rowsB, RELEGATION_N);
  const relegatedB = applyTraditionReprieve(relegationZoneIds(rowsB, RELEGATION_N), rowsB, `tradition:serie_b:${CAREER.seasonYear}`);
  const promotedC = accessZoneIds(rowsC, RELEGATION_N);
  const relegatedC = applyTraditionReprieve(relegationZoneIds(rowsC, RELEGATION_N, CURRENT_COMPETITION_ID === "serie_c" ? CAREER.clubId : null), rowsC, `tradition:serie_c:${CAREER.seasonYear}`);

  const dPool = CAREER.serieDPool.slice();
  const promotedDIdx = [];
  while (promotedDIdx.length < Math.min(RELEGATION_N, dPool.length)) {
    const idx = Math.floor(Math.random() * dPool.length);
    if (!promotedDIdx.includes(idx)) promotedDIdx.push(idx);
  }
  const promotedD = promotedDIdx.map((i) => dPool[i]); // objetos completos — nunca estiveram em divisionTeams antes

  const byId = new Map();
  ALL_COMPETITIONS_ORDER.forEach((compId) => (CAREER.divisionTeams[compId] || []).forEach((t) => byId.set(String(t.id), t)));
  const teamsFor = (ids) => ids.map((id) => byId.get(String(id))).filter(Boolean);
  const idsOf = (rows) => rows.map((r) => String(r.id));

  // GE-BALANCE-004 — antes de montar as divisões novas, quem troca de
  // divisão é recolocado na escala da divisão nova com o degrau entre
  // divisões (ver repositionArrivals; réguas tiradas antes). Os objetos
  // de time são os mesmos de CAREER.divisionTeams/serieDPool, então a
  // força nova é a que vai pra temporada seguinte (e pro save).
  const scaleA = divisionStrengthScale(CAREER.divisionTeams.brasileirao || []);
  const scaleB = divisionStrengthScale(CAREER.divisionTeams.serie_b || []);
  const scaleC = divisionStrengthScale(CAREER.divisionTeams.serie_c || []);
  const scaleD = divisionStrengthScale(dPool);
  const stayA = teamsFor(idsOf(rowsA).filter((id) => !relegatedA.includes(id)));
  const stayB = teamsFor(idsOf(rowsB).filter((id) => !promotedB.includes(id) && !relegatedB.includes(id)));
  const stayC = teamsFor(idsOf(rowsC).filter((id) => !promotedC.includes(id) && !relegatedC.includes(id)));
  repositionArrivals(teamsFor(promotedB), stayA, "promoted", scaleB);
  repositionArrivals(teamsFor(relegatedA), stayB, "relegated", scaleA);
  repositionArrivals(teamsFor(promotedC), stayB, "promoted", scaleC);
  repositionArrivals(teamsFor(relegatedB), stayC, "relegated", scaleB);
  repositionArrivals(promotedD, stayC, "promoted", scaleD);

  const newA = [...teamsFor(idsOf(rowsA).filter((id) => !relegatedA.includes(id))), ...teamsFor(promotedB)];
  const newB = [
    ...teamsFor(idsOf(rowsB).filter((id) => !promotedB.includes(id) && !relegatedB.includes(id))),
    ...teamsFor(relegatedA), ...teamsFor(promotedC),
  ];
  const newC = [
    ...teamsFor(idsOf(rowsC).filter((id) => !promotedC.includes(id) && !relegatedC.includes(id))),
    ...teamsFor(relegatedB), ...promotedD,
  ];
  const newDPool = [...dPool.filter((_, i) => !promotedDIdx.includes(i)), ...teamsFor(relegatedC)];

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
