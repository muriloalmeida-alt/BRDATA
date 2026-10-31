// Ponte para a versão atual (/carreira) enquanto a tela equivalente não
// existe na v2. A tela atual lê o fragmento (#acao) ao abrir a carreira e
// leva direto ao destino (ver applyV2DeepLink em public/js/carreira.js).
export type LegacyTarget =
  | "preparar" | "avancar-semana" | "amistoso" | "proxima-temporada"
  | "escalacao" | "calendario" | "financas" | "diretoria" | "noticias"
  | "elenco" | "jogos" | "mais" | "proposta";

export const legacyHref = (target: LegacyTarget) => `/carreira#${target}`;
