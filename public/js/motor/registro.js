/* ===================================================================
   MOTOR — REGISTRO (plano "sem página escondida", etapa C1, 09/11)
   -------------------------------------------------------------------
   O que a semana e a rodada registram na carreira, extraído de
   carreira.js sem mudar regra nem texto:
   - notificações (central de avisos, com o limite de 30);
   - objetivos diário, semanal e de temporada (modelos, renovação pela
     data local, progresso e recompensa);
   - conquistas permanentes (catálogo e progresso);
   - notícias da rodada (líder novo, goleada, zebra, reação do lanterna,
     fim de jejum, empate defendido) e as sequências sem vitória.

   Lê e grava a carreira atual do módulo de estado (motor/estado.js).
   Não chama a tela: "Objetivo concluído!" e "Conquista desbloqueada!"
   viram o evento "aviso" (motor/eventos.js), que a página antiga mostra
   como o toast de sempre (decisão de 09/11).
=================================================================== */
import { carreiraAtual, timePorId, forcaMediaDoElenco } from "./estado.js";
import { emitir } from "./eventos.js";
import { sortRows } from "./tabela.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ---------- Datas locais (renovação dos objetivos) ----------
export function localDateStr(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
// Segunda-feira da semana de `d`, no fuso local (dom=0...sáb=6).
export function localWeekStartStr(d) {
  d = d || new Date();
  const diffToMonday = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
  return localDateStr(monday);
}

// ---------- Notificações ----------
export const NOTIFICATION_MAX = 30;
export const NOTIFICATION_ICON = { calendario: "🗓️", lesao: "🩹", proposta: "💰", posicao: "🏆", olheiro: "🔭", loja: "🎁", partida: "📅" };
// opts.gateBy: "partida" | "loja" | "lesao" — respeita o liga/desliga das Configurações.
export function pushNotification(type, text, opts = {}) {
  const c = carreiraAtual();
  c.notificationSettings = c.notificationSettings || { partida: true, loja: false, lesao: true };
  const gate = opts.gateBy || null;
  if (gate && c.notificationSettings[gate] === false) return;
  c.notifications = c.notifications || [];
  c.notifications.unshift({ id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, icon: NOTIFICATION_ICON[type] || "🔔", text, ts: Date.now(), read: false });
  if (c.notifications.length > NOTIFICATION_MAX) c.notifications.length = NOTIFICATION_MAX;
}
export function unreadNotificationCount() {
  const c = carreiraAtual();
  return ((c && c.notifications) || []).filter((n) => !n.read).length;
}

// ---------- Objetivos ----------
export const OBJECTIVE_TEMPLATES = {
  daily: [
    { objectiveId: "obj_win_1_match", title: "Vença uma partida", icon: "🏆", progressType: "counter", target: 1, reward: { type: "coins", amount: 300 } },
    { objectiveId: "obj_train_1_player", title: "Treine 1 jogador", icon: "🏋️", progressType: "counter", target: 1, reward: { type: "coins", amount: 150 } },
    { objectiveId: "obj_market_1_move", title: "Faça 1 movimentação no mercado", icon: "💼", progressType: "counter", target: 1, reward: { type: "coins", amount: 150 } },
  ],
  weekly: [
    { objectiveId: "obj_win_3_streak", title: "Vença 3 jogos seguidos", icon: "🔥", progressType: "counter", target: 3, reward: { type: "coins_boost", amount: 800 } },
    { objectiveId: "obj_invicto_round", title: "Termine uma rodada invicto", icon: "🛡️", progressType: "boolean", target: 1, reward: { type: "coins_boost", amount: 600 } },
  ],
  season: [
    { objectiveId: "obj_top4", title: "Termine entre os 4 primeiros", icon: "📈", progressType: "threshold", target: 1, reward: { type: "premium", amount: 2500 } },
    { objectiveId: "obj_reveal_base", title: "Revele 1 jogador da base", icon: "💎", progressType: "counter", target: 1, reward: { type: "premium", amount: 1500 } },
  ],
};
export function freshObjectiveList(category) {
  return OBJECTIVE_TEMPLATES[category].map((t) => ({ ...t, currentProgress: 0, status: "in_progress" }));
}
export function freshObjectivesState() {
  return {
    daily: freshObjectiveList("daily"), weekly: freshObjectiveList("weekly"), season: freshObjectiveList("season"),
    dailyResetDate: localDateStr(), weeklyResetWeekStart: localWeekStartStr(),
  };
}
// Renova o diário (data local) e o semanal (segunda-feira) quando viram.
export function ensureObjectivesFresh() {
  const c = carreiraAtual();
  if (!c.objectives) c.objectives = freshObjectivesState();
  const today = localDateStr(), weekStart = localWeekStartStr();
  if (c.objectives.dailyResetDate !== today) {
    c.objectives.daily = freshObjectiveList("daily");
    c.objectives.dailyResetDate = today;
  }
  if (c.objectives.weeklyResetWeekStart !== weekStart) {
    c.objectives.weekly = freshObjectiveList("weekly");
    c.objectives.weeklyResetWeekStart = weekStart;
  }
}
// Vitórias seguidas no fim da forma recente (3 = vitória).
export function trailingWinStreak() {
  const form = carreiraAtual().recentForm || [];
  let n = 0;
  for (let i = form.length - 1; i >= 0 && form[i] === 3; i--) n++;
  return n;
}
// Avança um objetivo até a meta; ao bater, fica "completed" e avisa.
export function bumpObjective(category, objectiveId, amount) {
  const c = carreiraAtual();
  const list = c.objectives && c.objectives[category];
  const obj = list && list.find((o) => o.objectiveId === objectiveId);
  if (!obj || obj.status !== "in_progress") return;
  obj.currentProgress = Math.min(obj.target, obj.currentProgress + (amount || 1));
  if (obj.currentProgress >= obj.target) {
    obj.status = "completed";
    emitir("aviso", { titulo: "Objetivo concluído!", detalhe: obj.title, tipo: "pos" });
  }
}
// Recompensa: dinheiro sempre; "coins_boost" e "premium" também sobem a
// moral (+6); "premium" também recupera a condição (+15). Devolve o que
// mudou além do dinheiro, para o texto do aviso.
export function applyObjectiveReward(reward) {
  const c = carreiraAtual();
  c.finances.cash += reward.amount;
  const efeitos = { moral: false, condicao: false };
  if (reward.type === "coins_boost" || reward.type === "premium") {
    c.squad.forEach((p) => { p.morale = clamp((p.morale == null ? 70 : p.morale) + 6, 0, 100); });
    efeitos.moral = true;
  }
  if (reward.type === "premium") {
    c.squad.forEach((p) => { p.condition = clamp((p.condition == null ? 100 : p.condition) + 15, 0, 100); });
    efeitos.condicao = true;
  }
  return efeitos;
}

// ---------- Conquistas ----------
export const ACHIEVEMENT_CATALOG = [
  { achievementId: "ach_idolo", title: "Ídolo", description: "Complete 10 temporadas no mesmo clube.", category: "carreira", tier: "gold", target: 10, icon: "👑" },
  { achievementId: "ach_campeao_nacional", title: "Campeão Brasileiro", description: "Vença o Brasileirão.", category: "titulos", tier: "gold", target: 1, icon: "🏆" },
  { achievementId: "ach_campeao_copa", title: "Campeão da Copa", description: "Vença a Copa do Brasil.", category: "titulos", tier: "silver", target: 1, icon: "🏆" },
  { achievementId: "ach_artilheiro_area", title: "Artilheiro de Área", description: "100 gols do time em uma temporada.", category: "ofensivo", tier: "gold", target: 100, icon: "⚽" },
  { achievementId: "ach_fairplay", title: "Fair Play", description: "Termine uma temporada com menos de 30 faltas cometidas.", category: "disciplina", tier: "bronze", target: 1, icon: "🤝" },
  { achievementId: "ach_joia_base", title: "Joia da Base", description: "Revele 5 jogadores da categoria de base.", category: "formacao", tier: "silver", target: 5, icon: "💎" },
  { achievementId: "ach_veterano", title: "Veterano", description: "1 ano completo de conta ativa.", category: "fidelidade", tier: "bronze", target: 1, icon: "📅" },
];
export function freshAchievementsState() {
  return ACHIEVEMENT_CATALOG.map((a) => ({ achievementId: a.achievementId, currentProgress: 0, unlockedAt: null }));
}
export function achievementProgressFor(id) {
  const entry = (carreiraAtual().achievements || []).find((a) => a.achievementId === id);
  return entry || { achievementId: id, currentProgress: 0, unlockedAt: null };
}
export function setAchievementProgress(id, progress) {
  const c = carreiraAtual();
  if (!c.achievements) c.achievements = freshAchievementsState();
  const entry = c.achievements.find((a) => a.achievementId === id);
  if (!entry) return;
  const tpl = ACHIEVEMENT_CATALOG.find((a) => a.achievementId === id);
  entry.currentProgress = Math.min(tpl.target, progress);
  if (!entry.unlockedAt && entry.currentProgress >= tpl.target) {
    entry.unlockedAt = Date.now();
    emitir("aviso", { titulo: "Conquista desbloqueada!", detalhe: `${tpl.icon} ${tpl.title}`, tipo: "pos" });
  }
}
// As que dá para conferir a qualquer momento. contaCriadaEm: data de
// criação da CONTA (para "Veterano"); sem ela, "Veterano" não é conferida.
export function evaluateAlwaysCheckableAchievements(contaCriadaEm) {
  const c = carreiraAtual();
  if (!c.achievements) c.achievements = freshAchievementsState();
  setAchievementProgress("ach_idolo", (c.seasonHistory || []).length);
  setAchievementProgress("ach_joia_base", c.baseRevealedCount || 0);
  setAchievementProgress("ach_campeao_nacional", c.titlesWonNacional > 0 ? 1 : 0);
  setAchievementProgress("ach_campeao_copa", c.titlesWonCopa > 0 ? 1 : 0);
  if (contaCriadaEm) {
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    setAchievementProgress("ach_veterano", (Date.now() - contaCriadaEm) >= oneYearMs ? 1 : 0);
  }
}
export function evaluateSeasonEndAchievements(finishedTeamGoals, finishedTeamFouls) {
  const c = carreiraAtual();
  if (!c.achievements) c.achievements = freshAchievementsState();
  setAchievementProgress("ach_artilheiro_area", Math.max(achievementProgressFor("ach_artilheiro_area").currentProgress, finishedTeamGoals));
  if (finishedTeamFouls < 30) setAchievementProgress("ach_fairplay", 1);
}

// ---------- Notícias da rodada ----------
export const NEWS_PRIORITY = { lider: 1, zebra: 2, lanterna_reage: 3, goleada: 4, empate_defendido: 5, jejum_quebrado: 6, generico: 9 };
export const WINLESS_STREAK_THRESHOLD = 5; // rodadas sem vencer pra "jejum" valer manchete
export const NEWS_FEED_MAX = 60; // manchetes guardadas no feed navegável
export const ZEBRA_OVR_GAP = 6; // diferença mínima de overall médio pra contar como zebra/empate defendido
export function rankByPoints(standings) {
  const rows = sortRows(standings);
  const pos = {};
  rows.forEach((r, i) => { pos[r.id] = i + 1; });
  return pos;
}
export function updateWinlessStreaks(allResults) {
  const c = carreiraAtual();
  c.teamWinlessStreak = c.teamWinlessStreak || {};
  allResults.forEach((r) => {
    const homeId = String(r.home), awayId = String(r.away);
    if (r.gh > r.ga) { c.teamWinlessStreak[homeId] = 0; c.teamWinlessStreak[awayId] = (c.teamWinlessStreak[awayId] || 0) + 1; }
    else if (r.ga > r.gh) { c.teamWinlessStreak[awayId] = 0; c.teamWinlessStreak[homeId] = (c.teamWinlessStreak[homeId] || 0) + 1; }
    else { c.teamWinlessStreak[homeId] = (c.teamWinlessStreak[homeId] || 0) + 1; c.teamWinlessStreak[awayId] = (c.teamWinlessStreak[awayId] || 0) + 1; }
  });
}
// Manchetes da rodada (até 6; as do seu clube primeiro) e as sequências
// sem vitória atualizadas.
export function generateRoundNews(round, allResults, standingsBefore) {
  const c = carreiraAtual();
  const headlines = [];
  const isMine = (...ids) => ids.some((id) => String(id) === String(c.clubId));
  if (standingsBefore) {
    const posBefore = rankByPoints(standingsBefore);
    const posAfter = rankByPoints(c.standings);
    const total = Object.keys(posAfter).length;
    if (round > 1) {
      Object.keys(posAfter).forEach((id) => {
        if (posAfter[id] === 1 && posBefore[id] !== 1) {
          headlines.push({ type: "lider", mine: isMine(id), texto: `${timePorId(id).name} é o novo líder` });
        }
      });
    }
    const streaksBefore = { ...(c.teamWinlessStreak || {}) };
    allResults.forEach((r) => {
      const home = timePorId(r.home), away = timePorId(r.away);
      const mine = isMine(r.home, r.away);
      if (r.gh === r.ga) {
        const homeOvr = forcaMediaDoElenco(r.home), awayOvr = forcaMediaDoElenco(r.away);
        if (homeOvr != null && awayOvr != null && awayOvr >= homeOvr + ZEBRA_OVR_GAP) {
          headlines.push({ type: "empate_defendido", mine, texto: `${home.name} segura o empate em casa` });
        }
        return;
      }
      const winnerId = r.gh > r.ga ? r.home : r.away;
      const loserId = r.gh > r.ga ? r.away : r.home;
      const winner = timePorId(winnerId), loser = timePorId(loserId);
      const margin = Math.abs(r.gh - r.ga);
      if (margin >= 3) {
        headlines.push({ type: "goleada", mine, texto: `${winner.name} aplica goleada sobre ${loser.name} (${Math.max(r.gh, r.ga)} x ${Math.min(r.gh, r.ga)})` });
      }
      const winnerOvr = forcaMediaDoElenco(winnerId), loserOvr = forcaMediaDoElenco(loserId);
      if (winnerOvr != null && loserOvr != null && winnerOvr <= loserOvr - ZEBRA_OVR_GAP) {
        headlines.push({ type: "zebra", mine, texto: `Zebra: ${winner.name} surpreende e vence ${loser.name}` });
      }
      if (posBefore[String(winnerId)] === total) {
        const zoneClause = posAfter[String(winnerId)] <= total - 4 ? " e sai da zona de rebaixamento" : "";
        headlines.push({ type: "lanterna_reage", mine, texto: `Reação: lanterna ${winner.name} vence${zoneClause}` });
      }
      const streak = streaksBefore[String(winnerId)] || 0;
      if (streak >= WINLESS_STREAK_THRESHOLD) {
        headlines.push({ type: "jejum_quebrado", mine, texto: `${winner.name} encerra jejum de ${streak} jogos sem vitória` });
      }
    });
  }
  updateWinlessStreaks(allResults);
  if (!headlines.length) {
    headlines.push({ type: "generico", mine: false, texto: `Rodada ${round} não teve grandes surpresas na tabela.` });
  }
  headlines.sort((a, b) => ((b.mine ? 1 : 0) - (a.mine ? 1 : 0)) || (NEWS_PRIORITY[a.type] - NEWS_PRIORITY[b.type]));
  return headlines.slice(0, 6);
}
