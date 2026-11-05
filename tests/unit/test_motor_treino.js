// Fase 12, etapa 4 (05/11): equivalência do treino extraído
// (public/js/motor/treino.js) com o código anterior de carreira.js.
// REF = cópia congelada das funções antigas (abaixo, tal e qual), rodada
// num vm com o CAREER do caso e Math.random trocado por um gerador com
// semente; o motor roda com o MESMO gerador.
// Uso: node tests/unit/test_motor_treino.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------------- REF (carreira.js antes da etapa 4) ----------------
const REF_SRC = String.raw`
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
const SEASON_GAIN_CAP_BY_AGE = [[21, 6], [25, 4], [29, 2]];
const TRAINING_GAME_DAY = 5, TRAINING_PRE_GAME_DAY = 4, TRAINING_POST_GAME_DAY = 6;
const TRAINING_INTENSITY_MULT = { leve: 0.5, moderada: 1, intensa: 1.8 };
const TRAINING_DURATION_DEFAULT = { leve: 45, moderada: 60, intensa: 75 };
const FATIGUE_HISTORY_MAX = 16;
const TRAINING_SCHEMES = [
  {
    id: "equilibrio", name: "Equilíbrio Semanal",
    desc: "Alterna técnico e físico moderado, com folgas protegidas de sexta e domingo.",
    days: [
      { foco: "tecnico", intensidade: "moderada", grupo: "principal" },
      { foco: "fisico", intensidade: "moderada", grupo: "principal" },
      { foco: "tecnico", intensidade: "moderada", grupo: "misto" },
      { foco: "fisico", intensidade: "leve", grupo: "principal" },
    ],
  },
  {
    id: "pre_jogo", name: "Ativação Pré-Jogo",
    desc: "Cargas leves na semana toda. Uso quando o calendário está apertado (jogos a cada 3-4 dias).",
    days: [
      { foco: "tecnico", intensidade: "leve", grupo: "principal" },
      { foco: "tecnico", intensidade: "leve", grupo: "principal" },
      { foco: "fisico", intensidade: "leve", grupo: "principal" },
      { foco: "tecnico", intensidade: "leve", grupo: "principal" },
    ],
  },
  {
    id: "pretemporada", name: "Pré-Temporada Física",
    desc: "Cargas físicas intensas para elevar a base de condicionamento. Uso fora de sequência apertada de jogos.",
    days: [
      { foco: "fisico", intensidade: "intensa", grupo: "principal" },
      { foco: "fisico", intensidade: "intensa", grupo: "principal" },
      { foco: "tecnico", intensidade: "moderada", grupo: "principal" },
      { foco: "fisico", intensidade: "intensa", grupo: "principal" },
    ],
  },
  {
    id: "recuperacao", name: "Recuperação",
    desc: "Reduz carga total. Uso após jogos física ou taticamente desgastantes, ou elenco com muitos atletas fadigados.",
    days: [
      { foco: "descanso" },
      { foco: "tecnico", intensidade: "leve", grupo: "principal" },
      { foco: "descanso" },
      { foco: "tecnico", intensidade: "leve", grupo: "principal" },
    ],
  },
  {
    id: "base_sub20", name: "Integração Sub-20",
    desc: "Foco técnico com o time misto para acelerar evolução da base e elevar moral dos jovens.",
    days: [
      { foco: "tecnico", intensidade: "moderada", grupo: "misto" },
      { foco: "tecnico", intensidade: "moderada", grupo: "misto" },
      { foco: "fisico", intensidade: "leve", grupo: "misto" },
      { foco: "tecnico", intensidade: "moderada", grupo: "misto" },
    ],
  },
];
var CAREER = null, PRESEASON = false;
function calendarTurnKey() { return "k" + CAREER.currentRound; }
function calendarOn() { return true; }
function calendarWeek() { return { p: PRESEASON ? "pre" : "liga" }; }
function ensureObjectivesFresh() {}
function bumpObjective() {}
function seasonGainBaseCap(age) {
  const band = SEASON_GAIN_CAP_BY_AGE.find(([maxAge]) => age <= maxAge);
  return band ? band[1] : 0;
}
function playTimeGainFactor(appsSeason, roundsSoFar) {
  if (roundsSoFar < 6) return 1;
  const share = (appsSeason || 0) / roundsSoFar;
  return 0.5 + 0.5 * clamp(share / 0.5, 0, 1);
}
function seasonGainCap(p, roundsSoFar) {
  return Math.round(seasonGainBaseCap(p.age) * playTimeGainFactor(p.appsSeason, roundsSoFar));
}
function seasonGainRoom(p, attr, roundsSoFar) {
  const used = (p.seasonGain && p.seasonGain[attr]) || 0;
  return Math.max(0, seasonGainCap(p, roundsSoFar) - used);
}
function recordSeasonGain(p, attr, gain) {
  if (!gain) return;
  p.seasonGain = p.seasonGain || {};
  p.seasonGain[attr] = (p.seasonGain[attr] || 0) + gain;
}
function highBandGainFactor(value) {
  return value >= 88 ? 0.25 : value >= 80 ? 0.5 : 1;
}
function attributeTrainingGain(currentValue, ceiling, baseGain) {
  const room = ceiling - currentValue;
  if (room <= 0) return 0;
  let gained = 0;
  for (let i = 0; i < baseGain; i++) {
    // GE-BALANCE-005 (issue #38) — além da distância até o teto, a
    // faixa ABSOLUTA do atributo também freia (ver highBandGainFactor).
    const chance = clamp(room / 15, 0.05, 1) * highBandGainFactor(currentValue + gained);
    if (Math.random() < chance) gained++;
  }
  return Math.min(gained, room);
}
function applyNaturalAgingEvolution(playedThisRound) {
  const playedIds = new Set((playedThisRound || []).map((p) => p.id));
  CAREER.squad.forEach((p) => {
    const played = playedIds.has(p.id);
    const declineAge = p.group === "G" ? 32 : 30;
    let growChance, declineChance;
    if (p.age <= 21) { growChance = played ? 0.14 : 0.05; declineChance = 0; }
    else if (p.age < declineAge) { growChance = played ? 0.06 : 0.01; declineChance = played ? 0 : 0.01; }
    else { growChance = played ? 0.02 : 0; declineChance = (played ? 0.05 : 0.08) + (p.age - declineAge) * 0.01; }
    const trend = p.attrTrend || { overall: 0, atk: 0, def: 0, phys: 0 };
    // Nova feature (pedido do usuário: "atributos precisam ser mais
    // reais... evolução menos agressiva") — a maturação natural
    // também respeita o teto (p.potential, ver derivePotentialForAdult/
    // buildBasePlayer) — sem isso, um jovem promissor acabaria
    // passando do próprio potencial só de jogar muitas temporadas,
    // mesmo sem treino nenhum envolvido. Declínio nunca é limitado por
    // teto (é sobre o PISO, 20, que já valia).
    const ceiling = p.potential != null ? p.potential : 99;
    ["overall", "atk", "def", "phys"].forEach((attr) => {
      const roll = Math.random();
      // GE-BALANCE-005 (issue #38) — maturação também conta pro teto da
      // temporada (seasonGainRoom) e sofre o mesmo freio de faixa alta.
      if (roll < growChance * highBandGainFactor(p[attr])) {
        if (p[attr] < ceiling && seasonGainRoom(p, attr, CAREER.currentRound - 1) > 0) {
          p[attr] = clamp(p[attr] + 1, 20, ceiling); trend[attr] += 1; recordSeasonGain(p, attr, 1);
        }
      }
      else if (roll > 1 - declineChance) { p[attr] = clamp(p[attr] - 1, 20, 99); trend[attr] -= 1; }
    });
    // Acumula até o jogador ser aberto no detalhe de novo (ver
    // openDetail, que lê isso pro indicador ↑/↓ e zera em seguida —
    // "desde a última checagem", pedido da especificação). O ganho
    // determinístico de applyWeeklyTraining soma NO MESMO campo, pra
    // não duplicar a seta de tendência com 2 fontes diferentes.
    p.attrTrend = trend;
  });
}
function trainingTargets(entry) {
  if (entry.grupo === "individual") {
    const p = entry.individualPlayerId && CAREER.squad.find((x) => x.id === entry.individualPlayerId);
    return p ? [p] : [];
  }
  if (entry.grupo === "misto") return CAREER.squad.slice();
  return CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan");
}
function applyWeeklyTraining() {
  // GE-CALENDAR-001 — 1x por TURNO (semana no calendário; rodada no
  // modelo antigo), ver calendarTurnKey.
  if (String(CAREER.trainingAppliedForRound) === calendarTurnKey()) return null;
  const gains = new Map();
  CAREER.trainingPlan.forEach((entry, i) => {
    if (i === TRAINING_GAME_DAY || !entry || !entry.foco) return;
    if (entry.foco === "descanso") {
      // Descanso não tem "grupo" (o protótipo também desabilita esse
      // campo pra descanso) — recupera o elenco inteiro por igual.
      CAREER.squad.forEach((p) => { p.condition = clamp((p.condition == null ? 100 : p.condition) + 12, 0, 100); });
      return;
    }
    const mult = TRAINING_INTENSITY_MULT[entry.intensidade] || 1;
    const baseGain = Math.round(2 * mult);   // fórmula exata do documento (2.2) — teto POSSÍVEL, não garantido, ver attributeTrainingGain
    const fatigueCost = Math.round(6 * mult);
    // "Tático" (Bloco 5) mistura os 2 lados do jogo — evolui ATAQUE E
    // DEFESA junto, cada um com metade do baseGain (mantém o total de
    // evolução por semana comparável ao foco único de técnico/físico,
    // em vez de dobrar de graça só por afetar 2 atributos).
    const attrs = entry.foco === "tecnico" ? ["overall"] : entry.foco === "fisico" ? ["phys"] : ["atk", "def"];
    trainingTargets(entry).forEach((p) => {
      p.condition = clamp((p.condition == null ? 100 : p.condition) - fatigueCost, 0, 100);
      attrs.forEach((attr) => {
        // GE-CALENDAR-001 — pré-temporada: treino físico rende 1 ponto a
        // mais por sessão (o teto da temporada, GE-BALANCE-005, segue valendo).
        const preseasonBonus = attr === "phys" && calendarOn() && (calendarWeek() || {}).p === "pre" ? 1 : 0;
        const attrGain = (attrs.length > 1 ? Math.max(1, Math.round(baseGain / 2)) : baseGain) + preseasonBonus;
        // Nova feature (pedido do usuário: "atributos precisam ser mais
        // reais... evolução menos agressiva") — ganho respeita o teto
        // de cada jogador (p.potential), com retorno decrescente perto
        // dele (ver attributeTrainingGain) — fadiga sempre é cobrada
        // (o esforço aconteceu), mas o ganho de verdade pode vir menor
        // que attrGain, ou zero, se o jogador já estiver perto/no teto.
        const ceiling = p.potential != null ? p.potential : 99;
        // GE-BALANCE-005 (issue #38) — e o teto de ganho da TEMPORADA
        // por idade/minutagem (ver seasonGainRoom): veterano 30+ não
        // recupera mais no treino o que perdeu com a idade.
        const seasonRoom = seasonGainRoom(p, attr, CAREER.currentRound - 1);
        const gain = seasonRoom > 0 ? attributeTrainingGain(p[attr], ceiling, Math.min(attrGain, seasonRoom)) : 0;
        if (gain > 0) {
          p[attr] = clamp(p[attr] + gain, 20, ceiling);
          recordSeasonGain(p, attr, gain);
          const trend = p.attrTrend || { overall: 0, atk: 0, def: 0, phys: 0 };
          trend[attr] += gain;
          p.attrTrend = trend;
          gains.set(p.id, (gains.get(p.id) || 0) + gain);
        }
      });
      // Regra do documento (2.5): Sub-20 treinando no grupo Misto com
      // o elenco principal ganha moral "feliz" — na escala numérica
      // já existente, isso é um empurrão positivo + motivo explícito
      // (ver moraleReason, já usado em toda parte do jogo que mexe em
      // moral).
      if (p.origin === "base" && entry.grupo === "misto") {
        p.morale = clamp((p.morale == null ? 70 : p.morale) + 5, 0, 100);
        p.moraleReason = "Feliz treinando com o elenco principal";
      }
    });
  });
  // Regras do documento (2.5) ligadas ao ESTADO FINAL de condição
  // (depois da semana inteira resolvida) — "cansado" abaixo de 40,
  // volta a "neutro" só quando a condição já recuperou pra 55+ E o
  // motivo registrado ainda for o do cansaço do treino (evita
  // sobrescrever um moraleReason de outro sistema, ex.: banco/conversa
  // recente, sem relação com fadiga de treino).
  CAREER.squad.forEach((p) => {
    const cond = p.condition == null ? 100 : p.condition;
    if (cond < 40 && p.moraleReason !== "Cansado pelo desgaste dos treinos") {
      p.morale = clamp((p.morale == null ? 70 : p.morale) - 4, 0, 100);
      p.moraleReason = "Cansado pelo desgaste dos treinos";
    } else if (cond >= 55 && p.moraleReason === "Cansado pelo desgaste dos treinos") {
      p.morale = clamp((p.morale == null ? 70 : p.morale) + 4, 0, 100);
      p.moraleReason = "Neutro no clube";
    }
    // Bloco 5 ("pendentes" — tela "Histórico de fadiga") — 1 ponto por
    // rodada pra TODO o elenco, treinando ou não nesta semana (ver
    // aviso grande sobre FATIGUE_HISTORY_MAX no topo desta seção).
    p.fatigueHistory = p.fatigueHistory || [];
    p.fatigueHistory.push({ round: CAREER.currentRound, fadiga: Math.round(100 - cond) });
    if (p.fatigueHistory.length > FATIGUE_HISTORY_MAX) p.fatigueHistory.shift();
  });
  CAREER.trainingAppliedForRound = calendarTurnKey();
  // Retenção/Engajamento — "Treine 1 jogador" (objetivo diário) conta
  // a SEMANA aplicada como 1 evento (não 1 por jogador afetado, senão
  // uma semana de "misto" já bateria a meta sozinha de propósito).
  if (gains.size) { ensureObjectivesFresh(); bumpObjective("daily", "obj_train_1_player", 1); }
  return gains;
}
function defaultTrainingPlan(schemeId) {
  const scheme = TRAINING_SCHEMES.find((s) => s.id === schemeId) || TRAINING_SCHEMES[0];
  const plan = new Array(7);
  let di = 0;
  for (let i = 0; i < 7; i++) {
    if (i === TRAINING_GAME_DAY) plan[i] = { foco: "jogo" };
    else if (isProtectedTrainingDay(i)) plan[i] = { foco: "descanso" };
    else {
      plan[i] = { ...scheme.days[di++] };
      // Bloco 5 — duração default por intensidade (só informativo, ver
      // aviso no topo desta seção sobre TRAINING_DURATION_DEFAULT).
      plan[i].duracao = TRAINING_DURATION_DEFAULT[plan[i].intensidade] || 60;
    }
  }
  return plan;
}
function isProtectedTrainingDay(i) { return i === TRAINING_PRE_GAME_DAY || i === TRAINING_POST_GAME_DAY; }
`;

function refContext(rng) {
  const sb = { Math: Object.create(Math), console, Map, Set, JSON, String, Object, Array, Number };
  sb.Math.random = rng;
  vm.createContext(sb);
  vm.runInContext(REF_SRC, sb);
  return sb;
}

function squad(seed) {
  const r = seeded(seed);
  const origins = ["principal", "principal", "principal", "loan", "base"];
  return Array.from({ length: 26 }, (_, i) => {
    const p = { id: `p${i}`, name: `J${i}`, origin: origins[Math.floor(r() * origins.length)], group: ["G", "D", "M", "F"][i % 4], age: 17 + Math.floor(r() * 18),
      overall: 50 + Math.floor(r() * 42), atk: 40 + Math.floor(r() * 50), def: 40 + Math.floor(r() * 50), phys: 45 + Math.floor(r() * 50),
      potential: r() < 0.1 ? null : 60 + Math.floor(r() * 35), appsSeason: Math.floor(r() * 20), morale: r() < 0.2 ? null : Math.floor(r() * 100) };
    if (r() < 0.8) p.condition = Math.floor(30 + r() * 70);
    if (r() < 0.5) p.seasonGain = { overall: Math.floor(r() * 4), phys: Math.floor(r() * 3) };
    if (r() < 0.5) p.attrTrend = { overall: 0, atk: 1, def: 0, phys: -1 };
    if (r() < 0.3) p.moraleReason = r() < 0.5 ? "Cansado pelo desgaste dos treinos" : "Outro motivo";
    if (r() < 0.4) p.fatigueHistory = Array.from({ length: Math.floor(r() * 17) }, (_, k) => ({ round: k, fadiga: 10 }));
    return p;
  });
}
const SCHEMES = ["equilibrio", "pre_jogo", "pretemporada", "recuperacao", "base_sub20"];
const SEEDS = Array.from({ length: 150 }, (_, i) => 9 + i * 2654435761 % 1000003);

(async () => {
  const T = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "treino.js")).href);
  const apply = (sq, patches) => sq.forEach((p) => Object.assign(p, patches.get(p.id)));

  await check("Plano de 7 dias dos 5 esquemas igual (folgas de sexta e domingo, jogo no sábado)", () => {
    const ref = refContext(Math.random);
    SCHEMES.forEach((s) => assert.deepStrictEqual(T.defaultTrainingPlan(s), JSON.parse(JSON.stringify(ref.defaultTrainingPlan(s)))));
  });

  await check("Semana de treino: mesmo elenco final (condição, atributos, teto da temporada, tendência, moral, histórico de fadiga) e mesmos ganhos — 5 esquemas, plano individual e pré-temporada", () => {
    for (const s of SEEDS) {
      const scheme = SCHEMES[s % 5];
      const sq = squad(s);
      const plan = clone(T.defaultTrainingPlan(scheme));
      if (s % 7 === 0) plan[1] = { foco: "tatico", intensidade: "intensa", grupo: "principal" };
      if (s % 11 === 0) plan[2] = { foco: "fisico", intensidade: "moderada", grupo: "individual", individualPlayerId: "p3" };
      const pre = s % 3 === 0, round = 1 + (s % 30);
      const ref = refContext(seeded(s));
      ref.PRESEASON = pre;
      ref.CAREER = { squad: clone(sq), trainingPlan: plan, currentRound: round, trainingAppliedForRound: null };
      vm.runInContext(`PRESEASON = ${pre}; CAREER = ${JSON.stringify(ref.CAREER)};`, ref);
      const refGains = vm.runInContext("applyWeeklyTraining()", ref);
      const refSquad = JSON.parse(vm.runInContext("JSON.stringify(CAREER.squad)", ref));
      const got = clone(sq);
      const { patches, gains } = T.trainingWeek({ plan, squad: got, roundsSoFar: round - 1, preseason: pre, round }, seeded(s));
      apply(got, patches);
      assert.deepStrictEqual(got, refSquad);
      assert.deepStrictEqual([...gains], [...refGains]);
    }
  });

  await check("Evolução natural por idade: mesmo elenco final (crescimento com tetos, declínio a partir de 30/32)", () => {
    for (const s of SEEDS) {
      const sq = squad(s + 1);
      const playedIds = sq.filter((_, i) => i % 2 === 0).map((p) => p.id);
      const round = 1 + (s % 38);
      const ref = refContext(seeded(s));
      vm.runInContext(`CAREER = ${JSON.stringify({ squad: sq, currentRound: round })};`, ref);
      vm.runInContext(`applyNaturalAgingEvolution(${JSON.stringify(playedIds.map((id) => ({ id })))})`, ref);
      const refSquad = JSON.parse(vm.runInContext("JSON.stringify(CAREER.squad)", ref));
      const got = clone(sq);
      apply(got, T.agingWeek({ squad: got, playedIds, roundsSoFar: round - 1 }, seeded(s)));
      assert.deepStrictEqual(got, refSquad);
    }
  });

  await check("Teto da temporada e ganho de treino: mesmas funções (faixas de idade, minutagem, faixa alta)", () => {
    const ref = refContext(Math.random);
    for (const s of SEEDS) {
      const p = squad(s)[s % 26];
      for (const r of [0, 5, 6, 20, 37]) assert.strictEqual(T.seasonGainRoom(p, "overall", r), ref.seasonGainRoom(clone(p), "overall", r));
      [70, 81, 89].forEach((v) => assert.strictEqual(T.highBandGainFactor(v), ref.highBandGainFactor(v)));
      const rr = refContext(seeded(s));
      assert.strictEqual(T.attributeTrainingGain(p.overall, 95, 4, seeded(s)), rr.attributeTrainingGain(p.overall, 95, 4));
    }
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
