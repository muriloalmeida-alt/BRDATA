// ECON-001, Entrega 1: quadro de receitas, folha e caixa por perfil, com as
// fontes do catálogo (public/js/motor/economia.js). Sob demanda (fora das
// suítes). Escreve docs/economia/02_Quadro_E1.md.
// Uso: node tests/sim/economia_quadro.js
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");

(async () => {
  const E = await import(pathToFileURL(path.join(ROOT, "public/js/motor/economia.js")).href);
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const M = (v) => (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const grupos = [
    ["Brasil", [
      { liga: "brasileirao", nome: /^Flamengo/, rotulo: "Flamengo (elite)" },
      { liga: "brasileirao", nome: /^Palmeiras/, rotulo: "Palmeiras" },
      { liga: "brasileirao", nome: /^Bahia/, rotulo: "Bahia (meio)" },
      { liga: "brasileirao", nome: /^Mirassol/, rotulo: "Mirassol (menor folha)" },
      { liga: "serie_b", nome: /./, rotulo: "Maior da Série B" },
      { liga: "serie_b", nome: /./, rotulo: "Promovido à Série A (1º ano)", status: "promovido", para: "brasileirao" },
    ]],
    ["Europa", [
      { liga: "premier_league", nome: /^Arsenal/, rotulo: "Arsenal (topo da Premier League)" },
      { liga: "premier_league", nome: /^Brentford/, rotulo: "Recém-rebaixado à Championship (1º ano)", status: "rebaixado", para: "efl_championship" },
      { liga: "efl_championship", nome: /^Southampton/, rotulo: "Southampton (Championship)" },
      { liga: "la_liga", nome: /^Real Madrid/, rotulo: "Real Madrid" },
      { liga: "bundesliga", nome: /^FC Bayern/, rotulo: "Bayern" },
    ]],
    ["América do Sul", [
      { liga: "arg_liga_profesional", nome: /^River/, rotulo: "River Plate (grande argentino)" },
      { liga: "uru_primera", nome: /Peñarol/, rotulo: "Peñarol (grande uruguaio)" },
      { liga: "ecu_ligapro_a", nome: /Barcelona SC/, rotulo: "Barcelona SC (liga com dados escassos)" },
    ]],
  ];
  let md = `# ECON-001 · Entrega 1 · Quadro por perfil\n\nGerado por \`tests/sim/economia_quadro.js\` a partir do catálogo em \`public/js/motor/economia.js\` (versão ${E.VERSAO_ECONOMIA} da regra econômica, período de referência ${E.PERIODO_REFERENCIA}). Valores anuais em R$ milhões (câmbio fixo do jogo: £ 1 = R$ 7,00; € 1 = R$ 6,00; US$ 1 = R$ 5,50), folha-base em R$ milhões por mês. Âncora = número de clube da proposta (publicado ou estimado).\n\n`;
  md += `A Entrega 1 não muda o jogo: o modelo entra nas carreiras novas com a recalibração dos preços (Entrega 2).\n\n`;
  for (const [titulo, pedidos] of grupos) {
    md += `## ${titulo}\n\n| Perfil | Receita recorrente/ano | Folha-base/mês | Despesas/ano | Resultado/ano | Caixa inicial | Orçamento de transferências | Origem |\n|---|---:|---:|---:|---:|---:|---:|---|\n`;
    for (const l of E.quadro(indice, pedidos)) {
      md += `| ${l.rotulo}${l.receitas.transicaoAnual ? ` (transição R$ ${M(l.receitas.transicaoAnual)} mi)` : ""} | ${M(l.receitaAnual)} | ${M(l.folhaBaseMensal)} | ${M(l.despesasOperacionaisAnual)} | ${M(l.resultadoOperacionalAnual)} | ${M(l.caixaInicial)} | ${M(l.orcamentoTransferencias)} | ${l.ancorado ? "âncora" : "modelo"} |\n`;
    }
    md += "\n";
  }
  md += `## Fontes do catálogo\n\n| Liga | Item | Valor | Período | Tipo | Confiança | Fonte |\n|---|---|---|---|---|---|---|\n`;
  const fmt = (v, moeda) => (typeof v === "object" ? JSON.stringify(v) : moeda ? `${moeda} ${v.toLocaleString("pt-BR")}` : String(v));
  for (const [liga, p] of Object.entries(E.PERFIS)) {
    const itens = [];
    for (const [k, v] of Object.entries(p)) {
      if (v && v.tipo) itens.push(v);
      if (Array.isArray(v)) for (const x of v) { if (x && x.tipo) itens.push(x); else if (x && typeof x === "object") for (const y of Object.values(x)) if (y && y.tipo) itens.push(y); }
    }
    for (const x of itens) md += `| ${liga} | ${x.item} | ${fmt(x.valor, x.moeda)} | ${x.periodo} | ${x.tipo} | ${x.confianca} | ${x.fonte || "—"} |\n`;
  }
  md += `\n## Regras imputadas\n\n- Resultado operacional ÷ receita: ${JSON.stringify(E.REGRAS.margem)} (Championship: −10% no jogo; a Deloitte publica −46%, coberto por aportes, fora da base).\n- Despesas mínimas: ${E.REGRAS.despesasMinimas * 100}% da receita; caixa inicial: ${E.REGRAS.caixaInicial * 100}% da receita; orçamento: ${E.REGRAS.orcamentoMinimo * 100}% da receita + ${E.REGRAS.caixaParaOrcamento * 100}% do caixa + ${E.REGRAS.sobraParaOrcamento * 100}% da sobra anual.\n- Composição da receita (TV, comercial, jogo): ${JSON.stringify(E.COMPOSICAO)}.\n- Distribuição na liga: lei de potência na posição financeira (ordem pelo porte do pacote; no Brasil, pela força), ajustada à concentração da liga; âncoras substituem e o resto é reescalado para manter o total.\n`;
  fs.writeFileSync(path.join(ROOT, "docs/economia/02_Quadro_E1.md"), md);
  console.log(md.split("## Fontes")[0]);
})();
