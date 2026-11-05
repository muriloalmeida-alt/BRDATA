// Tipos de public/js/motor/tabela.js (Fase 12, etapa 2).
export interface Row { id: string | number; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; pts: number }
export type Standings<R extends Row = Row> = Record<string, R>;
export interface Result { home: string | number; away: string | number; gh: number; ga: number }
export function emptyRow(id: string | number): Row;
export function emptyStandings(ids: (string | number)[]): Standings;
export function applyResult(standings: Standings, r: Result): void;
export function cloneStandings<R extends Row>(standings: Standings<R>): Standings<R>;
export function compareRows(a: Row, b: Row): number;
export function sortRows<R extends Row>(standingsOrRows: Standings<R> | R[] | null | undefined): R[];
export function positionOf(standingsOrRows: Standings | Row[], clubId: string | number): number;
export function accessZoneIds(sortedRows: Row[], n: number): string[];
export function relegationZoneIds(sortedRows: Row[], n: number, protectedId?: string | number | null): string[];
