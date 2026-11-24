/* ===================================================================
   MOTOR — RELÓGIO DO MUNDO (MUNDO-001, etapa M2, 24/11/2026)
   -------------------------------------------------------------------
   O mundo avança por semana, e a semana é a data da segunda-feira
   ("AAAA-MM-DD"). É a mesma unidade do calendário da carreira brasileira
   (virada.buildSeasonCalendar: uma entrada por segunda-feira do ano), agora
   com o ano junto, para as ligas de agosto a maio (Europa) e as de janeiro
   a dezembro (Brasil e América do Sul) andarem no mesmo relógio.

   Módulo puro: não lê a carreira, a tela nem a rede.
   - agenda: Map semana -> jogos daquela semana ({ fase, rodada, data,
     casa, fora }), em ordem de data. Um clube pode ter mais de um jogo na
     mesma semana (rodada adiada, meio de semana): a agenda guarda os dois.
   - Temporada 1: os jogos com data dos pacotes (agendaDoPacote).
   - Temporadas seguintes: o modelo de semanas da temporada do pacote (a
     semana de cada fase/rodada), k anos depois, com os confrontos gerados
     para os clubes do save (agendaGerada).
   - Início do save (MUN-06): a semana de pré-temporada da liga escolhida;
     as outras ligas jogam até lá (jogosAntesDe), de forma leve, pelo
     simulador que a etapa M6 liga a este relógio.
   - Brasil: semanasDoCalendarioBrasileiro converte o calendário de hoje
     (MM-DD de um ano) em semanas do relógio, sem mudar nenhuma rodada.
=================================================================== */
import { generateAllRounds } from "./calendario.js";

const DIA = 86400000;

function utc(data) {
  const [a, m, d] = String(data).slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}
function iso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Segunda-feira da semana de uma data ("AAAA-MM-DD").
export function segundaDe(data) {
  const t = utc(data);
  const diaDaSemana = (new Date(t).getUTCDay() + 6) % 7; // segunda = 0
  return iso(t - diaDaSemana * DIA);
}

export function somarSemanas(semana, n) {
  return iso(utc(semana) + n * 7 * DIA);
}

export function proximaSemana(semana) {
  return somarSemanas(semana, 1);
}

// Semanas de a até b (b - a), em número inteiro; negativo se b vem antes.
export function semanasEntre(a, b) {
  return Math.round((utc(b) - utc(a)) / (7 * DIA));
}

// A mesma semana k anos depois: a segunda-feira mais próxima do mesmo dia,
// k anos à frente (a até 3 dias dele). Sempre a partir da semana ORIGINAL
// do pacote: encadear ano a ano ("a mais próxima da mais próxima")
// escorregaria alguns dias por ano.
export function mesmaSemanaAnos(semana, anos) {
  const [a, m, d] = semana.split("-").map(Number);
  const alvo = Date.UTC(a + anos, m - 1, d); // 29/02 sem ano bissexto vira 01/03
  const desloc = (new Date(alvo).getUTCDay() + 6) % 7; // dias desde a segunda
  return iso(desloc <= 3 ? alvo - desloc * DIA : alvo + (7 - desloc) * DIA);
}

export function umAnoDepois(semana) {
  return mesmaSemanaAnos(semana, 1);
}

function ordenarJogos(lista) {
  return lista.sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : 0) || x.rodada - y.rodada || String(x.casa).localeCompare(String(y.casa)));
}

function inserir(agenda, jogo) {
  const s = segundaDe(jogo.data);
  if (!agenda.has(s)) agenda.set(s, []);
  agenda.get(s).push(jogo);
}

function ordenarAgenda(agenda) {
  const out = new Map([...agenda.keys()].sort().map((k) => [k, ordenarJogos(agenda.get(k))]));
  return out;
}

// Agenda da temporada 1 a partir dos jogos compactos do índice do mundo
// ([fase, rodada, data, casa, fora], ver scripts/mundo_catalogo.js).
export function agendaDoPacote(partidas) {
  const agenda = new Map();
  for (const [fase, rodada, data, casa, fora] of partidas || []) inserir(agenda, { fase, rodada, data, casa, fora });
  return ordenarAgenda(agenda);
}

// Modelo de semanas: para cada fase, a semana de cada rodada. Vale a semana
// em que cai a maioria dos jogos da rodada (jogo adiado não muda o modelo);
// no empate, a mais cedo. Devolve { fase: { rodada: semana } }.
export function modeloDeSemanas(agenda) {
  const votos = {};
  for (const [semana, jogos] of agenda) {
    for (const j of jogos) {
      const f = (votos[j.fase] ||= {});
      const r = (f[j.rodada] ||= {});
      r[semana] = (r[semana] || 0) + 1;
    }
  }
  const modelo = {};
  for (const [fase, rodadas] of Object.entries(votos)) {
    modelo[fase] = {};
    for (const [rodada, porSemana] of Object.entries(rodadas)) {
      const melhor = Object.entries(porSemana).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
      modelo[fase][rodada] = melhor;
    }
  }
  return modelo;
}

// Dia de cada rodada dentro da sua semana (0 = segunda): o dia mais comum
// dos jogos da rodada na temporada do pacote. Duas rodadas na mesma semana
// (meio de semana e fim de semana) ficam em dias diferentes, como no real.
function diasDasRodadas(agenda, modelo) {
  const cont = {};
  for (const [semana, jogos] of agenda) {
    for (const j of jogos) {
      if (modelo[j.fase][j.rodada] !== semana) continue; // jogo adiado não conta
      const k = `${j.fase}#${j.rodada}`;
      const c = (cont[k] ||= new Array(7).fill(0));
      c[(new Date(utc(j.data)).getUTCDay() + 6) % 7]++;
    }
  }
  const out = {};
  for (const [k, c] of Object.entries(cont)) out[k] = c.indexOf(Math.max(...c));
  return out;
}

// Agenda de uma temporada seguinte: as semanas da temporada do pacote
// (agendaModelo, sempre a original) `anos` anos depois e os confrontos
// gerados para os clubes do save. `confrontos(fase, ids)` devolve
// { rodada: [{ home, away }] } para cada fase; o padrão é turno e returno
// (calendario.generateAllRounds), como no Brasil. Formatos com grupos e
// interzonais (Argentina, Uruguai) passam o próprio gerador (etapa M4).
export function agendaGerada({ agendaModelo, anos = 1, clubes, fases, confrontos }) {
  if (!(Number.isInteger(anos) && anos >= 1)) throw new Error(`relógio: anos inválido (${anos})`);
  const modelo = modeloDeSemanas(agendaModelo);
  const dias = diasDasRodadas(agendaModelo, modelo);
  const gerar = confrontos || ((fase, ids) => generateAllRounds(ids));
  const agenda = new Map();
  for (const fase of fases || Object.keys(modelo)) {
    const semanas = modelo[fase];
    if (!semanas) throw new Error(`relógio: fase sem modelo de semanas (${fase})`);
    const rodadas = gerar(fase, clubes);
    for (const [rodada, jogos] of Object.entries(rodadas)) {
      const semanaAntes = semanas[rodada];
      if (!semanaAntes) throw new Error(`relógio: rodada ${rodada} da fase ${fase} sem semana no modelo`);
      const data = iso(utc(mesmaSemanaAnos(semanaAntes, anos)) + (dias[`${fase}#${rodada}`] ?? 5) * DIA);
      for (const j of jogos) inserir(agenda, { fase, rodada: Number(rodada), data, casa: j.home, fora: j.away });
    }
  }
  return ordenarAgenda(agenda);
}

export function primeiraSemana(agenda) {
  const ks = [...agenda.keys()];
  return ks.length ? ks[0] : null;
}
export function ultimaSemana(agenda) {
  const ks = [...agenda.keys()];
  return ks.length ? ks[ks.length - 1] : null;
}

// Situação da liga numa semana: "antes" (pré-temporada ou férias),
// "andamento" ou "fim" (a fase fixa acabou; as fases geradas por resultado
// e a virada vêm das etapas M4 e M5).
export function situacaoDaLiga(agenda, semana) {
  const a = primeiraSemana(agenda), b = ultimaSemana(agenda);
  if (!a || semana < a) return "antes";
  if (semana > b) return "fim";
  return "andamento";
}

export const SEMANAS_DE_PRE_TEMPORADA = 4;

// Semana em que o save começa (MUN-06): a pré-temporada da liga escolhida.
export function inicioDoMundo(agendaDaLigaEscolhida, preTemporada = SEMANAS_DE_PRE_TEMPORADA) {
  const a = primeiraSemana(agendaDaLigaEscolhida);
  if (!a) throw new Error("relógio: liga escolhida sem jogos");
  return somarSemanas(a, -preTemporada);
}

// Jogos de uma semana em todas as ligas, em ordem determinística (ordem das
// ligas recebida, depois a da agenda). agendas: [[idDaLiga, agenda], ...].
export function jogosDaSemana(agendas, semana) {
  const out = [];
  for (const [liga, agenda] of agendas) for (const j of agenda.get(semana) || []) out.push({ liga, ...j });
  return out;
}

// Jogos de todas as ligas antes de uma semana (pré-simulação do início do
// save), semana a semana, na mesma ordem de jogosDaSemana.
export function jogosAntesDe(agendas, semana) {
  const semanas = new Set();
  for (const [, agenda] of agendas) for (const s of agenda.keys()) if (s < semana) semanas.add(s);
  return [...semanas].sort().flatMap((s) => jogosDaSemana(agendas, s));
}

// Clubes com mais de um jogo numa semana (informação para a tela e para a
// recuperação física; não é erro).
export function semanasCheias(agenda) {
  const out = [];
  for (const [semana, jogos] of agenda) {
    const cont = {};
    for (const j of jogos) { cont[j.casa] = (cont[j.casa] || 0) + 1; cont[j.fora] = (cont[j.fora] || 0) + 1; }
    for (const [clube, n] of Object.entries(cont)) if (n > 1) out.push({ semana, clube, jogos: n });
  }
  return out;
}

// O calendário brasileiro de hoje (weeks com d = "MM-DD" de `year`) em
// semanas do relógio: { semana, indice, fase, rodada }. Nada muda nas
// rodadas: cada semana do calendário é a sua segunda-feira com o ano.
export function semanasDoCalendarioBrasileiro(calendar) {
  return (calendar.weeks || []).map((w, indice) => ({
    semana: `${calendar.year}-${w.d}`, indice, fase: w.p, rodada: w.r == null ? null : w.r,
  }));
}
