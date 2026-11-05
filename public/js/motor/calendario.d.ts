// Tipos de public/js/motor/calendario.js (Fase 12, etapa 2).
export interface Fixture<T = string | number> { home: T; away: T }
export function generateAllRounds<T>(teamIds: T[]): Record<number, Fixture<T>[]>;
