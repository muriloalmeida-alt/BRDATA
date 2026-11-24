// Tipos de public/js/motor/relogio.js (MUNDO-001, etapa M2).
export type Semana = string; // segunda-feira, "AAAA-MM-DD"
export type ClubeId = string | number;
export interface Jogo { fase: string; rodada: number; data: string; casa: ClubeId; fora: ClubeId }
export type Agenda = Map<Semana, Jogo[]>;
export type PartidaCompacta = [fase: string, rodada: number, data: string, casa: ClubeId, fora: ClubeId];
export function segundaDe(data: string): Semana;
export function somarSemanas(semana: Semana, n: number): Semana;
export function proximaSemana(semana: Semana): Semana;
export function semanasEntre(a: Semana, b: Semana): number;
export function mesmaSemanaAnos(semana: Semana, anos: number): Semana;
export function umAnoDepois(semana: Semana): Semana;
export function agendaDoPacote(partidas: PartidaCompacta[]): Agenda;
export function modeloDeSemanas(agenda: Agenda): Record<string, Record<string, Semana>>;
export function agendaGerada(opts: {
  agendaModelo: Agenda;
  anos?: number;
  clubes: ClubeId[];
  fases?: string[];
  confrontos?: (fase: string, clubes: ClubeId[]) => Record<string, { home: ClubeId; away: ClubeId }[]>;
}): Agenda;
export function primeiraSemana(agenda: Agenda): Semana | null;
export function ultimaSemana(agenda: Agenda): Semana | null;
export function situacaoDaLiga(agenda: Agenda, semana: Semana): "antes" | "andamento" | "fim";
export const SEMANAS_DE_PRE_TEMPORADA: number;
export function inicioDoMundo(agendaDaLigaEscolhida: Agenda, preTemporada?: number): Semana;
export function jogosDaSemana(agendas: [string, Agenda][], semana: Semana): (Jogo & { liga: string })[];
export function jogosAntesDe(agendas: [string, Agenda][], semana: Semana): (Jogo & { liga: string })[];
export function semanasCheias(agenda: Agenda): { semana: Semana; clube: string; jogos: number }[];
export function semanasDoCalendarioBrasileiro(calendar: { year: number; weeks: { d: string; p: string; r: number | null }[] }): { semana: Semana; indice: number; fase: string; rodada: number | null }[];
