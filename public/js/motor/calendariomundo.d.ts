// Tipos de public/js/motor/calendariomundo.js (MUNDO-001, M6b-2).
import type { Agenda } from "./relogio.js";
export interface SemanaDoCalendario { d: string; a: number; p: "pre" | "temporada" | "ferias"; j: 0 | 1; r: number | null }
export function montarCalendarioDaCarreira(o: {
  agendaTecnico: Agenda; agendaSeguinte?: Agenda | null; outras?: Record<string, Agenda>;
  janelas?: [string, string][]; k?: number; preTemporada?: number;
}): {
  calendar: { year: number; idx: number; weeks: SemanaDoCalendario[] };
  schedule: Record<number, { home: string | number; away: string | number }[]>;
  outras: Record<string, Record<number, { home: string | number; away: string | number; fase: string; rodada: number }[]>>;
  rodadas: number; mapa: Record<string, number>; inicio: string; fim: string;
};
