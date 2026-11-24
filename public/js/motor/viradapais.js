/* ===================================================================
   MOTOR — VIRADA POR PAÍS (MUNDO-001, etapa M5, 24/11/2026)
   -------------------------------------------------------------------
   Aplica numa transação só o fim de temporada de um país do mundo:
   - troca de clubes entre a 1ª e a 2ª divisão (resultado das fases:
     fases.js na Europa, formatos.js na América do Sul);
   - reposição da 2ª pelo catálogo de 3ª divisão (a regra da Série D):
     sorteio determinístico, sem repetição, entre os elegíveis; quem cai
     da 2ª entra no catálogo; quem sobe sai dele;
   - clubes B: não sobem para a divisão do principal; se o principal cai
     para a divisão do B, o B cai para a seguinte; no catálogo, o B
     "condicional" só é elegível se o principal estiver acima na temporada
     nova; o "bloqueado" nunca;
   - proteção do clube do jogador na divisão jogável mais baixa (como no
     Brasil): a vaga de queda passa ao próximo clube da zona de baixo, e a
     exceção vai no resumo;
   - zonas da temporada nova (Argentina: quem entra ocupa a vaga de quem
     saiu da mesma divisão) e grupos sorteados (Competencia uruguaio);
   - histórico do promedio (a temporada que acabou entra; a janela corta o
     resto).
   Confere contagens e conjuntos disjuntos ANTES de devolver: o save só
   muda com uma virada válida. Módulo puro (mesma entrada, mesma saída).
=================================================================== */
import { rngDaChave } from "./desempate.js";

const S = (x) => String(x);
// Volta ao tipo do índice (ids numéricos), depois de comparar como texto.
const N = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);

function embaralhar(lista, chave) {
  const rng = rngDaChave(chave);
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
}

// Elegível para entrar na 2ª vindo do catálogo, dada a composição nova.
// `divisaoNova(id)`: 1, 2 ou null (fora das divisões jogáveis) na temporada nova.
export function elegivelDoCatalogo(c, divisaoNova) {
  if (c.elegibilidade === "blocked" || c.elegibilidade === "simulation_only") return false;
  if (c.elegibilidade === "conditional_parent_above_target") return c.clubePai != null && divisaoNova(c.clubePai) === 1;
  return c.elegibilidade == null || c.elegibilidade === "eligible";
}

// Quantos entram do catálogo e de que circuito (Argentina: metade
// Metropolitana, metade Federal A; os demais: um circuito só).
function cotas(pais, n) {
  if (pais === "AR") { const m = Math.ceil(n / 2); return [["Primera B Metropolitana", m], ["Federal A", n - m]]; }
  return [[null, n]];
}

// Representante do catálogo no barrage com a 2ª (Alemanha e França): o
// primeiro do sorteio entre os elegíveis. Sorteado ANTES da virada, ao
// montar as fases (fases.js, representanteTerceira).
export function sortearRepresentante({ catalogo, divisaoAtual, chave }) {
  const eleg = catalogo.filter((c) => elegivelDoCatalogo(c, divisaoAtual));
  return embaralhar(eleg.map((c) => c.id).sort((a, b) => S(a).localeCompare(S(b))), `${chave}:representante`)[0] ?? null;
}

// o = {
//   pais, chave, d1: { id, clubes }, d2: { id, clubes },
//   sobemD2: [ids] (da 2ª para a 1ª), descemD1: [ids],
//   descemD2: [ids] (da 2ª para o catálogo), sobemTerceira: [ids] (barrage),
//   quedaD2: [ids da 2ª, do mais ameaçado ao menos] (para a proteção),
//   catalogo: [{ id, elegibilidade, clubePai, grupo, ... }] (3ª do país),
//   entradasDoCatalogo: número de vagas da 2ª preenchidas pelo sorteio
//     (padrão: as que sobrarem depois do barrage),
//   reservas: [{ id, clubePai }] clubes B nas divisões jogáveis,
//   humano: id do clube do jogador (ou null),
//   zonas: { [ligaId]: { A: [ids], B: [ids] } } (opcional),
// }
export function aplicarVirada(o) {
  const excecoes = [];
  const d1 = new Set(o.d1.clubes.map(S)), d2 = new Set(o.d2.clubes.map(S));
  const tam1 = d1.size, tam2 = d2.size;
  const sobemD2 = o.sobemD2.map(S), descemD1 = o.descemD1.map(S);
  let descemD2 = o.descemD2.map(S);
  const sobemTerceira = (o.sobemTerceira || []).map(S);
  if (sobemD2.length !== descemD1.length) throw new Error(`virada ${o.pais}: ${sobemD2.length} sobem e ${descemD1.length} descem entre 1ª e 2ª`);
  for (const id of sobemD2) if (!d2.has(id)) throw new Error(`virada ${o.pais}: ${id} sobe sem estar na 2ª`);
  for (const id of [...descemD1]) if (!d1.has(id)) throw new Error(`virada ${o.pais}: ${id} desce sem estar na 1ª`);

  // Proteção do clube do jogador na divisão jogável mais baixa.
  const humano = o.humano != null ? S(o.humano) : null;
  if (humano && descemD2.includes(humano)) {
    const substituto = (o.quedaD2 || []).map(S).find((id) => id !== humano && !descemD2.includes(id) && !sobemD2.includes(id));
    if (!substituto) throw new Error(`virada ${o.pais}: sem clube para trocar com o clube protegido`);
    descemD2 = descemD2.map((id) => (id === humano ? substituto : id));
    excecoes.push({ tipo: "protecao", protegido: o.humano, caiNoLugar: N(substituto), texto: "O seu clube não pode cair abaixo da última divisão jogável: a vaga de queda passou ao clube seguinte da zona de baixo." });
  }

  // Composição nova (antes da reposição pelo catálogo).
  for (const id of descemD1) d1.delete(id);
  for (const id of sobemD2) { d2.delete(id); d1.add(id); }
  for (const id of descemD1) d2.add(id);
  for (const id of descemD2) d2.delete(id);
  for (const id of sobemTerceira) d2.add(id);

  // Clube B: se o principal está na 2ª nova, o B (que está na 2ª) cai para o catálogo.
  const paiDe = new Map((o.reservas || []).map((r) => [S(r.id), S(r.clubePai)]));
  for (const [b, pai] of paiDe) {
    if (d2.has(b) && d2.has(pai)) {
      if (b === humano) throw new Error(`virada ${o.pais}: clube do jogador é B e o principal caiu (não previsto)`);
      d2.delete(b);
      descemD2 = [...descemD2, b];
      excecoes.push({ tipo: "clube-b", id: N(b), texto: "Clube B rebaixado porque o clube principal caiu para a mesma divisão." });
    }
    if (d1.has(b)) throw new Error(`virada ${o.pais}: clube B na 1ª divisão (${b})`);
  }

  // Reposição pelo catálogo: as vagas que faltam na 2ª.
  const vagas = tam2 - d2.size;
  const divisaoNova = (id) => (d1.has(S(id)) ? 1 : d2.has(S(id)) ? 2 : null);
  const noCatalogo = o.catalogo.filter((c) => !sobemTerceira.includes(S(c.id)));
  const entram = [];
  if (vagas > 0) {
    const elegiveis = noCatalogo.filter((c) => elegivelDoCatalogo(c, divisaoNova)).sort((a, b) => S(a.id).localeCompare(S(b.id)));
    for (const [circuito, n] of cotas(o.pais, vagas)) {
      const doCircuito = elegiveis.filter((c) => !entram.includes(S(c.id)) && (circuito == null || String(c.grupo || "").startsWith(circuito)));
      embaralhar(doCircuito.map((c) => S(c.id)), `${o.chave}:terceira:${circuito || "unico"}`).slice(0, n).forEach((id) => entram.push(id));
    }
    // Circuito sem elegíveis suficientes: completa com os outros.
    if (entram.length < vagas) {
      const resto = elegiveis.map((c) => S(c.id)).filter((id) => !entram.includes(id));
      embaralhar(resto, `${o.chave}:terceira:resto`).slice(0, vagas - entram.length).forEach((id) => entram.push(id));
    }
    if (entram.length < vagas) throw new Error(`virada ${o.pais}: catálogo sem elegíveis para ${vagas} vagas`);
    entram.forEach((id) => d2.add(id));
  }

  // Catálogo novo: sai quem entrou; entra quem caiu da 2ª (com o que o
  // catálogo já sabia dele, se veio de lá antes).
  const entrouSet = new Set([...entram, ...sobemTerceira]);
  const catalogoNovo = o.catalogo.filter((c) => !entrouSet.has(S(c.id)));
  for (const id of descemD2) {
    const antes = o.catalogo.find((c) => S(c.id) === id);
    const pai = paiDe.get(id);
    catalogoNovo.push(antes || { id: N(id), elegibilidade: pai ? "conditional_parent_above_target" : "eligible", clubePai: pai ? Number(pai) : null, grupo: null, exJogavel: true });
  }

  // Conferência da transação.
  const n1 = [...d1], n2 = [...d2];
  if (n1.length !== tam1) throw new Error(`virada ${o.pais}: 1ª com ${n1.length} clubes (eram ${tam1})`);
  if (n2.length !== tam2) throw new Error(`virada ${o.pais}: 2ª com ${n2.length} clubes (eram ${tam2})`);
  const todos = [...n1, ...n2, ...catalogoNovo.map((c) => S(c.id))];
  if (new Set(todos).size !== todos.length) throw new Error(`virada ${o.pais}: clube repetido entre divisões e catálogo`);
  if (humano && !d1.has(humano) && !d2.has(humano)) throw new Error(`virada ${o.pais}: clube do jogador saiu das divisões jogáveis`);

  const ordenar = (ids) => ids.map(N).sort((a, b) => S(a).localeCompare(S(b), "en", { numeric: true }));
  const out = {
    [o.d1.id]: ordenar(n1), [o.d2.id]: ordenar(n2),
    catalogo: catalogoNovo.sort((a, b) => S(a.id).localeCompare(S(b.id), "en", { numeric: true })),
    entraramDoCatalogo: ordenar([...sobemTerceira, ...entram]),
    foramParaOCatalogo: ordenar(descemD2),
    excecoes,
  };
  if (o.zonas) {
    out.zonas = {};
    for (const [liga, zonas] of Object.entries(o.zonas)) {
      out.zonas[liga] = zonasSeguintes(zonas, liga === o.d1.id ? out[o.d1.id] : out[o.d2.id]);
    }
  }
  return out;
}

// Zonas da temporada nova: quem continua fica na sua zona; quem chega ocupa
// as vagas abertas, em ordem (zona A primeiro), mantendo o tamanho de cada.
export function zonasSeguintes(zonas, clubesNovos) {
  const novos = new Set(clubesNovos.map(S));
  const out = {};
  const vagas = [];
  for (const [z, ids] of Object.entries(zonas)) {
    out[z] = ids.filter((id) => novos.has(S(id)));
    for (let i = out[z].length; i < ids.length; i++) vagas.push(z);
  }
  const ficaram = new Set(Object.values(out).flat().map(S));
  const chegaram = clubesNovos.filter((id) => !ficaram.has(S(id))).sort((a, b) => S(a).localeCompare(S(b), "en", { numeric: true }));
  if (chegaram.length !== vagas.length) throw new Error(`zonas: ${chegaram.length} clubes para ${vagas.length} vagas`);
  chegaram.forEach((id, i) => out[vagas[i]].push(id));
  return out;
}

// Grupos sorteados (Competencia uruguaio): n grupos do mesmo tamanho.
export function sortearGrupos(ids, nomes, chave) {
  const ordem = embaralhar(ids.slice().sort((a, b) => S(a).localeCompare(S(b), "en", { numeric: true })), `${chave}:grupos`);
  const out = Object.fromEntries(nomes.map((n) => [n, []]));
  ordem.forEach((id, i) => out[nomes[i % nomes.length]].push(id));
  return out;
}

// Histórico do promedio da liga: entra a temporada que acabou (pts e jogos
// de cada clube que a disputou); fica só o que a janela ainda usa.
export function atualizarHistorico(historico, ano, porClube, janela) {
  const out = {};
  for (const [id, lst] of Object.entries(historico || {})) {
    // A temporada seguinte (ano + 1) usa as `janela - 1` anteriores a ela.
    const ficam = lst.filter((h) => h.ano > ano + 1 - janela && h.ano !== ano);
    if (ficam.length) out[id] = ficam;
  }
  for (const [id, x] of Object.entries(porClube)) {
    out[id] = [...(out[id] || []), { ano, pts: x.pts, j: x.j }].sort((a, b) => a.ano - b.ano);
  }
  return out;
}
