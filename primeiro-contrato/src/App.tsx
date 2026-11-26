// Touchline · Primeiro Contrato (PC-001). Estado da interface e navegação. A
// tela da carreira é derivada do save (decisão pendente > fase); as telas de
// criação usam uma pilha sincronizada com o histórico do navegador (voltar do
// sistema/gesto funciona sem botão extra no header).
import { useCallback, useEffect, useRef, useState } from "react";
import { sugerirNacionalidade } from "./engine/atleta.ts";
import type { Catalogo } from "./engine/catalogo.ts";
import { abrirJanela, assinarPrimeiroContrato, avancar, decidir, novaCarreira } from "./engine/carreira.ts";
import type { Carreira } from "./engine/estado.ts";
import { novaSemente } from "./engine/rng.ts";
import { catalogoAtivo, catalogoDoSave } from "./store/catalogo.ts";
import { apagarSave, carregarSave, gravarSave } from "./store/persistencia.ts";
import { TelaClube, TelaContrato, TelaInicio, TelaJogador, TelaPosicao, type Rascunho } from "./screens/Entrada.tsx";
import { TelaBalanco, TelaConvocacao, TelaPerdaEspaco, TelaRecuperacao, TelaTemporada, TelaTreinador } from "./screens/Carreira.tsx";
import { TelaAposentadoria, TelaComparar, TelaJanela } from "./screens/Mercado.tsx";
import { TelaLegado, TelaTrajetoria } from "./screens/Legado.tsx";
import { Dialogo } from "./ui/componentes.tsx";

type Rota = "inicio" | "jogador" | "posicao" | "clube" | "contrato" | "carreira" | "trajetoria" | "comparar";

const rascunhoNovo = (): Rascunho => ({
  semente: novaSemente(), apelido: "", numero: 10, posicao: null, clubeId: null,
  nacionalidade: sugerirNacionalidade(typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []),
});

const listaInicial = { texto: "", pais: "", ligaId: "", mostrar: 40, rolagem: 0 };

export function App() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [save, setSave] = useState<Carreira | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [pilha, setPilha] = useState<Rota[]>(["inicio"]);
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoNovo);
  const [lista, setLista] = useState(listaInicial);
  const [janelaSel, setJanelaSel] = useState<string | null>(null);
  const [confirmarNova, setConfirmarNova] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const pilhaRef = useRef(pilha);
  pilhaRef.current = pilha;
  const rota = pilha[pilha.length - 1];

  const iniciar = useCallback(async () => {
    setErro(null);
    try {
      const s = await carregarSave();
      const catalogo = s ? await catalogoDoSave(s.catalogo) : await catalogoAtivo();
      setSave(s);
      setCat(catalogo);
      setCarregado(true);
    } catch (e) {
      setErro("Não foi possível carregar o catálogo de clubes.");
      console.error(e);
    }
  }, []);
  useEffect(() => { void iniciar(); }, [iniciar]);

  // Histórico do navegador: cada tela empilhada é uma entrada.
  useEffect(() => {
    history.replaceState({ pc: 1 }, "");
    const pop = () => {
      setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const ir = (r: Rota) => { history.pushState({ pc: pilhaRef.current.length + 1 }, ""); setPilha((p) => [...p, r]); window.scrollTo(0, 0); };
  const voltar = () => history.back();
  const raiz = (r: Rota) => {
    // Recomeça a pilha (p.ex. depois de assinar). Entradas antigas do
    // histórico ficam inertes: o popstate não desce abaixo de uma tela.
    setPilha([r]);
    window.scrollTo(0, 0);
  };

  const atualizar = async (c: Carreira) => {
    setSave(c);
    await gravarSave(c);
  };

  if (erro) {
    return (
      <main className="estado" role="alert">
        <p>{erro}</p>
        <button type="button" className="link" onClick={() => void iniciar()}>Tentar de novo</button>
      </main>
    );
  }
  if (!carregado || !cat) {
    return <main className="estado" aria-busy="true"><div className="carregando" /><span className="sr-only">Carregando</span></main>;
  }

  const comecarNova = async () => {
    setConfirmarNova(false);
    await apagarSave();
    setSave(null);
    if (save) setCat(await catalogoAtivo());
    setRascunho(rascunhoNovo());
    setLista(listaInicial);
    raiz("inicio");
    ir("jogador");
  };

  // ── criação ──
  if (rota === "inicio") {
    return (
      <>
        <TelaInicio temSave={!!save} onNova={() => (save ? setConfirmarNova(true) : (setRascunho(rascunhoNovo()), ir("jogador")))} onContinuar={() => ir("carreira")} />
        {confirmarNova && <Dialogo titulo="Começar uma nova carreira?" texto="A carreira salva neste aparelho será substituída." confirmar="Começar de novo" onConfirmar={() => void comecarNova()} onCancelar={() => setConfirmarNova(false)} />}
      </>
    );
  }
  const mudar = (p: Partial<Rascunho>) => setRascunho((r) => ({ ...r, ...p, ...(p.posicao && p.posicao !== r.posicao ? { clubeId: r.clubeId } : {}) }));
  if (rota === "jogador") return <TelaJogador r={rascunho} onMudar={mudar} onAvancar={() => ir("posicao")} />;
  if (rota === "posicao") return <TelaPosicao r={rascunho} onMudar={mudar} onAvancar={() => ir("clube")} />;
  if (rota === "clube") {
    if (!rascunho.posicao) { voltar(); return null; }
    return <TelaClube cat={cat} r={rascunho} lista={lista} onLista={(l) => setLista((x) => ({ ...x, ...l }))} onMudar={mudar} onAvancar={() => ir("contrato")} />;
  }
  if (rota === "contrato") {
    if (!rascunho.posicao || !rascunho.clubeId) { voltar(); return null; }
    return (
      <TelaContrato cat={cat} r={rascunho} onAssinar={async () => {
        let c = novaCarreira(cat, { semente: rascunho.semente, apelido: rascunho.apelido, nacionalidade: rascunho.nacionalidade, numero: rascunho.numero, posicao: rascunho.posicao!, agora: new Date().toISOString() });
        c = assinarPrimeiroContrato(cat, c, rascunho.clubeId!);
        await atualizar(c);
        raiz("carreira");
      }} />
    );
  }

  // ── carreira ──
  if (!save) { raiz("inicio"); return null; }
  const c = save;
  if (rota === "trajetoria") {
    return <TelaTrajetoria cat={cat} c={c} onVoltar={voltar} rotuloVoltar={c.fase === "encerrada" ? "Voltar ao legado" : "Voltar à carreira"} />;
  }
  const decidirEm = async (id: string) => { await atualizar(decidir(cat, c, id)); setJanelaSel(null); raiz("carreira"); };
  const p = c.pendente;
  if (p?.tipo === "janela") {
    if (rota === "comparar") return <TelaComparar cat={cat} c={c} p={p} selecionado={janelaSel} onDecidir={(id) => void decidirEm(id)} />;
    return <TelaJanela cat={cat} c={c} p={p} selecionado={janelaSel} onSelecionar={setJanelaSel} onComparar={() => ir("comparar")} />;
  }
  if (p?.tipo === "aposentadoria") return <TelaAposentadoria c={c} p={p} onDecidir={(id) => void decidirEm(id)} />;
  if (p?.tipo === "adaptacao") return <TelaTreinador key={p.chave} p={p} onDecidir={(id) => void decidirEm(id)} />;
  if (p?.tipo === "recuperacao") return <TelaRecuperacao key={p.chave} p={p} onDecidir={(id) => void decidirEm(id)} />;
  if (p?.tipo === "perdaEspaco") return <TelaPerdaEspaco key={p.chave} p={p} onDecidir={(id) => void decidirEm(id)} />;
  if (p?.tipo === "convocacao") return <TelaConvocacao key={p.chave} c={c} p={p} onContinuar={() => void decidirEm("ok")} />;
  if (c.fase === "balanco") return <TelaBalanco c={c} onAbrirJanela={() => void atualizar(abrirJanela(cat, c))} />;
  if (c.fase === "encerrada") return <TelaLegado cat={cat} c={c} onTrajetoria={() => ir("trajetoria")} onNova={() => setConfirmarNova(true)} />;
  return (
    <>
      <TelaTemporada c={c} ocupado={ocupado} onTrajetoria={() => ir("trajetoria")} onAvancar={async () => {
        setOcupado(true);
        try { await atualizar(avancar(cat, c)); window.scrollTo(0, 0); } finally { setOcupado(false); }
      }} />
      {confirmarNova && <Dialogo titulo="Começar uma nova carreira?" texto="A carreira salva neste aparelho será substituída." confirmar="Começar de novo" onConfirmar={() => void comecarNova()} onCancelar={() => setConfirmarNova(false)} />}
    </>
  );
}
