/* ===================================================================
   MOTOR — TEMPORADA (Fase 12, etapa 6 do plano de independência, 06/11)
   -------------------------------------------------------------------
   Regras da virada de temporada, extraídas de carreira.js sem mudar
   nenhuma:
   - meta da diretoria, se foi batida, e a demissão por sequência;
   - reputação do técnico (meta e títulos);
   - premiações do Brasileirão e da Copa, e a moral de quem foi premiado;
   - regras de jogador: contrato e salário, potencial (adulto, base e
     queda pela idade), evolução anual dos CPUs, moral da virada e os
     geradores de jogador (base e profissional);
   - renovação dos elencos (o seu e os CPUs);
   - acesso e rebaixamento entre A, B, C e o repositório da Série D, com
     o perdão da tradição e a força de quem troca de divisão.
   A Copa do Brasil (chaveamento e jogos) e a orquestração da virada
   (advanceSeason) ficam no carreira.js (decisão de 06/11).

   Forma: tudo chega por parâmetro e nada aqui lê CAREER, DOM ou save.
   A renovação devolve o ELENCO NOVO (cópias), mais o resumo do que
   aconteceu; o carreira.js troca a lista. Acesso e rebaixamento
   devolvem quem sobe, quem cai, as divisões novas e a força nova de
   quem troca de divisão; o carreira.js aplica nos objetos de clube.

   Sorteio: recebe os geradores de fora, na mesma ordem de antes
   (equivalência em tests/unit/test_motor_temporada.js).
=================================================================== */

import { seasonGainBaseCap, playTimeGainFactor, highBandGainFactor } from "./treino.js";
import { relegationZoneIds, accessZoneIds } from "./tabela.js";

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
const average = (list) => (list.length ? list.reduce((s, p) => s + p.overall, 0) / list.length : 0);

// ---------- Jogador: contrato, potencial, moral ----------
// Salário, valor e contrato (1 a 4 temporadas a partir de liveSeason).
export function computeContractFields(overall, age, potential, rng, liveSeason) {
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
  const contractUntil = liveSeason + 1 + Math.floor(rng() * 4);
  return { wage, value, contractUntil };
}
// Salário "de mercado" para o overall e a idade atuais.
export function fairWageFor(p) {
  return computeContractFields(p.overall, p.age, p.potential || null, () => 0.5, 0).wage;
}
// Moral na virada: volta 30% rumo a 70; salário injusto pesa no principal.
export function seasonMorale(p) {
  const base = p.morale == null ? 70 : p.morale;
  let m = Math.round(base + (70 - base) * 0.3);
  if (p.origin === "principal") {
    const fair = fairWageFor(p);
    const ratio = fair ? p.wage / fair : 1;
    if (ratio < 0.85) m -= 6;
    else if (ratio > 1.15) m += 4;
  }
  return clamp(m, 0, 100);
}
// Teto de adulto pela idade (com freio da faixa alta).
export function derivePotentialForAdult(overall, age, rng) {
  let room;
  if (age <= 20) room = 8 + rng() * 10;
  else if (age <= 23) room = 4 + rng() * 8;
  else if (age <= 26) room = 1 + rng() * 5;
  else if (age <= 29) room = rng() * 3;
  else room = 0;
  room *= highBandGainFactor(overall);
  return Math.round(clamp(overall + room, overall, 99));
}
// Queda anual do potencial a partir do pico (30; goleiro, 32).
export function potentialDeclineFor(age, group) {
  const declineAge = group === "G" ? 32 : 30;
  if (age < declineAge) return 0;
  return Math.min(3, 1 + Math.floor((age - declineAge) / 2));
}
// Potencial de jovem, enviesado (~75% entre 55 e 75).
export function youthPotentialRoll(rng, bonus) {
  return Math.round(clamp(48 + rng() * 22 + Math.pow(rng(), 8) * 22 + bonus, 35, 94));
}
// Evolução anual agregada de jogador CPU: devolve a variação (0 = nada).
export function cpuAnnualDelta(p, rng) {
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
  return delta;
}
export function applyCpuAnnualEvolution(p, rng) {
  const delta = cpuAnnualDelta(p, rng);
  if (!delta) return;
  ["overall", "atk", "def", "phys"].forEach((attr) => { p[attr] = clamp(p[attr] + delta, 20, 99); });
}

// ---------- Geradores de jogador ----------
// env: { firstNames, lastNames, liveSeason }
export const BASE_COMPOSITION = ["G", "G", "D", "D", "D", "D", "D", "M", "M", "M", "M", "M", "F", "F", "F", "F"];
export function buildBasePlayer(club, idx, rng, env) {
  const group = BASE_COMPOSITION[idx % BASE_COMPOSITION.length];
  const age = 15 + Math.floor(rng() * 6);
  const potential = youthPotentialRoll(rng, (club.atk - 1) * 6);
  const overall = Math.round(clamp(potential * (0.42 + rng() * 0.28), 26, 60));
  const atk = clamp(overall + (group === "F" ? 5 : group === "M" ? 2 : -8) + Math.round(rng() * 6 - 3), 18, 78);
  const def = clamp(overall + (group === "D" || group === "G" ? 5 : -8) + Math.round(rng() * 6 - 3), 18, 78);
  const phys = clamp(Math.round(52 + rng() * 32), 32, 88);
  const first = env.firstNames[Math.floor(rng() * env.firstNames.length)];
  const last = env.lastNames[Math.floor(rng() * env.lastNames.length)];
  return {
    id: `base_${club.id}_${idx}`, name: `${first} ${last}`, photo: null,
    group, age, overall, atk, def, phys, potential,
    origin: "base", real: false,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    ...computeContractFields(overall, age, potential, rng, env.liveSeason),
  };
}
export const FILLER_COMPOSITION = ["G", "D", "D", "D", "D", "D", "M", "M", "M", "M", "M", "M", "F", "F", "F", "F"];
export function buildGeneratedProPlayer(club, idx, rng, env) {
  const group = FILLER_COMPOSITION[idx % FILLER_COMPOSITION.length];
  const age = 19 + Math.floor(rng() * 16);
  const clubFactor = (group === "F" || group === "M") ? club.atk : (2 - club.def);
  const overall = Math.round(clamp(52 + (clubFactor - 1) * 14 + (rng() * 16 - 8), 40, 82));
  const atk = clamp(overall + (group === "F" ? 6 : group === "M" ? 2 : -10) + Math.round(rng() * 6 - 3), 28, 90);
  const def = clamp(overall + (group === "D" || group === "G" ? 6 : -10) + Math.round(rng() * 6 - 3), 28, 90);
  const phys = clamp(Math.round(55 + rng() * 30), 38, 90);
  const first = env.firstNames[Math.floor(rng() * env.firstNames.length)];
  const last = env.lastNames[Math.floor(rng() * env.lastNames.length)];
  const potential = derivePotentialForAdult(overall, age, rng);
  return {
    id: `gen_${club.id}_${idx}`, name: `${first} ${last}`, photo: null,
    group, age, overall, atk, def, phys, potential,
    origin: "principal", real: false,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    ...computeContractFields(overall, age, potential, rng, env.liveSeason),
  };
}
export const MIN_PRINCIPAL = 18;

// ---------- Renovação dos elencos ----------
export const MAX_PLAYER_SEASON_HISTORY = 15;
export function snapshotSeason(p, year, clubName) {
  if (!p.seasonHistory) p.seasonHistory = [];
  p.seasonHistory.unshift({
    year, clubName,
    apps: p.appsSeason || 0, goals: p.goalsSeason || 0, assists: p.assistsSeason || 0,
    overall: p.overall,
  });
  if (p.seasonHistory.length > MAX_PLAYER_SEASON_HISTORY) p.seasonHistory.length = MAX_PLAYER_SEASON_HISTORY;
}
// Zera o que é "da temporada" (afastamento, cartões, números) e envelhece.
function turnOver(p) {
  p.age += 1; p.status = "ok"; p.outUntilRound = null; p.injurySeverity = null; p.yellowCards = 0; p.goalsSeason = 0; p.assistsSeason = 0; p.appsSeason = 0;
  delete p.seasonGain;
}
// Cópia do jogador: a renovação só mexe em campos de topo e no histórico
// da temporada (que ganha uma entrada), então basta copiar esses dois.
function copyPlayer(p) {
  const c = { ...p };
  if (p.seasonHistory) c.seasonHistory = p.seasonHistory.slice();
  return c;
}

// Elenco CPU: evolução anual, idade, queda do potencial, saída por fim
// de contrato e reposição até o mínimo com profissionais gerados.
// o: { club, squad, seasonYear, minSize, evoRng, rng, env }
export function renewLeagueSquad({ club, squad, seasonYear, minSize, evoRng, rng, env }) {
  const players = squad.map(copyPlayer);
  players.forEach((p) => {
    applyCpuAnnualEvolution(p, evoRng);
    turnOver(p);
    if (p.potential != null) p.potential = clamp(p.potential - potentialDeclineFor(p.age, p.group), 20, 99);
  });
  const kept = players.filter((p) => p.contractUntil >= seasonYear);
  const missing = Math.max(0, minSize - kept.length);
  const fresh = Array.from({ length: missing }, (_, i) => buildGeneratedProPlayer(club, i, rng, env));
  return [...kept, ...fresh];
}

// Seu elenco: histórico da temporada, idade, queda do potencial, saída
// por fim de contrato (limpa a escalação), moral da virada e reposição
// da base (até 16) e do principal (até o mínimo).
// o: { club, clubName, squad, lineup, seasonYear, rng, env }
export function renewHumanSquad({ club, clubName, squad, lineup, seasonYear, rng, env }) {
  const players = squad.map(copyPlayer);
  players.forEach((p) => {
    snapshotSeason(p, seasonYear, clubName);
    turnOver(p);
    if (p.potential != null) p.potential = clamp(p.potential - potentialDeclineFor(p.age, p.group), 20, 99);
  });
  const leavingNames = [];
  const staying = players.filter((p) => {
    if (p.contractUntil < seasonYear) { leavingNames.push(p.name); return false; }
    return true;
  });
  const remainingIds = new Set(staying.map((p) => p.id));
  const starters = lineup.starters.map((id) => (id && remainingIds.has(id) ? id : null));
  const bench = lineup.bench.filter((id) => remainingIds.has(id));
  staying.forEach((p) => { p.morale = seasonMorale(p); });
  const baseCount = staying.filter((p) => p.origin === "base").length;
  const newBase = Array.from({ length: Math.max(0, 16 - baseCount) }, (_, i) => buildBasePlayer(club, i, rng, env));
  const principalCount = staying.filter((p) => p.origin === "principal").length;
  const newPrincipal = Array.from({ length: Math.max(0, MIN_PRINCIPAL - principalCount) }, (_, i) => buildGeneratedProPlayer(club, i, rng, env));
  return {
    squad: [...staying, ...newBase, ...newPrincipal],
    starters, bench,
    summary: { leavingNames, newBaseCount: newBase.length, newPrincipalCount: newPrincipal.length },
  };
}

// ---------- Diretoria e reputação ----------
// Meta pela força do seu elenco contra a média da própria divisão.
export function computeBoardGoal(myPrincipal, ownDivisionPlayers) {
  const diff = average(myPrincipal) - average(ownDivisionPlayers);
  if (diff >= 4) return { type: "posicao_tabela", target: 6, label: "Terminar entre os 6 primeiros" };
  if (diff <= -4) return { type: "posicao_tabela", target: 16, label: "Não cair (terminar fora do Z4)" };
  return { type: "posicao_tabela", target: 10, label: "Terminar na primeira metade da tabela" };
}
export function boardGoalMet(position, goal) {
  return !!goal && position > 0 && position <= goal.target;
}
// Temporadas seguidas sem bater a meta até a demissão.
export const DISMISSAL_STREAK = 3;

export const REPUTATION_META_WEIGHT = 0.5;
export const REPUTATION_TITLE_WEIGHT = 0.2;
export const REPUTATION_META_POINTS = { met: 14, missed: -10 };
export const REPUTATION_TITLE_POINTS = 30;
export function countTitlesThisSeason(award, clubId) {
  let n = 0;
  if (award.brasileirao.campeao != null && String(award.brasileirao.campeao) === String(clubId)) n++;
  if (award.copaDoBrasil.disputou && String(award.copaDoBrasil.campeao) === String(clubId)) n++;
  return n;
}
// Reputação nova (0–100, nasce em 50) pela meta e pelos títulos.
export function seasonReputation(current, goalWasMet, award, clubId) {
  const metaDelta = (goalWasMet ? REPUTATION_META_POINTS.met : REPUTATION_META_POINTS.missed) * REPUTATION_META_WEIGHT;
  const titleDelta = countTitlesThisSeason(award, clubId) * REPUTATION_TITLE_POINTS * REPUTATION_TITLE_WEIGHT;
  const base = current == null ? 50 : current;
  return clamp(Math.round(base + metaDelta + titleDelta), 0, 100);
}
export function reputationLabel(rep) {
  return rep >= 85 ? "Lendário" : rep >= 70 ? "Renomado" : rep >= 50 ? "Estabelecido" : rep >= 30 ? "Em dúvida" : "Contestado";
}

// ---------- Premiações ----------
// o: { rows (tabela ordenada), humanClubId, humanSquad, leagueSquads,
//      teamName(id), cup, seasonYear }. Desempate: quem jogou menos.
export function seasonAwards({ rows, humanClubId, humanSquad, leagueSquads, teamName, cup, seasonYear }) {
  const campeao = rows[0] ? rows[0].id : null;
  const vice = rows[1] ? rows[1].id : null;
  const allPlayers = [];
  humanSquad.filter((p) => p.origin === "principal" || p.origin === "loan").forEach((p) => allPlayers.push({ p, clubId: humanClubId }));
  Object.entries(leagueSquads || {}).forEach(([clubId, squad]) => {
    squad.forEach((p) => allPlayers.push({ p, clubId }));
  });
  const awardEntry = (e, valor) => ({ jogadorId: e.p.id, nome: e.p.name, clubeId: e.clubId, clubeName: teamName(e.clubId), valor });
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
  const cupDone = !!(cup && cup.active && cup.phase === "done" && cup.ties.final[0]);
  const copaDoBrasil = cupDone
    ? { disputou: true, campeao: cup.champion, vice: String(cup.ties.final[0].home) === String(cup.champion) ? cup.ties.final[0].away : cup.ties.final[0].home }
    : { disputou: false, campeao: null, vice: null };
  return { seasonYear, brasileirao: { campeao, vice, artilheiro, assistencias, melhorJogador }, copaDoBrasil };
}
// Seus jogadores premiados (artilheiro, assistências, melhor): +15 de moral.
export const AWARD_MORALE_BOOST = 15;
export function awardedPlayerIds(award, clubId) {
  const b = award.brasileirao;
  return [b.artilheiro, b.assistencias, b.melhorJogador]
    .filter((entry) => entry && String(entry.clubeId) === String(clubId))
    .map((entry) => entry.jogadorId);
}

// ---------- Acesso e rebaixamento ----------
export const RELEGATION_N = 4;
export const CLUB_TRADITION_IDS = new Set(["fla", "cor", "pal", "sao", "san", "vas", "flu", "bot", "gre", "int", "cru", "cam"]);
export const TRADITION_REPRIEVE_CHANCE = 0.5;
// Perdão da tradição: metade das vezes, clube grande na zona troca de
// lugar com o não tradicional mais próximo acima da linha.
export function applyTraditionReprieve(zone, sortedRows, rng) {
  const ids = sortedRows.map((r) => String(r.id));
  const n = zone.length;
  let currentZone = zone.slice();
  zone.forEach((id) => {
    if (!CLUB_TRADITION_IDS.has(id) || !currentZone.includes(id)) return;
    if (rng() >= TRADITION_REPRIEVE_CHANCE) return;
    const zoneSet = new Set(currentZone);
    const above = [];
    for (let i = ids.length - n - 1; i >= 0; i--) { if (!zoneSet.has(ids[i])) above.push(ids[i]); }
    const replacement = above.find((rid) => !CLUB_TRADITION_IDS.has(rid)) || above[0];
    if (!replacement) return;
    currentZone = currentZone.filter((zid) => zid !== id);
    currentZone.push(replacement);
  });
  return currentZone;
}
// Força de quem troca de divisão: mantém o desvio que tinha na origem,
// com um degrau entre divisões (def alto = defende pior).
export const STRENGTH_DIVISION_GAP_SD = 2.0;
export function divisionStrengthScale(teams) {
  const atks = teams.map((t) => t.atk).filter(Number.isFinite);
  const defs = teams.map((t) => t.def).filter(Number.isFinite);
  const mean = (arr) => arr.reduce((a, v) => a + v, 0) / (arr.length || 1);
  const sd = (arr, m) => Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length || 1)) || 1;
  const meanAtk = mean(atks), meanDef = mean(defs);
  return { meanAtk, meanDef, sdAtk: sd(atks, meanAtk), sdDef: sd(defs, meanDef) };
}
// Força nova de quem chega (não altera os clubes): { atk, def } por clube.
export function arrivalStrength(arrivals, stayers, direction, originScale) {
  const dest = divisionStrengthScale(stayers);
  const gap = direction === "promoted" ? -STRENGTH_DIVISION_GAP_SD : STRENGTH_DIVISION_GAP_SD;
  return arrivals.map((t) => {
    const zAtk = (t.atk - originScale.meanAtk) / originScale.sdAtk + gap;
    const zDef = (t.def - originScale.meanDef) / originScale.sdDef - gap;
    return {
      atk: Math.round(clamp(dest.meanAtk + zAtk * dest.sdAtk, 0.35, 2.6) * 1000) / 1000,
      def: Math.round(clamp(dest.meanDef + zDef * dest.sdDef, 0.3, 2.6) * 1000) / 1000,
    };
  });
}

// Cascata A ↔ B ↔ C ↔ D. Não mexe nos clubes: devolve ids e a força nova.
// o: { rows: { A, B, C } (tabelas ordenadas), teams: { A, B, C } (clubes
//      das divisões), dPool (clubes da Série D), protectedC (seu clube,
//      se estiver na Série C: nunca vai para a D), reprieveRng: { A, B, C },
//      rng (sorteio de quem sobe da D) }
export function promotionRelegation({ rows, teams, dPool, protectedC, reprieveRng, rng }) {
  const relegatedA = applyTraditionReprieve(relegationZoneIds(rows.A, RELEGATION_N), rows.A, reprieveRng.A);
  const promotedB = accessZoneIds(rows.B, RELEGATION_N);
  const relegatedB = applyTraditionReprieve(relegationZoneIds(rows.B, RELEGATION_N), rows.B, reprieveRng.B);
  const promotedC = accessZoneIds(rows.C, RELEGATION_N);
  const relegatedC = applyTraditionReprieve(relegationZoneIds(rows.C, RELEGATION_N, protectedC), rows.C, reprieveRng.C);

  const promotedDIdx = [];
  while (promotedDIdx.length < Math.min(RELEGATION_N, dPool.length)) {
    const idx = Math.floor(rng() * dPool.length);
    if (!promotedDIdx.includes(idx)) promotedDIdx.push(idx);
  }
  const promotedD = promotedDIdx.map((i) => dPool[i]);

  const byId = new Map();
  [teams.A, teams.B, teams.C].forEach((list) => (list || []).forEach((t) => byId.set(String(t.id), t)));
  const teamsFor = (ids) => ids.map((id) => byId.get(String(id))).filter(Boolean);
  const idsOf = (r) => r.map((x) => String(x.id));

  const scaleA = divisionStrengthScale(teams.A || []);
  const scaleB = divisionStrengthScale(teams.B || []);
  const scaleC = divisionStrengthScale(teams.C || []);
  const scaleD = divisionStrengthScale(dPool);
  const stayA = teamsFor(idsOf(rows.A).filter((id) => !relegatedA.includes(id)));
  const stayB = teamsFor(idsOf(rows.B).filter((id) => !promotedB.includes(id) && !relegatedB.includes(id)));
  const stayC = teamsFor(idsOf(rows.C).filter((id) => !promotedC.includes(id) && !relegatedC.includes(id)));
  // Força nova, na mesma ordem de antes (quem fica nunca muda, então a
  // ordem não altera o resultado).
  const strength = [];
  const push = (arrivals, values) => arrivals.forEach((t, i) => strength.push({ team: t, ...values[i] }));
  push(teamsFor(promotedB), arrivalStrength(teamsFor(promotedB), stayA, "promoted", scaleB));
  push(teamsFor(relegatedA), arrivalStrength(teamsFor(relegatedA), stayB, "relegated", scaleA));
  push(teamsFor(promotedC), arrivalStrength(teamsFor(promotedC), stayB, "promoted", scaleC));
  push(teamsFor(relegatedB), arrivalStrength(teamsFor(relegatedB), stayC, "relegated", scaleB));
  push(promotedD, arrivalStrength(promotedD, stayC, "promoted", scaleD));

  return {
    relegatedA, promotedB, relegatedB, promotedC, relegatedC, promotedDIdx,
    strength,
    // Composição nova (listas de clubes, na ordem de antes).
    compose() {
      const newA = [...teamsFor(idsOf(rows.A).filter((id) => !relegatedA.includes(id))), ...teamsFor(promotedB)];
      const newB = [
        ...teamsFor(idsOf(rows.B).filter((id) => !promotedB.includes(id) && !relegatedB.includes(id))),
        ...teamsFor(relegatedA), ...teamsFor(promotedC),
      ];
      const newC = [
        ...teamsFor(idsOf(rows.C).filter((id) => !promotedC.includes(id) && !relegatedC.includes(id))),
        ...teamsFor(relegatedB), ...promotedD,
      ];
      const newDPool = [...dPool.filter((_, i) => !promotedDIdx.includes(i)), ...teamsFor(relegatedC)];
      return { newA, newB, newC, newDPool, teamsFor, promotedD };
    },
  };
}
