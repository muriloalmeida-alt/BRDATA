/* ===================================================================
   MOTOR — PARTIDA AO VIVO (plano "sem página escondida", etapa D1, 09/11)
   -------------------------------------------------------------------
   A partida do seu time ao vivo, em blocos de 15 minutos, extraída de
   carreira.js sem mudar regra nem texto (os comentários de cada regra
   continuam junto dos atalhos em carreira.js):
   - início (adversário, os outros jogos da rodada), cada bloco (força,
     gols, chances, cartões, lesões, desgaste, estatísticas),
     substituição e tática no jogo;
   - fim do jogo: tabela, estatísticas, renda, histórico de confrontos,
     forma, moral, objetivos, evolução, o fechamento da rodada e a
     coletiva que o jogo pede;
   - a rodada: sem jogo seu, resolve na hora; com jogo seu, abre a
     partida ao vivo.

   O estado da partida (LIVE_MATCH) mora em motor/estado.js. O relógio é
   da tela (decisão de 09/11): o motor só resolve o próximo bloco quando
   pedem; apito, torcida, destaque de gol e timers ficam na página.
   Avisos viram o evento "aviso". A perna da Copa e o amistoso ao vivo
   terminam pela página até a etapa D2.
=================================================================== */
import { carreiraAtual, ligaAtual, todosTimes, timePorId, forcaMediaDoElenco, partidaAtual, definirPartida } from "./estado.js";
import { ensureObjectivesFresh, bumpObjective, trailingWinStreak, rankByPoints } from "./registro.js";
import { fmtBRL, abbreviateName } from "./texto.js";
import { ambiente, avisar, leagueSquadFor } from "./semana.js";
import { applyConditionRecovery, applyMatchWearChunk, attributeGoals, computeHumanStrength, finishRoundTail, freshCareerTotals, freshMatchBucket, pickCpuXI, resolveCpuFixture, resolveRoundInstant } from "./fechamento.js";
import * as financas from "./financas.js";
import * as partida from "./partida.js";
import * as tabela from "./tabela.js";
import * as treino from "./treino.js";
import * as registro from "./registro.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const teamById = (id) => timePorId(id);
const squadAvgOverallOf = (clubId) => forcaMediaDoElenco(clubId);

export const PRIME_AGE_MIN = 24, PRIME_AGE_MAX = 30;

export function playerComplaintFactor(p) {
  const age = p.age == null ? PRIME_AGE_MIN : p.age;
  const ageGap = age < PRIME_AGE_MIN ? (PRIME_AGE_MIN - age) : age > PRIME_AGE_MAX ? (age - PRIME_AGE_MAX) : 0;
  const ageFactor = clamp(1 - ageGap * 0.06, 0.25, 1);
  const overallFactor = clamp((p.overall - 55) / 30, 0.25, 1);
  return clamp(ageFactor * overallFactor, 0.15, 1);
}

export function applyMoraleAfterMatch(myGoals, oppGoals) {
  const CAREER = carreiraAtual();
  const resultDelta = myGoals > oppGoals ? 3 : myGoals === oppGoals ? 0 : -3;
  const starterIds = new Set(CAREER.lineup.starters.filter(Boolean));
  const benchIds = new Set(CAREER.lineup.bench);
  CAREER.squad.forEach((p) => {
    const base = p.morale == null ? 70 : p.morale;
    let delta, reason;
    if (starterIds.has(p.id)) {
      delta = resultDelta + 2;
      p.benchStreak = 0;
      reason = resultDelta > 0 ? "Comemorando a vitória jogando entre os titulares"
        : resultDelta < 0 ? "Abalado com a derrota jogando entre os titulares"
        : "Neutro após o empate jogando entre os titulares";
    } else {
      p.benchStreak = (p.benchStreak || 0) + 1;
      // AJUSTE (pedido do usuário) — só a parte NEGATIVA de banco/fora
      // da lista é amortecida pelo quanto esse jogador reclama; o
      // resultado da partida em si (resultDelta, quando aparece
      // metade dele pro banco) não muda com idade/overall — isso é só
      // "reclamar de não jogar", não reação ao placar.
      const complaint = playerComplaintFactor(p);
      if (benchIds.has(p.id)) {
        const benchPenalty = Math.round(-1 * complaint);
        delta = Math.round(resultDelta / 2) + benchPenalty;
        reason = p.benchStreak >= TALK_BENCH_STREAK_THRESHOLD
          ? `Insatisfeito no banco há ${p.benchStreak} jogos seguidos`
          : "Quer mais oportunidades como titular";
      } else {
        delta = Math.round(-2 * complaint);
        reason = p.benchStreak >= TALK_BENCH_STREAK_THRESHOLD
          ? `Contrariado por ficar fora da lista de jogo há ${p.benchStreak} rodadas`
          : "Fora da lista de jogo nessa rodada";
      }
    }
    // FASE1-MER (decisão do Murilo, 13/11): promessa feita na contratação.
    // Prometido titular e fora do time, ou rotação e fora da lista: a moral
    // cai mais, e com a promessa quebrada por algumas rodadas ele pede para
    // sair. Vale na temporada da contratação.
    const promessa = p.promessa && p.promessa.temporada === CAREER.seasonYear ? p.promessa.papel : null;
    const quebrada = (promessa === "titular" && !starterIds.has(p.id)) || (promessa === "rotacao" && !starterIds.has(p.id) && !benchIds.has(p.id));
    if (quebrada) {
      delta += promessa === "titular" ? PROMESSA_PENALIDADE_TITULAR : PROMESSA_PENALIDADE_ROTACAO;
      reason = promessa === "titular" ? "Prometeram que ele seria titular" : "Prometeram que ele estaria na rotação";
    }
    const newMorale = clamp(base + delta, 0, 100);
    p.moraleTrend = newMorale > base ? "subindo" : newMorale < base ? "caindo" : "estavel";
    p.morale = newMorale;
    p.moraleReason = reason;
    // Consequência de moral prolongada baixa pedida no documento (além
    // de já pesar no desempenho via moraleFactor, e de já poder travar
    // renovação em proposeRenewal): fica marcado como "pede
    // transferência" — só um alerta visível (Elenco + detalhe), sem
    // forçar listagem automática no mercado, que exigiria uma reescrita
    // maior do fluxo de vendas só pra essa flag.
    p.wantsTransfer = (p.benchStreak >= WANTS_TRANSFER_BENCH_STREAK && p.morale <= WANTS_TRANSFER_MORALE_MAX)
      || (quebrada && p.benchStreak >= PROMESSA_RODADAS_PEDE_SAIDA && p.morale <= PROMESSA_MORAL_PEDE_SAIDA);
  });
}

// Promessa de papel (FASE1-MER): quanto a mais a moral cai por partida e
// quando o jogador pede para sair.
export const PROMESSA_PENALIDADE_TITULAR = -4;
export const PROMESSA_PENALIDADE_ROTACAO = -2;
export const PROMESSA_RODADAS_PEDE_SAIDA = 3;
export const PROMESSA_MORAL_PEDE_SAIDA = 45;

export const TALK_BENCH_STREAK_THRESHOLD = 3;

export const WANTS_TRANSFER_BENCH_STREAK = 5;

export const WANTS_TRANSFER_MORALE_MAX = 20;

export function stadiumUpgradeBonusFor(club) {
  const CAREER = carreiraAtual();
  return CAREER && String(club.id) === String(CAREER.clubId) ? (CAREER.stadium?.capacityBonus || 0) : 0;
}

export const RECENT_FORM_MAX = 5;

export function pushRecentForm(pts) {
  const CAREER = carreiraAtual();
  CAREER.recentForm = CAREER.recentForm || [];
  CAREER.recentForm.push(pts);
  if (CAREER.recentForm.length > RECENT_FORM_MAX) CAREER.recentForm.shift();
}

export function computeTicketRevenue(club) {
  const CAREER = carreiraAtual();
  return financas.ticketRevenue(club, ambiente.rngDaChave(`stadium:${club.id}`), stadiumUpgradeBonusFor(club), CAREER.recentForm);
}

export const MAX_MATCH_LOG = 200;

export function applyNaturalAgingEvolution(playedThisRound) {
  const CAREER = carreiraAtual();
  const patches = treino.agingWeek({
    squad: CAREER.squad,
    playedIds: (playedThisRound || []).map((p) => p.id),
    roundsSoFar: CAREER.currentRound - 1,
  }, Math.random);
  CAREER.squad.forEach((p) => Object.assign(p, patches.get(p.id)));
}

export function attributeChances(starters, atkStrength, defStrength, chunkShare) {
  // ~38% das chances viram defesa do goleiro; o resto, chance perdida
  // (fora/travessão). Cálculo no motor (motor/partida.js, chanceEvents).
  return partida.chanceEvents(starters, atkStrength, defStrength, chunkShare, Math.random);
}

export function attributePenaltyMisses(starters, atkStrength, defStrength, chunkShare) {
  return partida.penaltyMissEvents(starters, chunkShare, Math.random);
}

export function freshTeamStats() {
  return {
    assists: 0, yellow: 0, red: 0, cleanSheets: 0,
    home: freshMatchBucket(), away: freshMatchBucket(),
    biggestWin: null, biggestLoss: null,
  };
}

export function bumpMatchBucket(bucket, myGoals, oppGoals) {
  bucket.j++;
  if (myGoals > oppGoals) bucket.v++;
  else if (myGoals === oppGoals) bucket.e++;
  else bucket.d++;
  bucket.gp += myGoals;
  bucket.gc += oppGoals;
}

export function tallyMatchOutcomeStats(myGoals, oppGoals, isHome, opponentId, round) {
  const CAREER = carreiraAtual();
  if (!CAREER.teamStats) CAREER.teamStats = freshTeamStats();
  if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
  const season = CAREER.teamStats, total = CAREER.careerTotals;
  // O retrospecto GERAL da temporada já mora em CAREER.standings[clubId]
  // (fonte única, ver applyResultToStandings/statsRecordBucket) —
  // teamStats só precisa do recorte mandante/visitante e do que
  // standings não tem (clean sheet, maior goleada/derrota). careerTotals
  // SIM precisa do geral próprio (nunca reseta, sem outra fonte de
  // verdade pra "soma de todas as temporadas").
  bumpMatchBucket(total, myGoals, oppGoals);
  const sideKey = isHome ? "home" : "away";
  if (!season[sideKey]) season[sideKey] = freshMatchBucket();
  if (!total[sideKey]) total[sideKey] = freshMatchBucket();
  bumpMatchBucket(season[sideKey], myGoals, oppGoals);
  bumpMatchBucket(total[sideKey], myGoals, oppGoals);
  if (oppGoals === 0) { season.cleanSheets = (season.cleanSheets || 0) + 1; total.cleanSheets = (total.cleanSheets || 0) + 1; }
  const diff = myGoals - oppGoals;
  const opponent = teamById(opponentId);
  const matchInfo = { gf: myGoals, ga: oppGoals, opponentId, opponentName: opponent.short || opponent.name, round, seasonYear: CAREER.seasonYear, home: isHome };
  if (diff > 0) {
    if (!season.biggestWin || diff > (season.biggestWin.gf - season.biggestWin.ga)) season.biggestWin = matchInfo;
    if (!total.biggestWin || diff > (total.biggestWin.gf - total.biggestWin.ga)) total.biggestWin = matchInfo;
  } else if (diff < 0) {
    if (!season.biggestLoss || diff < (season.biggestLoss.gf - season.biggestLoss.ga)) season.biggestLoss = matchInfo;
    if (!total.biggestLoss || diff < (total.biggestLoss.gf - total.biggestLoss.ga)) total.biggestLoss = matchInfo;
  }
  // Sequências: rodam por PASSAGEM no clube, sem reset na virada de
  // temporada (uma sequência de vitórias que atravessa 2 temporadas é
  // real) — só o RECORDE (longestX) mora em careerTotals; o "atual" é
  // um contador vivo à parte (ver CAREER.currentWinStreak).
  CAREER.currentWinStreak = diff > 0 ? (CAREER.currentWinStreak || 0) + 1 : 0;
  CAREER.currentUnbeatenStreak = diff >= 0 ? (CAREER.currentUnbeatenStreak || 0) + 1 : 0;
  total.longestWinStreak = Math.max(total.longestWinStreak || 0, CAREER.currentWinStreak);
  total.longestUnbeatenStreak = Math.max(total.longestUnbeatenStreak || 0, CAREER.currentUnbeatenStreak);
}

// Os degraus e a regra moram no núcleo puro (partida.js), também usado pelo
// Pré-jogo da v2 (AVISO-MOTIVADO).
export const OPPONENT_MOTIVATION_STREAK_STEPS = partida.OPPONENT_MOTIVATION_STREAK_STEPS;

export function opponentMotivationMod() {
  const CAREER = carreiraAtual();
  return partida.motivacaoDoAdversario(CAREER.currentUnbeatenStreak || 0);
}

export function tallyTeamStats(events) {
  const CAREER = carreiraAtual();
  if (!events || !events.length) return;
  if (!CAREER.teamStats) CAREER.teamStats = freshTeamStats();
  if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
  events.forEach((e) => {
    // AJUSTE (Play-by-Play v1) — assistência não é mais um evento
    // separado ("assistencia"), virou o campo assistPlayer do próprio
    // evento "gol" (ver attributeGoals) — conta daqui agora.
    if (e.type === "gol" && e.assistPlayer) { CAREER.teamStats.assists++; CAREER.careerTotals.assists++; }
    else if (e.type === "amarelo") { CAREER.teamStats.yellow++; CAREER.careerTotals.yellow++; }
    else if (e.type === "vermelho") { CAREER.teamStats.red++; CAREER.careerTotals.red++; }
  });
}

export const PRESS_LIBRARY = [
  { id: "01", gatilho: "Pós-vitória (jogo comum)", pergunta: "Como avalia a vitória de hoje?", respostas: [
    { letra: "A", texto: "Fizemos o trabalho que planejamos, e o time merece o crédito.", reputacao: 1, moral: 1 },
    { letra: "B", texto: "Vitória importante, mas o foco já é o próximo jogo.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Vencemos, mas ainda temos muito o que corrigir.", reputacao: -1, moral: -1 },
  ] },
  { id: "02", gatilho: "Pós-derrota (jogo comum)", pergunta: "O que faltou pra evitar a derrota hoje?", respostas: [
    { letra: "A", texto: "Erramos em detalhes, mas a postura do time foi correta.", reputacao: 0, moral: 1 },
    { letra: "B", texto: "Faltou eficiência nas finalizações, vamos trabalhar isso.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Fomos superados, e isso preocupa pra próxima rodada.", reputacao: -1, moral: -2 },
  ] },
  { id: "03", gatilho: "Pós-empate segurando resultado fora", pergunta: "Um ponto fora de casa, como avalia?", respostas: [
    { letra: "A", texto: "Achamos que o ponto foi justo pelo que o time apresentou.", reputacao: 1, moral: 1 },
    { letra: "B", texto: "Queríamos os três pontos, mas empatar fora não é ruim.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Empate parece pouco pra qualidade que temos no elenco.", reputacao: -1, moral: -1 },
  ] },
  { id: "04", gatilho: "Clássico vencido", pergunta: "Vencer o clássico muda alguma coisa na temporada?", respostas: [
    { letra: "A", texto: "Todo clássico tem peso extra, e o time respondeu à altura.", reputacao: 2, moral: 2 },
    { letra: "B", texto: "Foram 3 pontos importantes, como qualquer outro jogo.", reputacao: 0, moral: 1 },
    { letra: "C", texto: "Já viramos a página, o próximo jogo é o que importa agora.", reputacao: 0, moral: 0 },
  ] },
  { id: "05", gatilho: "Clássico perdido", pergunta: "Como lidar com a pressão da torcida após perder o clássico?", respostas: [
    { letra: "A", texto: "Entendo a cobrança, e vamos trabalhar pra reverter isso.", reputacao: 0, moral: 0 },
    { letra: "B", texto: "Foi um jogo só, não vou dramatizar o resultado.", reputacao: -1, moral: 0 },
    { letra: "C", texto: "A arbitragem prejudicou o time em lances decisivos.", reputacao: -2, moral: 1 },
  ] },
  { id: "06", gatilho: "Título conquistado", pergunta: "O que representa esse título pra sua carreira?", respostas: [
    { letra: "A", texto: "É o resultado de um trabalho coletivo, divido esse mérito com o elenco.", reputacao: 3, moral: 3 },
    { letra: "B", texto: "É uma conquista importante, mas já penso na próxima temporada.", reputacao: 2, moral: 1 },
    { letra: "C", texto: "Mereço esse título depois de tudo que construí aqui.", reputacao: 1, moral: -1 },
  ] },
  { id: "07", gatilho: "Vice-campeonato", pergunta: "Ficar em segundo lugar é uma frustração?", respostas: [
    { letra: "A", texto: "Chegar à final já mostra a evolução do time neste ano.", reputacao: 1, moral: 2 },
    { letra: "B", texto: "É frustrante, mas vamos aprender com isso.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Perder a taça assim dói, e o elenco sabe disso.", reputacao: -1, moral: -1 },
  ] },
  { id: "08", gatilho: "Zona de rebaixamento", pergunta: "O time está na zona de rebaixamento, qual é o plano?", respostas: [
    { letra: "A", texto: "Confio no elenco, e vamos reagir rodada a rodada.", reputacao: 0, moral: 1 },
    { letra: "B", texto: "Precisamos de reforços urgentes pra sair dessa situação.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "A situação é grave, e cobranças internas vão acontecer.", reputacao: -1, moral: -2 },
  ] },
  { id: "09", gatilho: "Lanterna vence e reage", pergunta: "Essa vitória muda o cenário do time na tabela?", respostas: [
    { letra: "A", texto: "É o primeiro passo de uma reação que o elenco acredita ser possível.", reputacao: 1, moral: 2 },
    { letra: "B", texto: "Um resultado positivo, mas a tabela ainda preocupa.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Vencer não resolve tudo, ainda há muito trabalho pela frente.", reputacao: -1, moral: -1 },
  ] },
  { id: "10", gatilho: "Zebra sofrida (perdeu pra time azarão)", pergunta: "Como explica a derrota pra um adversário mais fraco no papel?", respostas: [
    { letra: "A", texto: "Futebol não se joga no papel, e o adversário mereceu.", reputacao: 0, moral: 0 },
    { letra: "B", texto: "Foi um dia ruim, vamos analisar o que houve.", reputacao: 0, moral: -1 },
    { letra: "C", texto: "Time entrou desmotivado, e isso é inaceitável.", reputacao: -1, moral: -2 },
  ] },
  { id: "11", gatilho: "Zebra aplicada (venceu favorito)", pergunta: "Essa vitória sobre um adversário mais forte surpreende?", respostas: [
    { letra: "A", texto: "O time acreditou do início ao fim, e mereceu o resultado.", reputacao: 2, moral: 2 },
    { letra: "B", texto: "Jogamos dentro do nosso plano, e deu certo.", reputacao: 1, moral: 1 },
    { letra: "C", texto: "Foi sorte em alguns lances, mas vamos aproveitar o resultado.", reputacao: 0, moral: 0 },
  ] },
  { id: "12", gatilho: "Goleada aplicada", pergunta: "Uma goleada dessas fortalece o time pra sequência?", respostas: [
    { letra: "A", texto: "É um resultado que mostra o potencial do elenco quando tudo funciona.", reputacao: 2, moral: 2 },
    { letra: "B", texto: "Bom resultado, mas cada jogo é uma história diferente.", reputacao: 1, moral: 0 },
    { letra: "C", texto: "Aproveitamos os erros do adversário, nada mais que isso.", reputacao: 0, moral: 0 },
  ] },
  { id: "13", gatilho: "Goleada sofrida", pergunta: "Como o vestiário reage a uma derrota tão elástica?", respostas: [
    { letra: "A", texto: "Vamos conversar internamente e corrigir o que for necessário.", reputacao: 0, moral: 0 },
    { letra: "B", texto: "Foi um resultado muito acima do que o jogo mostrou.", reputacao: -1, moral: -1 },
    { letra: "C", texto: "Resultado inaceitável pra um time com esse elenco.", reputacao: -2, moral: -2 },
  ] },
  { id: "14", gatilho: "Fim de jejum sem vitória", pergunta: "Depois de tantos jogos sem vencer, o que mudou hoje?", respostas: [
    { letra: "A", texto: "O time trabalhou a semana toda pra reverter essa fase.", reputacao: 1, moral: 2 },
    { letra: "B", texto: "Uma vitória importante pra aliviar a pressão recente.", reputacao: 0, moral: 1 },
    { letra: "C", texto: "Já estava demorando, mas o resultado é o que importa.", reputacao: 0, moral: 0 },
  ] },
  { id: "15", gatilho: "Contratação polêmica anunciada", pergunta: "A torcida reagiu dividida à contratação, como você vê isso?", respostas: [
    { letra: "A", texto: "Confio no trabalho de análise que nos trouxe até esse nome.", reputacao: 1, moral: 0 },
    { letra: "B", texto: "Toda contratação gera opinião dividida, o campo vai responder.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "Não decido escalação com base em opinião de torcida.", reputacao: -1, moral: 0 },
  ] },
  { id: "16", gatilho: "Venda de jogador querido pela torcida", pergunta: "Como justifica a saída de um ídolo recente do elenco?", respostas: [
    { letra: "A", texto: "Foi uma decisão difícil, mas necessária pro planejamento do clube.", reputacao: 0, moral: -1 },
    { letra: "B", texto: "Entendemos o carinho da torcida, mas o negócio fazia sentido.", reputacao: 0, moral: -1 },
    { letra: "C", texto: "Decisões de mercado não cabem a mim, é decisão da diretoria.", reputacao: -1, moral: -1 },
  ] },
  { id: "17", gatilho: "Jovem da base estreando bem", pergunta: "O que esperar desse jovem que se destacou hoje?", respostas: [
    { letra: "A", texto: "É fruto de um trabalho de formação que o clube vem fazendo.", reputacao: 2, moral: 2 },
    { letra: "B", texto: "Tem potencial, mas o caminho ainda é longo.", reputacao: 1, moral: 1 },
    { letra: "C", texto: "Vamos com cautela pra não queimar etapas dele.", reputacao: 0, moral: 0 },
  ] },
  { id: "18", gatilho: "Lesão de jogador-chave", pergunta: "Qual o impacto da lesão do titular pro restante da temporada?", respostas: [
    { letra: "A", texto: "É uma perda sensível, mas o elenco está preparado pra repor.", reputacao: 0, moral: 0 },
    { letra: "B", texto: "Vamos aguardar o diagnóstico antes de qualquer conclusão.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "É um golpe duro, e isso vai pesar nos próximos jogos.", reputacao: -1, moral: -2 },
  ] },
  { id: "19", gatilho: "Renovação de contrato recusada por jogador", pergunta: "Como lida com a recusa de renovação de um titular?", respostas: [
    { letra: "A", texto: "Respeito a decisão, e o foco continua sendo o time.", reputacao: 0, moral: 0 },
    { letra: "B", texto: "Vamos seguir conversando até o fim do vínculo atual.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "É frustrante perder um jogador importante dessa forma.", reputacao: -1, moral: -1 },
  ] },
  { id: "20", gatilho: "Meta da diretoria em risco", pergunta: "A diretoria estabeleceu uma meta pra temporada, ela está em risco?", respostas: [
    { letra: "A", texto: "Ainda temos rodadas suficientes pra buscar o que foi combinado.", reputacao: 0, moral: 1 },
    { letra: "B", texto: "A meta é desafiadora, mas seguimos trabalhando pra alcançá-la.", reputacao: 0, moral: 0 },
    { letra: "C", texto: "A cobrança existe, e sei que meu cargo depende do resultado.", reputacao: -1, moral: -1 },
  ] },
  { id: "21", gatilho: "Virada dramática nos acréscimos", pergunta: "Um gol nos acréscimos, como descreve esse momento?", respostas: [
    { letra: "A", texto: "É a recompensa pela insistência do time até o apito final.", reputacao: 2, moral: 3 },
    { letra: "B", texto: "Foi emocionante, mas vamos manter os pés no chão.", reputacao: 1, moral: 1 },
    { letra: "C", texto: "Tivemos sorte no lance, mas o resultado ficou com a gente.", reputacao: 0, moral: 0 },
  ] },
];

export function pressLibraryEntry(id) {
  return PRESS_LIBRARY.find((e) => e.id === id) || null;
}

export const PRESS_PRIORITY = { "06": 1, "07": 2, "04": 3, "05": 4, "09": 5, "18": 6, "21": 7, "11": 8, "12": 9, "17": 10, "08": 11, "10": 12, "13": 13, "14": 14, "20": 15, "03": 16, "01": 17, "02": 18 };

export const PRESS_ALWAYS_IDS = new Set(["06", "07", "04", "05"]);

export const PRESS_CHANCE_BY_ID = {
  "18": 0.6, "21": 0.6, "11": 0.6, "12": 0.6, "17": 0.6, "10": 0.6, "13": 0.6, "14": 0.6,
  "08": 0.3, "20": 0.3, "03": 0.3, "01": 0.3, "02": 0.3,
};

export const BIG_CLUB_NAME_FRAGMENTS = ["flamengo", "palmeiras", "corinthians", "são paulo", "sao paulo", "grêmio", "gremio", "internacional", "cruzeiro", "atlético-mg", "atletico-mg", "atlético mineiro", "atletico mineiro", "vasco", "botafogo", "fluminense", "santos"];

export function isBigClub(clubId) {
  const name = (teamById(clubId).name || "").toLowerCase();
  return BIG_CLUB_NAME_FRAGMENTS.some((f) => name.includes(f));
}

export const PRESS_META_RISK_GAP = 4; // posições abaixo da meta pra contar como "em risco" (ver gatilho 20)

export function determineMatchPressTrigger(ctx) {
  const CAREER = carreiraAtual();
  const { myGoals, oppGoals, isHome, myClubId, oppClubId, winlessBefore, injuredBeforeIds, events, roundPlayed } = ctx;
  const won = myGoals > oppGoals, lost = myGoals < oppGoals, drew = myGoals === oppGoals;
  const margin = Math.abs(myGoals - oppGoals);
  const myOvr = squadAvgOverallOf(myClubId), oppOvr = squadAvgOverallOf(oppClubId);
  const posAfter = rankByPoints(CAREER.standings);
  const total = Object.keys(posAfter).length;
  const myPosAfter = posAfter[String(myClubId)];
  const candidates = [];
  // Título/vice só na última rodada da temporada (proxy: posição final
  // na tabela — clinch matemático antecipado exigiria simular as
  // rodadas restantes, fora de escopo).
  if (roundPlayed >= 38) {
    if (myPosAfter === 1) candidates.push("06");
    else if (myPosAfter === 2) candidates.push("07");
  }
  if (isBigClub(oppClubId)) { if (won) candidates.push("04"); else if (lost) candidates.push("05"); }
  // Lesão de jogador-chave: alguém ficou contundido NESSA partida (não
  // estava contundido antes, ver injuredBeforeIds) e é "chave" (entre
  // os titulares de maior overall do elenco principal).
  const chaveIds = new Set(CAREER.squad.filter((p) => p.origin === "principal").sort((a, b) => b.overall - a.overall).slice(0, 5).map((p) => p.id));
  const newlyInjured = CAREER.squad.some((p) => p.status === "contundido" && chaveIds.has(p.id) && !injuredBeforeIds.has(p.id));
  if (newlyInjured) candidates.push("18");
  // Virada dramática: gol MEU nos acréscimos (minuto 90, ver
  // LIVE_MATCH_CHUNK_MINUTES) que não terminou em derrota.
  const lateMineGoal = (events || []).some((e) => e.type === "gol" && e.mine === true && e.minute === 90);
  if (lateMineGoal && !lost) candidates.push("21");
  if (won && myOvr != null && oppOvr != null && myOvr <= oppOvr - registro.ZEBRA_OVR_GAP) candidates.push("11");
  if (won && margin >= 3) candidates.push("12");
  // Jovem da base estreando bem: marcou ou deu assistência NESSE jogo,
  // é da base e é literalmente o primeiro jogo dele (apps já
  // incrementado pra 1 pelo wear chunk desse mesmo jogo).
  // AJUSTE (Play-by-Play v1) — assistência agora é o campo
  // assistPlayer do evento "gol" (ver attributeGoals), não mais um
  // evento "assistencia" separado — checa os dois nomes no mesmo evento.
  const debutStar = (events || []).some((e) => e.type === "gol" && e.mine === true
    && CAREER.squad.some((p) => (p.name === e.player || p.name === e.assistPlayer) && p.origin === "base" && p.apps === 1));
  if (debutStar) candidates.push("17");
  if (myPosAfter != null && myPosAfter > total - 4) candidates.push("08");
  if (lost && myOvr != null && oppOvr != null && myOvr >= oppOvr + registro.ZEBRA_OVR_GAP) candidates.push("10");
  if (lost && margin >= 3) candidates.push("13");
  if (won && winlessBefore >= registro.WINLESS_STREAK_THRESHOLD) candidates.push("14");
  // Meta em risco: só dispara 1x por temporada (senão repetiria toda
  // rodada enquanto o time seguir mal na tabela) — marca
  // metaRiskWarnedSeason só quando REALMENTE dispara (não quando só
  // virou candidata e perdeu a prioridade ou o sorteio de chance pra
  // outro gatilho), senão a temporada ficaria "queimada" sem o
  // jornalista ter perguntado nada sobre isso ainda.
  const goal = CAREER.boardGoal;
  const metaEmRisco = goal && myPosAfter != null && myPosAfter > goal.target + PRESS_META_RISK_GAP && CAREER.metaRiskWarnedSeason !== CAREER.seasonYear;
  if (metaEmRisco) candidates.push("20");
  if (drew && !isHome) candidates.push("03");
  if (won) candidates.push("01");
  if (lost) candidates.push("02");
  if (!candidates.length) return null;
  candidates.sort((a, b) => PRESS_PRIORITY[a] - PRESS_PRIORITY[b]);
  const chosen = candidates[0];
  if (!PRESS_ALWAYS_IDS.has(chosen) && Math.random() > (PRESS_CHANCE_BY_ID[chosen] || 0.3)) return null;
  if (chosen === "20") CAREER.metaRiskWarnedSeason = CAREER.seasonYear;
  return pressLibraryEntry(chosen);
}

export const LIVE_MATCH_CHUNK_MINUTES = [15, 30, 45, 60, 75, 90];

export const MAX_SUBS_PER_MATCH = 5;

export const LIVE_TACTICS_FAMILIARITY_PENALTY_CHUNKS = 2;

export function updateLiveStats(lm, hs, as, chunkShare, chancesHome, chancesAway, ghChunk, gaChunk) {
  // Posse ponderada pela fração de cada tempo (chunkShareSum normaliza a
  // posse em tempo real, ver renderLiveMatch); finalizações e faltas
  // somam. Cálculo no motor (motor/partida.js, addChunkStats).
  lm.stats = partida.addChunkStats(lm.stats, hs, as, chunkShare, chancesHome, chancesAway, ghChunk, gaChunk, Math.random);
}

export function applyLiveSub(lm, outId, inId) {
  const CAREER = carreiraAtual();
  const outIdx = CAREER.lineup.starters.indexOf(outId);
  if (outIdx < 0) return "fora-de-campo";
  const outPlayer = CAREER.squad.find((p) => p.id === outId);
  const inPlayer = CAREER.squad.find((p) => p.id === inId);
  if (!outPlayer || !inPlayer) return "sem-jogador";
  CAREER.lineup.starters[outIdx] = inId;
  CAREER.lineup.bench = CAREER.lineup.bench.filter((id) => id !== inId);
  CAREER.lineup.bench.push(outId);
  lm.subsUsed++;
  const minute = lm.chunkIndex === 0 ? 0 : LIVE_MATCH_CHUNK_MINUTES[lm.chunkIndex - 1];
  lm.events.push({ type: "substituicao", saiu: outPlayer.name, entra: inPlayer.name, minute, mine: true });
  return null;
}

export function applyLiveTactics(lm, newFormation, axes) {
  const CAREER = carreiraAtual();
  if (newFormation !== CAREER.lineup.formation) {
    CAREER.lineup.formation = newFormation;
    lm.formationPenaltyChunksLeft = LIVE_TACTICS_FAMILIARITY_PENALTY_CHUNKS;
    avisar("Esquema alterado — o time perde um pouco de efetividade até se ajustar.");
  }
  Object.assign(CAREER.lineup.tactics, axes);
}

export const MAN_MARKING_SUPPRESS_FACTOR = 0.4; // 60% de redução no peso de sorteio, nunca 100%

export function activeManMarkingSuppression(opponentId) {
  const CAREER = carreiraAtual();
  const mm = CAREER.manMarking;
  if (!mm || String(mm.opponentId) !== String(opponentId)) return null;
  return { playerId: mm.rivalPlayerId, factor: MAN_MARKING_SUPPRESS_FACTOR };
}

// ---------- A partida: as partes de regra de startLiveMatch,
// resolveLiveChunk, finishLiveMatch e simulateRound (carreira.js) ----------
// O texto das regras é o de antes; o que era tela (abrir o overlay, apito,
// torcida, desenhar o placar, timers, destaque de gol, modais) continua na
// página, que chama estas funções.

const applyResultToStandings = (r, standings = carreiraAtual().standings) => { tabela.applyResult(standings, r); };

// Início: adversário, XI do adversário e os outros jogos da rodada.
// Monta o LIVE_MATCH (motor/estado.js) e o devolve.
export function iniciarPartida(round, fixtures, humanFx, standingsBefore) {
  const CAREER = carreiraAtual();
  const isHome = String(humanFx.home) === String(CAREER.clubId);
  const home = teamById(humanFx.home), away = teamById(humanFx.away);
  const cpuTeamId = isHome ? humanFx.away : humanFx.home;
  // XI do adversário CPU sorteado uma vez só e mantido fixo a partida
  // inteira (pickCpuXI é determinístico pro squad atual — recalcular a
  // cada tempo só re-selecionaria o mesmo time mesmo, mas fixar deixa
  // a intenção clara: só o SEU lado pode mudar de gente em campo).
  const cpuXI = pickCpuXI(leagueSquadFor(cpuTeamId));
  const otherResults = fixtures.filter((fx) => fx !== humanFx).map((fx) => resolveCpuFixture(fx, round));
  return definirPartida({
    round, humanFx, isHome, home, away, cpuXI, otherResults, standingsBefore,
    chunkIndex: 0, gh: 0, ga: 0, events: [], appeared: new Set(),
    subsUsed: 0, subsBonus: 0, formationPenaltyChunksLeft: 0,
    lastHsStarters: [], lastAsStarters: [],
    timerId: null, paused: false, finished: false,
    // AJUSTE (Play-by-Play v1) — velocidade de reprodução (1x/2x, ver
    // .mt-live-speed em carreira.html/scheduleNextChunk) e
    // estatísticas agregadas decorativas (posse/finalizações/faltas,
    // ver updateLiveStats/resolveLiveChunk — documento seção 5/9,
    // "stats" da Match Timeline). Fila de destaques de gol em tela
    // cheia (ver queueGoalHighlights) fica vazia até o 1º gol.
    speed: 1,
    stats: { possWeightHome: 0, shots: { home: 0, away: 0 }, shotsOnTarget: { home: 0, away: 0 }, fouls: { home: 0, away: 0 } },
    goalHighlightQueue: [], goalHighlightOnDone: null, goalHighlightTimer: null,
    // FASE 4 (item 2) — coletiva de imprensa: quem já estava contundido
    // ANTES dessa partida, pra distinguir de quem se machucou NELA (ver
    // gatilho "18" em determineMatchPressTrigger, chamada de dentro de
    // finishLiveMatch).
    injuredBeforeIds: new Set(CAREER.squad.filter((p) => p.status === "contundido").map((p) => p.id)),
  });
}

// Um bloco de 15 minutos da partida em andamento. Devolve o minuto e os
// lances do bloco; quem chamou decide o que vem depois (intervalo, próximo
// bloco, fim) e mostra.
export function resolverBloco() {
  const CAREER = carreiraAtual();
  const lm = partidaAtual();
  if (!lm || lm.finished) return null;
  const round = lm.round;
  const prevMinute = lm.chunkIndex === 0 ? 0 : LIVE_MATCH_CHUNK_MINUTES[lm.chunkIndex - 1];
  const minute = LIVE_MATCH_CHUNK_MINUTES[lm.chunkIndex];
  const chunkShare = (minute - prevMinute) / 90;
  // computeHumanStrength lê CAREER.lineup/tactics NA HORA — é por isso
  // que uma substituição/troca de tática feita na pausa já entra em
  // vigor no próximo tempo sem precisar de nenhum código extra aqui.
  const hs = lm.isHome ? computeHumanStrength(lm.home) : { atk: lm.home.atk, def: lm.home.def, starters: lm.cpuXI };
  const as = lm.isHome ? { atk: lm.away.atk, def: lm.away.def, starters: lm.cpuXI } : computeHumanStrength(lm.away);
  const humanSide = lm.isHome ? hs : as;
  if (lm.formationPenaltyChunksLeft > 0) {
    // GE-BALANCE-003 (issue #30) — penalidade simétrica em atk+def:
    // atk pior (menor, /=0.92 equivale a *0.92... mantido *= porque
    // maior=melhor pra atk) continua igual; def PIOR precisa de um
    // número MAIOR (menor = defesa melhor, ver comentário em
    // simulateCupLeg) — por isso def usa /= em vez de *=.
    Object.assign(humanSide, partida.withFormationPenalty(humanSide));
    lm.formationPenaltyChunksLeft--;
  }
  // GE-BALANCE-001 (issue #26) — adversário motivado contra sequência
  // longa de invencibilidade do clube humano (ver opponentMotivationMod)
  // — só Brasileirão, de propósito (CAREER.currentUnbeatenStreak não é
  // somado nem lido pela Copa, ver GE-COPA-001/finishCupLegLive).
  const cpuSide = lm.isHome ? as : hs;
  const motivationMod = lm.cupContext || lm.friendlyContext ? 1 : opponentMotivationMod();
  // GE-BALANCE-003 (issue #30) — mesmo motivo do formationPenalty acima:
  // "adversário mais ligado" precisa de um def MENOR (defesa melhor),
  // por isso def usa /= em vez de *= (atk continua *=, maior=melhor).
  Object.assign(cpuSide, partida.withMotivation(cpuSide, motivationMod));
  // GE-BALANCE-003 (issue #30) — ver comentário em simulateCupLeg.
  const { gh: ghChunk, ga: gaChunk } = partida.scoreGoals(hs, as, chunkShare, Math.random);
  const wearHome = applyMatchWearChunk(hs.starters, round, chunkShare, lm.appeared);
  const wearAway = applyMatchWearChunk(as.starters, round, chunkShare, lm.appeared);
  const myRedIds = lm.isHome ? wearHome.redCardIds : wearAway.redCardIds;
  if (myRedIds.length) lm.subsBonus += myRedIds.length;
  lm.gh += ghChunk; lm.ga += gaChunk;
  // AJUSTE (Play-by-Play v1) — chance perdida/defesa (camada
  // decorativa, ver attributeChances) + estatísticas agregadas
  // (ver updateLiveStats) NÃO tocam lambdaHome/lambdaAway nem
  // ghChunk/gaChunk — só enriquecem o feed e o resumo de fim de jogo.
  const chancesHome = attributeChances(hs.starters, hs.atk, as.def, chunkShare);
  const chancesAway = attributeChances(as.starters, as.atk, hs.def, chunkShare);
  // AJUSTE (Play-by-Play v2, catálogo PENALTY_MISSED) — par
  // PENALTY_AWARDED+PENALTY_MISSED, 100% decorativo (ver
  // attributePenaltyMisses — nunca vira gol, então nunca precisa
  // tocar no placar).
  const penMissHome = attributePenaltyMisses(hs.starters, hs.atk, as.def, chunkShare);
  const penMissAway = attributePenaltyMisses(as.starters, as.atk, hs.def, chunkShare);
  updateLiveStats(lm, hs, as, chunkShare, chancesHome, chancesAway, ghChunk, gaChunk);
  // Nova feature — Marcação individual: suprime (nunca anula) o
  // jogador do RIVAL escolhido pro técnico marcar, só na partida contra
  // ESSE adversário específico (ver activeManMarkingSuppression).
  const opponentId = lm.isHome ? lm.away.id : lm.home.id;
  const markSuppress = activeManMarkingSuppression(opponentId);
  const goalsHome = attributeGoals(hs.starters, ghChunk, lm.isHome ? null : markSuppress).map((e) => ({ ...e, mine: lm.isHome }));
  const goalsAway = attributeGoals(as.starters, gaChunk, lm.isHome ? markSuppress : null).map((e) => ({ ...e, mine: !lm.isHome }));
  // AJUSTE (Play-by-Play v2, catálogo VAR_CHECK) — depois de um gol,
  // ~12% de chance do lance ser checado no VAR — SEMPRE confirma a
  // decisão em campo (nunca anula um gol já contado no placar, decisão
  // nossa pra não precisar desfazer um gol já creditado — ver
  // comentário no topo de attributeGoals sobre pênalti pelo mesmo
  // motivo).
  const varEvents = partida.varCheckEvents([...goalsHome, ...goalsAway], Math.random);
  const chunkEvents = [
    ...goalsHome, ...goalsAway,
    ...varEvents,
    ...chancesHome.map((e) => ({ ...e, mine: lm.isHome })),
    ...chancesAway.map((e) => ({ ...e, mine: !lm.isHome })),
    ...penMissHome.map((e) => ({ ...e, mine: lm.isHome })),
    ...penMissAway.map((e) => ({ ...e, mine: !lm.isHome })),
    ...wearHome.events.map((e) => ({ ...e, mine: lm.isHome })),
    ...wearAway.events.map((e) => ({ ...e, mine: !lm.isHome })),
  ].map((e) => ({ ...e, minute }));
  lm.events.push(...chunkEvents);
  lm.lastHsStarters = hs.starters; lm.lastAsStarters = as.starters;
  lm.chunkIndex++;
  return { minute, chunkEvents };
}

// Fim do jogo (Brasileirão): placar na tabela, estatísticas, renda, histórico
// de confrontos, forma, moral, objetivos, evolução e o fechamento da rodada.
// Devolve o resumo da rodada e a coletiva que o jogo pede (ou null); a
// página abre a coletiva, fecha a tela e grava.
export function encerrarPartida() {
  const CAREER = carreiraAtual();
  const lm = partidaAtual();
  lm.finished = true;
  const result = { home: lm.humanFx.home, away: lm.humanFx.away, gh: lm.gh, ga: lm.ga };
  // "substituicao"/"chance_perdida"/"defesa" só existem pro feed AO
  // VIVO (ver liveEventLabel) — igual lesão (ver comentário no topo de
  // applyMatchWearChunk), o modal de detalhe do jogo de sempre
  // (matchEventsSummaryHTML) só lista gol/cartão (Tela hifi-03 do
  // documento: "Artilheiros e cartões", não chance perdida/defesa).
  const summaryEvents = lm.events.filter((e) => e.type === "gol" || e.type === "amarelo" || e.type === "vermelho");
  if (summaryEvents.length) result.events = summaryEvents;
  applyResultToStandings(result);
  (CAREER.resultsByRound[lm.round] = CAREER.resultsByRound[lm.round] || []).push(result);
  // "Minha equipe" nas Estatísticas só soma o SEU lado, mesmo critério
  // de sempre (ver tallyTeamStats/resolveCpuFixture) — filtra pelos
  // eventos marcados "mine" durante os tempos (ver resolveLiveChunk).
  tallyTeamStats(lm.events.filter((e) => e.mine));
  // Quem nunca apareceu em nenhum tempo (reserva que ficou fora)
  // recupera condição no fim da partida, mesmo critério de sempre (ver
  // applyConditionRecovery) — só uma chamada (não uma por tempo) pra
  // não multiplicar a recuperação por 6.
  applyConditionRecovery(Array.from(lm.appeared));
  let ticketRevenue = null;
  if (lm.isHome) {
    ticketRevenue = computeTicketRevenue(lm.home);
    CAREER.finances.cash += ticketRevenue.revenue;
  }
  // AJUSTE (Play-by-Play v1) — stats agregadas (ver updateLiveStats,
  // consumidas pela Tela hifi-03/matchStatsBarsHTML) e a lista COMPLETA
  // de eventos, sem filtro (ver openMatchReplay/"Rever lances" — a
  // única tela que precisa ver chance perdida/defesa/substituição
  // também, não só gol/cartão).
  const stats = {
    possession: { home: Math.round(clamp(lm.stats.possWeightHome, 0, 1) * 100) },
    shots: lm.stats.shots, shotsOnTarget: lm.stats.shotsOnTarget, fouls: lm.stats.fouls,
  };
  stats.possession.away = 100 - stats.possession.home;
  const humanMatch = { ...result, isHome: lm.isHome, ticketRevenue, stats, allEvents: lm.events };
  // Nova feature — Histórico de confrontos (H2H, ver renderH2H()):
  // registra o resultado do SEU jogo pra sempre poder puxar o
  // retrospecto contra um adversário específico depois. unshift (mais
  // recente primeiro) — mesma convenção de CAREER.seasonHistory.
  CAREER.matchLog = CAREER.matchLog || [];
  CAREER.matchLog.unshift({
    seasonYear: CAREER.seasonYear, round: lm.round,
    opponentId: lm.isHome ? lm.humanFx.away : lm.humanFx.home,
    home: lm.isHome, gh: lm.gh, ga: lm.ga,
  });
  if (CAREER.matchLog.length > MAX_MATCH_LOG) CAREER.matchLog.length = MAX_MATCH_LOG;
  const myGoals = lm.isHome ? lm.gh : lm.ga, oppGoals = lm.isHome ? lm.ga : lm.gh;
  // Módulo de Estatísticas completo — V/E/D, clean sheet, mandante x
  // visitante, maior goleada/derrota e sequências (temporada + de
  // sempre, ver tallyMatchOutcomeStats).
  tallyMatchOutcomeStats(myGoals, oppGoals, lm.isHome, lm.isHome ? lm.humanFx.away : lm.humanFx.home, lm.round);
  pushRecentForm(myGoals > oppGoals ? 3 : myGoals === oppGoals ? 1 : 0);
  applyMoraleAfterMatch(myGoals, oppGoals);
  // Retenção/Engajamento — objetivos ligados ao resultado da SUA
  // partida (ver ensureObjectivesFresh/bumpObjective) + contadores de
  // temporada usados só no fim dela (ver evaluateSeasonEndAchievements
  // em advanceSeason) — gols/faltas do SEU lado apenas, mesmo recorte
  // de "Minha equipe" já usado em tallyTeamStats acima.
  ensureObjectivesFresh();
  if (myGoals > oppGoals) bumpObjective("daily", "obj_win_1_match", 1);
  if (myGoals >= oppGoals) bumpObjective("weekly", "obj_invicto_round", 1);
  const weeklyStreakObj = (CAREER.objectives.weekly || []).find((o) => o.objectiveId === "obj_win_3_streak");
  if (weeklyStreakObj && weeklyStreakObj.status === "in_progress") {
    weeklyStreakObj.currentProgress = Math.min(weeklyStreakObj.target, trailingWinStreak());
    if (weeklyStreakObj.currentProgress >= weeklyStreakObj.target) {
      weeklyStreakObj.status = "completed";
      avisar({ title: "Objetivo concluído!", detail: weeklyStreakObj.title }, { type: "pos" });
    }
  }
  CAREER.seasonTeamGoals = (CAREER.seasonTeamGoals || 0) + myGoals;
  CAREER.seasonTeamFouls = (CAREER.seasonTeamFouls || 0) + (lm.isHome ? lm.stats.fouls.home : lm.stats.fouls.away);
  // FASE 3 (item 4) — evolução natural por idade considera quem
  // terminou a partida em campo do seu lado (após eventuais
  // substituições).
  applyNaturalAgingEvolution(lm.isHome ? lm.lastHsStarters : lm.lastAsStarters);
  // FASE 4 (item 2) — jejum ANTES de finishRoundTail rodar (ver
  // updateWinlessStreaks, chamada de dentro de generateRoundNews logo
  // abaixo, que ZERA o jejum de quem venceu) — sem capturar aqui, não
  // dava mais pra saber "estava há quantos jogos sem vencer" depois.
  const winlessBefore = (CAREER.teamWinlessStreak || {})[String(CAREER.clubId)] || 0;
  const allResults = [...lm.otherResults, result];
  const summary = finishRoundTail(lm.round, allResults, humanMatch, lm.standingsBefore);
  // FASE 4 (item 2) — coletiva de imprensa pós-jogo (documento original
  // da Fase 4): decide se alguma situação da PRESS_LIBRARY bateu com
  // essa partida específica — se bateu, "Continuar" do modal "Seu
  // jogo" abre a coletiva ANTES de seguir pros Resultados da rodada
  // (ver btnMatchDetailContinue/closePressConferenceModal).
  const oppClubId = lm.isHome ? lm.humanFx.away : lm.humanFx.home;
  const trigger = determineMatchPressTrigger({
    myGoals, oppGoals, isHome: lm.isHome, myClubId: CAREER.clubId, oppClubId,
    winlessBefore, injuredBeforeIds: lm.injuredBeforeIds, events: lm.events, roundPlayed: lm.round,
  });
  return { summary, trigger };
}

// A rodada corrente: sem jogo seu, resolve na hora e devolve o resumo; com
// jogo seu, abre a partida ao vivo (`abrirAoVivo`, da tela) e devolve "live".
export function simulateRound(abrirAoVivo) {
  const CAREER = carreiraAtual();
  const round = CAREER.currentRound;
  if (round > 38) return null;
  const fixtures = CAREER.schedule[round] || [];
  // FASE 4 (item 3) — cópia da tabela ANTES de qualquer resultado dessa
  // rodada aplicar (ver applyResultToStandings, chamado fixture a
  // fixture) — sem isso não dá pra saber quem "virou líder" nessa
  // rodada especificamente (ver generateRoundNews).
  const standingsBefore = tabela.cloneStandings(CAREER.standings);
  const humanFx = fixtures.find((fx) => String(fx.home) === String(CAREER.clubId) || String(fx.away) === String(CAREER.clubId));
  if (!humanFx) return resolveRoundInstant(round, fixtures, standingsBefore);
  abrirAoVivo(round, fixtures, humanFx, standingsBefore);
  return "live";
}
