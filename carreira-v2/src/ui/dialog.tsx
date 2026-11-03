// Folha modal acessível, compartilhada (AUD-04). Mesmo visual de sempre
// (.sheet-scrim/.sheet em base.css), com o comportamento completo de diálogo:
// - abre com o foco no elemento marcado com data-autofocus (ou no 1º focável);
// - Tab e Shift+Tab ficam presos dentro da folha;
// - o resto da página (#root) fica inerte enquanto ela está aberta (a folha
//   é renderizada fora dele, num portal);
// - fecha com Escape e com toque no fundo SÓ quando `onDismiss` existe — quem
//   não pode ser dispensado (gravação em curso, escolha obrigatória) não passa
//   `onDismiss`;
// - ao fechar, devolve o foco a quem a abriu (se ele ainda existe na tela).
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { focusScreen } from "./router.tsx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusablesIn(el: HTMLElement): HTMLElement[] {
  // Na ordem do Tab: fora quem tem tabIndex -1 (ex.: opções não ativas de um
  // grupo com foco "roving").
  return [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && !n.hasAttribute("inert") && n.getClientRects().length > 0);
}

export function Sheet({ labelledBy, describedBy, alert = false, onDismiss, children }: {
  labelledBy: string; describedBy?: string; alert?: boolean; onDismiss?: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    root?.setAttribute("aria-hidden", "true");
    const box = ref.current!;
    const target = box.querySelector<HTMLElement>("[data-autofocus]") || focusablesIn(box)[0] || box;
    target.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dismissRef.current) { e.preventDefault(); dismissRef.current(); }
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusablesIn(box);
      if (!list.length) { e.preventDefault(); box.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !box.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !box.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      root?.removeAttribute("inert");
      root?.removeAttribute("aria-hidden");
      // Devolve o foco a quem abriu, se ele ainda está na tela; se a folha
      // fechou por uma navegação, a nova tela cuida do foco (router.tsx).
      // Aberta sem acionador (ex.: voltar do sistema na partida): título da tela.
      if (opener && opener !== document.body && opener.isConnected && !opener.closest("[inert]")) opener.focus();
      else focusScreen();
    };
  }, []);

  return createPortal(
    <div className="sheet-scrim" onClick={() => dismissRef.current?.()}>
      <div ref={ref} className="sheet" role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
        tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
