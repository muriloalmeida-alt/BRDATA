// Catálogo imutável por versão (PC-001, CATALOGO.md). O motor recebe o
// snapshot pronto; quem baixa é a camada de dados da interface.

export type Liga = {
  id: string;
  nome: string;
  pais: string;
  paisId: string;
  continente: string;
  confederacao: string;
  divisao: number;
  temporada: string;
  rodadas: number | null; // null = formato não verificado (temporada simplificada)
  clubes: number;
};

export type Clube = {
  id: string;
  nome: string;
  sigla: string;
  cor: string | null;
  ligaId: string;
  atk: number;
  def: number;
  perfilEstimado: boolean;
  escudo: string | null;
  busca: string;
};

export type Snapshot = {
  versao: string;
  temporada: string;
  geradoEm: string;
  fonte: string;
  ligas: Liga[];
  clubes: Clube[];
};

export type Catalogo = Snapshot & {
  liga: (id: string) => Liga | undefined;
  clube: (id: string) => Clube | undefined;
  clubesDaLiga: (ligaId: string) => Clube[];
};

export function indexarCatalogo(s: Snapshot): Catalogo {
  const ligas = new Map(s.ligas.map((l) => [l.id, l]));
  const clubes = new Map(s.clubes.map((c) => [c.id, c]));
  const porLiga = new Map<string, Clube[]>();
  for (const c of s.clubes) {
    const arr = porLiga.get(c.ligaId) ?? [];
    arr.push(c);
    porLiga.set(c.ligaId, arr);
  }
  return {
    ...s,
    liga: (id) => ligas.get(id),
    clube: (id) => clubes.get(id),
    clubesDaLiga: (id) => porLiga.get(id) ?? [],
  };
}

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type FiltroClubes = { texto?: string; pais?: string; ligaId?: string };

/** Busca por nome e sigla, com e sem acentos, antes ou depois dos filtros.
 *  Ordem: começa com o termo > contém; depois divisão e nome. */
export function buscarClubes(cat: Catalogo, f: FiltroClubes): Clube[] {
  const termo = semAcento(f.texto ?? "");
  const partes = termo.split(/\s+/).filter(Boolean);
  const res: Array<{ c: Clube; score: number }> = [];
  for (const c of cat.clubes) {
    const l = cat.liga(c.ligaId);
    if (!l) continue;
    if (f.pais && l.pais !== f.pais) continue;
    if (f.ligaId && l.id !== f.ligaId) continue;
    let score = 0;
    if (partes.length) {
      if (!partes.every((p) => c.busca.includes(p))) continue;
      score = c.busca.startsWith(partes[0]) || c.busca.includes(" " + partes[0]) ? 0 : 1;
    }
    res.push({ c, score });
  }
  res.sort((a, b) => a.score - b.score
    || (cat.liga(a.c.ligaId)!.divisao - cat.liga(b.c.ligaId)!.divisao)
    || a.c.nome.localeCompare(b.c.nome, "pt-BR"));
  return res.map((r) => r.c);
}

/** Nível de jogo da liga (0–100), estimativa do motor. Ligas fora da tabela
 *  caem num nível pela divisão. Simulação, não dado observado. */
const NIVEL_LIGA: Record<string, number> = {
  premier_league: 86, la_liga: 85, serie_a_italia: 83, bundesliga: 83, ligue_1: 80,
  brasileirao: 76, efl_championship: 74, arg_liga_profesional: 72, laliga_hypermotion: 72,
  bundesliga_2: 72, serie_b_italia: 71, ligue_2: 70, serie_b: 68, col_primera_a: 67,
  "GB-ENG-3": 66, "DE-3": 65, chi_liga_primera: 65, ecu_ligapro_a: 65, uru_primera: 64,
  "ES-3": 63, arg_primera_nacional: 63, serie_c: 62, "IT-3": 61, "FR-3": 60,
  col_primera_b: 58, chi_liga_ascenso: 57, ecu_ligapro_b: 56, uru_segunda: 55,
  serie_d: 54, "AR-3": 52, "CL-3": 50, "CO-3": 48, "EC-3": 47, "UY-3": 46,
};

export function nivelLiga(l: Liga | undefined): number {
  if (!l) return 55;
  return NIVEL_LIGA[l.id] ?? Math.max(40, 76 - (l.divisao - 1) * 8);
}

/** Força do clube (0–100): nível da liga ± perfil de ataque/defesa. */
export function forcaClube(cat: Catalogo, clubeId: string): number {
  const c = cat.clube(clubeId);
  if (!c) return 55;
  const base = nivelLiga(cat.liga(c.ligaId));
  const rel = Math.max(-1, Math.min(1, (c.atk - 1) - (c.def - 1))) * 7;
  return Math.round((base + rel) * 10) / 10;
}

/** Jogos de liga por temporada. Formato verificado usa as rodadas do
 *  catálogo; senão, calendário simulado explícito (temporada simplificada). */
export function jogosDaTemporada(l: Liga | undefined): { jogos: number; simplificada: boolean } {
  if (l && l.rodadas) return { jogos: l.rodadas, simplificada: false };
  if (!l) return { jogos: 30, simplificada: true };
  const tamanho = Math.min(Math.max(l.clubes, 12), 24);
  return { jogos: Math.min(38, (tamanho - 1) * 2), simplificada: true };
}

/** Rótulo "País · Liga" a partir da inscrição na temporada do snapshot. */
export function rotuloInscricao(cat: Catalogo, clubeId: string): string {
  const c = cat.clube(clubeId);
  const l = c && cat.liga(c.ligaId);
  return l ? `${l.pais} · ${l.nome}` : "";
}
