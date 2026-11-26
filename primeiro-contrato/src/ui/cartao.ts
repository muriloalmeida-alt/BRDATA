// Cartão de legado em imagem (PC-001): canvas → PNG. Compartilhamento nativo
// quando o aparelho aceita arquivo; senão, download.
import { nomeExibicao } from "../engine/atleta.ts";
import type { Catalogo } from "../engine/catalogo.ts";
import { passagens, totais } from "../engine/carreira.ts";
import type { Carreira } from "../engine/estado.ts";

const BASE = import.meta.env.BASE_URL;

function imagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error(src));
    i.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fx = 0.52, fy = 0.45) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  const sx = clampN((img.width - sw) * fx, 0, img.width - sw), sy = clampN((img.height - sh) * fy, 0, img.height - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export async function gerarCartao(cat: Catalogo, c: Carreira): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#080e18"; ctx.fillRect(0, 0, W, H);
  const [foto, marca] = await Promise.all([imagem(`${BASE}fundos/04_despedida.webp`), imagem(`${BASE}marca-t.webp`)]);
  // Cartão com borda lima
  const cx = 90, cy = 70, cw = W - 180, ch = 900;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 36); ctx.clip();
  cover(ctx, foto, cx, cy, cw, ch);
  const g = ctx.createLinearGradient(0, cy, 0, cy + ch);
  g.addColorStop(0.3, "rgba(7,15,24,0.05)"); g.addColorStop(0.75, "rgba(7,15,24,0.92)");
  ctx.fillStyle = g; ctx.fillRect(cx, cy, cw, ch);
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = "#b4e64b";
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 36); ctx.stroke();
  ctx.drawImage(marca, cx + 44, cy + 40, 99, 80);
  ctx.fillStyle = "rgba(245,247,250,.92)"; ctx.textAlign = "right";
  ctx.font = "700 110px 'Barlow Condensed'"; ctx.fillText(String(c.atleta.numero), cx + cw - 44, cy + 130);
  // Nome e números
  const tot = totais(c);
  ctx.textAlign = "center"; ctx.fillStyle = "#f5f7fa";
  ctx.font = "700 86px 'Barlow Condensed'"; ctx.fillText(nomeExibicao(c.atleta), W / 2, cy + ch - 220, cw - 80);
  ctx.fillStyle = "rgba(245,247,250,.35)"; ctx.fillRect(cx + 70, cy + ch - 190, cw - 140, 2); ctx.fillRect(W / 2 - 1, cy + ch - 160, 2, 120);
  ctx.fillStyle = "#b4e64b"; ctx.font = "700 100px 'Barlow Condensed'";
  ctx.fillText(String(tot.jogos), W / 2 - cw / 4, cy + ch - 80); ctx.fillText(String(tot.metrica), W / 2 + cw / 4, cy + ch - 80);
  ctx.fillStyle = "#f5f7fa"; ctx.font = "500 40px Barlow";
  ctx.fillText("Jogos", W / 2 - cw / 4, cy + ch - 30); ctx.fillText(tot.rotulo, W / 2 + cw / 4, cy + ch - 30);
  // Trajetória resumida
  const ps = passagens(c).filter((p) => !p.emprestimo);
  const clubes = [...new Map(ps.map((p) => [p.clubeId, p])).values()].slice(0, 4).map((p) => `${p.inicio} · ${p.clubeNome}`);
  ctx.font = "500 38px Barlow"; ctx.fillStyle = "#f5f7fa";
  clubes.forEach((t, i) => ctx.fillText(t, W / 2, 1060 + i * 52, W - 160));
  ctx.font = "600 34px 'Barlow Condensed'"; ctx.fillStyle = "#b4e64b";
  ctx.fillText("TOUCHLINE · PRIMEIRO CONTRATO", W / 2, H - 50);
  void cat;
  return await new Promise<Blob>((ok, falha) => cv.toBlob((b) => (b ? ok(b) : falha(new Error("toBlob"))), "image/png"));
}

export async function compartilharCartao(cat: Catalogo, c: Carreira): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const blob = await gerarCartao(cat, c);
  const nome = `touchline-${nomeExibicao(c.atleta).replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`;
  const arquivo = new File([blob], nome, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], title: "Minha carreira no Touchline" });
      return "compartilhado";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "baixado";
}
