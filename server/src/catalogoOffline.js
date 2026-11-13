/* OFFLINE-001 (13/11/2026) — catálogo da carreira para jogar sem rede.

   Decisão do Murilo (13/11, item 3): a carreira criada offline nasce com uma
   cópia dos clubes e elencos que o servidor está usando, gerada no deploy e
   versionada. Este módulo monta essa cópia com as MESMAS fontes das rotas
   /api/career/teams, /api/career/standings e /api/career/teams/:id/players
   (mesmo fornecedor, mesmas chaves de cache), uma vez por processo (= por
   deploy), e calcula a versão pelo conteúdo.

   Sem fornecedor com dados (modo exemplo), o catálogo só diz isso
   ({ hasKey: false }): o motor usa os dados de exemplo do js/data.js, que já
   vão no pacote do app.

   GET /api/career/catalogo-offline[?versao=X]
   - mesma versão que o cliente já tem: { versao, atual: true } (sem corpo);
   - senão: { versao, hasKey, season, competicoes: { <id>: { teams,
     standings } }, jogadores: { "<id>:<teamId>": [...] } }. */
const crypto = require("crypto");

const COMPETICOES = ["brasileirao", "serie_b", "serie_c"];

function criarCatalogoOffline({ hasKey, season, resolverCompeticao, buscarTimes, buscarTabela, buscarJogadores, log = () => {} }) {
  let pronto = null;

  async function montar() {
    if (!hasKey()) return { hasKey: false, season: String(season), competicoes: {}, jogadores: {} };
    const competicoes = {};
    const jogadores = {};
    for (const id of COMPETICOES) {
      let comp;
      try { comp = resolverCompeticao(id); } catch (e) { log(`catálogo offline: ${id} fora (${e.message})`); continue; }
      const [teams, standings] = await Promise.all([buscarTimes(comp, season), buscarTabela(comp, season)]);
      competicoes[id] = { teams: teams || [], standings: standings || [] };
      for (const t of teams || []) {
        // Um clube por vez: o fornecedor ao vivo tem limite de chamadas.
        jogadores[`${id}:${t.id}`] = (await buscarJogadores(comp, t.id, season)) || [];
      }
    }
    return { hasKey: true, season: String(season), competicoes, jogadores };
  }

  async function obter() {
    if (!pronto) {
      pronto = montar().then((dados) => {
        const versao = crypto.createHash("sha256").update(JSON.stringify(dados)).digest("hex").slice(0, 16);
        return { versao, ...dados };
      }).catch((e) => { pronto = null; throw e; });
    }
    return pronto;
  }

  return {
    obter,
    // Resposta da rota: corpo inteiro, ou só a versão quando o cliente já a tem.
    async resposta(versaoDoCliente) {
      const c = await obter();
      if (versaoDoCliente && versaoDoCliente === c.versao) return { versao: c.versao, atual: true };
      return c;
    },
  };
}

module.exports = { criarCatalogoOffline, COMPETICOES };
