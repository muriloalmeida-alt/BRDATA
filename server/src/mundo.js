/* MUNDO-001, etapa M1 (24/11/2026): o catálogo do mundo para a carreira.

   Serve o que scripts/mundo_catalogo.js gravou a partir dos pacotes de dados
   da Europa 2026/27 e da Sul-América 2026 (ver docs/mundo/):
   - GET /api/career/mundo[?versao=X]: o índice (países, ligas com
     regulamento e calendário, clubes, 3ª divisão e jogos das fases fixas).
     Com a mesma versão que o cliente já tem, só { versao, atual: true }.
   - GET /api/career/mundo/elencos/<liga>: os elencos crus da liga
     ({ versao, liga, playersByTeamId }), no formato de getTeamPlayers.

   Desligado por padrão: as rotas só respondem com MUNDO_ATIVO=true no host.
   As ligas novas só chegam ao seletor de novo save na etapa M10 (plano em
   docs/mundo/02_Plano_de_execucao.md). Os arquivos são lidos uma vez por
   processo: são commitados e não mudam com o servidor de pé. */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "frozen-catalog");

function mundoAtivo(env = process.env) {
  return String(env.MUNDO_ATIVO || "").trim().toLowerCase() === "true";
}

function criarMundo({ dir = DIR } = {}) {
  let indice = null;
  const elencos = new Map();

  function obterIndice() {
    if (!indice) indice = JSON.parse(fs.readFileSync(path.join(dir, "mundo", "mundo.json"), "utf8"));
    return indice;
  }

  return {
    // Corpo da rota do índice.
    indice(versaoDoCliente) {
      const m = obterIndice();
      if (versaoDoCliente && versaoDoCliente === m.versao) return { versao: m.versao, atual: true };
      return m;
    },
    // Corpo da rota de elencos, ou null para liga fora do mundo (404).
    elencos(liga) {
      const m = obterIndice();
      // As 20 ligas do índice; para o mercado do mundo (M8), as 3 do Brasil;
      // e os clubes andinos das copas da CONMEBOL (M9b).
      const doBrasil = !!(m.brasil && Object.prototype.hasOwnProperty.call(m.brasil.ligas, liga));
      const dasCopas = liga === "conmebol_andinos" && !!(m.copas && m.copas.conmebol);
      if (!Object.prototype.hasOwnProperty.call(m.competicoes, liga) && !doBrasil && !dasCopas) return null;
      if (!elencos.has(liga)) {
        const s = JSON.parse(fs.readFileSync(path.join(dir, `snapshot-${liga}.json`), "utf8"));
        elencos.set(liga, { versao: m.versao, liga, playersByTeamId: s.playersByTeamId || {} });
      }
      return elencos.get(liga);
    },
  };
}

module.exports = { criarMundo, mundoAtivo };
