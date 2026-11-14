// Camada anticorrupção (docs/carreira-v2/docs/04): a v2 conversa com o
// servidor existente só por estas portas. Única escrita: a escalação
// (decisão de 01/11), pelo MESMO PUT /api/career da versão atual — sem
// API, schema ou formato novos. Antes de gravar, relê o save do servidor
// e aplica só a mudança de escalação por cima dele (o servidor não tem
// controle de conflito; ver inventário R2).
import type { Career, Team } from "../domain/types.ts";
import { applyLineupChange, type LineupChange, type Recomposicao } from "../domain/lineup.ts";
import { conferirArquivoDaCarreira, contaAtualId, definirContaAtual, localRepo } from "./local.ts";
import { LOCAL_CREST_BY_ID } from "../domain/crests.ts";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body && body.error) || `Erro ${res.status}`);
  return body as T;
}

export interface SessionUser {
  id: string; name: string;
  // Login diário (recompensa): dia da sequência e data local da última coleta.
  dailyLogin?: { currentStreakDay: number; lastClaimDate: string | null };
  // Tutorial de boas-vindas já visto pela conta (/api/auth/me).
  onboardingSeen?: boolean;
  // OFFLINE-001: sem rede (último perfil guardado) ou perfil local (sem conta).
  offline?: boolean; local?: boolean;
}

export const SessionGateway = {
  async current(): Promise<SessionUser | null> {
    const repo = await localRepo();
    if (repo) {
      const c = await repo.conta();
      if (!c) { definirContaAtual(null); return null; }
      definirContaAtual(String(c.user.id));
      // OFFLINE-001: catálogo offline (clubes e elencos) em dia, em segundo plano.
      if (c.online) repo.atualizarCatalogo().catch(() => {});
      return { ...(c.user as unknown as SessionUser), id: String(c.user.id), offline: !c.online, local: c.local };
    }
    const me = await getJSON<{ authenticated: boolean; user?: SessionUser }>("/api/auth/me");
    const u = me.authenticated && me.user ? { ...me.user, id: String(me.user.id) } : null;
    definirContaAtual(u ? u.id : null);
    return u;
  },
  // Novo login no meio da partida (AUD-02, sessão expirada ao gravar o
  // resultado). Mesmo POST /api/auth/login do formulário da versão atual
  // (submitCtLogin), com a mesma regra de pagamento pendente.
  async login(email: string, password: string): Promise<{ user: SessionUser } | { error: string }> {
    const res = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (body && body.error) || "E-mail ou senha incorretos." };
    const user = body && body.user;
    if (!user) return { error: "Não foi possível entrar. Tente de novo." };
    if (user.planStatus && user.planStatus !== "active") return { error: "Sua conta tem um pagamento pendente — finalize na página inicial para liberar o acesso." };
    return { user: { id: String(user.id), name: user.name } };
  },
  // Sair (menu Mais): mesmo POST /api/auth/logout da versão anterior.
  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  },
  // Nome do treinador (configurar carreira) — mesmo PUT /api/account/name
  // da versão anterior (submitSetup).
  async updateName(name: string): Promise<SessionUser> {
    // OFFLINE-001: perfil local (jogando sem conta): o nome fica no aparelho.
    if (contaAtualId() === "local") {
      const repo = await localRepo();
      const u = repo ? await repo.nomeLocal(name) : null;
      if (u) return u as unknown as SessionUser;
    }
    const res = await fetch("/api/account/name", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, (body && body.error) || "Não foi possível salvar seu nome.");
    return body.user as SessionUser;
  },
};

export const CareerGateway = {
  // Carreira ativa da conta (GET /api/career). null = sem carreira.
  async loadActive(): Promise<Career | null> {
    const repo = await localRepo();
    const conta = contaAtualId();
    if (repo && conta) {
      try { return (await repo.ler(conta)).career as Career | null; }
      catch (e) { if ((e as { status?: number }).status === 401) throw new HttpError(401, "Sessão expirada."); throw e; }
    }
    const r = await getJSON<{ career: Career | null }>("/api/career");
    return r.career;
  },
  // OFFLINE-001: grava a carreira inteira (aparelho primeiro, cópia no servidor).
  async saveCareer(next: Career): Promise<void> {
    const repo = await localRepo();
    const conta = contaAtualId();
    if (repo && conta) {
      const r = await repo.gravar(conta, next);
      if (!r.ok) throw new HttpError(r.motivo === "armazenamento" ? 507 : 409, r.motivo === "armazenamento" ? "Não foi possível salvar no aparelho." : "A carreira está aberta em outra aba.");
      return;
    }
    const res = await fetch("/api/career", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(next) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, (body && body.error) || `Erro ${res.status}`);
  },
  // OFFLINE-001: partida da liga interrompida (app fechado no meio do jogo),
  // guardada no aparelho pelo motor: a v2 volta para a Partida.
  async matchInProgress(): Promise<boolean> {
    const repo = await localRepo();
    const conta = contaAtualId();
    return !!(repo && conta && (await repo.partidaPendente(conta).catch(() => null)));
  },
  // OFFLINE-001, etapa 3: salvar e restaurar.
  async backupState(): Promise<"em-dia" | "pendente" | "conflito" | "sem-carreira" | null> {
    const repo = await localRepo(); const conta = contaAtualId();
    return repo && conta ? repo.situacaoDaCopia(conta) : null;
  },
  async exportFile(): Promise<{ name: string; text: string } | null> {
    const repo = await localRepo(); const conta = contaAtualId();
    const arq = repo && conta ? await repo.exportar(conta) : null;
    if (!arq) return null;
    const d = new Date();
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const clube = String(arq.resumo.clube || "carreira").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return { name: `brdata-${clube}-${dia}.json`, text: JSON.stringify(arq) };
  },
  // Lê e confere o arquivo; não grava nada (a tela confirma antes).
  checkFile(text: string): { ok: true; save: Career } | { ok: false; motivo: string } {
    let obj: unknown;
    try { obj = JSON.parse(text); } catch { return { ok: false, motivo: "formato" }; }
    return conferirArquivoDaCarreira(obj) as { ok: true; save: Career } | { ok: false; motivo: string };
  },
  async importSave(save: Career): Promise<{ ok: boolean; motivo?: string }> {
    const repo = await localRepo(); const conta = contaAtualId();
    if (!repo || !conta) return { ok: false, motivo: "indisponivel" };
    return repo.importar(conta, save);
  },
  async serverCopy(): Promise<{ ok: boolean; motivo?: string; career?: { clubName?: string; seasonYear?: number; currentRound?: number; updatedAt?: number } | null }> {
    const repo = await localRepo();
    return repo ? repo.copiaDoServidor() : { ok: false, motivo: "indisponivel" };
  },
  // Conflito (a conta avançou em outro aparelho): a deste aparelho passa a valer na conta.
  async keepDeviceCopy(): Promise<{ ok: boolean; motivo?: string }> {
    const repo = await localRepo(); const conta = contaAtualId();
    if (!repo || !conta) return { ok: false, motivo: "indisponivel" };
    return repo.enviarDoAparelho(conta);
  },
  async restoreFromServer(): Promise<{ ok: boolean; motivo?: string }> {
    const repo = await localRepo(); const conta = contaAtualId();
    if (!repo || !conta) return { ok: false, motivo: "indisponivel" };
    return repo.trazerDoServidor(conta);
  },
  // OFFLINE-001: manda já a cópia pendente ao servidor (depois de entrar de novo).
  async backupNow(): Promise<string> {
    const repo = await localRepo();
    const conta = contaAtualId();
    return repo && conta ? repo.copiarParaServidor(conta) : "ok";
  },
  async deleteCareer(): Promise<void> {
    const repo = await localRepo();
    const conta = contaAtualId();
    if (repo && conta) { await repo.apagar(conta); return; }
    const res = await fetch("/api/career", { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new HttpError(res.status, `Erro ${res.status}`);
  },
  async version(): Promise<number | null> {
    const repo = await localRepo();
    const conta = contaAtualId();
    if (repo && conta) return repo.versao(conta);
    const r = await getJSON<{ career: Career | null }>("/api/career").catch(() => ({ career: null }));
    return r.career && r.career.updatedAt != null ? Number(r.career.updatedAt) : null;
  },
  // Relê → aplica a mudança → grava (mesmo corpo e mesmo campo updatedAt
  // que persistCareer() do legado). Devolve a carreira gravada, ou o
  // motivo do conflito (nada gravado).
  // FASE1-ESC: a escalação é revalidada sobre o save relido (vagas,
  // elegibilidade e quem estava na vaga); troca que tira o goleiro do banco
  // devolve a recomposição para confirmar junto; sem goleiro, o bloqueio.
  async updateLineup(change: LineupChange): Promise<{ career: Career } | { conflict: string } | { recompose: Recomposicao } | { blocked: string }> {
    const fresh = await this.loadActive();
    if (!fresh) throw new HttpError(404, "Carreira não encontrada.");
    const next = applyLineupChange(fresh, change);
    if ("conflict" in next || "recompose" in next || "blocked" in next) return next;
    next.updatedAt = Date.now();
    await this.saveCareer(next);
    return { career: next };
  },
};

// Catálogo de clubes: escudos OFICIAIS do repositório (public/img/teams/),
// nunca imagens geradas. Fonte, em ordem: times gravados no próprio save
// (CAREER.divisionTeams) → catálogo de exemplo public/js/data.js →
// monograma (sigla) quando não há escudo.
const LOCAL_CRESTS = new Set(["fla", "pal", "bot", "for", "int", "sao", "cor", "cap", "cam", "flu", "san", "bra", "juv", "cui", "gre", "cru", "bah", "vas", "vit"]);

// Escudos: cópia local de cada clube (ESCUDOS-001, decisão do Murilo de
// 13/11/2026: cópia local das Séries A, B e C, como a da D, para não
// depender do site externo e abrir offline). O mapa (domain/crests.ts,
// gerado por scripts/escudos_catalogo.js) liga o id do clube — dos dados
// reais (fornecedor) ou de exemplo (data.js) — ao arquivo em /img/teams.
// O escudo é sempre o ORIGINAL, sobre uma chapinha clara (decisão de 13/11:
// a versão negativa tirava a identidade do clube); ver .crest-img no CSS.
// `darkBackground` fica por compatibilidade (cartões claros, Season.tsx).
export function crestSrc(t: Team | undefined, _darkBackground = true): string | null {
  if (!t) return null;
  const id = String(t.id);
  const local = LOCAL_CREST_BY_ID[id];
  if (local) return local;
  const logo = t.logo
    ? (t.logo.startsWith("http") || t.logo.startsWith("/") ? t.logo : `/${t.logo}`)
    : null;
  if (logo && !logo.startsWith("http")) return logo;
  if (LOCAL_CRESTS.has(id)) return `/img/teams/${id}.svg`;
  return logo; // link externo do fornecedor: último recurso (cai no monograma se falhar)
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
    // SERIED-001: os clubes da Série D (serieDPool) jogam a Copa do Brasil.
    const fromSave = [...Object.values(career.divisionTeams || {}).flat(), ...(career.serieDPool || [])];
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
