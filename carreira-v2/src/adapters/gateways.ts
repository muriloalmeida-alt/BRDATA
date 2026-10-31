// Camada anticorrupção (docs/carreira-v2/docs/04): a v2 conversa com o
// servidor existente só por estas portas. Nesta entrega são SÓ LEITURA —
// nenhuma escrita no save (o servidor ainda não tem controle de conflito
// entre a v2 e a tela atual; ver inventário R2).
import type { Career, Team } from "../domain/types.ts";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body && body.error) || `Erro ${res.status}`);
  return body as T;
}

export interface SessionUser { id: string; name: string }

export const SessionGateway = {
  async current(): Promise<SessionUser | null> {
    const me = await getJSON<{ authenticated: boolean; user?: SessionUser }>("/api/auth/me");
    return me.authenticated && me.user ? me.user : null;
  },
};

export const CareerGateway = {
  // Carreira ativa da conta (GET /api/career). null = sem carreira.
  async loadActive(): Promise<Career | null> {
    const r = await getJSON<{ career: Career | null }>("/api/career");
    return r.career;
  },
};

// Catálogo de clubes: escudos OFICIAIS do repositório (public/img/teams/),
// nunca imagens geradas. Fonte, em ordem: times gravados no próprio save
// (CAREER.divisionTeams) → catálogo de exemplo public/js/data.js →
// monograma (sigla) quando não há escudo.
const LOCAL_CRESTS = new Set(["fla", "pal", "bot", "for", "int", "sao", "cor", "cap", "cam", "flu", "san", "bra", "juv", "cui", "gre", "cru", "bah", "vas", "vit"]);

export function crestSrc(t: Team | undefined): string | null {
  if (!t) return null;
  if (t.logo) return t.logo.startsWith("http") || t.logo.startsWith("/") ? t.logo : `/${t.logo}`;
  return LOCAL_CRESTS.has(String(t.id)) ? `/img/teams/${t.id}.svg` : null;
}

type DemoGlobals = Record<string, Team[] | undefined>;
let demoLoad: Promise<Team[]> | null = null;
function loadDemoCatalog(): Promise<Team[]> {
  if (!demoLoad) {
    demoLoad = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "/js/data.js";
      s.onload = () => {
        // data.js declara catálogos com `const` no escopo global de script:
        // acessíveis por nome a partir daqui, não por window.
        const g = new Function("try { return { a: DEMO_TEAMS, b: DEMO_TEAMS_SERIE_B, c: DEMO_TEAMS_SERIE_C }; } catch (e) { return {}; }")() as DemoGlobals;
        resolve([...(g.a || []), ...(g.b || []), ...(g.c || [])]);
      };
      s.onerror = () => resolve([]);
      document.head.appendChild(s);
    });
  }
  return demoLoad;
}

export const ClubCatalogGateway = {
  async forCareer(career: Career): Promise<(id: string | number) => Team> {
    const fromSave = Object.values(career.divisionTeams || {}).flat();
    const pool = fromSave.length ? fromSave : await loadDemoCatalog();
    const map = new Map(pool.map((t) => [String(t.id), t]));
    return (id) => {
      const t = map.get(String(id));
      if (t) return t;
      if (String(id) === String(career.clubId)) return { id, name: career.clubName, short: career.clubShort, logo: career.clubLogo };
      return { id, name: "Adversário" };
    };
  },
};
