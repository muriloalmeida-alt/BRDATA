#!/usr/bin/env node
// MUNDO-001, etapa M1 (24/11/2026): catálogo do mundo.
//
// Lê os três pacotes de dados recebidos em 24/11/2026 (Europa 2026/27,
// Sul-América 2026 e Competições continentais, ver docs/mundo/) e grava o que
// o jogo lê:
//  - server/frozen-catalog/snapshot-<liga>.json: as 20 ligas novas, no formato
//    do provedor congelado (teams, standings, playersByTeamId), com o escudo
//    local em `localLogo`;
//  - server/frozen-catalog/mundo/mundo.json: o índice do mundo (países, ligas
//    com regulamento e calendário, clubes, catálogo de 3ª divisão e os jogos
//    das fases de tabela fixa, com data local do campeonato);
//  - server/frozen-catalog/mundo/fonte/: os JSON originais dos pacotes, sem
//    alteração (menos elencos, CSV e planilhas, que repetem o que já está
//    nos snapshots e nos JSON);
//  - public/img/teams/mundo/: os escudos WebP.
//
// Os dados dos pacotes não são editados. O que este script acrescenta ou
// decide fica marcado:
//  - `siglaDerivada: true`: o pacote não traz sigla (América do Sul), e ela
//    sai das 3 primeiras letras do nome curto;
//  - `vinculosResolvidos`: o mesmo atleta (mesmo id de origem) aparece em dois
//    clubes (`vinculos-a-conferir.json`). Fica no clube com MENOS atletas, se
//    o outro continua com pelo menos 23 e 2 goleiros; no empate, no clube de
//    divisão mais alta (MUN-03).
//
// Uso:
//   node scripts/mundo_catalogo.js --europa DIR --sul-america DIR --continentais DIR --andino DIR --uefa-extra DIR [--gravar]
//
// --uefa-extra (M10b, 25/11/2026): o 5º pacote (Portugal, Países Baixos,
// Bélgica, Turquia e Escócia), só nas copas da UEFA, em `copas.uefa`, com o
// acesso de jogo e as outras associações de scripts/dados/uefa_acesso.json.
//
// --andino (M9b, 25/11/2026): o 4º pacote (Bolívia, Paraguai, Peru e
// Venezuela). Decisão do Murilo (DEP-1, 24/11): só nas copas da CONMEBOL,
// como clubes da CPU. Entram as 1ªs divisões (60 clubes, elencos reais) em
// `copas.conmebol` do índice e no snapshot `snapshot-conmebol_andinos.json`.
// O pacote não traz força: ela é estimada (ver forcaAndina).
// Sem --gravar, só confere e mostra o resumo.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SNAP_DIR = path.join(ROOT, "server/frozen-catalog");
const MUNDO_DIR = path.join(SNAP_DIR, "mundo");
const ESCUDOS_DIR = path.join(ROOT, "public/img/teams/mundo");
const ESCUDO_URL = "/img/teams/mundo/";

// Fases de tabela fixa: os confrontos não dependem de resultado anterior e
// vêm do pacote. As outras (quadrangulares, hexagonais, Intermedio, finais e
// mata-matas) são geradas pelo motor a partir da simulação (MUN-07, etapa M4).
const FASES_FIXAS = new Set(["Fase Regular", "Apertura", "Clausura", "Competencia", "Fase Inicial"]);

// Ordem de exibição dos países (Europa, depois América do Sul).
const ORDEM_PAISES = ["GB-ENG", "ES", "IT", "DE", "FR", "AR", "CL", "CO", "EC", "UY"];

function args(argv) {
  const out = { gravar: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--gravar") out.gravar = true;
    else if (a.startsWith("--")) out[a.slice(2)] = argv[++i];
  }
  for (const k of ["europa", "sul-america", "continentais"]) {
    if (!out[k]) throw new Error(`falta --${k} DIR (pasta do pacote descompactado)`);
  }
  return out;
}

const lerJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// --- datas -----------------------------------------------------------------
// Data local (AAAA-MM-DD) de um instante no fuso do campeonato.
function dataLocal(instante, fuso) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instante);
  const v = (t) => p.find((x) => x.type === t).value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
// Diferença (ms) entre o relógio do fuso e o UTC num instante.
function deslocamento(instante, fuso) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: fuso, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(instante);
  const v = (t) => Number(p.find((x) => x.type === t).value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - instante.getTime();
}
// Instante de um horário de parede (data + hora) num fuso.
function instanteDe(data, hora, fuso) {
  const [h, m] = String(hora || "12:00").split(":").map(Number);
  const [a, mes, d] = data.split("-").map(Number);
  const ingenuo = Date.UTC(a, mes - 1, d, h, m || 0);
  if (fuso === "UTC") return new Date(ingenuo);
  let t = ingenuo - deslocamento(new Date(ingenuo), fuso);
  t = ingenuo - deslocamento(new Date(t), fuso);
  return new Date(t);
}

// Sigla para clube sem sigla no pacote: 3 primeiras letras do nome curto.
function siglaDe(nome) {
  const s = String(nome || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return (s + "XXX").slice(0, 3);
}

function escudoLocal(pacoteDir, localLogoPath, copias) {
  if (!localLogoPath) return null;
  const origem = path.join(pacoteDir, localLogoPath);
  if (!fs.existsSync(origem)) return null;
  const nome = path.basename(localLogoPath);
  copias.set(nome, origem);
  return ESCUDO_URL + nome;
}

function montar(opts) {
  const P = { eu: opts.europa, sa: opts["sul-america"], cont: opts.continentais, andino: opts.andino || null, uefaExtra: opts["uefa-extra"] || null };
  const eu = {
    ligas: lerJSON(path.join(P.eu, "dados/ligas.json")),
    clubes: lerJSON(path.join(P.eu, "dados/clubes.json")),
    terceira: lerJSON(path.join(P.eu, "dados/catalogo-terceira-divisao.json")),
    partidas: lerJSON(path.join(P.eu, "dados/partidas-2026-27.json")),
    ids: lerJSON(path.join(P.eu, "integracao/ids-motor.json")),
  };
  const sa = {
    ligas: lerJSON(path.join(P.sa, "dados/ligas.json")),
    clubes: lerJSON(path.join(P.sa, "dados/clubes.json")),
    terceira: lerJSON(path.join(P.sa, "dados/catalogo-terceira-divisao.json")),
    partidas: lerJSON(path.join(P.sa, "dados/partidas-2026.json")),
    ids: lerJSON(path.join(P.sa, "integracao/ids-motor.json")),
    vinculos: lerJSON(path.join(P.sa, "dados/vinculos-a-conferir.json")),
  };
  const ids = { ...eu.ids, ...sa.ids };
  const idNum = (catalogo) => {
    const n = ids[catalogo];
    if (!Number.isInteger(n)) throw new Error(`clube sem id numérico em ids-motor.json: ${catalogo}`);
    return n;
  };
  const copias = new Map();

  // --- países ---------------------------------------------------------------
  const paises = [];
  for (const c of eu.ligas.countries) {
    paises.push({
      codigo: c.id, nome: c.name, regiao: "europa", fuso: c.timezone,
      moeda: c.currency, moedaLocal: c.currency,
      ligas: c.competitionIds,
      janelas: (c.transferWindows || []).map((j) => [j.opens, j.closes]),
      terceira: c.thirdTier,
    });
  }
  for (const c of sa.ligas.countries) {
    paises.push({
      codigo: c.id, nome: c.name, regiao: "america_sul", fuso: c.timezone,
      moeda: c.simulationCurrency, moedaLocal: c.localCurrency,
      ligas: sa.ligas.competitions.filter((l) => l.countryCode === c.id).sort((a, b) => a.division - b.division).map((l) => l.id),
      janelas: c.transferWindows || [],
      terceira: c.thirdTier,
    });
  }
  paises.sort((a, b) => ORDEM_PAISES.indexOf(a.codigo) - ORDEM_PAISES.indexOf(b.codigo));

  // --- ligas ----------------------------------------------------------------
  const competicoes = {};
  for (const l of eu.ligas.competitions) {
    competicoes[l.id] = {
      id: l.id, nome: l.name, pais: l.countryCode, regiao: "europa", divisao: l.division,
      clubes: l.clubs, rodadas: l.rounds, formato: l.format,
      temporada: { chave: l.seasonKey, anoInicial: l.seasonStartYear, anoFinal: l.seasonEndYear, anoCivil: false },
      fuso: l.timezone, moeda: l.currency, pontos: l.points, regras: l.rules, calendario: l.calendar,
    };
  }
  for (const l of sa.ligas.competitions) {
    const ano = Number(l.season);
    competicoes[l.id] = {
      id: l.id, nome: l.name, pais: l.countryCode, regiao: "america_sul", divisao: l.division,
      clubes: l.clubs, formato: l.rules && l.rules.regular && l.rules.regular.format || null,
      temporada: { chave: String(l.season), anoInicial: ano, anoFinal: ano, anoCivil: !!l.calendarYearSeason },
      fuso: l.timezone, moeda: l.simulationCurrency, moedaLocal: l.localCurrency, pontos: l.points, regras: l.rules,
      calendario: { primeiroJogo: l.firstFixtureDate, ultimoJogoNoPacote: l.lastFixtureDateInSnapshot, fonte: l.calendarSourceUrl },
      fonteRegulamento: l.regulationSourceUrl,
    };
  }

  // --- clubes ---------------------------------------------------------------
  const porCatalogo = new Map();
  const clubes = [];
  for (const [regiao, pacote, dir] of [["europa", eu, P.eu], ["america_sul", sa, P.sa]]) {
    for (const c of pacote.clubes) {
      const st = c.strength || {};
      const fin = c.finances || {};
      const semSigla = !c.abbreviation;
      const clube = {
        id: idNum(c.id), catalogo: c.id, nome: c.name, curto: c.shortName || c.name,
        sigla: c.abbreviation || siglaDe(c.shortName || c.name), ...(semSigla ? { siglaDerivada: true } : {}),
        liga: c.competitionId, pais: c.countryCode, regiao, divisao: c.division,
        c1: c.c1 || null, c2: c.c2 || null,
        estadio: c.stadium ? { nome: c.stadium.name || null, cidade: c.stadium.city || null, capacidade: c.stadium.capacity ?? null } : null,
        escudo: escudoLocal(dir, c.localLogoPath, copias), logoOrigem: c.logo || null,
        atk: c.atk ?? st.atk ?? null, def: c.def ?? st.def ?? null,
        nivel: st.gameplayLevel ?? fin.gameplayLevel ?? null, indice: st.index ?? null,
        reserva: !!c.reserveTeam || /reserve/.test(c.promotionEligibility || ""),
        clubePai: c.parentClubId ? c.parentClubId : null,
        divisaoMinima: c.minDivisionAllowed ?? null,
        elegibilidade: c.promotionEligibility || null,
        financas: Object.fromEntries(Object.entries(fin).filter(([k, v]) => typeof v === "number" || k === "currency" || k === "localCurrency")),
      };
      clubes.push(clube);
      porCatalogo.set(c.id, clube);
    }
  }
  // clubePai: o id numérico, quando o pai também está no catálogo.
  const terceira = [];
  for (const [regiao, pacote, dir] of [["europa", eu, P.eu], ["america_sul", sa, P.sa]]) {
    for (const c of pacote.terceira) {
      const clube = {
        id: idNum(c.id), catalogo: c.id, nome: c.name, curto: c.shortName || c.name,
        sigla: c.abbreviation || siglaDe(c.shortName || c.name), ...(c.abbreviation ? {} : { siglaDerivada: true }),
        pais: c.countryCode, regiao, grupo: c.group || null,
        elegibilidade: c.promotionEligibility || null, reserva: !!c.reserveTeam,
        clubePai: c.parentClubId || null, rankReferencia: c.referenceRank ?? null,
        c1: c.c1 || null, c2: c.c2 || null,
        estadio: c.stadium ? { nome: c.stadium.name || null, capacidade: c.stadium.capacity ?? null } : null,
        escudo: escudoLocal(dir, c.localLogoPath, copias), logoOrigem: c.logo || null,
        atk: c.atk ?? null, def: c.def ?? null,
      };
      terceira.push(clube);
      porCatalogo.set(c.id, clube);
    }
  }
  const resolverPai = (x) => {
    if (!x.clubePai) return;
    const pai = porCatalogo.get(x.clubePai);
    x.clubePaiCatalogo = x.clubePai;
    x.clubePai = pai ? pai.id : null;
  };
  clubes.forEach(resolverPai);
  terceira.forEach(resolverPai);

  // --- jogos das fases fixas --------------------------------------------------
  const partidas = {};
  const ignoradas = {};
  for (const m of eu.partidas) {
    const comp = competicoes[m.competitionId];
    const data = m.timeBasis === "source_local" || !m.time ? m.date : dataLocal(instanteDe(m.date, m.time, m.timeBasis), comp.fuso);
    (partidas[m.competitionId] ||= []).push(["Fase Regular", m.round, data, idNum(m.homeClubId), idNum(m.awayClubId)]);
  }
  for (const m of sa.partidas) {
    if (!FASES_FIXAS.has(m.stage)) { ignoradas[m.competitionId] = (ignoradas[m.competitionId] || 0) + 1; continue; }
    const comp = competicoes[m.competitionId];
    const data = dataLocal(new Date(m.kickoff), comp.fuso);
    (partidas[m.competitionId] ||= []).push([m.stage, m.round, data, idNum(m.homeClubId), idNum(m.awayClubId)]);
  }
  for (const id of Object.keys(partidas)) {
    partidas[id].sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0) || a[1] - b[1] || a[3] - b[3]);
  }

  // --- snapshots e vínculos duplicados (MUN-03) ---------------------------------
  const snapshots = {};
  for (const [pacoteDir, lista] of [[P.eu, eu.ligas.competitions], [P.sa, sa.ligas.competitions]]) {
    for (const l of lista) {
      const s = lerJSON(path.join(pacoteDir, `integracao/snapshots/snapshot-${l.id}.json`));
      s.teams.forEach((t) => {
        const c = porCatalogo.get(t.catalogClubId);
        t.localLogo = c ? c.escudo : null;
      });
      snapshots[l.id] = s;
    }
  }
  const jogadoresDe = new Map(); // id numérico do clube -> [lista, snapshot]
  for (const s of Object.values(snapshots)) {
    for (const [tid, lista] of Object.entries(s.playersByTeamId)) jogadoresDe.set(Number(tid), lista);
  }
  const porOrigem = new Map();
  for (const v of sa.vinculos) {
    if (!porOrigem.has(v.sourcePlayerId)) porOrigem.set(v.sourcePlayerId, []);
    porOrigem.get(v.sourcePlayerId).push(v);
  }
  const vinculosResolvidos = [];
  const goleiros = (l) => l.filter((p) => /goal/i.test(p.position || "")).length;
  for (const [origem, vs] of porOrigem) {
    const ocorr = vs.map((v) => {
      const clube = porCatalogo.get(v.clubId);
      const lista = jogadoresDe.get(clube.id) || [];
      const jogador = lista.find((p) => String(p.id) === origem || String(p.id).startsWith(origem + "_"));
      return { clube, lista, jogador };
    }).filter((o) => o.jogador);
    if (ocorr.length < 2) continue;
    ocorr.sort((a, b) => a.lista.length - b.lista.length || a.clube.divisao - b.clube.divisao || a.clube.id - b.clube.id);
    const fica = ocorr[0];
    for (const sai of ocorr.slice(1)) {
      const restante = sai.lista.filter((p) => p !== sai.jogador);
      if (restante.length < 23 || goleiros(restante) < 2) continue;
      sai.lista.splice(sai.lista.indexOf(sai.jogador), 1);
      vinculosResolvidos.push({ origem, nome: sai.jogador.name, ficaEm: fica.clube.id, saiDe: sai.clube.id });
    }
  }

  // --- nível da liga e média de gols ----------------------------------------
  // nivel: o gameplayLevel do pacote (igual para todos os clubes da liga), na
  // mesma escala para as 20 ligas; força comparável entre ligas (MUN-02).
  // mediaGolsPorTime: gols por clube por jogo da referência (Europa: a base
  // da calibração do pacote; América do Sul: as tabelas de referência), para
  // o nível de gols do motor (partida.nivelDeGols).
  {
    const refSA = lerJSON(path.join(P.sa, "dados/tabelas-referencia.json"));
    const somaSA = {};
    for (const r of refSA) { const x = (somaSA[r.competitionId] ||= { gp: 0, j: 0 }); x.gp += r.gp; x.j += r.j; }
    for (const [id, comp] of Object.entries(competicoes)) {
      const doClube = clubes.filter((c) => c.liga === id);
      const niveis = [...new Set(doClube.map((c) => c.nivel).filter((x) => x != null))];
      comp.nivel = niveis.length === 1 ? niveis[0] : null;
      if (comp.regiao === "europa") {
        const base = [...new Set(eu.clubes.filter((c) => c.competitionId === id).map((c) => c.strength && c.strength.reference && c.strength.reference.baselineGfPerClubMatch).filter((x) => x != null))];
        comp.mediaGolsPorTime = base.length === 1 ? base[0] : null;
      } else {
        const x = somaSA[id];
        comp.mediaGolsPorTime = x && x.j ? Math.round((x.gp / x.j) * 10000) / 10000 : null;
      }
    }
  }

  // --- zonas fixas (Argentina) e grupos do Competencia (Uruguai) -------------
  // Argentina: as zonas de referência do pacote (as mesmas no Apertura e no
  // Clausura). Uruguai (Segunda): os grupos saem dos próprios jogos do
  // Competencia (quem joga com quem).
  const grupos = {};
  const gruposRef = lerJSON(path.join(P.sa, "dados/grupos-referencia.json"));
  for (const g of gruposRef) {
    const m = /^(?:Apertura )?(?:Group|Zona) ([AB])$/.exec(g.label);
    if (!m || !g.competitionId.startsWith("arg_")) continue;
    (grupos[g.competitionId] ||= {})[m[1]] = g.clubIds.map(idNum).sort((x, y) => x - y);
  }
  {
    const jogos = (partidas.uru_segunda || []).filter((j) => j[0] === "Competencia");
    const viz = new Map();
    for (const [, , , h, a] of jogos) { (viz.get(h) || viz.set(h, new Set()).get(h)).add(a); (viz.get(a) || viz.set(a, new Set()).get(a)).add(h); }
    const vistos = new Set();
    const comps = [];
    for (const id of [...viz.keys()].sort((x, y) => x - y)) {
      if (vistos.has(id)) continue;
      const pilha = [id], comp = [];
      vistos.add(id);
      while (pilha.length) { const x = pilha.pop(); comp.push(x); for (const y of viz.get(x)) if (!vistos.has(y)) { vistos.add(y); pilha.push(y); } }
      comps.push(comp.sort((x, y) => x - y));
    }
    if (comps.length !== 2) throw new Error(`Competencia uruguaio: esperava 2 grupos, veio ${comps.length}`);
    grupos.uru_segunda = { A: comps[0], B: comps[1] };
  }

  // --- promedio inicial (histórico das temporadas anteriores) --------------
  // Tabelas por fase, sem repetir a mesma fase de um clube (o pacote repete
  // a tabela da temporada em mais de um recorte). Só as fases que contam:
  // Argentina (2024 anual; 2025 Apertura + Clausura por zona), Colômbia
  // (Apertura + Clausura, sem os grupos finais) e Uruguai (Apertura,
  // Intermedio e Clausura). { liga: { clube: [{ ano, pts, j }] } }.
  const promedioInicial = {};
  {
    const hist = lerJSON(path.join(P.sa, "dados/historico-tabelas.json"));
    const conta = (r) => {
      if (r.competitionId === "col_primera_a") return r.phase === "Apertura" || r.phase === "Clausura";
      return true;
    };
    const vistos = new Set();
    const soma = {};
    for (const r of hist) {
      if (!conta(r)) continue;
      const ano = Number(String(r.seasonRef).slice(0, 4));
      const id = idNum(r.clubId);
      const chave = `${r.competitionId}|${ano}|${r.phase}|${id}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const k = `${r.competitionId}|${id}|${ano}`;
      soma[k] ||= { liga: r.competitionId, id, ano, pts: 0, j: 0 };
      soma[k].pts += r.points;
      soma[k].j += r.games;
    }
    for (const x of Object.values(soma)) ((promedioInicial[x.liga] ||= {})[x.id] ||= []).push({ ano: x.ano, pts: x.pts, j: x.j });
    for (const l of Object.values(promedioInicial)) for (const lst of Object.values(l)) lst.sort((x, y) => x.ano - y.ano);
  }

  const copas = opts.andino ? { ...copasConmebol(opts.andino, snapshots), ...copasUefa(opts["uefa-extra"] || null, snapshots) } : null;
  // Regras das copas continentais (M9b): as tabelas do pacote, sem alteração.
  const continentais = Object.fromEntries([["competicoes", "competicoes"], ["calendarios", "calendarios"], ["premiacao", "premiacao"], ["acesso", "acesso-e-transferencias"]]
    .map(([k, f]) => [k, lerJSON(path.join(P.cont, `config/${f}.json`))]));
  const mundo = {
    brasil: opts.brasil || null,
    ...(copas ? { copas } : {}),
    continentais,
    formato: 1,
    fontes: { europa: eu.ligas.preparedOn || null, americaSul: sa.ligas.preparedOn || null },
    paises, competicoes,
    perfisDesempate: eu.ligas.tieBreakProfiles,
    clubes: clubes.sort((a, b) => a.id - b.id),
    terceira: terceira.sort((a, b) => a.id - b.id),
    partidas,
    vinculosResolvidos,
    grupos,
    promedioInicial,
  };
  mundo.versao = crypto.createHash("sha256").update(JSON.stringify(mundo)).digest("hex").slice(0, 16);
  return { mundo, snapshots, copias, ignoradas, P };
}

// ---------- copas da CONMEBOL: clubes andinos (M9b) ----------
// Nível de jogo por associação nas copas (parâmetro de jogo, na escala do
// gameplayLevel das ligas do pacote: Argentina 1,16, Colômbia 1,06...). As
// associações com liga jogável usam o nível da própria 1ª divisão; o Brasil
// não tem gameplayLevel no catálogo.
const NIVEL_CONMEBOL = { BRA: 1.2, PAR: 0.98, PER: 0.95, BOL: 0.9, VEN: 0.88 };
const ASSOC_ANDINA = { BO: "BOL", PY: "PAR", PE: "PER", VE: "VEN" };
const NOME_ASSOC = { BOL: "Bolívia", PAR: "Paraguai", PER: "Peru", VEN: "Venezuela" };
// Força estimada: o pacote não traz força nem nota de atleta (só nome,
// posição, idade e nacionalidade). A ordem dos clubes na competição é a da
// tabela de 2026 consultada (fonte "tabla de posiciones"); ela dá a força
// relativa na liga, na faixa dos clubes do pacote sul-americano (o 1º perto
// de 1,35/0,80; o último perto de 0,65/1,20).
function forcaAndina(pos, n) {
  const q = n > 1 ? 1 - (2 * pos) / (n - 1) : 0;
  return { atk: Math.round((1 + 0.35 * q) * 1000) / 1000, def: Math.round((1 - 0.2 * q) * 1000) / 1000 };
}
const ID_ANDINO_BASE = 870000000;
function copasConmebol(dir, snapshots) {
  const ligas = lerJSON(path.join(dir, "dados/ligas.json")).competitions.filter((l) => l.division === 1);
  const clubes = new Map(lerJSON(path.join(dir, "dados/clubes.json")).map((c) => [c.id, c]));
  const porComp = lerJSON(path.join(dir, "integracao/clubes-por-competicao.json"));
  const elencos = lerJSON(path.join(dir, "dados/elencos.json"));
  const catalogos = ligas.flatMap((l) => porComp[l.id]).filter((id) => clubes.get(id).participationStatus === "participant").sort();
  const idDe = new Map(catalogos.map((c, i) => [c, ID_ANDINO_BASE + i + 1]));
  const lista = [];
  const snap = { competitionId: "conmebol_andinos", name: "Clubes andinos (copas da CONMEBOL)", season: "2026", teams: [], standings: [], playersByTeamId: {} };
  for (const l of ligas) {
    const ids = porComp[l.id].filter((id) => idDe.has(id));
    ids.forEach((cat, pos) => {
      const c = clubes.get(cat);
      const assoc = ASSOC_ANDINA[c.countryCode];
      const id = idDe.get(cat);
      const f = forcaAndina(pos, ids.length);
      const sigla = siglaDe(c.shortName || c.name);
      lista.push({ id, catalogo: cat, nome: c.name, curto: c.shortName || c.name, sigla, siglaDerivada: true, assoc, pais: c.countryCode, liga: l.id, ordemPacote: pos + 1, escudo: null, logoOrigem: c.logo || null, ...f, forcaEstimada: true });
      snap.teams.push({ id, catalogClubId: cat, name: c.name, short: c.shortName || c.name, logo: c.logo || null, localLogo: null, venue: null, atk: f.atk, def: f.def });
      snap.playersByTeamId[String(id)] = elencos.filter((p) => p.clubId === cat).map((p) => ({ id: p.id, name: p.name, photo: null, position: p.position, age: p.age ?? null, rating: null, games: null, goals: 0, assists: 0 }));
    });
  }
  for (const [id, ps] of Object.entries(snap.playersByTeamId)) {
    if (ps.length < 22 || ps.filter((p) => /goal/i.test(p.position)).length < 2) throw new Error(`clube andino ${id} sem 22 atletas e 2 goleiros`);
  }
  snapshots.conmebol_andinos = snap;
  return {
    conmebol: {
      niveis: NIVEL_CONMEBOL,
      associacoes: Object.fromEntries(Object.entries(NOME_ASSOC).map(([k, nome]) => [k, { nome, liga: ligas.find((l) => ASSOC_ANDINA[l.countryCode] === k).id }])),
      clubes: lista.sort((a, b) => a.id - b.id),
    },
  };
}

// ---------- copas da UEFA (M10b) ----------
// 5º pacote (Portugal, Países Baixos, Bélgica, Turquia e Escócia): só nas
// copas, como CPU, com elencos reais (decisão do Murilo, DEP-1). As outras
// associações: nome real e elenco fictício (scripts/dados/uefa_acesso.json).
// Força estimada pela ordem na tabela (a do pacote é a da temporada
// consultada, no começo do campeonato: faixa mais estreita que a dos andinos).
const ASSOC_UEFA_EXTRA = { PT: "POR", NL: "NED", BE: "BEL", TR: "TUR", SCO: "SCO", "GB-SCT": "SCO" };
const ID_UEFA_EXTRA = 880000000, ID_UEFA_OUTRAS = 885000000;
function forcaPelaOrdem(pos, n, amplitude) {
  const q = n > 1 ? 1 - (2 * pos) / (n - 1) : 0;
  return { atk: Math.round((1 + amplitude * q) * 1000) / 1000, def: Math.round((1 - (amplitude * 4 / 7) * q) * 1000) / 1000 };
}
function copasUefa(dir, snapshots) {
  const tabela = lerJSON(path.join(ROOT, "scripts/dados/uefa_acesso.json"));
  const clubes = [];
  const snap = { competitionId: "uefa_extra", name: "Clubes do 5º pacote (copas da UEFA)", season: "2026/27", teams: [], standings: [], playersByTeamId: {} };
  if (dir) {
    const lista = lerJSON(path.join(dir, "clubes.json"));
    const elencos = lerJSON(path.join(dir, "elencos.json"));
    const porLiga = new Map();
    for (const c of lista) (porLiga.get(c.competitionId) || porLiga.set(c.competitionId, []).get(c.competitionId)).push(c);
    const ids = new Map(lista.map((c) => c.id).sort().map((c, i) => [c, ID_UEFA_EXTRA + i + 1]));
    for (const [liga, cs] of porLiga) {
      cs.forEach((c, pos) => {
        const assoc = ASSOC_UEFA_EXTRA[c.countryCode];
        if (!assoc) throw new Error(`associação desconhecida: ${c.countryCode}`);
        const id = ids.get(c.id), f = forcaPelaOrdem(pos, cs.length, 0.25);
        clubes.push({ id, catalogo: c.id, nome: c.name, curto: c.name, sigla: siglaDe(c.name), siglaDerivada: true, assoc, liga, ordemPacote: pos + 1, escudo: null, logoOrigem: c.logo || null, ...f, forcaEstimada: true });
        snap.teams.push({ id, catalogClubId: c.id, name: c.name, short: c.name, logo: c.logo || null, localLogo: null, venue: null, atk: f.atk, def: f.def });
        const ps = elencos.filter((p) => p.clubId === c.id).map((p) => ({ id: p.id, name: p.name, photo: null, position: p.position, age: p.age ?? null, rating: null, games: null, goals: 0, assists: 0 }));
        if (ps.length < 22 || ps.filter((p) => /goal/i.test(p.position)).length < 2) throw new Error(`${c.name}: elenco incompleto`);
        snap.playersByTeamId[String(id)] = ps;
      });
    }
    snapshots.uefa_extra = snap;
  }
  // Outras associações: nome real, elenco gerado pelo jogo.
  let k = 0;
  for (const [assoc, a] of Object.entries(tabela.associacoes)) {
    (a.clubes || []).forEach((nome, pos) => {
      const f = forcaPelaOrdem(pos, a.clubes.length, 0.2);
      clubes.push({ id: ID_UEFA_OUTRAS + ++k, nome, curto: nome, sigla: siglaDe(nome), siglaDerivada: true, assoc, ordemPacote: pos + 1, escudo: null, logoOrigem: null, ...f, forcaEstimada: true, elencoFicticio: true });
    });
  }
  const associacoes = Object.fromEntries(Object.entries(tabela.associacoes).map(([k2, a]) => [k2, { nome: a.nome, pais: a.pais || null, nivel: a.nivel ?? null, vagas: a.vagas }]));
  return { uefa: { titulares: tabela.titulares, eps: tabela.eps, associacoes, clubes: clubes.sort((x, y) => x.id - y.id) } };
}

function gravar({ mundo, snapshots, copias, P }) {
  fs.mkdirSync(ESCUDOS_DIR, { recursive: true });
  for (const [nome, origem] of copias) fs.copyFileSync(origem, path.join(ESCUDOS_DIR, nome));
  for (const [id, s] of Object.entries(snapshots)) {
    fs.writeFileSync(path.join(SNAP_DIR, `snapshot-${id}.json`), JSON.stringify(s) + "\n");
  }
  fs.mkdirSync(MUNDO_DIR, { recursive: true });
  fs.writeFileSync(path.join(MUNDO_DIR, "mundo.json"), JSON.stringify(mundo) + "\n");
  // Fontes originais, sem alteração.
  const fontes = [
    ["europa", P.eu, ["dados/ligas.json", "dados/clubes.json", "dados/catalogo-terceira-divisao.json", "dados/partidas-2026-27.json", "dados/benchmarks-financeiros.json", "dados/referencias.json", "documentacao/04_Validacao.json", "integracao/ids-motor.json"]],
    ["sul-america", P.sa, ["dados/ligas.json", "dados/clubes.json", "dados/catalogo-terceira-divisao.json", "dados/partidas-2026.json", "dados/benchmarks-financeiros.json", "dados/referencias.json", "dados/historico-tabelas.json", "dados/tabelas-referencia.json", "dados/grupos-referencia.json", "dados/vinculos-a-conferir.json", "documentacao/04_Validacao.json", "integracao/ids-motor.json"]],
    ["continentais", P.cont, ["config/competicoes.json", "config/acesso-e-transferencias.json", "config/calendarios.json", "config/premiacao.json", "fontes.json"]],
    ...(P.uefaExtra ? [["europa-extra", P.uefaExtra, ["clubes.json"]]] : []),
    ...(P.andino ? [["bol-par-per-ven", P.andino, ["dados/ligas.json", "dados/clubes.json", "dados/referencias.json", "integracao/clubes-por-competicao.json", "documentacao/validacao.json"]]] : []),
  ];
  for (const [nome, dir, arquivos] of fontes) {
    for (const a of arquivos) {
      const destino = path.join(MUNDO_DIR, "fonte", nome, path.basename(a));
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(path.join(dir, a), destino);
    }
  }
}

// Brasil (M6b-5b): as Séries A, B e C do catálogo congelado (os mesmos times
// e a mesma força que a carreira brasileira calcula ao carregar:
// carga.calibrateStrengths e carga.mediaGolsDaLiga) e a Série D do jogo
// (js/data.js), para o Brasil jogar no mundo leve quando o técnico está fora.
async function brasil() {
  const vm = require("vm");
  const { pathToFileURL } = require("url");
  globalThis.window = globalThis;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
  const carga = await import(pathToFileURL(path.join(ROOT, "public/js/motor/carga.js")).href);
  const nomes = { brasileirao: "Brasileirão Série A", serie_b: "Brasileirão Série B", serie_c: "Brasileirão Série C" };
  const ligas = {};
  for (const id of Object.keys(nomes)) {
    const snap = lerJSON(path.join(SNAP_DIR, `snapshot-${id}.json`));
    const forca = carga.calibrateStrengths(snap.standings || []);
    ligas[id] = {
      nome: nomes[id], mediaGolsPorTime: carga.mediaGolsDaLiga(snap.standings || []),
      clubes: snap.teams.map((t) => {
        const cor = carga.realTeamColor(t.name);
        return { id: t.id, nome: t.name, sigla: t.short || siglaDe(t.name), escudo: t.logo || null, c1: (cor && cor.c1) || "#0057B8", c2: (cor && cor.c2) || "#062B5C", atk: (forca[t.id] || {}).atk ?? 1.3, def: (forca[t.id] || {}).def ?? 1.05 };
      }),
    };
  }
  /* global DEMO_TEAMS_SERIE_D */
  const serieD = DEMO_TEAMS_SERIE_D.map((t) => ({ id: t.id, nome: t.name, sigla: t.short, escudo: t.logo || null, c1: t.c1, c2: t.c2, atk: t.atk, def: t.def }));
  return { ligas, serieD };
}

async function main() {
  const opts = args(process.argv);
  opts.brasil = await brasil();
  const r = montar(opts);
  const m = r.mundo;
  console.log(`versão ${m.versao}`);
  console.log(`${m.paises.length} países, ${Object.keys(m.competicoes).length} ligas, ${m.clubes.length} clubes, ${m.terceira.length} na 3ª divisão`);
  console.log(`${Object.values(m.partidas).reduce((s, l) => s + l.length, 0)} jogos de fase fixa; fases geradas pelo motor (fora do índice): ${JSON.stringify(r.ignoradas)}`);
  console.log(`${r.copias.size} escudos; ${m.clubes.filter((c) => !c.escudo).length} clubes jogáveis sem escudo local`);
  console.log(`vínculos duplicados resolvidos: ${m.vinculosResolvidos.length}`);
  if (m.copas) console.log(`copas da CONMEBOL: ${m.copas.conmebol.clubes.length} clubes andinos; UEFA: ${m.copas.uefa.clubes.filter((c) => !c.elencoFicticio).length} do 5º pacote e ${m.copas.uefa.clubes.filter((c) => c.elencoFicticio).length} de outras associações`);
  console.log(`Brasil: ${Object.values(m.brasil.ligas).map((l) => l.clubes.length).join("/")} clubes e ${m.brasil.serieD.length} na Série D`);
  if (opts.gravar) { gravar(r); console.log("gravado."); } else console.log("(só conferência; use --gravar para escrever)");
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
module.exports = { montar, dataLocal, instanteDe, siglaDe };
