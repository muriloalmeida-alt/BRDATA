// Ponte para a versão atual (/carreira-old) enquanto a tela equivalente não
// existe na v2. A tela atual lê o fragmento (#acao) ao abrir a carreira e
// leva direto ao destino (ver applyV2DeepLink em public/js/carreira.js).
export type LegacyTarget =
  | "preparar" | "avancar-semana" | "amistoso" | "proxima-temporada"
  | "escalacao" | "calendario" | "financas" | "diretoria" | "noticias"
  | "elenco" | "jogos" | "mais" | "proposta" | "mercado";

export const legacyHref = (target: LegacyTarget) => `/carreira-old#${target}`;
// Elenco de um clube (legado: openClubRoster; o próprio clube abre a aba Elenco).
export const legacyClubHref = (clubId: string | number) => `/carreira-old#clube:${encodeURIComponent(String(clubId))}`;
// Ficha completa de um jogador seu (legado: openDetail — contrato e ações).
export const legacyPlayerHref = (playerId: string) => `/carreira-old#jogador:${encodeURIComponent(playerId)}`;
