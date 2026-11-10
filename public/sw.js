/* ===================================================================
   SERVICE WORKER — deixa o BR Data instalável (PWA) e funcionando
   parcialmente offline.
   -------------------------------------------------------------------
   Estratégia:
   - "App shell" (HTML/CSS/JS/ícones): NETWORK-FIRST — toda vez que o
     visitante está online, busca a versão atual direto do servidor
     (com cache:"no-store", ignorando até o cache HTTP nativo do
     navegador) e só cai pro que estiver salvo em cache se a rede
     falhar (offline). Isso existe pra o app SEMPRE abrir com o deploy
     mais recente pra quem está online, sem exigir um 2º reload nem um
     clique em "atualizar" — só entra em jogo o que está em cache
     quando não há internet nenhuma.
   - /api/*: mesma ideia (network-first), já era assim antes.
   - Qualquer outra origem (fontes do Google, etc.): não intercepta,
     deixa o navegador cuidar do jeito normal dele.

   AJUSTE (29/08/2026, pedido do usuário: "Todo deploy novo estou com
   problema de cache no navegador"): a estratégia ANTERIOR pro app
   shell era "stale-while-revalidate" (responde na hora com o que já
   tava em cache, atualiza em segundo plano só pra PRÓXIMA visita) —
   ou seja, depois de todo deploy, o primeiro carregamento de quem já
   tinha o site aberto/instalado SEMPRE vinha da versão antiga, e só
   ficava em dia depois de um 2º carregamento (ou de esperar o aviso
   "nova versão disponível" e clicar em atualizar). Reportado
   repetidamente como "problema de cache a cada deploy" -- histórico
   de vários BUMPs manuais de CACHE_NAME abaixo (removidos deste
   comentário, mas seguem no histórico do git) tentando contornar o
   sintoma sem resolver a causa. Network-first resolve a causa: com
   internet, a versão nova aparece JÁ NO PRIMEIRO carregamento depois
   do deploy, sem esperar nada.

   CACHE_NAME não precisa mais ser bumpado manualmente a cada deploy
   (era o processo antigo, documentado nas versões anteriores deste
   arquivo) — o servidor substitui "__DEPLOY_VERSION__" abaixo por um
   valor calculado no boot do processo (ver DEPLOY_VERSION em
   server.js) toda vez que serve este arquivo, então cada novo deploy
   (que reinicia o processo no Railway) já gera um nome de cache novo
   sozinho — isso só importa pro fallback OFFLINE (o "activate" abaixo
   limpa o cache antigo), já que a estratégia network-first acima nem
   depende do cache pra quem está online. */
const CACHE_NAME = "brdata-shell-__DEPLOY_VERSION__";
const API_CACHE_NAME = "brdata-api-v1";

// Carreira 2.0 (fase 11, a raiz do app instalado): JS/CSS do build da v2,
// com hash no nome — o servidor troca o comentário abaixo pela lista lida
// de public/carreira/index.html (ver serveStatic em server.js), para a tela
// abrir offline já na 1ª vez.
const V2_ASSETS = /*__V2_ASSETS__*/[];

const APP_SHELL = [
  ...V2_ASSETS,
  "/",            // desde a fase 11, a Carreira 2.0 (a raiz abre a v2)
  "/brasileirao", // o site do Brasileirão (index.html, servido pelo servidor)
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/js/qrcode-lib.js",
  "/js/data.js",
  "/js/engine.js",
  "/js/liveData.js",
  "/js/affiliates.js",
  "/js/app.js",
  "/img/logo.png",
  "/img/cbf-logo.png",
  "/img/icons/icon-192.png",
  "/img/icons/icon-512.png",
  // Modo Técnico (carreira.html/carreira.js) — item 9 da lista de
  // melhorias ("Cache offline do Modo Técnico"): antes desta lista, só
  // os arquivos do site principal (acima) entravam em cache na
  // instalação do service worker; carreira.html/carreira.js só
  // ficavam disponíveis offline DEPOIS de uma 1ª visita online (o
  // network-first acima só cacheia o que é de fato requisitado). Pra
  // quem instala o app já direto pelo Modo Técnico (manifest-
  // treinador.json, ver carreira.html) e depois perde a conexão sem
  // nunca ter aberto o site principal, o app shell abaixo garante que
  // a tela abre mesmo assim — dados de carreira (fetch/api) continuam
  // exigindo rede na 1ª vez, como já era.
  // Fase 11: /carreira.html virou redirecionamento para "/" (já acima);
  // carreira.js segue no shell porque o motor da v2 (/carreira/motor) usa.
  "/js/carreira.js",
  // Fase 12: núcleo do motor (carreira.html importa estes módulos).
  "/js/motor/partida.js",
  "/js/motor/tabela.js",
  "/js/motor/calendario.js",
  "/js/motor/rodada.js",
  "/js/motor/financas.js",
  "/js/motor/treino.js",
  "/js/motor/mercado.js",
  "/js/motor/temporada.js",
  "/js/motor/estado.js",
  "/js/motor/eventos.js",
  "/js/motor/registro.js",
  "/js/motor/texto.js",
  "/js/motor/semana.js",
  "/js/motor/fechamento.js",
  "/js/motor/aovivo.js",
  "/js/motor/posjogo.js",
  "/js/motor/clube.js",
  "/js/motor/virada.js",
  "/js/motor/ponte.js",
  "/js/motor/jogo.js",
  "/js/motor/carga.js",
  // Etapa G2c: a v2 abre o motor como módulo por este hospedeiro (com o
  // /js/data.js, já acima), sem a página escondida.
  "/js/motor/v2.js",
  "/manifest-treinador.json",
  "/img/brand-icon.png",
  "/img/icons/apple-touch-icon.png",
  "/img/icons/favicon-16.png",
  "/img/icons/favicon-32.png",
  "/img/icons/icon-maskable-192.png",
  "/img/icons/icon-maskable-512.png",
  // BRDATA 2048 (GAME-2048-001) — página standalone para WebView; entra no
  // app shell para funcionar offline desde a instalação. css/m3-tokens.css
  // também é usado por carreira.html.
  "/css/m3-tokens.css",
  // Redesign capítulos 1–7 — estilos e cenas da splash/login (abrem
  // offline desde a instalação, como o resto do app shell).
  "/css/brdata-redesign.css",
  "/img/redesign/background-navy-clean.svg",
  "/2048.html",
  "/js/game2048/engine.js",
  "/js/game2048/ui.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// networkFirst genérico — tenta a rede primeiro (cache:"no-store" pra
// nem o cache HTTP nativo do navegador servir uma cópia antiga sem
// perguntar pro servidor) e só cai pro cache dado (offline, ou o
// servidor fora do ar) se a rede falhar de verdade.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline e sem cache pra essa consulta");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // não intercepta POST/etc.

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // deixa passar (fontes externas etc.)

  const cacheName = isApiRequest(url) ? API_CACHE_NAME : CACHE_NAME;
  event.respondWith(networkFirst(request, cacheName));
});

/* AJUSTE (notificações push do Modo Técnico, pedido do usuário —
   sugeri como melhoria de retenção e ele confirmou implementar; ver
   server/src/push.js) — handler de "push" (mostra a notificação) +
   "notificationclick" (foca uma aba já aberta no destino, ou abre uma
   nova). Só o Modo Técnico assina push por enquanto (o site principal,
   index.html, não usa isso ainda), mas o handler mora neste MESMO
   arquivo porque as duas páginas registram o MESMO service worker
   (mesmo escopo "/") — não dá pra ter 2 workers competindo por ele. */
self.addEventListener("push", (event) => {
  let data = { title: "BR Treinador", body: "Você tem uma novidade no Modo Técnico." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload não era JSON (não deveria acontecer, ver push.js) —
    // segue com o texto genérico acima em vez de falhar a notificação.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/img/icons/icon-192.png",
      badge: "/img/icons/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).pathname === targetUrl.pathname);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl.href);
    })
  );
});
