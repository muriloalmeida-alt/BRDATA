// Tipos de public/js/motor/v2.js (etapa G2a): o hospedeiro do motor sem página.
import type { Ambiente } from "./semana";
export function ambienteSemPagina(): Ambiente;
/** A ponte: os mesmos comandos de window.BRDATA_PONTE, montados do motor. */
export function criarPonte(): Record<string, (...args: any[]) => any> & { estado: () => any };
/** Abre o jogo sem a página (precisa do /js/data.js carregado antes). */
export function abrirMotor(): Promise<{ ponte: ReturnType<typeof criarPonte> } | { semConta: true }>;
