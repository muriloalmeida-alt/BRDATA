import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import { App } from "./App.tsx";
import { captureInvite } from "./adapters/invite.ts";

// Link de convite (/?convite=CODIGO): guarda antes de qualquer tela (fase 11).
captureInvite();

// App instalável (fase 11): o mesmo service worker do site e da versão
// anterior (/sw.js, escopo "/"), que também recebe as notificações push.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
