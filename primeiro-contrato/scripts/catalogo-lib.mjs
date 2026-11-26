// Importador do catálogo (PC-001). Puro: recebe os arquivos-fonte já lidos e
// devolve o snapshot normalizado + relatório de integridade. Quem lê/grava
// disco é scripts/importar-catalogo.mjs.
//
// Fonte: pacote "Primeiro Contrato" (catalogo/touchline-clubes.json e
// catalogo/escudos-touchline.json), extraído de server/frozen-catalog/mundo e
// de CATALOGO_SERIE_D (public/js/data.js) do BRDATA.

export const PAISES = {
  "Brasil": { id: "BR", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Argentina": { id: "AR", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Chile": { id: "CL", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Colômbia": { id: "CO", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Equador": { id: "EC", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Uruguai": { id: "UY", continente: "América do Sul", confederacao: "CONMEBOL" },
  "Alemanha": { id: "DE", continente: "Europa", confederacao: "UEFA" },
  "Espanha": { id: "ES", continente: "Europa", confederacao: "UEFA" },
  "França": { id: "FR", continente: "Europa", confederacao: "UEFA" },
  "Inglaterra": { id: "GB-ENG", continente: "Europa", confederacao: "UEFA" },
  "Itália": { id: "IT", continente: "Europa", confederacao: "UEFA" },
};

function semAcento(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Normaliza a referência de escudo: caminho local ganha a barra inicial. */
export function normalizarEscudo(asset) {
  if (!asset || typeof asset !== "string") return null;
  if (/^https:\/\//.test(asset)) return asset;
  if (/^https?:/.test(asset)) return null; // http sem TLS: não usar
  return asset.startsWith("/") ? asset : "/" + asset;
}

/**
 * @param {Array<object>} clubes   touchline-clubes.json
 * @param {Record<string,{asset:string|null}>} escudos escudos-touchline.json
 * @param {{versao:string, temporada:string, geradoEm:string, existeArquivo?:(p:string)=>boolean, escudoLocalPorId?:Record<string,string>}} meta
 */
export function montarSnapshot(clubes, escudos, meta) {
  const erros = [];
  const avisos = [];
  const ligas = new Map();
  const vistos = new Set();
  const saida = [];
  for (const c of clubes) {
    const id = String(c.id);
    if (vistos.has(id)) { erros.push(`clube duplicado: ${id}`); continue; }
    vistos.add(id);
    if (!c.nome || !c.code || !c.league || !c.country) { erros.push(`inscrição incompleta: ${id}`); continue; }
    const pais = PAISES[c.country];
    if (!pais) { erros.push(`país sem cadastro: ${c.country} (${id})`); continue; }
    let liga = ligas.get(c.code);
    if (!liga) {
      liga = {
        id: c.code, nome: c.league, pais: c.country, paisId: pais.id,
        continente: pais.continente, confederacao: pais.confederacao,
        divisao: Number(c.tier) || 1, temporada: meta.temporada,
        rodadas: Number.isFinite(c.rounds) ? c.rounds : null,
        clubes: 0,
      };
      ligas.set(c.code, liga);
    } else if (liga.nome !== c.league || liga.pais !== c.country) {
      erros.push(`liga ${c.code} com nome/país divergente em ${id}`);
    }
    liga.clubes += 1;
    if (Number.isFinite(c.rounds) && liga.rodadas == null) liga.rodadas = c.rounds;
    // Cópia local do mesmo escudo por ID (ESCUDOS-001 do BRDATA) tem
    // precedência sobre a URL externa do índice: sem dependência de site de
    // terceiros e com cache do próprio app.
    const local = meta.escudoLocalPorId ? normalizarEscudo(meta.escudoLocalPorId[id]) : null;
    const ref = local ?? (escudos[id] ? normalizarEscudo(escudos[id].asset) : null);
    let escudo = ref;
    if (ref && ref.startsWith("/") && meta.existeArquivo && !meta.existeArquivo(ref)) {
      avisos.push(`escudo local ausente: ${id} ${ref}`);
      escudo = null;
    }
    const perfilEstimado = !(Number.isFinite(c.atk) && Number.isFinite(c.def));
    saida.push({
      id, nome: c.nome, sigla: c.sigla || c.nome.slice(0, 3).toUpperCase(),
      cor: c.c1 || null, ligaId: c.code,
      atk: perfilEstimado ? 1 : c.atk, def: perfilEstimado ? 1 : c.def,
      perfilEstimado, escudo,
      busca: semAcento(`${c.nome} ${c.sigla || ""}`),
    });
  }
  const semEscudo = saida.filter((c) => !c.escudo).length;
  const relatorio = {
    clubes: saida.length, ligas: ligas.size, paises: new Set([...ligas.values()].map((l) => l.pais)).size,
    semEscudo, escudosExternos: saida.filter((c) => c.escudo && c.escudo.startsWith("http")).length,
    formatoVerificado: [...ligas.values()].filter((l) => l.rodadas != null).length,
    erros, avisos,
  };
  return {
    snapshot: {
      versao: meta.versao, temporada: meta.temporada, geradoEm: meta.geradoEm,
      fonte: "Touchline (BRDATA: server/frozen-catalog/mundo + CATALOGO_SERIE_D), pacote Primeiro Contrato de 26/11/2026",
      ligas: [...ligas.values()],
      clubes: saida,
    },
    relatorio,
  };
}
