/* ===================================================================
   MOTOR — CALENDÁRIO DA CARREIRA NO MUNDO (MUNDO-001, M6b-2, 24/11/2026)
   -------------------------------------------------------------------
   Monta o calendário do save do mundo (CAREER.calendar) no formato que o
   motor já usa no Brasil (virada.buildSeasonCalendar): uma entrada por
   semana, { d: "MM-DD" da segunda-feira, p: fase do ano, r: rodada }, com
   dois campos novos:
   - a: o ano da semana (a temporada europeia cruza o ano);
   - j: janela de transferências do país aberta (1) ou fechada (0) naquela
     semana, pelas datas da FIFA do pacote (mercado.windowByCalendar).
   A temporada vai da pré-temporada (4 semanas antes do 1º jogo da liga do
   técnico) até a semana antes da pré-temporada seguinte.

   Rodadas: as da liga do técnico na agenda do relógio, numeradas em
   sequência (1..N) na ordem das semanas; fase e rodada de origem ficam no
   mapa (Apertura 1..16 e Clausura 1..16 viram 1..32). Semana com duas
   rodadas (meio e fim de semana) vira duas entradas com a mesma data, como
   a semana de Copa do Brasil (`c`) vira dois jogos. Jogo adiado fica na
   rodada dele (o motor joga por rodada).

   A outra divisão do país joga pelas datas: cada jogo vai para a entrada
   da semana dele (a 1ª entrada da semana). A etapa M6b-4 liga isso ao
   fechamento da rodada e da semana sem jogo.
   Módulo puro.
=================================================================== */
import * as Rel from "./relogio.js";

const somaAnos = (data, k) => `${Number(data.slice(0, 4)) + k}${data.slice(4)}`;

// Janela aberta na semana (segunda a domingo) se algum dia dela está numa
// janela [abre, fecha] (datas inclusivas).
function janelaNaSemana(semana, janelas) {
  const fim = new Date(Date.parse(semana + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);
  return janelas.some(([abre, fecha]) => abre <= fim && fecha >= semana) ? 1 : 0;
}

// o = {
//   agendaTecnico: Map (relógio) da liga do técnico nesta temporada,
//   agendaSeguinte: Map da mesma liga na temporada seguinte (para o fim),
//   outras: { liga: Map } (a outra divisão do país),
//   janelas: [[abre, fecha]] do país na temporada 1 (do índice),
//   k: temporadas desde a do pacote (desloca as janelas k anos),
//   preTemporada: semanas antes do 1º jogo (padrão do relógio),
// }
export function montarCalendarioDaCarreira(o) {
  const pre = o.preTemporada ?? Rel.SEMANAS_DE_PRE_TEMPORADA;
  const inicio = Rel.somarSemanas(Rel.primeiraSemana(o.agendaTecnico), -pre);
  const fim = o.agendaSeguinte ? Rel.somarSemanas(Rel.primeiraSemana(o.agendaSeguinte), -pre) : Rel.somarSemanas(Rel.ultimaSemana(o.agendaTecnico), 8);
  if (!(fim > inicio)) throw new Error("calendário: a temporada seguinte começa antes desta");
  const janelas = (o.janelas || []).map(([a, b]) => [somaAnos(a, o.k || 0), somaAnos(b, o.k || 0)]);

  // Rodadas da liga do técnico, em sequência, pela semana do modelo
  // (a semana da maioria dos jogos da rodada).
  const modelo = Rel.modeloDeSemanas(o.agendaTecnico);
  const ordem = [];
  for (const [fase, rodadas] of Object.entries(modelo)) for (const [rodada, semana] of Object.entries(rodadas)) ordem.push({ fase, rodada: Number(rodada), semana });
  ordem.sort((x, y) => (x.semana < y.semana ? -1 : x.semana > y.semana ? 1 : 0) || primeiroDia(o.agendaTecnico, x) - primeiroDia(o.agendaTecnico, y));
  const mapa = {};
  ordem.forEach((x, i) => { x.r = i + 1; mapa[`${x.fase}#${x.rodada}`] = i + 1; });
  const primeiraRodada = ordem[0].semana, ultimaRodada = ordem[ordem.length - 1].semana;

  const weeks = [];
  const entradaDaSemana = {};
  for (let s = inicio; s < fim; s = Rel.proximaSemana(s)) {
    const p = s < primeiraRodada ? "pre" : s <= ultimaRodada ? "temporada" : "ferias";
    const base = { d: s.slice(5), a: Number(s.slice(0, 4)), p, j: janelaNaSemana(s, janelas) };
    const daSemana = ordem.filter((x) => x.semana === s);
    entradaDaSemana[s] = weeks.length;
    if (!daSemana.length) weeks.push({ ...base, r: null });
    else daSemana.forEach((x) => weeks.push({ ...base, r: x.r }));
  }

  // Jogos do técnico por rodada; da outra divisão, por entrada do calendário.
  const schedule = {};
  for (const jogos of o.agendaTecnico.values()) for (const j of jogos) {
    const r = mapa[`${j.fase}#${j.rodada}`];
    (schedule[r] ||= []).push({ home: j.casa, away: j.fora });
  }
  const outras = {};
  for (const [liga, agenda] of Object.entries(o.outras || {})) {
    const porEntrada = {};
    for (const [s, jogos] of agenda) {
      // Semana fora do calendário (antes do início ou depois do fim): fica na
      // primeira ou na última entrada, para nenhum jogo se perder.
      const idx = entradaDaSemana[s] ?? (s < inicio ? 0 : weeks.length - 1);
      for (const j of jogos) (porEntrada[idx] ||= []).push({ home: j.casa, away: j.fora, fase: j.fase, rodada: j.rodada });
    }
    outras[liga] = porEntrada;
  }
  return {
    calendar: { year: Number(inicio.slice(0, 4)), idx: 0, weeks },
    schedule, outras, rodadas: ordem.length, mapa, inicio, fim,
  };
}

function primeiroDia(agenda, x) {
  let menor = "9999";
  for (const jogos of agenda.values()) for (const j of jogos) if (j.fase === x.fase && j.rodada === x.rodada && j.data < menor) menor = j.data;
  return Date.parse(menor);
}
