// OFFLINE-001 (13/11/2026): o aparelho está com rede? Recompensa diária,
// loja, ranking e amigos são serviços da conta e só funcionam com rede
// (decisão do Murilo, item 2); a carreira funciona sem.
import { useEffect, useState } from "react";

export function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function useOnline(): boolean {
  const [on, setOn] = useState(online);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return on;
}

export const OFFLINE_TEXT = {
  reward: "Sem conexão. A recompensa diária precisa de internet; volte quando estiver online.",
  shop: "Sem conexão. Comprar créditos e itens precisa de internet. O que você já comprou continua valendo na carreira.",
  ranking: "Sem conexão. O ranking e os amigos precisam de internet.",
};
