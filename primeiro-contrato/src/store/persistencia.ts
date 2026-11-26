// Save anônimo (PC-001): IndexedDB, com localStorage e memória como reserva
// (aba privada, armazenamento bloqueado). Cada gravação é uma transação única
// com o save inteiro: avanço e efeitos da decisão entram juntos.
import { migrarSave } from "../engine/save.ts";
import type { Carreira } from "../engine/estado.ts";

const DB = "touchline-primeiro-contrato";
const STORE = "carreiras";
const CHAVE = "atual";
const LS = "touchline-pc:carreira";
let memoria: string | null = null;

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    if (typeof indexedDB === "undefined") return falha(new Error("sem IndexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => falha(req.error);
  });
}

async function idb<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((ok, falha) => {
      const tx = db.transaction(STORE, modo);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => ok(req.result);
      tx.onerror = () => falha(tx.error);
      tx.onabort = () => falha(tx.error);
    });
  } finally { db.close(); }
}

export async function carregarSave(): Promise<Carreira | null> {
  let bruto: unknown = null;
  try { bruto = await idb("readonly", (s) => s.get(CHAVE)); } catch { /* reserva abaixo */ }
  if (!bruto) {
    try { const t = localStorage.getItem(LS); if (t) bruto = JSON.parse(t); } catch { /* sem armazenamento */ }
  }
  if (!bruto && memoria) bruto = JSON.parse(memoria);
  return migrarSave(bruto);
}

export async function gravarSave(c: Carreira): Promise<void> {
  const copia = JSON.parse(JSON.stringify(c));
  memoria = JSON.stringify(copia);
  try { await idb("readwrite", (s) => s.put(copia, CHAVE)); return; } catch { /* reserva */ }
  try { localStorage.setItem(LS, memoria); } catch { /* fica só em memória */ }
}

export async function apagarSave(): Promise<void> {
  memoria = null;
  try { await idb("readwrite", (s) => s.delete(CHAVE)); } catch { /* ok */ }
  try { localStorage.removeItem(LS); } catch { /* ok */ }
}
