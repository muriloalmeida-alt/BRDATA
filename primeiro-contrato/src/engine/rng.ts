// Aleatoriedade determinística (PC-001). Toda sorte do motor vem de um
// gerador criado a partir de uma chave textual (semente + contexto), nunca de
// Math.random: mesma semente + mesmas decisões = mesma carreira.

export type Rng = {
  next: () => number; // [0, 1)
  int: (min: number, max: number) => number; // inclusive
  range: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: readonly T[]) => T;
  normal: (mean: number, sd: number) => number;
};

/** Hash de 32 bits (cyrb53 reduzido) de uma chave textual. */
export function hash32(str: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export function rngFrom(...partes: Array<string | number>): Rng {
  let a = hash32(partes.join("|"));
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    normal: (mean, sd) => {
      const u = Math.max(next(), 1e-9), v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
  return rng;
}

/** Semente nova para uma carreira (única fonte não determinística). */
export function novaSemente(): string {
  const c = globalThis.crypto;
  if (c && "getRandomValues" in c) {
    const b = new Uint32Array(2);
    c.getRandomValues(b);
    return b[0].toString(36) + b[1].toString(36);
  }
  return Date.now().toString(36);
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
