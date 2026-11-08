// Cópia congelada de notificações, objetivos, conquistas, notícias da rodada
// e das buscas de time em public/js/carreira.js ANTES da etapa C1 (09/11),
// tal e qual. Referência do test_motor_registro.js: não editar.

const NOTIFICATION_MAX = 30;
const NOTIFICATION_ICON = { calendario: "🗓️", lesao: "🩹", proposta: "💰", posicao: "🏆", olheiro: "🔭", loja: "🎁", partida: "📅" };
function pushNotification(type, text, opts = {}) {
  CAREER.notificationSettings = CAREER.notificationSettings || { partida: true, loja: false, lesao: true };
  const gate = opts.gateBy || null; // "partida" | "loja" | "lesao" | null (sem toggle correspondente)
  if (gate && CAREER.notificationSettings[gate] === false) return;
  CAREER.notifications = CAREER.notifications || [];
  CAREER.notifications.unshift({ id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, icon: NOTIFICATION_ICON[type] || "🔔", text, ts: Date.now(), read: false });
  if (CAREER.notifications.length > NOTIFICATION_MAX) CAREER.notifications.length = NOTIFICATION_MAX;
}
function unreadNotificationCount() {
  return ((CAREER && CAREER.notifications) || []).filter((n) => !n.read).length;
}
function localDateStr(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function localWeekStartStr(d) {
  d = d || new Date();
  const diffToMonday = (d.getDay() + 6) % 7; // dom(0)->6, seg(1)->0, ter(2)->1...
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
  return localDateStr(monday);
}
const OBJECTIVE_TEMPLATES = {
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
function freshObjectiveList(category) {
  return OBJECTIVE_TEMPLATES[category].map((t) => ({ ...t, currentProgress: 0, status: "in_progress" }));
}
function freshObjectivesState() {
  return {
    daily: freshObjectiveList("daily"), weekly: freshObjectiveList("weekly"), season: freshObjectiveList("season"),
    dailyResetDate: localDateStr(), weeklyResetWeekStart: localWeekStartStr(),
  };
}
function ensureObjectivesFresh() {
  if (!CAREER.objectives) CAREER.objectives = freshObjectivesState();
  const today = localDateStr(), weekStart = localWeekStartStr();
  if (CAREER.objectives.dailyResetDate !== today) {
    CAREER.objectives.daily = freshObjectiveList("daily");
    CAREER.objectives.dailyResetDate = today;
  }
  if (CAREER.objectives.weeklyResetWeekStart !== weekStart) {
    CAREER.objectives.weekly = freshObjectiveList("weekly");
    CAREER.objectives.weeklyResetWeekStart = weekStart;
  }
}
function trailingWinStreak() {
  const form = CAREER.recentForm || [];
  let n = 0;
  for (let i = form.length - 1; i >= 0 && form[i] === 3; i--) n++;
  return n;
}
function bumpObjective(category, objectiveId, amount) {
  const list = CAREER.objectives && CAREER.objectives[category];
  const obj = list && list.find((o) => o.objectiveId === objectiveId);
  if (!obj || obj.status !== "in_progress") return;
  obj.currentProgress = Math.min(obj.target, obj.currentProgress + (amount || 1));
  if (obj.currentProgress >= obj.target) {
    obj.status = "completed";
    toast({ title: "Objetivo concluído!", detail: obj.title }, { type: "pos" });
  }
}
function applyObjectiveReward(reward) {
  CAREER.finances.cash += reward.amount;
  let detail = `+${fmtBRL(reward.amount)}`;
  if (reward.type === "coins_boost" || reward.type === "premium") {
    CAREER.squad.forEach((p) => { p.morale = clamp((p.morale == null ? 70 : p.morale) + 6, 0, 100); });
    detail += " · moral do elenco em alta";
  }
  if (reward.type === "premium") {
    CAREER.squad.forEach((p) => { p.condition = clamp((p.condition == null ? 100 : p.condition) + 15, 0, 100); });
    detail += " · condição física recuperada";
  }
  return detail;
}
const ACHIEVEMENT_CATALOG = [
  { achievementId: "ach_idolo", title: "Ídolo", description: "Complete 10 temporadas no mesmo clube.", category: "carreira", tier: "gold", target: 10, icon: "👑" },
  { achievementId: "ach_campeao_nacional", title: "Campeão Brasileiro", description: "Vença o Brasileirão.", category: "titulos", tier: "gold", target: 1, icon: "🏆" },
  { achievementId: "ach_campeao_copa", title: "Campeão da Copa", description: "Vença a Copa do Brasil.", category: "titulos", tier: "silver", target: 1, icon: "🏆" },
  { achievementId: "ach_artilheiro_area", title: "Artilheiro de Área", description: "100 gols do time em uma temporada.", category: "ofensivo", tier: "gold", target: 100, icon: "⚽" },
  { achievementId: "ach_fairplay", title: "Fair Play", description: "Termine uma temporada com menos de 30 faltas cometidas.", category: "disciplina", tier: "bronze", target: 1, icon: "🤝" },
  { achievementId: "ach_joia_base", title: "Joia da Base", description: "Revele 5 jogadores da categoria de base.", category: "formacao", tier: "silver", target: 5, icon: "💎" },
  { achievementId: "ach_veterano", title: "Veterano", description: "1 ano completo de conta ativa.", category: "fidelidade", tier: "bronze", target: 1, icon: "📅" },
];
function freshAchievementsState() {
  return ACHIEVEMENT_CATALOG.map((a) => ({ achievementId: a.achievementId, currentProgress: 0, unlockedAt: null }));
}
function achievementProgressFor(id) {
  const entry = (CAREER.achievements || []).find((a) => a.achievementId === id);
  return entry || { achievementId: id, currentProgress: 0, unlockedAt: null };
}
function setAchievementProgress(id, progress) {
  if (!CAREER.achievements) CAREER.achievements = freshAchievementsState();
  const entry = CAREER.achievements.find((a) => a.achievementId === id);
  if (!entry) return;
  const tpl = ACHIEVEMENT_CATALOG.find((a) => a.achievementId === id);
  entry.currentProgress = Math.min(tpl.target, progress);
  if (!entry.unlockedAt && entry.currentProgress >= tpl.target) {
    entry.unlockedAt = Date.now();
    toast({ title: "Conquista desbloqueada!", detail: `${tpl.icon} ${tpl.title}` }, { type: "pos" });
  }
}
function evaluateAlwaysCheckableAchievements() {
  if (!CAREER.achievements) CAREER.achievements = freshAchievementsState();
  // Reaproveita CAREER.seasonHistory (já existente, ver advanceSeason)
  // em vez de um contador novo — ele já é zerado sozinho a cada clube
  // novo (ver startCareer) e MAX_SEASON_HISTORY (15) é folgado o
  // bastante acima da meta desta conquista (10).
  setAchievementProgress("ach_idolo", (CAREER.seasonHistory || []).length);
  setAchievementProgress("ach_joia_base", CAREER.baseRevealedCount || 0);
  setAchievementProgress("ach_campeao_nacional", CAREER.titlesWonNacional > 0 ? 1 : 0);
  setAchievementProgress("ach_campeao_copa", CAREER.titlesWonCopa > 0 ? 1 : 0);
  if (ME && ME.createdAt) {
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    setAchievementProgress("ach_veterano", (Date.now() - ME.createdAt) >= oneYearMs ? 1 : 0);
  }
}
function evaluateSeasonEndAchievements(finishedTeamGoals, finishedTeamFouls) {
  if (!CAREER.achievements) CAREER.achievements = freshAchievementsState();
  setAchievementProgress("ach_artilheiro_area", Math.max(achievementProgressFor("ach_artilheiro_area").currentProgress, finishedTeamGoals));
  if (finishedTeamFouls < 30) setAchievementProgress("ach_fairplay", 1);
}
const NEWS_PRIORITY = { lider: 1, zebra: 2, lanterna_reage: 3, goleada: 4, empate_defendido: 5, jejum_quebrado: 6, generico: 9 };
const WINLESS_STREAK_THRESHOLD = 5; // rodadas sem vencer pra "jejum" valer manchete
const NEWS_FEED_MAX = 60; // manchetes guardadas no feed navegável (ver finishRoundTail/renderNewsScreen)
const ZEBRA_OVR_GAP = 6; // diferença mínima de overall médio pra contar como zebra/empate-defendido
function rankByPoints(standings) {
  const rows = motorTabela().sortRows(standings);
  const pos = {};
  rows.forEach((r, i) => { pos[r.id] = i + 1; });
  return pos;
}
function updateWinlessStreaks(allResults) {
  CAREER.teamWinlessStreak = CAREER.teamWinlessStreak || {};
  allResults.forEach((r) => {
    const homeId = String(r.home), awayId = String(r.away);
    if (r.gh > r.ga) { CAREER.teamWinlessStreak[homeId] = 0; CAREER.teamWinlessStreak[awayId] = (CAREER.teamWinlessStreak[awayId] || 0) + 1; }
    else if (r.ga > r.gh) { CAREER.teamWinlessStreak[awayId] = 0; CAREER.teamWinlessStreak[homeId] = (CAREER.teamWinlessStreak[homeId] || 0) + 1; }
    else { CAREER.teamWinlessStreak[homeId] = (CAREER.teamWinlessStreak[homeId] || 0) + 1; CAREER.teamWinlessStreak[awayId] = (CAREER.teamWinlessStreak[awayId] || 0) + 1; }
  });
}
function generateRoundNews(round, allResults, standingsBefore) {
  const headlines = [];
  const isMine = (...ids) => ids.some((id) => String(id) === String(CAREER.clubId));
  if (standingsBefore) {
    const posBefore = rankByPoints(standingsBefore);
    const posAfter = rankByPoints(CAREER.standings);
    const total = Object.keys(posAfter).length;
    // Líder novo — pedido do usuário: comparação é por TIME (não por
    // partida), então checa os 20 de uma vez só; sem manchete na
    // rodada 1 (todo mundo empatado em 0, "virar líder" não diz nada).
    if (round > 1) {
      Object.keys(posAfter).forEach((id) => {
        if (posAfter[id] === 1 && posBefore[id] !== 1) {
          headlines.push({ type: "lider", mine: isMine(id), texto: `${teamById(id).name} é o novo líder` });
        }
      });
    }
    const streaksBefore = { ...(CAREER.teamWinlessStreak || {}) };
    allResults.forEach((r) => {
      const home = teamById(r.home), away = teamById(r.away);
      const mine = isMine(r.home, r.away);
      if (r.gh === r.ga) {
        // Empate — ver adaptação no comentário do bloco acima.
        const homeOvr = squadAvgOverallOf(r.home), awayOvr = squadAvgOverallOf(r.away);
        if (homeOvr != null && awayOvr != null && awayOvr >= homeOvr + ZEBRA_OVR_GAP) {
          headlines.push({ type: "empate_defendido", mine, texto: `${home.name} segura o empate em casa` });
        }
        return;
      }
      const winnerId = r.gh > r.ga ? r.home : r.away;
      const loserId = r.gh > r.ga ? r.away : r.home;
      const winner = teamById(winnerId), loser = teamById(loserId);
      const margin = Math.abs(r.gh - r.ga);
      if (margin >= 3) {
        headlines.push({ type: "goleada", mine, texto: `${winner.name} aplica goleada sobre ${loser.name} (${Math.max(r.gh, r.ga)} x ${Math.min(r.gh, r.ga)})` });
      }
      const winnerOvr = squadAvgOverallOf(winnerId), loserOvr = squadAvgOverallOf(loserId);
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
  // Prioridade pedida: manchete do SEU clube sempre primeiro,
  // independente do tipo — depois disso, líder > zebra > lanterna
  // reage > goleada > empate defendido > jejum quebrado > genérico.
  headlines.sort((a, b) => ((b.mine ? 1 : 0) - (a.mine ? 1 : 0)) || (NEWS_PRIORITY[a.type] - NEWS_PRIORITY[b.type]));
  return headlines.slice(0, 6);
}
function teamById(id) {
  const own = LEAGUE_TEAMS.find((t) => String(t.id) === String(id));
  if (own) return { ...own, competitionId: CURRENT_COMPETITION_ID };
  const other = ALL_TEAMS_FLAT.find((t) => String(t.id) === String(id));
  if (other) return other;
  return { id, name: `Time #${id}`, short: String(id).slice(0, 3).toUpperCase(), c1: "#8892A0", c2: "#333" };
}
function squadAvgOverallOf(clubId) {
  if (String(clubId) === String(CAREER.clubId)) return averageOverall(CAREER.squad.filter((p) => p.origin === "principal"));
  return averageOverall(CAREER.leagueSquads[String(clubId)] || []);
}
function averageOverall(list) {
  if (!list.length) return 0;
  return list.reduce((s, p) => s + p.overall, 0) / list.length;
}
