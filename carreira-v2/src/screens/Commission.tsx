// Comissão técnica — menu de sugestões rápidas (05/11, documento
// IMPLEMENTAR_COMISSAO_TECNICA.md e imagem 01_referencia_visual.png).
// Fechado: aba estreita na borda direita, só com o chevron. Aberto: folha
// pela parte de baixo (Sheet: foco preso, Escape, toque no fundo, foco
// devolvido à aba) com Escalação, Formação e Postura, uma aberta por vez.
// As regras e a gravação são do motor (adapters/comissao.ts).
import { useCallback, useEffect, useRef, useState } from "react";
import { ComissaoGateway, type Categoria, type Desfazer, type Sugestao, type Sugestoes } from "../adapters/comissao.ts";
import { Sheet } from "../ui/dialog.tsx";
import { IconChevron, IconClose, IconPitch, IconSliders, IconUsers, IconArrow } from "../ui/icons.tsx";
import { BASE, navigate } from "../ui/router.tsx";
import "./commission.css";

const NOME: Record<Categoria, string> = { escalacao: "Escalação", formacao: "Formação", postura: "Postura" };
const ICONE: Record<Categoria, JSX.Element> = { escalacao: <IconUsers className="cm-ico" />, formacao: <IconPitch className="cm-ico" />, postura: <IconSliders className="cm-ico" /> };
const SEM_DADOS = "Sem dados suficientes para sugerir uma mudança.";
const ERRO: Record<string, string> = {
  desatualizada: "A situação mudou desde a sugestão. Veja a recomendação atualizada e toque de novo.",
  "sem-sugestao": "Esta sugestão não vale mais. Veja a recomendação atualizada.",
  mudou: "Não dá para desfazer: a escalação mudou depois da sugestão.",
  partida: "Há uma partida em andamento.",
};
const errText = (m?: string) => ERRO[m || ""] || "Não foi possível gravar agora. Nada foi alterado; tente de novo.";

export function CommissionTab({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Fica montada (escondida) com o painel aberto: a folha devolve o foco a ela ao fechar. */}
      <button type="button" className={`cm-tab${open ? " is-hidden" : ""}`} aria-label="Abrir comissão técnica" aria-expanded={open} aria-controls="cm-panel" onClick={() => setOpen(true)}>
        <span className="cm-tab-face" aria-hidden="true"><IconChevron className="cm-tab-chev" /></span>
      </button>
      {open && <CommissionPanel onClose={() => setOpen(false)} onChanged={onChanged} />}
    </>
  );
}

function CommissionPanel({ onClose, onChanged }: { onClose: () => void; onChanged: () => Promise<void> | void }) {
  const [data, setData] = useState<Sugestoes | "erro" | null>(null);
  const [aberta, setAberta] = useState<Categoria | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; desfazer?: Desfazer } | null>(null);
  const firstLoad = useRef(true);

  const aplicarDados = useCallback((d: Sugestoes) => {
    setData(d);
    if (firstLoad.current) {
      firstLoad.current = false;
      const first = d.itens.find((i) => i.estado === "mudanca") || d.itens[0];
      setAberta(first ? first.categoria : null);
    }
  }, []);
  const carregar = useCallback(async () => {
    setData(null);
    const r = await ComissaoGateway.sugestoes();
    if (r.ok) aplicarDados(r); else setData("erro");
  }, [aplicarDados]);
  useEffect(() => { carregar(); }, [carregar]);

  const travar = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  };
  const aplicar = (s: Sugestao) => travar(async () => {
    setMsg(null);
    const r = await ComissaoGateway.aplicar(s.categoria, s.chave);
    if (r.ok) {
      aplicarDados(r);
      setMsg({ ok: true, text: `Sugestão aplicada: ${r.desfazer.resumo}.`, desfazer: r.desfazer });
      await onChanged();
      return;
    }
    const fresh = r as unknown as Partial<Sugestoes>;
    if (fresh.itens) aplicarDados(fresh as Sugestoes);
    setMsg({ ok: false, text: errText(r.motivo) });
  });
  const desfazer = (d: Desfazer) => travar(async () => {
    const r = await ComissaoGateway.desfazer(d);
    if (r.ok) { aplicarDados(r); setMsg({ ok: true, text: "Desfeito. A configuração anterior voltou." }); await onChanged(); return; }
    setMsg({ ok: false, text: errText(r.motivo) });
  });

  return (
    <Sheet labelledBy="cm-t" describedBy="cm-s" id="cm-panel" className="cm-sheet" onDismiss={busy ? undefined : onClose}>
      <header className="cm-head">
        <div>
          <h2 className="sheet-title" id="cm-t">Comissão técnica</h2>
          <p className="cm-sub" id="cm-s">Sugestões para o próximo jogo{data && data !== "erro" && data.jogo ? ` · ${data.jogo.casa ? "contra" : "fora contra"} o ${data.jogo.adversario}` : ""}</p>
        </div>
        <button type="button" className="cm-close" aria-label="Fechar" onClick={onClose} disabled={busy}><IconClose className="cm-close-ico" /></button>
      </header>
      <div className="cm-body">
        {data === null && <p className="cm-state" role="status">Carregando as sugestões…</p>}
        {data === "erro" && <div className="cm-state" role="alert">Não foi possível carregar as sugestões.<button type="button" className="state-btn" onClick={carregar}>Tentar novamente</button></div>}
        {data && data !== "erro" && !data.contratada && (
          <div className="cm-state">
            <p>A comissão técnica ainda não foi contratada. Com ela, você recebe sugestões de escalação, formação e postura para cada jogo.</p>
            <button type="button" className="cta cm-cta" onClick={() => { onClose(); navigate(`${BASE}/comissao`); }}>Ver comissão técnica</button>
          </div>
        )}
        {data && data !== "erro" && data.contratada && !data.jogo && <p className="cm-state">Sem próximo jogo marcado agora. As sugestões voltam quando houver um confronto na agenda.</p>}
        {data && data !== "erro" && data.contratada && data.jogo && (
          <ul className="cm-list">
            {data.itens.map((s) => {
              const on = aberta === s.categoria;
              const resumo = s.estado === "sem-dados" ? SEM_DADOS : s.resumo;
              return (
                <li key={s.categoria} className={`cm-item${on ? " is-open" : ""}`}>
                  <button type="button" className="cm-row" aria-expanded={on} aria-controls={`cm-${s.categoria}`} onClick={() => { setAberta(on ? null : s.categoria); setMsg(null); }}>
                    {ICONE[s.categoria]}
                    <span className="cm-row-body"><span className="cm-cat">{NOME[s.categoria]}</span><span className="cm-resumo">{resumo}</span></span>
                    <IconChevron className="cm-chev" />
                  </button>
                  {on && (
                    <div className="cm-detail" id={`cm-${s.categoria}`}>
                      {s.estado !== "sem-dados" && s.motivo && <p className="cm-motivo">{s.motivo}</p>}
                      {s.estado === "mudanca" && s.categoria === "escalacao" && s.detalhe?.entra && (
                        <p className="cm-swap" aria-label={`Sai ${s.detalhe.sai ? s.detalhe.sai.nome : "vaga vazia"}, entra ${s.detalhe.entra.nome}`}>
                          <span className="cm-chip">{s.detalhe.sai ? s.detalhe.sai.nome : "Vaga"}</span><IconArrow className="cm-arrow" /><span className="cm-chip is-in">{s.detalhe.entra.nome}</span>
                        </p>
                      )}
                      {s.estado === "mudanca" && s.categoria === "formacao" && s.detalhe && (
                        <div className="cm-form">
                          <p className="cm-swap"><span className="cm-chip">{s.detalhe.de}</span><IconArrow className="cm-arrow" /><span className="cm-chip is-in">{s.detalhe.para}</span></p>
                          {(s.detalhe.entram?.length || 0) > 0 && <p className="cm-note">Entram: {s.detalhe.entram!.join(", ")}</p>}
                          {(s.detalhe.saem?.length || 0) > 0 && <p className="cm-note">Saem: {s.detalhe.saem!.join(", ")}</p>}
                        </div>
                      )}
                      {s.estado === "mudanca" && s.nota && <p className="cm-note">{s.nota}</p>}
                      {s.estado === "mudanca" && (
                        <button type="button" className="cta cm-cta" aria-disabled={busy || undefined} onClick={() => aplicar(s)}>{busy ? "Aplicando…" : "Aplicar sugestão"}</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {msg && (
          <p className={msg.ok ? "cm-msg is-ok" : "cm-msg inline-error"} role={msg.ok ? "status" : "alert"}>
            {msg.text}
            {msg.desfazer && <button type="button" className="link-back cm-undo" disabled={busy} onClick={() => desfazer(msg.desfazer!)}>Desfazer</button>}
          </p>
        )}
      </div>
    </Sheet>
  );
}
