// Potencial como o jogo mostra: a faixa estimada pelo olheiro
// (scoutedPotentialRange, carreira.js), nunca o potencial real. Mesma
// fórmula e mesma semente (seededRngFromKey/mulberry32, data.js), só para
// exibir; quem usa o potencial real é o motor.
import type { Player } from "./types.ts";

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRngFromKey(key: string) {
  const seed = Array.from(String(key)).reduce((s, c) => (s + c.charCodeAt(0) * 31) | 0, 0);
  return mulberry32(seed);
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function scoutedPotentialRange(p: Pick<Player, "id" | "overall" | "potential" | "age" | "scoutRevealed">): { lo: number; hi: number } | null {
  if (p.potential == null) return null;
  if (p.potential <= p.overall && !p.scoutRevealed) return null;
  if (p.scoutRevealed) return { lo: p.potential, hi: p.potential };
  const rng = seededRngFromKey(`scout:${p.id}`);
  const age = p.age ?? 99;
  const ageUncertainty = age <= 17 ? 5 : age <= 19 ? 3 : 1;
  const fuzz = 2 + ageUncertainty + Math.floor(rng() * 3);
  const lo = clamp(p.potential - fuzz, p.overall, 99);
  return { lo, hi: clamp(p.potential + fuzz, lo, 99) };
}
// "76–82", "80" (revelado) ou null (não avaliado: já no teto).
export function potentialText(p: Pick<Player, "id" | "overall" | "potential" | "age" | "scoutRevealed">): string | null {
  const r = scoutedPotentialRange(p);
  return r ? (r.lo === r.hi ? String(r.lo) : `${r.lo}–${r.hi}`) : null;
}
