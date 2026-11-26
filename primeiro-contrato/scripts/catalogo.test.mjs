import test from "node:test";
import assert from "node:assert/strict";
import { montarSnapshot, normalizarEscudo } from "./catalogo-lib.mjs";

const meta = { versao: "t-1", temporada: "2026", geradoEm: "2026-11-26" };
const fixture = [
  { id: 1, nome: "São Paulo", sigla: "SAO", c1: "#f00", atk: 1.1, def: 0.9, code: "brasileirao", league: "Brasileirão Série A", country: "Brasil", tier: 1 },
  { id: "x-b", nome: "Real Madrid Castilla", sigla: "RMC", c1: "#fff", atk: null, def: null, code: "ES-3", league: "Primera Federación", country: "Espanha", tier: 3 },
  { id: 3, nome: "Arsenal FC", sigla: "ARS", c1: "#f00", atk: 1.1, def: 0.7, code: "premier_league", league: "Premier League", country: "Inglaterra", tier: 1, rounds: 38 },
];

test("normaliza escudos locais, aceita https e recusa http", () => {
  assert.equal(normalizarEscudo("img/teams/a.png"), "/img/teams/a.png");
  assert.equal(normalizarEscudo("/img/x.webp"), "/img/x.webp");
  assert.equal(normalizarEscudo("https://cdn.x/a.png"), "https://cdn.x/a.png");
  assert.equal(normalizarEscudo("http://cdn.x/a.png"), null);
  assert.equal(normalizarEscudo(null), null);
});

test("cada inscrição resolve clube, liga, país e temporada", () => {
  const { snapshot, relatorio } = montarSnapshot(fixture, { 1: { asset: "img/teams/sp.png" }, 3: { asset: null } }, meta);
  assert.deepEqual(relatorio.erros, []);
  assert.equal(snapshot.clubes.length, 3);
  for (const c of snapshot.clubes) {
    const l = snapshot.ligas.find((x) => x.id === c.ligaId);
    assert.ok(l && l.pais && l.temporada === "2026");
  }
  const castilla = snapshot.clubes.find((c) => c.id === "x-b");
  assert.equal(castilla.perfilEstimado, true);
  assert.equal(snapshot.clubes.find((c) => c.id === "1").escudo, "/img/teams/sp.png");
  assert.equal(relatorio.semEscudo, 2);
  assert.equal(snapshot.ligas.find((l) => l.id === "premier_league").rodadas, 38);
  assert.equal(snapshot.ligas.find((l) => l.id === "brasileirao").rodadas, null);
});

test("duplicata e país desconhecido viram erro", () => {
  const { relatorio } = montarSnapshot([...fixture, fixture[0], { ...fixture[0], id: 9, country: "Marte" }], {}, meta);
  assert.equal(relatorio.erros.length, 2);
});

test("escudo local inexistente cai para as iniciais", () => {
  const { snapshot, relatorio } = montarSnapshot(fixture, { 1: { asset: "/img/nao.png" } }, { ...meta, existeArquivo: () => false });
  assert.equal(snapshot.clubes.find((c) => c.id === "1").escudo, null);
  assert.equal(relatorio.avisos.length, 1);
});

test("escudo local por ID tem precedência sobre URL externa", () => {
  const { snapshot } = montarSnapshot(fixture, { 1: { asset: "https://cdn.x/1.png" } }, { ...meta, escudoLocalPorId: { 1: "/img/teams/sp.svg" } });
  assert.equal(snapshot.clubes.find((c) => c.id === "1").escudo, "/img/teams/sp.svg");
});
