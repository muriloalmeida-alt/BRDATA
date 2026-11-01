// Campo com os titulares (Escalação e Pré-jogo). Com `slotHref`, cada
// camisa leva ao "Quem entra?"; sem, é só leitura.
import type { CSSProperties } from "react";
import { shortName, type LineupModel, type PitchSlot } from "../domain/lineup.ts";
import { Jersey } from "./components.tsx";
import { Link } from "./router.tsx";

// Centro horizontal (%) de cada camisa, pelo nº de jogadores na linha —
// medido na referência (3: 23/50/77; 4: 15/38/62/85).
const STEP: Record<number, number> = { 1: 0, 2: 30, 3: 27, 4: 23.5, 5: 18.5 };
const ROW_Y = [21, 45, 67, 89]; // ataque → goleiro (% da altura do campo)

function Slot({ s, x, y, href }: { s: PitchSlot; x: number; y: number; href?: string }) {
  const label = s.player
    ? `${s.label}: ${s.player.name}, overall ${s.player.overall}${s.out ? `, ${s.out.toLowerCase()}` : ""}${href ? ". Trocar" : ""}`
    : `${s.label}: vaga vazia${href ? ". Escolher jogador" : ""}`;
  const style: CSSProperties = { left: `${x}%`, top: `${y}%` };
  const body = (<>
      <span className="lu-jersey">
        <Jersey value={s.player?.overall} gk={s.group === "G"} empty={!s.player} />
        {s.out && <span className="lu-out" aria-hidden="true">!</span>}
      </span>
      <span className="lu-name">{s.player ? shortName(s.player.name) : s.label}</span>
  </>);
  return href
    ? <Link to={href} className="lu-slot" style={style} aria-label={label}>{body}</Link>
    : <span className="lu-slot lu-slot--ro" style={style} role="listitem" aria-label={label}>{body}</span>;
}

function Pitch() {
  return (
    <svg className="lu-lines" viewBox="0 0 390 414" preserveAspectRatio="none" aria-hidden="true">
      <path d="M32 9H358L390 414H0Z" />
      <path d="M172 9V0h46v9" />
      <path d="M104 9v53h182V9M145 9v23h100V9" />
      <path d="M166 62a40 14 0 0 0 58 0" />
      <path d="M17 182h356" />
      <ellipse cx="195" cy="182" rx="53" ry="43" />
      <path d="M87 414v-80h216v80M133 414v-38h123v38" />
      <path d="M160 334a45 22 0 0 1 70 0" />
      <path d="M166 414v13h58v-13" />
      <path d="M32 18a9 9 0 0 0 9-9M349 9a9 9 0 0 0 9 9M0 404a10 10 0 0 1 10 10M380 414a10 10 0 0 1 10-10" />
    </svg>
  );
}


export function PitchPlayers({ rows, slotHref }: { rows: LineupModel["rows"]; slotHref?: (index: number) => string }) {
  const slots = rows.map((row, ri) => row.map((s, i) => (
    <Slot key={s.index} s={s} href={slotHref?.(s.index)} x={50 + (i - (row.length - 1) / 2) * (STEP[row.length] ?? 18)} y={ROW_Y[ri + (4 - rows.length)] ?? 50} />
  )));
  return (<>
    <Pitch />
    {slotHref ? slots : <div role="list" className="lu-ro-list">{slots}</div>}
  </>);
}
