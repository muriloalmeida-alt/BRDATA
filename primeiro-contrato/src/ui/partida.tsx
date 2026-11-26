// Card da partida (PC-002): rodada, adversário, escudos por ID, placar,
// situação do atleta, minutos e destaques da função; marcos em lima.
import type { Catalogo } from "../engine/catalogo.ts";
import type { Partida } from "../engine/estado.ts";
import { POS, type Posicao } from "../engine/posicoes.ts";
import { Escudo } from "./componentes.tsx";

const MARCO: Record<Partida["marcos"][number], string> = {
  estreia: "Estreia", retorno: "Volta da lesão", golDecisivo: "Gol decisivo", atuacao: "Atuação acima da média",
};

export function situacaoTexto(p: Partida): string {
  if (p.situacao === "titular") return `Titular · ${p.minutos} min`;
  if (p.situacao === "entrou") return `Entrou · ${p.minutos} min`;
  if (p.situacao === "banco") return "No banco, sem entrar";
  return "Indisponível · lesão";
}

export function destaquesTexto(p: Partida, funcao: Posicao): string {
  if (p.minutos === 0) return "";
  const itens: string[] = [];
  const pl = (n: number, s: string, pll: string) => `${n} ${n === 1 ? s : pll}`;
  if (p.gols) itens.push(pl(p.gols, "gol", "gols"));
  if (p.assistencias) itens.push(pl(p.assistencias, "assistência", "assistências"));
  const setor = POS[funcao].setor;
  if (setor === "GOL") { itens.push(pl(p.defesas, "defesa", "defesas")); if (p.semSofrer) itens.push("sem sofrer gol"); }
  else if (setor === "DEF" || funcao === "VOLE" || funcao === "VOLD") { if (p.desarmes) itens.push(pl(p.desarmes, "desarme", "desarmes")); }
  if (p.nota != null) itens.push(`nota ${p.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}`);
  return itens.join(" · ");
}

export function CardPartida({ cat, p, clubeId, ligaNome, simplificada, funcao }: { cat: Catalogo; p: Partida; clubeId: string; ligaNome: string; simplificada: boolean; funcao: Posicao }) {
  const casa = p.mandante ? clubeId : p.adversarioId;
  const fora = p.mandante ? p.adversarioId : clubeId;
  const gc = p.mandante ? p.golsPro : p.golsContra;
  const gf = p.mandante ? p.golsContra : p.golsPro;
  const sig = (id: string) => cat.clube(id)?.sigla ?? "";
  const resultado = p.golsPro > p.golsContra ? "Vitória" : p.golsPro < p.golsContra ? "Derrota" : "Empate";
  const destaque = p.marcos.length > 0;
  const nome = (id: string) => cat.clube(id)?.nome ?? "";
  return (
    <article className={`partida${destaque ? " partida--marco" : ""}`} aria-label={`Rodada ${p.rodada}: ${nome(casa)} ${gc} a ${gf} ${nome(fora)}. ${situacaoTexto(p)}.`}>
      <p className="partida-kicker">Rodada {p.rodada} · {ligaNome}{simplificada ? " · simulada" : ""}</p>
      <div className="placar" aria-hidden="true">
        <span className="placar-time"><Escudo cat={cat} clubeId={casa} tamanho={44} /><span>{sig(casa)}</span></span>
        <span className="placar-num">{gc}<small>×</small>{gf}</span>
        <span className="placar-time"><Escudo cat={cat} clubeId={fora} tamanho={44} /><span>{sig(fora)}</span></span>
      </div>
      <p className="partida-adv">{resultado} {p.mandante ? "em casa" : "fora"} contra o {p.adversarioNome}</p>
      <p className={`partida-sit partida-sit--${p.situacao}`}>{situacaoTexto(p)}</p>
      {p.minutos > 0 && <p className="partida-dest">{destaquesTexto(p, funcao)}</p>}
      {destaque && <p className="partida-marcos">{p.marcos.map((m) => <span key={m} className="chip-marco">{MARCO[m]}</span>)}</p>}
    </article>
  );
}

/** Linha compacta para o histórico de jogos do balanço. */
export function LinhaPartida({ p, funcao }: { p: Partida; funcao: Posicao }) {
  const res = p.golsPro > p.golsContra ? "V" : p.golsPro < p.golsContra ? "D" : "E";
  return (
    <li className="linha-partida">
      <span className={`res res--${res}`} aria-label={res === "V" ? "Vitória" : res === "D" ? "Derrota" : "Empate"}>{res}</span>
      <span className="lp-corpo">
        <b>R{p.rodada} · {p.mandante ? "" : "@ "}{p.adversarioNome} {p.golsPro}×{p.golsContra}</b>
        <span>{situacaoTexto(p)}{p.minutos > 0 ? ` · ${destaquesTexto(p, funcao)}` : ""}</span>
      </span>
    </li>
  );
}
