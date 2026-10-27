import { describe, expect, it } from "vitest";
import raw from "./__fixtures__/career_r4.json";
import type { Career } from "./contracts";
import {
  boardConfidence, clubNews, clubRecord, crestSrc, firstName, greeting, groupLabel, leaguePosition,
  nextMatch, recentResults, shortDate, sortedStandings, squadHighlights,
} from "./dashboard";

// Fixture: save real do jogo atual depois de 3 rodadas (Athletico-PR,
// Série A 2023), recortado aos campos que a v2 lê — ver
// docs/IMPLEMENTACAO_INVENTARIO_REAL.md.
const career = raw as unknown as Career;
const clone = (): Career => JSON.parse(JSON.stringify(raw));

describe("tabela", () => {
  it("ordena por pontos, vitórias, saldo e gols pró", () => {
    const rows = sortedStandings(career.standings);
    const key = (r: { pts: number; v: number; sg: number; gp: number }) => [r.pts, r.v, r.sg, r.gp];
    for (let i = 1; i < rows.length; i++) {
      const a = key(rows[i - 1]), b = key(rows[i]);
      const k = a.findIndex((x, j) => x !== b[j]);
      expect(k === -1 || a[k] > b[k]).toBe(true); // a vem antes de b pelo 1º critério que difere
    }
    expect(rows).toHaveLength(Object.keys(career.standings).length);
  });
  it("posição do clube está entre 1 e o total; clube ausente = 0", () => {
    const pos = leaguePosition(career);
    expect(pos).toBeGreaterThanOrEqual(1);
    expect(pos).toBeLessThanOrEqual(20);
    expect(leaguePosition({ ...clone(), clubId: "nao-existe" })).toBe(0);
  });
  it("campanha bate com a linha do clube na tabela", () => {
    const r = career.standings[career.clubId];
    expect(clubRecord(career)).toMatchObject({ j: r.j, v: r.v, e: r.e, d: r.d, gp: r.gp, gc: r.gc, pts: r.pts });
  });
});

describe("próximo jogo", () => {
  it("é o confronto do clube na rodada atual, com data do calendário", () => {
    const nm = nextMatch(career)!;
    expect(nm.round).toBe(career.currentRound);
    expect([nm.home.id, nm.away.id]).toContain(career.clubId);
    expect(nm.opponent.id).not.toBe(career.clubId);
    const week = career.calendar!.weeks.find((w) => w.r === career.currentRound)!;
    expect(nm.date!.getMonth() + 1).toBe(Number(week.d.split("-")[0]));
    expect(nm.date!.getDate()).toBe(Number(week.d.split("-")[1]));
  });
  it("sem confronto na rodada (fim de temporada) devolve null", () => {
    expect(nextMatch({ ...clone(), currentRound: 999 })).toBeNull();
  });
  it("sem calendário mantém o jogo, sem data", () => {
    const nm = nextMatch({ ...clone(), calendar: null })!;
    expect(nm.date).toBeNull();
  });
});

describe("desempenho e elenco", () => {
  it("resultados recentes batem com recentForm do save (3/1/0 pontos)", () => {
    const pts = recentResults(career).map((r) => (r.result === "V" ? 3 : r.result === "E" ? 1 : 0));
    expect(pts).toEqual((career.recentForm ?? []).slice(-pts.length));
  });
  it("sem matchLog: lista vazia", () => {
    expect(recentResults({ ...clone(), matchLog: undefined })).toEqual([]);
  });
  it("destaques = 4 maiores overall do elenco principal, em ordem", () => {
    const s = squadHighlights(career);
    expect(s).toHaveLength(4);
    expect(s.every((p) => p.origin === "principal")).toBe(true);
    for (let i = 1; i < s.length; i++) expect(s[i - 1].overall).toBeGreaterThanOrEqual(s[i].overall);
  });
  it("notícias: no máximo 3, mais recentes primeiro", () => {
    const n = clubNews(career);
    expect(n.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < n.length; i++) expect((n[i - 1].round ?? 0)).toBeGreaterThanOrEqual(n[i].round ?? 0);
  });
});

describe("diretoria", () => {
  it("confiança fica entre 0 e 100 e tem rótulo coerente com o valor", () => {
    const c = boardConfidence(career);
    expect(c.value).toBeGreaterThanOrEqual(0);
    expect(c.value).toBeLessThanOrEqual(100);
    expect(c.label).toBe(c.value >= 80 ? "Muito alta" : c.value >= 60 ? "Alta" : c.value >= 40 ? "Estável" : c.value >= 20 ? "Baixa" : "Crítica");
  });
  it("extremos são limitados (0–100)", () => {
    expect(boardConfidence({ ...clone(), negativeSeasonsStreak: 10 }).value).toBe(0);
    expect(boardConfidence({ ...clone(), reputation: 1000 }).value).toBe(100);
  });
});

describe("apresentação", () => {
  it("escudo: logo do catálogo > SVG oficial > null", () => {
    expect(crestSrc({ id: "fla" })).toBe("/img/teams/fla.svg");
    expect(crestSrc({ id: "x", logo: "img/teams/x_b.png" })).toBe("/img/teams/x_b.png");
    expect(crestSrc({ id: "desconhecido" })).toBeNull();
  });
  it("saudação pela hora e primeiro nome", () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe("Bom dia");
    expect(greeting(new Date(2026, 0, 1, 14))).toBe("Boa tarde");
    expect(greeting(new Date(2026, 0, 1, 22))).toBe("Boa noite");
    expect(firstName("Murilo Almeida")).toBe("Murilo");
    expect(firstName("")).toBe("Treinador");
  });
  it("posição: todos os grupos do save têm rótulo (G/D/M/F)", () => {
    const groups = new Set(career.squad.map((p) => p.group));
    for (const g of groups) expect(groupLabel(g)).not.toBe("—");
  });
  it("data curta sem 'de' e com só a 1ª letra maiúscula", () => {
    expect(shortDate(new Date(2023, 3, 10))).toMatch(/^[A-Z][a-zç]{2}, 10 abr$/);
  });
});
