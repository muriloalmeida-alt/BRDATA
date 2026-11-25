/* ===================================================================
   MOTOR — ECONOMIA POR LIGA E CLUBE (ECON-001, Entrega 1, 25/11/2026)
   -------------------------------------------------------------------
   Catálogo versionado de perfis econômicos por liga/divisão e o modelo da
   base financeira de cada clube (proposta em docs/economia/00_Proposta.md;
   decisões de PM em 01_Especificacao.md). Módulo puro: não lê nem grava o
   save; o catálogo fica no código (fora do save), com fonte, período,
   unidade, item medido e confiança de cada número.

   Unidade interna: R$ (como o resto do motor). Os valores do catálogo ficam
   na moeda da fonte e são convertidos pelo câmbio fixo do jogo
   (texto.CAMBIO) na leitura; o arredondamento é feito uma vez, na saída.

   Modelo (por liga):
   - receita recorrente total da liga (sem venda de jogadores, aportes e
     prêmios extraordinários), da fonte ou imputada;
   - distribuição entre os clubes por uma lei de potência na posição
     financeira (r^-k), com k ajustado à concentração da liga (razão topo/
     base ou fatia dos 2 maiores); a ordem dos clubes vem do porte do pacote
     (M7) ou, no Brasil, da força; âncoras de clube substituem a estimativa
     e o resto é reescalado para manter o total;
   - folha-base do elenco = receita × razão da liga (ou âncora; no Brasil,
     uma lei de potência ajustada às folhas publicadas);
   - despesas operacionais, caixa inicial e orçamento de transferências por
     regra imputada documentada; TV, comercial e bilheteria/sócios pela
     composição da região;
   - recém-rebaixado com pagamento de transição (Inglaterra) e promovido na
     faixa de baixo da divisão nova.
   A Entrega 1 não liga este modelo ao jogo: a ativação (carreiras novas,
   CAREER.economia.versao = 2) vem com os preços, na Entrega 2.
=================================================================== */
import { CAMBIO } from "./texto.js";

export const VERSAO_ECONOMIA = 5;
export const PERIODO_REFERENCIA = "2024/25–2025/26";

// Fonte de um número: { valor, moeda, periodo, item, tipo, fonte, confianca }.
// tipo: "publicado" | "estimado" | "imputado"; confianca: "alta" | "media" | "baixa".
const F = (valor, moeda, periodo, item, tipo, fonte, confianca) => ({ valor, moeda, periodo, item, tipo, fonte, confianca });

// Composição da receita recorrente por região (imputada): TV, comercial
// (patrocínio e licenciamento) e dia de jogo/sócios.
export const COMPOSICAO = {
  europa: { tv: 0.5, comercial: 0.35, jogo: 0.15 },
  brasil: { tv: 0.4, comercial: 0.3, jogo: 0.3 },
  america_sul: { tv: 0.3, comercial: 0.3, jogo: 0.4 },
};
// Regras imputadas da base financeira (fração da receita recorrente anual).
export const REGRAS = {
  // Resultado operacional recorrente ÷ receita (imputado): as despesas fecham
  // a conta (receita − folha-base − despesas = resultado). Custos de futebol
  // fora a folha-base (direitos de imagem, bônus, staff, estrutura) entram
  // nas despesas. Prejuízos cobertos por aportes ficam fora da base (a
  // Championship publica −46%; no jogo, −10%: ver PERFIS.efl_championship).
  margem: { europa: 0.03, brasil: 0.05, america_sul: 0.0 },
  despesasMinimas: 0.12, // despesas não ficam abaixo de 12% da receita
  // Saldo de abertura (grandeza distinta da receita): ~2 meses de receita.
  // Era 8% (~1 mês); nas divisões de baixo, a reserva de 1 mês de folha
  // levava quase todo o caixa e o clube não conseguia contratar (25/11).
  caixaInicial: 0.15,
  orcamentoMinimo: 0.06, // orçamento de transferências mínimo
  sobraParaOrcamento: 0.6, // parte da sobra anual (receita - folha - despesas) que vira orçamento
  caixaParaOrcamento: 0.25, // parte do caixa inicial que vira orçamento
  reservaDeCaixaMeses: 1, // caixa mínimo após um pagamento: 1 mês de folha
};

// ---------- catálogo ----------
// Por liga: região, moeda, clubes, receita recorrente total, razão folha-base/
// receita e concentração. Âncoras de clube por nome.
export const PERFIS = {
  premier_league: {
    regiao: "europa", moeda: "GBP", clubes: 20,
    receitaTotal: F(6.8e9, "GBP", "2024/25", "receita dos 20 clubes", "publicado", "Deloitte, Annual Review of Football Finance 2025", "alta"),
    custoSalarial: F(4.4e9, "GBP", "2024/25", "custo salarial dos clubes (atletas e staff)", "publicado", "Deloitte, Annual Review of Football Finance 2025", "alta"),
    razaoFolhaBase: F(0.62, null, "2025/26", "folha-base do elenco ÷ custo salarial", "imputado", "Arsenal £189,3 mi de salários-base (FBref/Capology) contra o custo salarial médio da liga", "media"),
    topoBase: F(4.5, null, "2024/25", "receita do maior ÷ menor clube", "imputado", "ordem de grandeza das contas da Deloitte", "media"),
    ancoras: [{ nome: /^Arsenal/, folhaBaseAnual: F(189.3e6, "GBP", "2025/26", "salários-base do elenco", "estimado", "FBref/Capology", "media") }],
  },
  efl_championship: {
    regiao: "europa", moeda: "GBP", clubes: 24,
    receitaTotal: F(942e6, "GBP", "2024/25", "receita total da divisão (inclui pagamentos de transição)", "publicado", "Deloitte, Annual Review of Football Finance 2025 (Championship)", "alta"),
    razaoCusto: F(1.15, null, "2024/25", "custo salarial ÷ receita (prejuízo operacional de £436 mi)", "imputado", "Deloitte (prejuízo publicado); razão imputada", "media"),
    razaoFolhaBase: F(0.65, null, "2024/25", "folha-base ÷ custo salarial", "imputado", "mesma ordem da Premier League", "baixa"),
    topoBase: F(5, null, "2024/25", "maior ÷ menor (recém-rebaixados no topo)", "imputado", "estrutura da divisão", "baixa"),
    margem: F(-0.1, null, "2024/25", "resultado operacional ÷ receita no jogo", "imputado", "a Deloitte publica −46% (prejuízo de £436 mi), coberto por aportes dos donos, que ficam fora da base recorrente", "media"),
    transicao: [F(49e6, "GBP", "2025/26", "pagamento de transição, 1º ano após a queda", "imputado", "ordem de grandeza do parachute da Premier League", "media"),
      F(40e6, "GBP", "2025/26", "pagamento de transição, 2º ano", "imputado", "idem", "media")],
  },
  bundesliga: {
    regiao: "europa", moeda: "EUR", clubes: 18,
    receitaTotal: F(4.3e9, "EUR", "2024/25", "receita da liga", "publicado", "Deloitte / DFL 2024/25", "alta"),
    custoSalarial: F(2.3e9, "EUR", "2024/25", "custo salarial", "publicado", "Deloitte / DFL 2024/25", "alta"),
    razaoFolhaBase: F(0.65, null, "2024/25", "folha-base ÷ custo salarial", "imputado", "mesma ordem da Premier League", "baixa"),
    topoBase: F(8, null, "2024/25", "maior ÷ menor", "imputado", "Bayern contra os menores", "media"),
  },
  bundesliga_2: {
    regiao: "europa", moeda: "EUR", clubes: 18,
    receitaTotal: F(0.8e9, "EUR", "2024/25", "receita da divisão", "imputado", "ordem de grandeza da 2. Bundesliga", "baixa"),
    razaoCusto: F(0.5, null, "2024/25", "custo salarial ÷ receita", "imputado", "", "baixa"),
    razaoFolhaBase: F(0.7, null, "2024/25", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(4, null, "2024/25", "maior ÷ menor", "imputado", "", "baixa"),
  },
  la_liga: {
    regiao: "europa", moeda: "EUR", clubes: 20,
    receitaTotal: F(4.1e9, "EUR", "2024/25", "receita da liga", "publicado", "Deloitte 2025 (LaLiga)", "alta"),
    razaoCusto: F(0.55, null, "2024/25", "custo salarial ÷ receita", "imputado", "", "media"),
    razaoFolhaBase: F(0.65, null, "2024/25", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    top2: F(0.52, null, "2024/25", "fatia de Real Madrid e Barcelona na receita", "publicado", "proposta ECON-001 (Deloitte)", "alta"),
  },
  laliga_hypermotion: {
    regiao: "europa", moeda: "EUR", clubes: 22,
    receitaTotal: F(0.4e9, "EUR", "2024/25", "receita da divisão", "imputado", "", "baixa"),
    razaoCusto: F(0.6, null, "2024/25", "custo salarial ÷ receita", "imputado", "", "baixa"),
    razaoFolhaBase: F(0.7, null, "2024/25", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(4, null, "2024/25", "maior ÷ menor", "imputado", "", "baixa"),
  },
  serie_a_italia: {
    regiao: "europa", moeda: "EUR", clubes: 20,
    receitaTotal: F(3.8e9, "EUR", "2023/24", "receita da liga", "imputado", "ordem de grandeza das contas da Deloitte (fora da proposta)", "media"),
    razaoCusto: F(0.6, null, "2023/24", "custo salarial ÷ receita", "imputado", "", "media"),
    razaoFolhaBase: F(0.65, null, "2023/24", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(8, null, "2023/24", "maior ÷ menor", "imputado", "", "baixa"),
  },
  serie_b_italia: {
    regiao: "europa", moeda: "EUR", clubes: 20,
    receitaTotal: F(0.35e9, "EUR", "2023/24", "receita da divisão", "imputado", "", "baixa"),
    razaoCusto: F(0.8, null, "2023/24", "custo salarial ÷ receita", "imputado", "", "baixa"),
    razaoFolhaBase: F(0.7, null, "2023/24", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(4, null, "2023/24", "maior ÷ menor", "imputado", "", "baixa"),
  },
  ligue_1: {
    regiao: "europa", moeda: "EUR", clubes: 18,
    receitaTotal: F(2.2e9, "EUR", "2023/24", "receita da liga", "imputado", "ordem de grandeza das contas da Deloitte (fora da proposta)", "media"),
    razaoCusto: F(0.65, null, "2023/24", "custo salarial ÷ receita", "imputado", "", "media"),
    razaoFolhaBase: F(0.65, null, "2023/24", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(15, null, "2023/24", "maior ÷ menor (PSG muito acima)", "imputado", "", "media"),
  },
  ligue_2: {
    regiao: "europa", moeda: "EUR", clubes: 18,
    receitaTotal: F(0.32e9, "EUR", "2023/24", "receita da divisão", "imputado", "", "baixa"),
    razaoCusto: F(0.7, null, "2023/24", "custo salarial ÷ receita", "imputado", "", "baixa"),
    razaoFolhaBase: F(0.7, null, "2023/24", "folha-base ÷ custo salarial", "imputado", "", "baixa"),
    topoBase: F(4, null, "2023/24", "maior ÷ menor", "imputado", "", "baixa"),
  },
  brasileirao: {
    regiao: "brasil", moeda: "BRL", clubes: 20,
    receitaTotal: F(11e9, "BRL", "2025", "receita recorrente dos 20 maiores (R$ 15 bi menos mais de R$ 4 bi de transferências)", "estimado", "Sports Value 2025", "media"),
    topoBase: F(11.6, null, "2025", "Flamengo ÷ Mirassol (R$ 2,09 bi ÷ R$ 180 mi)", "publicado", "Sports Value 2025 / ge", "media"),
    // Folha-base: lei de potência na receita, ajustada às folhas publicadas
    // (Flamengo R$ 37,5 mi/mês com R$ 2,09 bi; Mirassol R$ 6 mi/mês com R$ 180 mi).
    folhaPotencia: F({ a: 450e6, r0: 2.09e9, b: 0.748 }, "BRL", "2025–2026", "folha anual = a × (receita / r0)^b", "estimado", "ajuste às folhas do ge 2026 e às receitas da Sports Value 2025", "media"),
    ancoras: [
      { nome: /^Flamengo/, receitaAnual: F(2.09e9, "BRL", "2025", "receita", "publicado", "Sports Value 2025", "alta"), folhaBaseMensal: F(37.5e6, "BRL", "2026", "folha mensal", "estimado", "ge, 14/10/2026", "media") },
      { nome: /^Palmeiras/, folhaBaseMensal: F(30e6, "BRL", "2026", "folha mensal", "estimado", "ge, 14/10/2026", "media") },
      { nome: /^Bahia/, folhaBaseMensal: F(14e6, "BRL", "2026", "folha mensal", "estimado", "ge, 14/10/2026", "media") },
      { nome: /^Mirassol/, receitaAnual: F(180e6, "BRL", "2025", "receita", "publicado", "Sports Value 2025", "alta"), folhaBaseMensal: F(6e6, "BRL", "2026", "folha mensal", "estimado", "ge, 14/10/2026", "media") },
    ],
  },
  serie_b: {
    regiao: "brasil", moeda: "BRL", clubes: 20,
    receitaTotal: F(1.4e9, "BRL", "2025", "receita da divisão", "imputado", "ordem de grandeza (clubes de R$ 30 mi a R$ 200 mi)", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(6, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  serie_c: {
    regiao: "brasil", moeda: "BRL", clubes: 20,
    receitaTotal: F(0.35e9, "BRL", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.55, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(5, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  arg_liga_profesional: {
    regiao: "america_sul", moeda: "USD", clubes: 30,
    receitaTotal: F(0.8e9, "USD", "2025", "receita recorrente da liga", "imputado", "ordem de grandeza (River e Boca no topo)", "baixa"),
    razaoFolha: F(0.45, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(20, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
    ancoras: [{ nome: /^River Plate/, receitaAnual: F(120e6, "USD", "2025", "receita recorrente (US$ 217,7 mi reportados incluem Mundial e vendas)", "imputado", "ge, 07/08/2026, sem extraordinários", "media") }],
  },
  arg_primera_nacional: {
    regiao: "america_sul", moeda: "USD", clubes: 36,
    receitaTotal: F(70e6, "USD", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(4, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  uru_primera: {
    regiao: "america_sul", moeda: "USD", clubes: 16,
    receitaTotal: F(90e6, "USD", "2025", "receita da liga", "imputado", "ordem de grandeza (Peñarol e Nacional no topo)", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(15, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
    ancoras: [{ nome: /Peñarol/, receitaAnual: F(25e6, "USD", "2025", "receita recorrente (sócios US$ 9,5 mi e TV US$ 5,5 mi publicados; o resto imputado)", "imputado", "El País (Uruguai), 2025", "media") }],
  },
  uru_segunda: {
    regiao: "america_sul", moeda: "USD", clubes: 14,
    receitaTotal: F(8e6, "USD", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.55, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(3, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  col_primera_a: {
    regiao: "america_sul", moeda: "USD", clubes: 20,
    receitaTotal: F(250e6, "USD", "2025", "receita da liga", "imputado", "ordem de grandeza (Supersociedades sem os números nesta entrega)", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(10, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  col_primera_b: {
    regiao: "america_sul", moeda: "USD", clubes: 16,
    receitaTotal: F(25e6, "USD", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.55, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(4, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  chi_liga_primera: {
    regiao: "america_sul", moeda: "USD", clubes: 16,
    receitaTotal: F(200e6, "USD", "2025", "receita da liga", "imputado", "", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(10, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  chi_liga_ascenso: {
    regiao: "america_sul", moeda: "USD", clubes: 16,
    receitaTotal: F(20e6, "USD", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.55, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(4, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  ecu_ligapro_a: {
    regiao: "america_sul", moeda: "USD", clubes: 16,
    receitaTotal: F(150e6, "USD", "2025", "receita da liga", "imputado", "", "baixa"),
    razaoFolha: F(0.5, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(10, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
  ecu_ligapro_b: {
    regiao: "america_sul", moeda: "USD", clubes: 12,
    receitaTotal: F(15e6, "USD", "2025", "receita da divisão", "imputado", "", "baixa"),
    razaoFolha: F(0.55, null, "2025", "folha-base ÷ receita", "imputado", "", "baixa"),
    topoBase: F(4, null, "2025", "maior ÷ menor", "imputado", "", "baixa"),
  },
};

// Referências de plausibilidade (proposta): clubes fora das ligas jogáveis e
// negócios. Não entram no catálogo de clubes; servem aos testes e ao quadro.
/* ---------- Valor de mercado por atleta (Mercado, etapa 1; economia v4) ----------
   Handoff "Touchline — Implementação do mercado" (25/11/2026), seção 1. Sem
   avaliação individual nos catálogos (os pacotes do mundo só têm o valor do
   elenco inteiro, `squadMarketValueEur`), todo atleta usa:
     valor = referência da liga (overall 75, em EUR) × qualidade(overall) × idade
   convertido a R$ pelo câmbio fixo e arredondado uma vez (R$ 1 mil). */
const H = "Handoff Touchline — Implementação do mercado (25/11/2026), tabela da seção 1";
const I = (valor, item) => F(valor, "EUR", "2025/26", item || "valor de mercado de referência, overall 75, 24–28 anos", "imputado", null, "baixa");
export const REFERENCIA_OV75 = {
  premier_league: F(15e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  la_liga: F(8e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  bundesliga: F(8e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  serie_a_italia: F(8e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  ligue_1: F(8e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  efl_championship: F(4e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  brasileirao: F(2.5e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  arg_liga_profesional: F(1.8e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  serie_b: F(0.9e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  uru_primera: F(0.7e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  serie_c: F(0.35e6, "EUR", "2025/26", "valor de mercado de referência, overall 75, 24–28 anos", "estimado", H, "media"),
  // Imputados por mercado comparável (25/11): segundas divisões das 4 grandes
  // fora a Inglaterra ~ 40% da Championship; Chile, Colômbia e Equador entre o
  // Uruguai e a Argentina; segundas da América do Sul ~ 1/3 da primeira (como
  // Série B ÷ Série A no Brasil).
  laliga_hypermotion: I(1.6e6), serie_b_italia: I(1.6e6), bundesliga_2: I(1.6e6), ligue_2: I(1.2e6),
  col_primera_a: I(1.2e6), chi_liga_primera: I(1.0e6), ecu_ligapro_a: I(1.0e6),
  arg_primera_nacional: I(0.6e6), col_primera_b: I(0.35e6), chi_liga_ascenso: I(0.3e6), ecu_ligapro_b: I(0.3e6), uru_segunda: I(0.2e6),
  // Perfis de fallback explícitos (sem divisão no catálogo): Série D, clube
  // fictício das copas (elenco gerado) e clube andino das copas.
  serie_d: I(0.12e6, "fallback: Série D (elenco gerado), overall 75"),
  fora_do_catalogo: I(0.5e6, "fallback: clube fictício das copas, overall 75"),
  conmebol_andinos: I(0.9e6, "fallback: clube andino das copas (Bolívia, Paraguai, Peru, Venezuela), overall 75"),
  uefa_extra: I(3e6, "fallback: 5º pacote da UEFA (Portugal, Holanda, Bélgica...), overall 75; Portugal na tabela do handoff: 4 mi"),
};
// Multiplicador de qualidade pelo overall (interpolação linear; fora da
// tabela, os das extremidades).
export const QUALIDADE = [[50, 0.02], [55, 0.05], [60, 0.12], [65, 0.25], [70, 0.55], [75, 1], [80, 1.9], [85, 3.8], [90, 6.5], [95, 10]];
export function multQualidade(ov) {
  const t = QUALIDADE;
  if (!(ov > t[0][0])) return t[0][1];
  if (ov >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 1; i < t.length; i++) if (ov <= t[i][0]) { const [a, va] = t[i - 1], [b, vb] = t[i]; return va + ((vb - va) * (ov - a)) / (b - a); }
  return 1;
}
// Multiplicador de idade e potencial (goleiro: faixas 2 anos depois). Sem
// potencial conhecido, a diferença para o overall é zero.
export function multIdade(age, potential, overall, group) {
  const a = (age || 25) - (group === "G" ? 2 : 0);
  if (a <= 23) return Math.min(1.6, 0.8 + 0.04 * Math.max(0, (potential != null ? potential : overall) - overall));
  if (a <= 28) return 1;
  if (a <= 31) return 0.8;
  if (a <= 34) return 0.55;
  return 0.3;
}
export const fatorIndividual = (a) => multQualidade(a.overall) * multIdade(a.age, a.potential, a.overall, a.group);
// Valor de mercado em EUR (moeda da referência) e em R$ (unidade interna).
export function valorDeMercadoEur(liga, a) {
  const r = REFERENCIA_OV75[liga] || REFERENCIA_OV75.fora_do_catalogo;
  return r.valor * fatorIndividual(a);
}
export function valorDeMercado(liga, a) {
  return Math.max(1000, Math.round((valorDeMercadoEur(liga, a) * CAMBIO.EUR) / 1000) * 1000);
}
// Virada de janela (seção 1): valor anterior × (fator individual de agora ÷ o
// da janela anterior); minutos e desempenho neutros até a calibração em
// simulação. Cada janela uma vez (CAREER.economia.janelaValores). Devolve o
// número de atletas atualizados.
export function atualizarValoresDaJanela(CAREER, chave) {
  if (!CAREER || !CAREER.economia || CAREER.economia.versao < 4 || CAREER.economia.janelaValores === chave) return 0;
  CAREER.economia.janelaValores = chave;
  let n = 0;
  const todos = [CAREER.squad || [], ...Object.values(CAREER.leagueSquads || {}), CAREER.agentesLivres || [], ...Object.values(CAREER.basesCpu || {})];
  for (const lista of todos) for (const p of lista) {
    if (!(p.fatorValor > 0) || p.value == null) continue;
    const f = Math.round(fatorIndividual(p) * 1e4) / 1e4;
    if (!(f > 0) || Math.abs(f - p.fatorValor) < 1e-4) continue;
    p.value = Math.max(1000, Math.round((p.value * f) / p.fatorValor / 1000) * 1000);
    p.fatorValor = f;
    n++;
  }
  return n;
}

export const REFERENCIAS = {
  benfica: { receitaSemAtletas: F(230.6e6, "EUR", "2024/25", "rendimentos sem direitos de atletas", "publicado", "Benfica SAD, Relatório e Contas 2024/25", "alta"),
    salarioPavlidis: F(2.88e6, "EUR", "2026/27", "salário fixo bruto anual", "estimado", "Capology", "media") },
  fifa2025: { ate500mil: 0.565, ate1mi: 0.674, acima20mi: 0.038, fonte: "FIFA Global Transfer Report 2025 (transferências internacionais masculinas com taxa)" },
};

// ---------- utilidades ----------
const emReais = (f) => (f.moeda && f.moeda !== "BRL" ? f.valor * (CAMBIO[f.moeda] || 1) : f.valor);
const arred = (v) => Math.round(v / 1000) * 1000;
const S = (x) => String(x);

// Expoente da lei de potência r^-k: pela razão topo/base, k = ln(razão)/ln(n);
// pela fatia dos 2 maiores, busca binária.
export function expoenteDaLiga(perfil, n) {
  if (perfil.top2) {
    let lo = 0, hi = 4;
    for (let i = 0; i < 60; i++) {
      const k = (lo + hi) / 2;
      let soma = 0;
      for (let r = 1; r <= n; r++) soma += r ** -k;
      const fatia = (1 + 2 ** -k) / soma;
      if (fatia < perfil.top2.valor) lo = k; else hi = k;
    }
    return (lo + hi) / 2;
  }
  return Math.log(perfil.topoBase.valor) / Math.log(n);
}

// Razão folha-base ÷ receita da liga (quando não há lei própria).
export function razaoFolhaDaLiga(perfil) {
  if (perfil.razaoFolha) return perfil.razaoFolha.valor;
  const custo = perfil.custoSalarial ? perfil.custoSalarial.valor / perfil.receitaTotal.valor : perfil.razaoCusto ? perfil.razaoCusto.valor : 0.5;
  return custo * (perfil.razaoFolhaBase ? perfil.razaoFolhaBase.valor : 0.65);
}

// ---------- ordem financeira dos clubes ----------
// Pelo porte do pacote (receita anual do pacote, relativa dentro da liga);
// no Brasil (sem dados no pacote), pela força do clube.
export function ordemFinanceira(indice, liga, ids = null) {
  let clubes;
  if (indice.brasil && indice.brasil.ligas[liga]) {
    clubes = indice.brasil.ligas[liga].clubes.map((c) => ({ id: c.id, nome: c.nome, nota: c.atk / c.def }));
  } else {
    clubes = indice.clubes.filter((c) => c.liga === liga).map((c) => ({ id: c.id, nome: c.nome, nota: (c.financas && c.financas.annualRevenue) || c.atk / c.def }));
  }
  if (ids) {
    const set = new Set(ids.map(S));
    clubes = clubes.filter((c) => set.has(S(c.id)));
  }
  return clubes.sort((a, b) => b.nota - a.nota || S(a.id).localeCompare(S(b.id)));
}

// ---------- a liga ----------
// Base financeira de todos os clubes da liga: Map id -> economia (R$).
export function economiaDaLiga(indice, liga, opts = {}) {
  if (!PERFIS[liga]) return null;
  return economiaDosClubes(liga, ordemFinanceira(indice, liga, opts.ids || null));
}
// O mesmo modelo para uma lista de clubes já ordenada pela posição
// financeira (a do save: [{ id, nome }], maior primeiro).
export function economiaDosClubes(liga, clubes) {
  const perfil = PERFIS[liga];
  if (!perfil || !clubes.length) return null;
  const n = clubes.length;
  const k = expoenteDaLiga(perfil, n);
  const pesos = clubes.map((_, i) => (i + 1) ** -k);
  const somaPesos = pesos.reduce((s, x) => s + x, 0);
  const total = emReais(perfil.receitaTotal) * (n / perfil.clubes); // composição diferente: proporcional ao número de clubes
  // Receita: estimativa pela posição; âncoras substituem; o resto é reescalado.
  const receitas = pesos.map((p) => (total * p) / somaPesos);
  const ancoraDe = (c) => (perfil.ancoras || []).find((a) => a.nome.test(c.nome));
  const fixos = new Set();
  clubes.forEach((c, i) => { const a = ancoraDe(c); if (a && a.receitaAnual) { receitas[i] = emReais(a.receitaAnual); fixos.add(i); } });
  const somaFixos = [...fixos].reduce((s, i) => s + receitas[i], 0);
  const somaLivres = receitas.reduce((s, x, i) => s + (fixos.has(i) ? 0 : x), 0);
  const fator = somaLivres > 0 ? Math.max(0.2, (total - somaFixos) / somaLivres) : 1;
  clubes.forEach((_, i) => { if (!fixos.has(i)) receitas[i] *= fator; });

  const razao = razaoFolhaDaLiga(perfil);
  const out = new Map();
  clubes.forEach((c, i) => {
    const a = ancoraDe(c);
    let folha;
    if (a && a.folhaBaseMensal) folha = emReais(a.folhaBaseMensal) * 12;
    else if (a && a.folhaBaseAnual) folha = emReais(a.folhaBaseAnual);
    else if (perfil.folhaPotencia) { const fp = perfil.folhaPotencia.valor; folha = fp.a * (receitas[i] / fp.r0) ** fp.b; }
    else folha = receitas[i] * razao;
    out.set(S(c.id), baseDoClube({ id: c.id, nome: c.nome, liga, perfil, receita: receitas[i], folha, posicao: i + 1, n, ancorado: !!a }));
  });
  return out;
}

// A base financeira de um clube (R$; anuais e mensais).
function baseDoClube({ id, nome, liga, perfil, receita, folha, posicao, n, ancorado, transicao = 0, status = "normal" }) {
  const regiao = perfil.regiao;
  const comp = COMPOSICAO[regiao];
  const recorrente = receita + transicao;
  const margem = perfil.margem ? perfil.margem.valor : REGRAS.margem[regiao];
  const despesas = Math.max(recorrente * REGRAS.despesasMinimas, recorrente * (1 - margem) - folha);
  const caixa = recorrente * REGRAS.caixaInicial;
  const sobra = recorrente - folha - despesas;
  const orcamento = Math.max(recorrente * REGRAS.orcamentoMinimo, Math.max(0, sobra) * REGRAS.sobraParaOrcamento + caixa * REGRAS.caixaParaOrcamento);
  return {
    id: S(id), nome, liga, posicaoFinanceira: posicao, clubesNaLiga: n, ancorado, status,
    receitaAnual: arred(recorrente),
    receitas: { tvAnual: arred(receita * comp.tv), comercialAnual: arred(receita * comp.comercial), jogoAnual: arred(receita * comp.jogo), transicaoAnual: arred(transicao) },
    folhaBaseAnual: arred(folha), folhaBaseMensal: arred(folha / 12),
    despesasOperacionaisAnual: arred(despesas),
    resultadoOperacionalAnual: arred(sobra),
    caixaInicial: arred(caixa),
    orcamentoTransferencias: arred(orcamento),
    obrigacoes: [],
  };
}

// ---------- virada: subir, cair, trocar ----------
// Os fluxos futuros do clube na divisão nova: a receita vira a da posição
// financeira equivalente (promovido: entre os de baixo; rebaixado: no topo da
// divisão nova, mais a transição quando a liga paga); a folha-base alvo segue
// a regra da divisão nova. Caixa, contratos e obrigações não mudam (ficam com
// o clube; quem decide a folha real são os contratos).
export function economiaNaVirada(indice, base, { para, status, anoAposQueda = 1 }) {
  const perfil = PERFIS[para];
  if (!perfil) return null;
  const n = ordemFinanceira(indice, para).length || perfil.clubes;
  const k = expoenteDaLiga(perfil, n);
  const posicao = status === "rebaixado" ? 2 : status === "promovido" ? Math.max(1, n - 3) : Math.ceil(n / 2);
  let soma = 0;
  for (let r = 1; r <= n; r++) soma += r ** -k;
  const receita = (emReais(perfil.receitaTotal) * (n / perfil.clubes) * posicao ** -k) / soma;
  const transicao = status === "rebaixado" && perfil.transicao && perfil.transicao[anoAposQueda - 1] ? emReais(perfil.transicao[anoAposQueda - 1]) : 0;
  const folha = perfil.folhaPotencia ? perfil.folhaPotencia.valor.a * (receita / perfil.folhaPotencia.valor.r0) ** perfil.folhaPotencia.valor.b : receita * razaoFolhaDaLiga(perfil);
  const nova = baseDoClube({ id: base.id, nome: base.nome, liga: para, perfil, receita, folha, posicao, n, ancorado: false, transicao, status });
  // Caixa e obrigações do clube seguem com ele.
  return { ...nova, caixaInicial: base.caixaInicial, obrigacoes: base.obrigacoes || [] };
}

// ---------- capacidade de compra ----------
// O mínimo entre o orçamento disponível, o caixa para o pagamento imediato
// (com a reserva de 1 mês de folha) e a capacidade de assumir as parcelas
// futuras (o caixa projetado mês a mês não pode ficar negativo), mais o
// espaço de folha. Créditos de venda contam só no mês em que entram.
//   estado = { caixa, folhaMensal, tetoMensal, orcamento, receitaMensal,
//     despesaMensal, parcelasAPagar: [{ mes, valor }], recebiveis: [{ mes, valor }] }
//   op = { taxa, parcelas, salarioMensal }
// Devolve { ok, motivo, limites: { orcamento, pagamentoImediato, parcelas, folha } }.
export function capacidadeDeCompra(estado, op) {
  const parcelas = Math.max(1, op.parcelas || 1);
  const primeira = Math.ceil((op.taxa || 0) / parcelas);
  const reserva = (estado.folhaMensal + (op.salarioMensal || 0)) * REGRAS.reservaDeCaixaMeses;
  const limites = {
    orcamento: Math.max(0, estado.orcamento ?? Infinity),
    pagamentoImediato: Math.max(0, estado.caixa - reserva),
    folha: Math.max(0, (estado.tetoMensal ?? Infinity) - estado.folhaMensal),
    parcelas: Infinity,
  };
  // Projeção de caixa: entra receita, sai folha (com o salário novo),
  // despesas, parcelas já assumidas e as novas; recebíveis no mês deles.
  const meses = Math.max(parcelas, ...((estado.parcelasAPagar || []).map((p) => p.mes)), 1);
  let caixa = estado.caixa - primeira;
  let pior = caixa;
  for (let m = 1; m < meses + 1; m++) {
    caixa += (estado.receitaMensal || 0) - (estado.despesaMensal || 0) - estado.folhaMensal - (op.salarioMensal || 0);
    for (const p of estado.parcelasAPagar || []) if (p.mes === m) caixa -= p.valor;
    for (const r of estado.recebiveis || []) if (r.mes === m) caixa += r.valor;
    if (m < parcelas) caixa -= Math.ceil(((op.taxa || 0) - primeira) / (parcelas - 1));
    pior = Math.min(pior, caixa);
  }
  limites.parcelas = pior;
  let motivo = null;
  if ((op.taxa || 0) > limites.orcamento) motivo = "orcamento";
  else if (primeira > limites.pagamentoImediato) motivo = "caixa";
  else if ((op.salarioMensal || 0) > limites.folha) motivo = "folha";
  else if (pior < 0) motivo = "parcelas";
  return { ok: !motivo, motivo, primeiraParcela: primeira, limites: { ...limites, parcelas: Math.round(limites.parcelas) } };
}

// ---------- quadro por perfil (Entrega 1) ----------
// Para o relatório: a base financeira dos clubes pedidos (por nome) de cada liga.
export function quadro(indice, pedidos) {
  const linhas = [];
  for (const { liga, nome, rotulo, status, para } of pedidos) {
    const eco = economiaDaLiga(indice, liga);
    if (!eco) continue;
    const base = [...eco.values()].find((e) => (nome instanceof RegExp ? nome.test(e.nome) : e.nome === nome));
    if (!base) continue;
    const linha = status ? economiaNaVirada(indice, base, { para, status }) : base;
    linhas.push({ rotulo: rotulo || base.nome, ...linha });
  }
  return linhas;
}

/* ---------- Entrega 2: o preço e o salário dos atletas (ECON-001b) ----------
   A regra de sempre (overall, idade, potencial: temporada.computeContractFields)
   dá a ORDEM dos atletas (quem vale e ganha mais que quem); a economia dá o
   NÍVEL e o FORMATO, por liga, para valer igual em qualquer fonte de dados:

   - posição relativa na liga: z = (ln(valor de sempre) − mediana da liga) ÷
     dispersão da liga (a mesma conta para o salário). Os overalls de cada
     fonte têm escalas próprias (Brasil: mediana 67, topo 84; Premier League
     do mundo: mediana 71, topo 78), e a curva de sempre é exponencial no
     overall: sem normalizar, o craque do Brasil saía mais caro que o da
     Premier League (25/11);
   - formato comum (log-normal): valor = preço mediano da liga × e^(σv·z),
     σv = DISPERSAO.valor (percentil 90 ≈ 3× a mediana; o topo de uma liga,
     10 a 15×); salário = nível do clube × e^(σs·z);
   - nível pelo dinheiro: o atleta mediano da liga custa PRECO_SOBRE_RECEITA
     da receita do clube mediano; o nível de salário da liga leva a soma das
     folhas à soma das folhas-base, e o do clube é o da liga × (receita do
     clube ÷ mediana)^PORTE_SALARIAL (o clube mais rico paga mais pela mesma
     qualidade).
   Fica no save (CAREER.economia, só em carreira nova; versão 3): escalas:
   { id: [nível de salário, liga, caixa de referência] } e ligas: { liga:
   { s: [mediana ln salário, dispersão, nível da liga], v: [mediana ln valor,
   dispersão, preço mediano], receitaMediana } }. A versão 2 (escala linear,
   carreiras criadas entre o #168 e esta regra) continua lida como era. */
// Chave da economia v2 nas carreiras novas (os testes de equivalência com a
// cópia congelada da carreira antiga a desligam: a cópia não tem a economia).
export const ECONOMIA_V2 = { ativa: true };
export const ESCALA_LIMITES = { min: 0.25, max: 150 };
const limitar = (x) => Math.max(ESCALA_LIMITES.min, Math.min(ESCALA_LIMITES.max, x));
const mediana = (xs) => { const v = xs.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 1; };
// Dispersão (em log) do formato comum: valor (p90 = 3× a mediana) e salário
// (p90 = 2,5× a mediana). Calibração em docs/economia/03_Mercado_E2.md.
export const DISPERSAO = { valor: 0.86, salario: 0.72 };
// Preço do atleta mediano da liga ÷ receita anual MÉDIA dos clubes da liga
// (total ÷ clubes). A média, e não a mediana: nas ligas concentradas (LaLiga,
// com 52% nos 2 maiores) o clube mediano fatura pouco e o preço da liga
// inteira caía (o topo do Real Madrid saía a € 27 mi). Pela razão valor de
// mercado dos elencos ÷ receita (~1,4 nas grandes ligas da Europa, ~0,65 no
// Brasil), o atleta mediano fica em 2% a 4% da receita média; 3% (25/11).
export const PRECO_SOBRE_RECEITA = 0.03;
export const PORTE_SALARIAL = 0.4;
// Quanto o nível de salário do clube segue a folha-base dele (0 = o da liga;
// 1 = folha exata). 0,75 (25/11): nas ligas concentradas (LaLiga, Argentina)
// o nível da liga deixava o grande na metade da folha-base.
export const AJUSTE_CLUBE = 0.75;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
// Mediana e dispersão (p90 − p50, em desvios-padrão da normal) do log.
function paramsLog(xs) {
  const l = xs.filter((x) => x > 0).map(Math.log).sort((a, b) => a - b);
  if (!l.length) return null;
  const q = (f) => l[Math.min(l.length - 1, Math.floor(f * l.length))];
  return [r4(q(0.5)), r4(Math.max(0.05, (q(0.9) - q(0.5)) / 1.2816))];
}

export function economiaV2(CAREER) {
  return !!(CAREER && CAREER.economia && CAREER.economia.versao >= 2);
}
// { salario, valor } do clube: funções do valor e do salário de sempre para
// os da economia (ou fatores, na versão 2), ou null (sem economia ou sem escala).
export function escalaDe(CAREER, clubId) {
  if (!economiaV2(CAREER)) return null;
  const x = CAREER.economia.escalas[String(clubId)];
  if (!x) {
    // v4: clube da Série D (elenco gerado quando cruza com o técnico na Copa):
    // o perfil de fallback explícito (valor) e metade do nível da Série C.
    const C3 = CAREER.economia.ligas && CAREER.economia.ligas.serie_c;
    if (CAREER.economia.versao >= 4 && C3 && (CAREER.serieDPool || []).some((t) => String(t.id) === String(clubId))) {
      return { salario: escalaDosParametros(C3.s[2] * 0.5, C3).salario, ...escalaDeValorDoCatalogo("serie_d") };
    }
    return null;
  }
  if (CAREER.economia.versao < 3) return { salario: x[0], valor: x[1] };
  const L = CAREER.economia.ligas[x[1]];
  if (!L) return null;
  const e = escalaDosParametros(x[0], L);
  // v4 (Mercado, etapa 1): o valor pelo catálogo (referência da liga do clube
  // detentor × qualidade × idade e potencial); x[3]: a referência de valor
  // quando difere da liga (clube fictício de fora: o perfil de fallback).
  if (CAREER.economia.versao >= 4) return { salario: e.salario, ...escalaDeValorDoCatalogo(x[3] || x[1]) };
  return e;
}
// Valor de mercado pelo catálogo da liga `liga`: valor(legado, atleta) e o
// fator individual (qualidade × idade), guardado para a virada de janela.
export function escalaDeValorDoCatalogo(liga) {
  return {
    valor: (legado, a) => (a && a.overall != null ? valorDeMercado(liga, a) : legado),
    fatorValor: (a) => fatorIndividual(a),
  };
}
// Expoente sobre a curva de sempre (a forma comum ÷ a dispersão da liga):
// - valor: σv ÷ dispersão, esticando ou comprimindo (a fonte do mundo
//   comprime o topo da Premier League; a do Brasil é larga demais);
// - salário: só comprime (no máximo 1). Esticar o salário fazia a diferença
//   de qualidade entre divisões do mesmo país pesar mais que a de dinheiro,
//   porque a folha de cada divisão fecha na folha-base dela: um atleta ganhava
//   mais no maior da Championship que no Arsenal (25/11). No valor isso não
//   acontece: o preço entre divisões difere ~9×, mais que a qualidade.
export const expoenteDaForma = (sigma, dispersao, maximo = 1) => Math.min(maximo, sigma / dispersao);
export function escalaDosParametros(nivelSalario, L) {
  const ks = expoenteDaForma(DISPERSAO.salario, L.s[1]), kv = expoenteDaForma(DISPERSAO.valor, L.v[1], Infinity);
  return {
    salario: (w) => nivelSalario * Math.exp(ks * (Math.log(Math.max(1, w)) - L.s[0])),
    valor: (v) => L.v[2] * Math.exp(kv * (Math.log(Math.max(1, v)) - L.v[0])),
  };
}
const aplicar = (x, f) => (typeof f === "function" ? f(x) : x * f);
// Parâmetros de uma divisão: clubes = [{ id, nome, salarios, valores }] na
// ordem financeira (salários e valores dos atletas pela regra de sempre).
// Devolve { escalas: { id: nível de salário }, liga: { s, v, receitaMediana },
// economia: Map } ou null.
export function escalasDaDivisao(liga, clubes) {
  const eco = economiaDosClubes(liga, clubes);
  if (!eco) return null;
  const salarios = clubes.flatMap((c) => c.salarios || []).filter((x) => x > 0);
  const valores = clubes.flatMap((c) => c.valores || []).filter((x) => x > 0);
  const ps = paramsLog(salarios), pv = paramsLog(valores);
  if (!ps || !pv) return null;
  const receitaMediana = mediana([...eco.values()].map((e) => e.receitaAnual));
  const receitaMedia = [...eco.values()].reduce((t, e) => t + e.receitaAnual, 0) / eco.size;
  const ks = expoenteDaForma(DISPERSAO.salario, ps[1]);
  const forma = (w) => Math.exp(ks * (Math.log(w) - ps[0]));
  // Nível de salário da liga: a soma das folhas = a soma das folhas-base.
  const comElenco = clubes.filter((c) => (c.salarios || []).length);
  const alvo = comElenco.reduce((t, c) => t + eco.get(String(c.id)).folhaBaseMensal, 0);
  const pesos = comElenco.reduce((t, c) => t + c.salarios.reduce((u, w) => u + forma(w), 0), 0);
  const nivel = pesos > 0 ? alvo / pesos : 1;
  const L = { s: [...ps, Math.round(nivel)], v: [...pv, Math.round(PRECO_SOBRE_RECEITA * receitaMedia)], receitaMediana: Math.round(receitaMediana) };
  // Nível de cada clube: o da liga puxado em parte (AJUSTE_CLUBE) para a
  // folha-base do clube: nivel × (folha-base ÷ folha no nível da liga)^λ.
  // Sem elenco no save: o da liga pelo porte (receita ÷ mediana)^PORTE_SALARIAL.
  // Depois, a ordem: o clube mais rico nunca paga menos pela mesma qualidade
  // (regressão isotônica pela receita, com o peso da folha de cada clube).
  const itens = clubes.map((c) => {
    const e = eco.get(String(c.id));
    const p = (c.salarios || []).reduce((u, w) => u + forma(w), 0);
    const n = p > 0 ? nivel * (e.folhaBaseMensal / (nivel * p)) ** AJUSTE_CLUBE : nivel * (e.receitaAnual / receitaMediana) ** PORTE_SALARIAL;
    return { id: String(c.id), receita: e.receitaAnual, n, peso: Math.max(1, p) };
  }).sort((x, y) => x.receita - y.receita || x.id.localeCompare(y.id));
  const escalas = {};
  for (const [id, n] of isotonica(itens)) escalas[id] = Math.round(n);
  return { escalas, liga: L, economia: eco };
}
// A ordem no país (25/11): entre divisões, um clube não paga mais pela mesma
// qualidade que o clube da divisão de cima mais próximo dele em receita (o de
// menor receita entre os que faturam mais que ele). O maior da Championship,
// com a transição, pagava mais que o Arsenal. Comparar com um clube
// hipotético da divisão de cima do mesmo tamanho extrapolava a liga de cima e
// derrubava a folha da divisão de baixo inteira (a Championship real paga
// caro: folha perto de 100% da receita). Só
// baixa quem viola; a comparação é no atleta mediano da divisão de baixo (a
// referência da divisão de cima fica fora da realidade da de baixo).
// divisoes: as do país, de cima para baixo; escalas: { id: [nivel, liga, caixa] };
// ligas: { liga: L }; receitas: { id: receita anual }.
export function ordemNoPais(divisoes, escalas, ligas, receitas) {
  const pago = (id, w) => escalaDosParametros(escalas[id][0], ligas[escalas[id][1]]).salario(w);
  for (let d = 1; d < divisoes.length; d++) {
    const cima = divisoes[d - 1], baixo = divisoes[d];
    if (!ligas[cima] || !ligas[baixo]) continue;
    const w = Math.exp(ligas[baixo].s[0]);
    const deCima = Object.keys(escalas).filter((id) => escalas[id][1] === cima && receitas[id] != null).sort((x, y) => receitas[x] - receitas[y]);
    for (const id of Object.keys(escalas).filter((x) => escalas[x][1] === baixo && receitas[x] != null)) {
      const vizinho = deCima.find((u) => receitas[u] >= receitas[id]);
      if (!vizinho) continue;
      const limite = pago(vizinho, w);
      const atual = pago(id, w);
      if (atual > limite) escalas[id][0] = Math.round(escalas[id][0] * (limite / atual));
    }
  }
  return escalas;
}
// Regressão isotônica crescente (pool adjacent violators): itens em ordem
// crescente de receita, { id, n, peso } -> [[id, n ajustado]].
function isotonica(itens) {
  const blocos = [];
  for (const it of itens) {
    blocos.push({ ids: [it.id], soma: it.n * it.peso, peso: it.peso });
    while (blocos.length > 1 && blocos[blocos.length - 2].soma / blocos[blocos.length - 2].peso > blocos[blocos.length - 1].soma / blocos[blocos.length - 1].peso) {
      const b = blocos.pop(), a = blocos.pop();
      blocos.push({ ids: [...a.ids, ...b.ids], soma: a.soma + b.soma, peso: a.peso + b.peso });
    }
  }
  return blocos.flatMap((b) => b.ids.map((id) => [id, b.soma / b.peso]));
}
// Demanda (Entrega 2): numa compra entre países (um dos clubes é de fora do
// país do save, CAREER.exterior), quem compra de um mercado mais caro paga
// parte da diferença de preço ao vendedor: o valor-base da reserva × (preço
// mediano da liga do comprador ÷ o da do vendedor)^0,5, entre 1 e 3. No
// mercado doméstico, o preço é o valor exibido. Comprador de mercado mais
// barato não ganha desconto. Sem economia: 1.
export const DEMANDA = { expoente: 0.5, teto: 3 };
function nivelDePreco(CAREER, id) {
  const x = CAREER.economia.escalas[String(id)];
  if (!x) return null;
  if (CAREER.economia.versao < 3) return x[1];
  // v4: a referência de valor do catálogo (overall 75) da liga do clube.
  if (CAREER.economia.versao >= 4) { const r = REFERENCIA_OV75[x[3] || x[1]]; return r ? r.valor : null; }
  const L = CAREER.economia.ligas[x[1]];
  return L ? L.v[2] : null;
}
export function fatorDeDemanda(CAREER, compradorId, vendedorId) {
  if (!economiaV2(CAREER)) return 1;
  const fora = (id) => !!(CAREER.exterior && CAREER.exterior.clubes && CAREER.exterior.clubes[String(id)]);
  if (fora(compradorId) === fora(vendedorId)) return 1;
  const c = nivelDePreco(CAREER, compradorId), v = nivelDePreco(CAREER, vendedorId);
  if (!c || !(v > 0)) return 1;
  return Math.max(1, Math.min(DEMANDA.teto, (c / v) ** DEMANDA.expoente));
}
// Aplica a escala no contrato de um atleta (uma vez: anota em p.escalaEco; na
// v4+, o p.fatorValor marca, sem o campo a mais por atleta no save).
export const jaEscalado = (p) => !!(p.escalaEco || p.fatorValor != null);
export function aplicarEscalaNoAtleta(p, escala) {
  if (!p || !escala || jaEscalado(p)) return p;
  if (p.wage != null) p.wage = Math.max(100, Math.round(aplicar(p.wage, escala.salario) / 100) * 100);
  if (p.loanOriginalWage != null) p.loanOriginalWage = Math.max(100, Math.round(aplicar(p.loanOriginalWage, escala.salario) / 100) * 100);
  if (p.value != null) p.value = Math.max(1000, Math.round((typeof escala.valor === "function" ? escala.valor(p.value, p) : p.value * escala.valor) / 1000) * 1000);
  if (escala.fatorValor && p.overall != null) { p.fatorValor = Math.round(escala.fatorValor(p) * 1e4) / 1e4; p.valorInicial = p.value; }
  else p.escalaEco = 1;
  return p;
}
// Contrato novo já na escala (o p.escalaEco evita escalar de novo).
export function contratoNaEscala(c, escala) {
  if (!escala) return c;
  return { ...c, wage: Math.max(100, Math.round(aplicar(c.wage, escala.salario) / 100) * 100), value: Math.max(1000, Math.round(aplicar(c.value, escala.valor) / 1000) * 1000), escalaEco: 1 };
}

// Fluxos do clube do técnico na economia v2 (mensais, R$), da base financeira.
// folhaReal (mensal): a folha dos contratos; as despesas fecham a margem do
// clube com ela (receita − folha real − despesas = resultado da base), para
// não sobrar nem faltar dinheiro só porque a folha real difere da folha-base.
// v5 (Mercado, etapa 2): com `teto` (mensal), as despesas fecham a margem com
// a folha no teto: o resultado da base vale quando o clube usa todo o
// orçamento de folha, e quem usa menos poupa a diferença.
export function fluxosDoClube(base, folhaReal = null, teto = null) {
  const folhaDaConta = teto != null ? teto : folhaReal;
  const despesasAnual = folhaDaConta == null ? base.despesasOperacionaisAnual
    : Math.max(base.receitaAnual * REGRAS.despesasMinimas, base.receitaAnual - base.resultadoOperacionalAnual - folhaDaConta * 12);
  return {
    id: base.id, liga: base.liga, status: base.status,
    receitaAnual: base.receitaAnual, tvMensal: arred((base.receitas.tvAnual + base.receitas.transicaoAnual) / 12),
    comercialAnual: base.receitas.comercialAnual, jogoAnual: base.receitas.jogoAnual,
    despesasMensais: arred(despesasAnual / 12), folhaBaseMensal: base.folhaBaseMensal,
    orcamentoTransferencias: base.orcamentoTransferencias,
    margem: base.receitaAnual > 0 ? Math.round((base.resultadoOperacionalAnual / base.receitaAnual) * 1e4) / 1e4 : 0,
  };
}

/* ---------- Mercado, etapa 2: orçamento e avaliação de operação (economia v5) ----------
   Handoff do mercado, seção 2. Três espaços (os da tela: "Paga agora" e
   "Custo mensal"), mais o orçamento da temporada e a projeção do caixa:
   - entrada livre = caixa − reserva de 1 mês de despesas essenciais (folha +
     despesas operacionais) − entradas já prometidas (propostas vinculantes);
   - parcelas por mês = o resultado mensal com a folha no teto (nunca abaixo
     de PARCELAS_MINIMO da receita) − parcelas mensais já assumidas;
   - folha = teto − folha (com os compromissos: propostas vinculantes e a
     parte do salário nos empréstimos);
   - orçamento de transferências da temporada: entrada + parcelas que vencem
     na temporada;
   - projeção: o caixa mês a mês ao longo do compromisso (receita − despesas −
     folha nova − parcelas + recebíveis firmes no mês) não fica negativo.
   Mesma função para o técnico e para a CPU (avaliarOperacao). */
export const ALVO_FOLHA = { padrao: 0.6 }; // custo do elenco ÷ receita: o topo da faixa 45%–60%
export const PARCELAS_MINIMO = 0.04;       // espaço mínimo para parcelas: 4% da receita mensal (imputado)
export const MESES_MAXIMO = 24;            // saldo parcelado em até 24 meses
export const ENTRADA_FAIXA = [0.2, 0.4];   // entrada sugerida de uma oferta parcelada
export const alvoDaFolha = (liga) => ALVO_FOLHA[liga] || ALVO_FOLHA.padrao;
// Teto de folha (mensal) pela faixa-alvo: alvo × receita mensal. O clube que
// abre a temporada acima dela ganha a folga de abertura (FOLGA_ABERTURA sobre a
// folha): sem ela, quem nasce acima de 60% (14 de 24 clubes da Championship,
// o mais pobre da Segunda uruguaia) não contratava ninguém; acima disso,
// precisa liberar espaço (venda, empréstimo) para contratar.
export const FOLGA_ABERTURA = 0.1;
// A faixa do handoff é do CUSTO DO ELENCO (com encargos, bônus e imagem); a
// folha do jogo é a folha-base dos atletas, 65% do custo salarial
// (razaoFolhaBase do catálogo, Entrega 1). Teto da folha-base = alvo × 0,65 ×
// receita (~39% da receita: a mediana da Premier League). Sem a conversão, o
// espaço não usado virava lucro (R$ 1,3 bi/ano no Arsenal).
export const FOLHA_BASE_DO_CUSTO = 0.65;
export function tetoDaFolha(liga, receitaAnual, folhaAtual) {
  const perfil = PERFIS[liga];
  const razao = perfil && perfil.razaoFolhaBase ? perfil.razaoFolhaBase.valor : FOLHA_BASE_DO_CUSTO;
  return Math.max(Math.round((alvoDaFolha(liga) * razao * receitaAnual) / 12 / 1000) * 1000, Math.round(((folhaAtual || 0) * (1 + FOLGA_ABERTURA)) / 1000) * 1000);
}
// O custo do elenco (o que a faixa mede) a partir da folha-base.
export const custoDoElenco = (folha, liga) => folha / ((PERFIS[liga] && PERFIS[liga].razaoFolhaBase && PERFIS[liga].razaoFolhaBase.valor) || FOLHA_BASE_DO_CUSTO);
// estado = { caixa, folha, teto, receitaMensal, despesasMensais, margem,
//   parcelasMensais: [{ valor, meses }], recebiveis: [{ mes, valor }],
//   entradasPrometidas, folhaPrometida, orcamentoRestante, mesesNaTemporada }
export function envelopes(e) {
  const reserva = (e.folha || 0) + (e.despesasMensais || 0);
  const parcelasAtuais = (e.parcelasMensais || []).reduce((t, p) => t + (p.meses > 0 ? p.valor : 0), 0);
  const resultadoNoTeto = (e.receitaMensal || 0) - (e.despesasMensais || 0) - (e.teto || 0);
  return {
    reserva,
    entrada: Math.max(0, (e.caixa || 0) - reserva - (e.entradasPrometidas || 0)),
    parcelas: Math.max(0, Math.max(resultadoNoTeto, PARCELAS_MINIMO * (e.receitaMensal || 0)) - parcelasAtuais),
    folha: Math.max(0, (e.teto || 0) - (e.folha || 0) - (e.folhaPrometida || 0)),
    orcamento: e.orcamentoRestante == null ? Infinity : Math.max(0, e.orcamentoRestante),
  };
}
// op = { taxa, entrada, meses, salario } (meses 0: à vista; a entrada é a
// taxa). Devolve { ok, motivo, faltam, paga: { agora, porMes, total }, antes,
// depois, piorCaixa }. motivo: "orcamento" | "caixa" | "parcelas" | "folha" | "fluxo".
export function avaliarOperacao(e, op) {
  const meses = Math.max(0, Math.min(MESES_MAXIMO, Math.round(op.meses || 0)));
  const taxa = Math.max(0, Math.round(op.taxa || 0));
  const entrada = meses ? Math.min(taxa, Math.max(0, Math.round(op.entrada != null ? op.entrada : taxa))) : taxa;
  const porMes = meses ? Math.round((taxa - entrada) / meses) : 0;
  const salario = Math.max(0, Math.round(op.salario || 0));
  const antes = envelopes(e);
  const naTemporada = entrada + porMes * Math.min(meses, e.mesesNaTemporada == null ? meses : e.mesesNaTemporada);
  // Projeção do caixa ao longo do compromisso (pelo menos 12 meses).
  const horizonte = Math.max(12, meses, ...(e.parcelasMensais || []).map((p) => p.meses || 0));
  let caixa = (e.caixa || 0) - entrada, pior = caixa;
  for (let m = 1; m <= horizonte; m++) {
    caixa += (e.receitaMensal || 0) - (e.despesasMensais || 0) - (e.folha || 0) - salario;
    for (const p of e.parcelasMensais || []) if (m <= (p.meses || 0)) caixa -= p.valor;
    if (m <= meses) caixa -= porMes;
    for (const r of e.recebiveis || []) if (r.mes === m) caixa += r.valor;
    pior = Math.min(pior, caixa);
  }
  let motivo = null, faltam = 0;
  if (naTemporada > antes.orcamento) { motivo = "orcamento"; faltam = naTemporada - antes.orcamento; }
  else if (entrada > antes.entrada) { motivo = "caixa"; faltam = entrada - antes.entrada; }
  else if (porMes > antes.parcelas) { motivo = "parcelas"; faltam = porMes - antes.parcelas; }
  else if (salario > antes.folha) { motivo = "folha"; faltam = salario - antes.folha; }
  else if (pior < 0) { motivo = "fluxo"; faltam = -pior; }
  const depois = { ...antes, entrada: antes.entrada - entrada, parcelas: antes.parcelas - porMes, folha: antes.folha - salario, orcamento: antes.orcamento - naTemporada };
  return { ok: !motivo, motivo, faltam: Math.round(faltam), paga: { agora: entrada, porMes, meses, total: taxa, salario }, antes, depois, piorCaixa: Math.round(pior) };
}
export function economiaV5(CAREER) { return !!(CAREER && CAREER.economia && CAREER.economia.versao >= 5); }

// Distribuição de preços (FIFA 2025, com taxa, em US$): fração até US$ 500
// mil, até US$ 1 mi e acima de US$ 20 mi.
export function distribuicaoDePrecos(precos) {
  const usd = precos.filter((v) => v > 0).map((v) => v / CAMBIO.USD);
  const n = usd.length || 1;
  return { n: usd.length, ate500mil: usd.filter((v) => v <= 500e3).length / n, ate1mi: usd.filter((v) => v <= 1e6).length / n, acima20mi: usd.filter((v) => v > 20e6).length / n };
}

// Capacidade de compra no estado do jogo (técnico ou CPU), pela mesma regra:
// caixa, folha (com o teto) e parcelas por rodada; receita e despesa da
// rodada pela base mensal (÷ 4). Sem economia v2: null (regra de antes).
export function capacidadeNoJogo(CAREER, { caixa, folha, teto, parcelasPorRodada = [], fluxos = null, estado = null }, op) {
  if (!economiaV2(CAREER)) return null;
  // v5: a avaliação da etapa 2, com o estado completo quando há (técnico) ou
  // o mínimo (CPU: caixa, folha, teto; receita e despesas do clube quando o
  // save as tem). As parcelas por rodada de antes (2 a 4) vencem no mês:
  // contam como entrada.
  if (economiaV5(CAREER)) {
    const e = estado || { caixa, folha, teto, receitaMensal: fluxos ? fluxos.receitaAnual / 12 : 0, despesasMensais: fluxos ? fluxos.despesasMensais : 0 };
    const r = avaliarOperacao(e, { taxa: op.taxa, entrada: op.entrada, meses: op.meses || 0, salario: op.salarioMensal });
    return { ...r, limites: r.antes, primeiraParcela: r.paga.agora };
  }
  const porRodada = (v) => (v || 0) / 4;
  return capacidadeDeCompra({
    caixa, folhaMensal: porRodada(folha), tetoMensal: porRodada(teto),
    receitaMensal: fluxos ? porRodada(fluxos.receitaAnual / 12) : porRodada(folha) * 1.05,
    despesaMensal: fluxos ? porRodada(fluxos.despesasMensais) : 0,
    parcelasAPagar: parcelasPorRodada, recebiveis: [],
  }, { taxa: op.taxa, parcelas: op.parcelas || 1, salarioMensal: porRodada(op.salarioMensal) });
}
