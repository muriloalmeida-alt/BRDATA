import type { Team } from "../domain/contracts";
import { crestSrc } from "../domain/dashboard";

// Escudo oficial do repositório; sem escudo, sigla do clube (nunca imagem
// inventada). Fundo claro garante contraste de escudos escuros (doc 03).
export function Crest({ team, size = 40, logo }: { team?: Pick<Team, "id" | "logo" | "short" | "name"> | null; size?: number; logo?: string | null }) {
  const src = logo ? "/" + logo.replace(/^\//, "") : crestSrc(team);
  const label = team?.name ?? "";
  if (src) return <span className="crest" style={{ width: size, height: size }}><img src={src} alt={label ? `Escudo do ${label}` : ""} loading="lazy" /></span>;
  return <span className="crest mono" style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }} aria-label={label}>{team?.short ?? "?"}</span>;
}

export function Ring({ value, tone, size = 84 }: { value: number; tone: "good" | "mid" | "bad"; size?: number }) {
  const r = 36, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, value));
  const color = tone === "good" ? "var(--accent)" : tone === "mid" ? "var(--warn)" : "var(--danger)";
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={`${pct}%`}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 42 42)" />
      <text x="42" y="48" textAnchor="middle" fill="var(--text)" style={{ font: "700 19px var(--font-num)" }}>{pct}%</text>
    </svg>
  );
}
