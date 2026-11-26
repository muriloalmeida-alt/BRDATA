// As 11 posições do 4–2–3–1 (PC-001, LEIA_PRIMEIRO_CLAUDE "Posição").

export type Posicao = "GOL" | "LD" | "ZAGD" | "ZAGE" | "LE" | "VOLD" | "VOLE" | "PD" | "MEI" | "PE" | "CA";
export type Setor = "GOL" | "DEF" | "MEI" | "ATA";

export type InfoPosicao = {
  id: Posicao;
  sigla: string; // como aparece no campo
  nome: string; // por extenso (nome acessível)
  setor: Setor;
  linha: number; // 0 = topo (CA) … 4 = GOL
  coluna: number; // posição horizontal 0..1 dentro do campo
  funcao: string; // completa "Aceita jogar …?"
};

export const POSICOES: readonly InfoPosicao[] = [
  { id: "CA", sigla: "CA", nome: "Centroavante", setor: "ATA", linha: 0, coluna: 0.5, funcao: "como centroavante" },
  { id: "PE", sigla: "PE", nome: "Ponta esquerda", setor: "ATA", linha: 1, coluna: 0.22, funcao: "aberto pela esquerda" },
  { id: "MEI", sigla: "MEI", nome: "Meia", setor: "MEI", linha: 1, coluna: 0.5, funcao: "como meia" },
  { id: "PD", sigla: "PD", nome: "Ponta direita", setor: "ATA", linha: 1, coluna: 0.78, funcao: "aberto pela direita" },
  { id: "VOLE", sigla: "VOL E", nome: "Volante pela esquerda", setor: "MEI", linha: 2, coluna: 0.32, funcao: "como volante pela esquerda" },
  { id: "VOLD", sigla: "VOL D", nome: "Volante pela direita", setor: "MEI", linha: 2, coluna: 0.68, funcao: "como volante pela direita" },
  { id: "LE", sigla: "LE", nome: "Lateral esquerdo", setor: "DEF", linha: 3, coluna: 0.13, funcao: "na lateral esquerda" },
  { id: "ZAGE", sigla: "ZAG E", nome: "Zagueiro pela esquerda", setor: "DEF", linha: 3, coluna: 0.38, funcao: "na zaga pela esquerda" },
  { id: "ZAGD", sigla: "ZAG D", nome: "Zagueiro pela direita", setor: "DEF", linha: 3, coluna: 0.62, funcao: "na zaga pela direita" },
  { id: "LD", sigla: "LD", nome: "Lateral direito", setor: "DEF", linha: 3, coluna: 0.87, funcao: "na lateral direita" },
  { id: "GOL", sigla: "GOL", nome: "Goleiro", setor: "GOL", linha: 4, coluna: 0.5, funcao: "no gol" },
];

export const POS = Object.fromEntries(POSICOES.map((p) => [p.id, p])) as Record<Posicao, InfoPosicao>;

/** Funções relacionadas, da mais natural para a menos (adaptação). */
export const RELACIONADAS: Record<Posicao, Posicao[]> = {
  GOL: [],
  LD: ["PD", "ZAGD"],
  LE: ["PE", "ZAGE"],
  ZAGD: ["ZAGE", "VOLD", "LD"],
  ZAGE: ["ZAGD", "VOLE", "LE"],
  VOLD: ["VOLE", "MEI", "ZAGD"],
  VOLE: ["VOLD", "MEI", "ZAGE"],
  MEI: ["PD", "PE", "VOLD"],
  PD: ["PE", "MEI", "CA"],
  PE: ["PD", "MEI", "CA"],
  CA: ["MEI", "PD", "PE"],
};

export function ehPosicao(v: unknown): v is Posicao {
  return typeof v === "string" && v in POS;
}

export type ChaveMetrica = "gols" | "assistencias" | "desarmes" | "semSofrer";

/** Métrica principal mostrada em temporada, balanço, trajetória e legado.
 *  Atacante: gols; meia: assistências (criação); volante e defensor:
 *  desarmes; goleiro: jogos sem sofrer gol (PROJETO.md, regra 3). */
export function metricaPrincipal(pos: Posicao): { chave: ChaveMetrica; rotulo: string } {
  const setor = POS[pos].setor;
  if (setor === "ATA") return { chave: "gols", rotulo: "Gols" };
  if (pos === "MEI") return { chave: "assistencias", rotulo: "Assistências" };
  if (setor === "GOL") return { chave: "semSofrer", rotulo: "Sem sofrer gol" };
  return { chave: "desarmes", rotulo: "Desarmes" };
}
