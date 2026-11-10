/* ===================================================================
   MOTOR — HOSPEDEIRO SEM PÁGINA (plano "sem página escondida", etapa
   G2a, 10/11)
   -------------------------------------------------------------------
   Abre o jogo sem a página antiga (carreira.html): monta o ambiente que
   a página dava ao motor, entra na conta, carrega a carreira (a mesma
   entrada da página) e devolve a ponte — o mesmo objeto de comandos que
   a página expõe em window.BRDATA_PONTE, montado a partir do motor.

   Quem hospeda precisa ter carregado antes o /js/data.js (dados de
   exemplo, nomes e o sorteio por chave, como na página).

   Diferenças para a ponte da página, todas de tela:
   - sem página, os pedidos de tela (evento "tela") não têm quem desenhe e
     são ignorados; avisos (evento "aviso") ficam para quem quiser ouvir;
   - o som não toca (como no modo ponte da página), mas a preferência de
     som é a mesma (localStorage); nenhuma caixa "incluir base" marcada, nenhum modal
     aberto, botão Simular de mentira;
   - continuarPosJogo (o caminho antigo que mostrava a página em tela
     cheia) não existe aqui: a v2 usa as etapas do pós-jogo.
=================================================================== */
import * as estado from "./estado.js";
import * as semana from "./semana.js";
import { ouvir } from "./eventos.js";
import { comandosGestao } from "./ponte.js";
import { comandosJogo } from "./jogo.js";
import { comandosCarga, ponteEstado, enterAfterAuth, fetchJSON, fetchRealPlayers, teamLogoSrc, ponteGravar, persistCareer } from "./carga.js";

// O ambiente que a página dava ao motor (ver motorSemana em carreira.js),
// agora sem página.
export function ambienteSemPagina() {
  // data.js é script comum: as const de topo dele ficam no escopo global
  // léxico, que os módulos também enxergam pelo nome.
  /* global DEMO_FIRST_NAMES, DEMO_LAST_NAMES, DEMO_TEAMS_SERIE_D, seededRngFromKey */
  if (typeof DEMO_FIRST_NAMES === "undefined" || typeof seededRngFromKey === "undefined") {
    throw new Error("motor/v2.js: carregue /js/data.js antes de abrir o motor");
  }
  const botao = { disabled: false };
  return {
    primeirosNomes: DEMO_FIRST_NAMES, sobrenomes: DEMO_LAST_NAMES, rngDaChave: seededRngFromKey,
    temporadaReal: () => estado.temporadaReal(), contaCriadaEm: () => estado.conta() && estado.conta().createdAt,
    buscarJogadores: (...a) => fetchRealPlayers(...a), timesSerieD: () => DEMO_TEAMS_SERIE_D, escudo: (t) => teamLogoSrc(t),
    modoReal: () => estado.modoReal(), herancaDoTecnico: () => estado.herancaDoTecnico(),
    gravar: () => ponteGravar(), somLigado: () => somLigado(), nomeTecnico: () => estado.conta() && estado.conta().name,
    agendar: (fn, ms) => setTimeout(fn, ms), cancelar: (id) => clearTimeout(id), persistir: () => persistCareer(), modoPonte: () => true,
    botaoSimular: () => botao,
    incluirBaseNaEscalacao: () => false, algumModalAberto: () => false,
  };
}

// Preferência de som: a mesma chave da página (o som em si é da tela; no modo
// ponte a página também não tocava nada).
function somLigado() { try { return localStorage.getItem("mt_sfx_enabled") !== "0"; } catch (_) { return true; } }
function gravarSom(v) { try { localStorage.setItem("mt_sfx_enabled", v ? "1" : "0"); } catch (_) { /* sem armazenamento */ } }
// Dos pedidos de tela, só o do som tem efeito que fica (a preferência).
let ouvindoTela = false;
function ouvirTela() {
  if (ouvindoTela) return;
  ouvindoTela = true;
  ouvir("tela", (t) => { if (t && t.nome === "setSfxEnabled") gravarSom(!!t.args[0]); });
}

// A ponte (mesmos comandos de window.BRDATA_PONTE), montada do motor.
export function criarPonte() {
  const P = {
    estado: ponteEstado,
    ...comandosGestao,
    ...comandosJogo,
    ...comandosCarga,
    continuarPosJogo() { return { ok: false, motivo: "sem-suporte" }; },
    executar(nome, ...args) {
      const fn = typeof nome === "string" && nome !== "executar" ? P[nome] : null;
      if (typeof fn !== "function") return { ok: false, motivo: "comando-desconhecido" };
      return fn.apply(P, args);
    },
  };
  return P;
}

// Abre o jogo: ambiente, conta e a entrada (carga do save ou escolha de
// competição). Devolve a ponte; sem conta logada, { semConta: true }.
export async function abrirMotor() {
  if (!semana.temAmbiente()) semana.definirAmbiente(ambienteSemPagina());
  ouvirTela();
  const me = await fetchJSON("/api/auth/me").catch(() => ({ authenticated: false }));
  if (!me || !me.authenticated) return { semConta: true };
  estado.definirConta(me.user);
  const ponte = criarPonte();
  await enterAfterAuth();
  return { ponte };
}
