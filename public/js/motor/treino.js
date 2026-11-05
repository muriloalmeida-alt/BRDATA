/* ===================================================================
   MOTOR — TREINO (Fase 12, etapa 4 do plano de independência, 05/11)
   -------------------------------------------------------------------
   Regras do treino semanal e da evolução natural, extraídas de
   carreira.js sem mudar nenhuma: plano de 7 dias e esquemas prontos,
   fadiga, ganho de atributo com teto (potencial, teto da temporada por
   idade/minutagem — GE-BALANCE-005 — e freio da faixa alta), moral do
   treino e histórico de fadiga; e a maturação/declínio por idade.

   Forma (decisão de 05/11): o motor simula sobre CÓPIAS dos campos de
   cada jogador e devolve, por jogador, o novo valor desses campos
   (`patch`); o carreira.js só aplica (Object.assign). Nada aqui lê
   CAREER, DOM ou save.

   Sorteio: recebe o gerador `rng`, na mesma ordem de antes; o jogo passa
   Math.random (equivalência em tests/unit/test_motor_treino.js).
=================================================================== */

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- Semana virtual (1 rodada/turno = 7 dias, jogo no sábado) ----------
export const TRAINING_DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const TRAINING_GAME_DAY = 5;
export const TRAINING_PRE_GAME_DAY = 4;
export const TRAINING_POST_GAME_DAY = 6;
export function isProtectedTrainingDay(i) { return i === TRAINING_PRE_GAME_DAY || i === TRAINING_POST_GAME_DAY; }
export const TRAINING_INTENSITY_MULT = { leve: 0.5, moderada: 1, intensa: 1.8 };
export const TRAINING_DURATION_DEFAULT = { leve: 45, moderada: 60, intensa: 75 };
export const FATIGUE_HISTORY_MAX = 16;
export const TRAINING_SCHEMES = [
  { id: "equilibrio", name: "Equilíbrio Semanal", desc: "Alterna técnico e físico moderado, com folgas protegidas de sexta e domingo.",
    days: [{ foco: "tecnico", intensidade: "moderada", grupo: "principal" }, { foco: "fisico", intensidade: "moderada", grupo: "principal" }, { foco: "tecnico", intensidade: "moderada", grupo: "misto" }, { foco: "fisico", intensidade: "leve", grupo: "principal" }] },
  { id: "pre_jogo", name: "Ativação Pré-Jogo", desc: "Cargas leves na semana toda. Uso quando o calendário está apertado (jogos a cada 3-4 dias).",
    days: [{ foco: "tecnico", intensidade: "leve", grupo: "principal" }, { foco: "tecnico", intensidade: "leve", grupo: "principal" }, { foco: "fisico", intensidade: "leve", grupo: "principal" }, { foco: "tecnico", intensidade: "leve", grupo: "principal" }] },
  { id: "pretemporada", name: "Pré-Temporada Física", desc: "Cargas físicas intensas para elevar a base de condicionamento. Uso fora de sequência apertada de jogos.",
    days: [{ foco: "fisico", intensidade: "intensa", grupo: "principal" }, { foco: "fisico", intensidade: "intensa", grupo: "principal" }, { foco: "tecnico", intensidade: "moderada", grupo: "principal" }, { foco: "fisico", intensidade: "intensa", grupo: "principal" }] },
  { id: "recuperacao", name: "Recuperação", desc: "Reduz carga total. Uso após jogos física ou taticamente desgastantes, ou elenco com muitos atletas fadigados.",
    days: [{ foco: "descanso" }, { foco: "tecnico", intensidade: "leve", grupo: "principal" }, { foco: "descanso" }, { foco: "tecnico", intensidade: "leve", grupo: "principal" }] },
  { id: "base_sub20", name: "Integração Sub-20", desc: "Foco técnico com o time misto para acelerar evolução da base e elevar moral dos jovens.",
    days: [{ foco: "tecnico", intensidade: "moderada", grupo: "misto" }, { foco: "tecnico", intensidade: "moderada", grupo: "misto" }, { foco: "fisico", intensidade: "leve", grupo: "misto" }, { foco: "tecnico", intensidade: "moderada", grupo: "misto" }] },
];
// Plano de 7 dias de um esquema (os 4 dias dele + jogo e 2 folgas fixas).
export function defaultTrainingPlan(schemeId) {
  const scheme = TRAINING_SCHEMES.find((s) => s.id === schemeId) || TRAINING_SCHEMES[0];
  const plan = new Array(7);
  let di = 0;
  for (let i = 0; i < 7; i++) {
    if (i === TRAINING_GAME_DAY) plan[i] = { foco: "jogo" };
    else if (isProtectedTrainingDay(i)) plan[i] = { foco: "descanso" };
    else {
      plan[i] = { ...scheme.days[di++] };
      plan[i].duracao = TRAINING_DURATION_DEFAULT[plan[i].intensidade] || 60;
    }
  }
  return plan;
}
// Quem treina num dia: "individual" só o escolhido; "misto" o elenco
// inteiro (principal + base); "principal" principal + emprestados.
export function trainingTargets(entry, squad) {
  if (entry.grupo === "individual") {
    const p = entry.individualPlayerId && squad.find((x) => x.id === entry.individualPlayerId);
    return p ? [p] : [];
  }
  if (entry.grupo === "misto") return squad.slice();
  return squad.filter((p) => p.origin === "principal" || p.origin === "loan");
}

// ---------- GE-BALANCE-005: teto de ganho ----------
// [idade máxima da faixa, ganho máximo na temporada]; 30+ não ganha.
export const SEASON_GAIN_CAP_BY_AGE = [[21, 6], [25, 4], [29, 2]];
export function seasonGainBaseCap(age) {
  const band = SEASON_GAIN_CAP_BY_AGE.find(([maxAge]) => age <= maxAge);
  return band ? band[1] : 0;
}
// Minutagem: metade das rodadas jogadas = teto cheio; nunca jogou = metade.
// Antes da 6ª rodada ninguém é punido.
export function playTimeGainFactor(appsSeason, roundsSoFar) {
  if (roundsSoFar < 6) return 1;
  const share = (appsSeason || 0) / roundsSoFar;
  return 0.5 + 0.5 * clamp(share / 0.5, 0, 1);
}
export function seasonGainCap(p, roundsSoFar) {
  return Math.round(seasonGainBaseCap(p.age) * playTimeGainFactor(p.appsSeason, roundsSoFar));
}
export function seasonGainRoom(p, attr, roundsSoFar) {
  const used = (p.seasonGain && p.seasonGain[attr]) || 0;
  return Math.max(0, seasonGainCap(p, roundsSoFar) - used);
}
// Acima de 80 cada ponto é 2x mais difícil; acima de 88, 4x.
export function highBandGainFactor(value) {
  return value >= 88 ? 0.25 : value >= 80 ? 0.5 : 1;
}
// Ganho de um treino: sorteia ponto a ponto, com chance pela distância ao
// teto e pela faixa alta.
export function attributeTrainingGain(currentValue, ceiling, baseGain, rng) {
  const room = ceiling - currentValue;
  if (room <= 0) return 0;
  let gained = 0;
  for (let i = 0; i < baseGain; i++) {
    const chance = clamp(room / 15, 0.05, 1) * highBandGainFactor(currentValue + gained);
    if (rng() < chance) gained++;
  }
  return Math.min(gained, room);
}

// Campos do jogador que o treino e a evolução mexem (cópia independente).
const TOUCH = ["condition", "overall", "atk", "def", "phys", "morale", "moraleReason"];
function copyOf(p) {
  const c = { id: p.id, origin: p.origin, group: p.group, age: p.age, appsSeason: p.appsSeason, potential: p.potential };
  TOUCH.forEach((k) => { if (k in p) c[k] = p[k]; });
  c.seasonGain = p.seasonGain ? { ...p.seasonGain } : p.seasonGain;
  c.attrTrend = p.attrTrend ? { ...p.attrTrend } : p.attrTrend;
  c.fatigueHistory = p.fatigueHistory ? p.fatigueHistory.map((x) => ({ ...x })) : p.fatigueHistory;
  return c;
}
function patchOf(c, orig) {
  const out = {};
  [...TOUCH, "seasonGain", "attrTrend", "fatigueHistory"].forEach((k) => {
    if (c[k] !== undefined || k in orig) { if (JSON.stringify(c[k]) !== JSON.stringify(orig[k])) out[k] = c[k]; }
  });
  return out;
}
function recordSeasonGain(p, attr, gain) {
  if (!gain) return;
  p.seasonGain = p.seasonGain || {};
  p.seasonGain[attr] = (p.seasonGain[attr] || 0) + gain;
}

// ---------- Semana de treino ----------
// plan: os 7 dias; squad: o elenco; roundsSoFar: rodadas já disputadas na
// temporada; preseason: semana de pré-temporada (físico rende +1);
// round: rodada do ponto do histórico de fadiga.
// Devolve { patches: Map(id → campos novos), gains: Map(id → pontos ganhos) }.
export function trainingWeek({ plan, squad, roundsSoFar, preseason, round }, rng) {
  const copies = squad.map(copyOf);
  const byId = new Map(copies.map((c) => [c.id, c]));
  const gains = new Map();
  (plan || []).forEach((entry, i) => {
    if (i === TRAINING_GAME_DAY || !entry || !entry.foco) return;
    if (entry.foco === "descanso") {
      copies.forEach((p) => { p.condition = clamp((p.condition == null ? 100 : p.condition) + 12, 0, 100); });
      return;
    }
    const mult = TRAINING_INTENSITY_MULT[entry.intensidade] || 1;
    const baseGain = Math.round(2 * mult);
    const fatigueCost = Math.round(6 * mult);
    const attrs = entry.foco === "tecnico" ? ["overall"] : entry.foco === "fisico" ? ["phys"] : ["atk", "def"];
    trainingTargets(entry, squad).map((p) => byId.get(p.id)).forEach((p) => {
      p.condition = clamp((p.condition == null ? 100 : p.condition) - fatigueCost, 0, 100);
      attrs.forEach((attr) => {
        const preseasonBonus = attr === "phys" && preseason ? 1 : 0;
        const attrGain = (attrs.length > 1 ? Math.max(1, Math.round(baseGain / 2)) : baseGain) + preseasonBonus;
        const ceiling = p.potential != null ? p.potential : 99;
        const seasonRoom = seasonGainRoom(p, attr, roundsSoFar);
        const gain = seasonRoom > 0 ? attributeTrainingGain(p[attr], ceiling, Math.min(attrGain, seasonRoom), rng) : 0;
        if (gain > 0) {
          p[attr] = clamp(p[attr] + gain, 20, ceiling);
          recordSeasonGain(p, attr, gain);
          const trend = p.attrTrend || { overall: 0, atk: 0, def: 0, phys: 0 };
          trend[attr] += gain;
          p.attrTrend = trend;
          gains.set(p.id, (gains.get(p.id) || 0) + gain);
        }
      });
      if (p.origin === "base" && entry.grupo === "misto") {
        p.morale = clamp((p.morale == null ? 70 : p.morale) + 5, 0, 100);
        p.moraleReason = "Feliz treinando com o elenco principal";
      }
    });
  });
  copies.forEach((p) => {
    const cond = p.condition == null ? 100 : p.condition;
    if (cond < 40 && p.moraleReason !== "Cansado pelo desgaste dos treinos") {
      p.morale = clamp((p.morale == null ? 70 : p.morale) - 4, 0, 100);
      p.moraleReason = "Cansado pelo desgaste dos treinos";
    } else if (cond >= 55 && p.moraleReason === "Cansado pelo desgaste dos treinos") {
      p.morale = clamp((p.morale == null ? 70 : p.morale) + 4, 0, 100);
      p.moraleReason = "Neutro no clube";
    }
    p.fatigueHistory = p.fatigueHistory || [];
    p.fatigueHistory.push({ round, fadiga: Math.round(100 - cond) });
    if (p.fatigueHistory.length > FATIGUE_HISTORY_MAX) p.fatigueHistory.shift();
  });
  const patches = new Map();
  squad.forEach((orig, i) => patches.set(orig.id, patchOf(copies[i], orig)));
  return { patches, gains };
}

// ---------- Evolução natural por idade (1x por rodada jogada) ----------
// Cresce mais quem é jovem e jogou; declina a partir dos 30 (32 goleiro).
// O crescimento respeita o potencial, o teto da temporada e a faixa alta;
// o declínio só respeita o piso (20).
export function agingWeek({ squad, playedIds, roundsSoFar }, rng) {
  const played = new Set(playedIds || []);
  const patches = new Map();
  squad.forEach((orig) => {
    const p = copyOf(orig);
    const wasPlayed = played.has(p.id);
    const declineAge = p.group === "G" ? 32 : 30;
    let growChance, declineChance;
    if (p.age <= 21) { growChance = wasPlayed ? 0.14 : 0.05; declineChance = 0; }
    else if (p.age < declineAge) { growChance = wasPlayed ? 0.06 : 0.01; declineChance = wasPlayed ? 0 : 0.01; }
    else { growChance = wasPlayed ? 0.02 : 0; declineChance = (wasPlayed ? 0.05 : 0.08) + (p.age - declineAge) * 0.01; }
    const trend = p.attrTrend || { overall: 0, atk: 0, def: 0, phys: 0 };
    const ceiling = p.potential != null ? p.potential : 99;
    ["overall", "atk", "def", "phys"].forEach((attr) => {
      const roll = rng();
      if (roll < growChance * highBandGainFactor(p[attr])) {
        if (p[attr] < ceiling && seasonGainRoom(p, attr, roundsSoFar) > 0) {
          p[attr] = clamp(p[attr] + 1, 20, ceiling); trend[attr] += 1; recordSeasonGain(p, attr, 1);
        }
      } else if (roll > 1 - declineChance) { p[attr] = clamp(p[attr] - 1, 20, 99); trend[attr] -= 1; }
    });
    p.attrTrend = trend;
    patches.set(orig.id, patchOf(p, orig));
  });
  return patches;
}
