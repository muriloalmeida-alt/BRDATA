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
//   node scripts/mundo_catalogo.js --europa DIR --sul-america DIR --continentais DIR [--gravar]
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
  const P = { eu: opts.europa, sa: opts["sul-america"], cont: opts.continentais };
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

  const mundo = {
    brasil: opts.brasil || null,
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
  console.log(`Brasil: ${Object.values(m.brasil.ligas).map((l) => l.clubes.length).join("/")} clubes e ${m.brasil.serieD.length} na Série D`);
  if (opts.gravar) { gravar(r); console.log("gravado."); } else console.log("(só conferência; use --gravar para escrever)");
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
module.exports = { montar, dataLocal, instanteDe, siglaDe };
