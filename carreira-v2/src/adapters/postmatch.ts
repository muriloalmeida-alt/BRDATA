// Pós-jogo (fase 4 do plano de independência): a v2 pede a etapa pendente
// ao motor e responde cada uma (comandos posJogo, concluirEtapa,
// responderColetiva, responderProposta e encerrarPosJogo da ponte; a perna
// da Copa é jogada na Partida, com iniciarPernaCopa). A sequência vive na
// memória do motor, como na versão anterior: o que já foi decidido está
// gravado; recarregar a página encerra a sequência.
import { engine } from "./engine.ts";
import type { PostMatchStep } from "../domain/postmatch.ts";

type R<T = object> = ({ ok: true } & T) | { ok: false; motivo?: string };

async function run<T>(name: string, ...args: unknown[]): Promise<T> {
  const s = engine.current() || await engine.get();
  return await s.run<T | Promise<T>>(name, ...args);
}

export const PostMatchGateway = {
  // Sem motor aberto (página recarregada) não há sequência: "nenhuma".
  current: async (): Promise<PostMatchStep> => {
    if (!engine.current()) return { etapa: "nenhuma" };
    return run<PostMatchStep>("posJogo").catch(() => ({ etapa: "nenhuma" }) as PostMatchStep);
  },
  done: (name: "noticias" | "resultados") => run<R<PostMatchStep>>("concluirEtapa", name),
  answerPress: (letra: string | null) => run<R<{ reputacao: number | null; moral: number | null } & PostMatchStep>>("responderColetiva", letra),
  answerOffer: (d: "aceitar" | "recusar" | "depois") => run<R<PostMatchStep>>("responderProposta", d),
  finish: () => run<R>("encerrarPosJogo").catch(() => ({ ok: false }) as R),
};
