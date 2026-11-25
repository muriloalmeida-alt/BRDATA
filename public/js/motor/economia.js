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

export const VERSAO_ECONOMIA = 2;
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

/* ---------- Entrega 2: a escala dos contratos (ECON-001b) ----------
   O salário e o valor de cada atleta continuam saindo da regra de sempre
   (overall, idade, potencial: temporada.computeContractFields) e passam por
   uma escala:
   - salário: a do clube (folha-base alvo ÷ folha do elenco pela regra de
     sempre), para a mesma qualidade ganhar diferente em clubes diferentes;
   - valor: a da liga com o porte do clube (escalaDeValor), para o preço
     seguir o mercado em que o atleta está.
   Fica no save (CAREER.economia, só em carreira nova): { versao, escalas:
   { id: [salario, valor] }, ligas: { liga: valor }, clube }. Clube sem
   escala (fora do save na criação) recebe a dele quando entra
   (completarEscalas). Sem economia v2, tudo como antes. */
// Chave da economia v2 nas carreiras novas (os testes de equivalência com a
// cópia congelada da carreira antiga a desligam: a cópia não tem a economia).
export const ECONOMIA_V2 = { ativa: true };
export const ESCALA_LIMITES = { min: 0.25, max: 150 };
const limitar = (x) => Math.max(ESCALA_LIMITES.min, Math.min(ESCALA_LIMITES.max, x));
// A escala de valor pode ficar abaixo da mínima do salário (divisões pobres).
const limitarValor = (x) => Math.max(0.05, Math.min(ESCALA_LIMITES.max, x));
const mediana = (xs) => { const v = xs.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 1; };

export function economiaV2(CAREER) {
  return !!(CAREER && CAREER.economia && CAREER.economia.versao >= 2);
}
// { salario, valor } do clube, ou null (sem economia v2 ou clube sem escala).
export function escalaDe(CAREER, clubId) {
  if (!economiaV2(CAREER)) return null;
  const x = CAREER.economia.escalas[String(clubId)];
  return x ? { salario: x[0], valor: x[1] } : null;
}
// Escala de valor: média geométrica entre a escala de salário do clube e a
// da liga (o preço segue o mercado da liga, com o porte de quem vende), com
// expoente 0,9 (a razão taxa ÷ salário anual cai nos mercados mais caros:
// calibração pelos negócios de referência, docs/economia/03_Mercado_E2.md).
export const EXPOENTE_VALOR = 1.0;
export function escalaDeValor(doClube, daLiga) {
  return limitar(Math.sqrt(doClube * daLiga) ** EXPOENTE_VALOR);
}
// Escalas de uma divisão: clubes = [{ id, nome, folhaLegada }] na ordem
// financeira. A escala de salário da liga leva a soma das folhas do elenco
// (pela regra de sempre) à soma das folhas-base da liga; a do clube é a da
// liga pelo porte dele (receita ÷ mediana da liga)^PORTE_SALARIAL: o clube
// mais rico paga mais pela mesma qualidade, e a folha real de cada clube sai
// dos contratos (quem tem elenco melhor paga mais). Devolve { escalas: { id:
// [salario, valor] }, salario, valor, economia: Map }.
export const PORTE_SALARIAL = 0.4;
// Preço do atleta mediano da liga ÷ receita anual do clube mediano (25/11):
// nas ligas de topo a curva de sempre já dava ~9% (Premier League 9,6%,
// Bundesliga 9,1%, Brasileirão 8,1%); nas divisões de baixo dava 17% a 27%,
// e o atleta mediano custava mais que o caixa inteiro do clube. Todas as
// ligas passam a 9%: o preço acompanha o dinheiro da divisão.
export const PRECO_SOBRE_RECEITA = 0.09;
// clubes[].valores (opcional): os valores dos atletas pela regra de sempre;
// com eles, a escala de valor da liga leva o mediano a PRECO_SOBRE_RECEITA da
// receita do clube mediano, e o porte do clube vendedor entra pela raiz.
export function escalasDaDivisao(liga, clubes) {
  const eco = economiaDosClubes(liga, clubes);
  if (!eco) return null;
  const comElenco = clubes.filter((c) => c.folhaLegada > 0);
  const alvo = comElenco.reduce((t, c) => t + eco.get(String(c.id)).folhaBaseMensal, 0);
  const legado = comElenco.reduce((t, c) => t + c.folhaLegada, 0);
  const daLiga = limitar(legado > 0 ? alvo / legado : 1);
  const med = mediana([...eco.values()].map((e) => e.receitaAnual));
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const valores = clubes.flatMap((c) => c.valores || []).filter((v) => v > 0);
  const valorDaLiga = valores.length ? limitarValor((PRECO_SOBRE_RECEITA * med) / mediana(valores)) : escalaDeValor(daLiga, daLiga);
  const escalas = {};
  for (const c of clubes) {
    const e = eco.get(String(c.id));
    const sal = limitar(daLiga * (e.receitaAnual / med) ** PORTE_SALARIAL);
    escalas[String(c.id)] = [r3(sal), r3(limitarValor(valorDaLiga * Math.sqrt(sal / daLiga)))];
  }
  return { escalas, salario: r3(daLiga), valor: r3(valorDaLiga), economia: eco };
}
// Demanda (Entrega 2): numa compra entre países (um dos clubes é de fora do
// país do save, CAREER.exterior), quem compra de um mercado mais caro paga
// parte da diferença de preço ao vendedor: o valor-base da reserva × (escala
// de valor do comprador ÷ a do vendedor)^0,5, entre 1 e 3. No mercado
// doméstico, o preço é o valor exibido (a escala do clube já tem o porte).
// Comprador de mercado mais barato não ganha desconto. Sem v2: 1.
export const DEMANDA = { expoente: 0.5, teto: 3 };
export function fatorDeDemanda(CAREER, compradorId, vendedorId) {
  if (!economiaV2(CAREER)) return 1;
  const fora = (id) => !!(CAREER.exterior && CAREER.exterior.clubes && CAREER.exterior.clubes[String(id)]);
  if (fora(compradorId) === fora(vendedorId)) return 1;
  const c = CAREER.economia.escalas[String(compradorId)], v = CAREER.economia.escalas[String(vendedorId)];
  if (!c || !v || !(v[1] > 0)) return 1;
  return Math.max(1, Math.min(DEMANDA.teto, (c[1] / v[1]) ** DEMANDA.expoente));
}
// Aplica a escala no contrato de um atleta (uma vez: anota em p.escalaEco).
export function aplicarEscalaNoAtleta(p, escala) {
  if (!p || !escala || p.escalaEco) return p;
  if (p.wage != null) p.wage = Math.max(100, Math.round((p.wage * escala.salario) / 100) * 100);
  if (p.loanOriginalWage != null) p.loanOriginalWage = Math.max(100, Math.round((p.loanOriginalWage * escala.salario) / 100) * 100);
  if (p.value != null) p.value = Math.max(1000, Math.round((p.value * escala.valor) / 1000) * 1000);
  p.escalaEco = 1;
  return p;
}
// Contrato novo já na escala (o p.escalaEco evita escalar de novo).
export function contratoNaEscala(c, escala) {
  if (!escala) return c;
  return { ...c, wage: Math.max(100, Math.round((c.wage * escala.salario) / 100) * 100), value: Math.max(1000, Math.round((c.value * escala.valor) / 1000) * 1000), escalaEco: 1 };
}

// Fluxos do clube do técnico na economia v2 (mensais, R$), da base financeira.
// folhaReal (mensal): a folha dos contratos; as despesas fecham a margem do
// clube com ela (receita − folha real − despesas = resultado da base), para
// não sobrar nem faltar dinheiro só porque a folha real difere da folha-base.
export function fluxosDoClube(base, folhaReal = null) {
  const despesasAnual = folhaReal == null ? base.despesasOperacionaisAnual
    : Math.max(base.receitaAnual * REGRAS.despesasMinimas, base.receitaAnual - base.resultadoOperacionalAnual - folhaReal * 12);
  return {
    id: base.id, liga: base.liga, status: base.status,
    receitaAnual: base.receitaAnual, tvMensal: arred((base.receitas.tvAnual + base.receitas.transicaoAnual) / 12),
    comercialAnual: base.receitas.comercialAnual, jogoAnual: base.receitas.jogoAnual,
    despesasMensais: arred(despesasAnual / 12), folhaBaseMensal: base.folhaBaseMensal,
    orcamentoTransferencias: base.orcamentoTransferencias,
  };
}

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
export function capacidadeNoJogo(CAREER, { caixa, folha, teto, parcelasPorRodada = [], fluxos = null }, op) {
  if (!economiaV2(CAREER)) return null;
  const porRodada = (v) => (v || 0) / 4;
  return capacidadeDeCompra({
    caixa, folhaMensal: porRodada(folha), tetoMensal: porRodada(teto),
    receitaMensal: fluxos ? porRodada(fluxos.receitaAnual / 12) : porRodada(folha) * 1.05,
    despesaMensal: fluxos ? porRodada(fluxos.despesasMensais) : 0,
    parcelasAPagar: parcelasPorRodada, recebiveis: [],
  }, { taxa: op.taxa, parcelas: op.parcelas || 1, salarioMensal: porRodada(op.salarioMensal) });
}
