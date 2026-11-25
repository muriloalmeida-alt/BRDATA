// MUNDO-001 (M10c, MUN-15): a visão das copas continentais do save (grupos,
// fase de liga e chaves), montada pelo motor (comando copasContinentais).
import { engine } from "./engine.ts";
import type { ContinentalView } from "../domain/continental.ts";

export const ContinentalGateway = {
  async view(): Promise<ContinentalView | null> {
    const s = await engine.get();
    return (await s.run<ContinentalView | null>("copasContinentais")) || null;
  },
};
