// Cartão de conquista para compartilhar: o mesmo desenho de
// shareCanvasBase + shareAchievementCard + shareCanvasImage (carreira.js),
// na v2 (o compartilhamento do navegador precisa do toque na própria página).
function wrap(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxWidth: number, lineHeight: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}
export async function shareAchievement(a: { id: string; titulo: string; descricao: string; icone: string }): Promise<"shared" | "downloaded" | "cancelled" | "failed"> {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* segue com as fontes do sistema */ }
  const w = 1080, h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "failed";
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0d1a2e"); bg.addColorStop(1, "#040a15");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w / 2, h * 0.34, 40, w / 2, h * 0.34, w * 0.75);
  glow.addColorStop(0, "rgba(212,175,55,.18)"); glow.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(212,175,55,.4)"; ctx.lineWidth = 4; ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.fillStyle = "rgba(232,222,196,.6)"; ctx.font = "600 26px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("BR TREINADOR · MODO TÉCNICO", w / 2, h - 58);
  ctx.fillStyle = "#d4af37"; ctx.font = "700 34px Inter, sans-serif";
  ctx.fillText("CONQUISTA DESBLOQUEADA", w / 2, 200);
  ctx.font = "160px serif"; ctx.fillText(a.icone || "🏆", w / 2, 480);
  ctx.fillStyle = "#f5f0e6"; ctx.font = '700 70px "Bebas Neue", sans-serif';
  ctx.fillText(a.titulo, w / 2, 640, w - 140);
  ctx.fillStyle = "rgba(232,222,196,.8)"; ctx.font = "600 32px Inter, sans-serif";
  wrap(ctx, a.descricao, w / 2, 720, w - 200, 42);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "failed";
  const filename = `conquista-${a.id}.png`;
  try {
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Conquista desbloqueada!", text: `Desbloqueei a conquista "${a.titulo}" no BR Treinador! 🏆` });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

// ---------- Cartão de título (item 1, 05/11) ----------
// Mesmo desenho de shareTitleCard + shareDrawCrest (carreira.js): faixa
// dourada com o título, escudo num hexágono sobre a chapinha clara, nome do
// clube, temporada e taça. O título diz a série certa (decisão de 05/11).
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
export interface CrestTeam { name: string; short?: string; c1?: string; c2?: string; src: string | null }
async function drawCrest(ctx: CanvasRenderingContext2D, t: CrestTeam, cx: number, cy: number, r: number) {
  const img = t.src ? await loadImage(t.src) : null;
  hexPath(ctx, cx, cy, r);
  ctx.save(); ctx.clip();
  if (img) {
    ctx.fillStyle = "#F5F1E6"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const pad = r * 0.14;
    ctx.drawImage(img, cx - r + pad, cy - r + pad, (r - pad) * 2, (r - pad) * 2);
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, t.c1 || "#1d3a63"); g.addColorStop(1, t.c2 || "#0b1c33");
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
  hexPath(ctx, cx, cy, r);
  ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 3; ctx.stroke();
  if (!img) {
    ctx.fillStyle = "#f5f0e6"; ctx.font = `700 ${Math.round(r * 0.68)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((t.short || t.name || "?").slice(0, 3).toUpperCase(), cx, cy + r * 0.05);
    ctx.textBaseline = "alphabetic";
  }
}
export async function shareTitle(o: { head: string; text: string; year: number; team: CrestTeam; file: string }): Promise<"shared" | "downloaded" | "cancelled" | "failed"> {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* segue com as fontes do sistema */ }
  const w = 1080, h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "failed";
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0d1a2e"); bg.addColorStop(1, "#040a15");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w / 2, h * 0.34, 40, w / 2, h * 0.34, w * 0.75);
  glow.addColorStop(0, "rgba(212,175,55,.18)"); glow.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(212,175,55,.4)"; ctx.lineWidth = 4; ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.fillStyle = "rgba(232,222,196,.6)"; ctx.font = "600 26px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("BR TREINADOR · MODO TÉCNICO", w / 2, h - 58);
  ctx.fillStyle = "#d4af37"; ctx.font = "700 40px Inter, sans-serif";
  ctx.fillText(o.head, w / 2, 200);
  await drawCrest(ctx, o.team, w / 2, 480, 220);
  ctx.fillStyle = "#f5f0e6"; ctx.font = '700 76px "Bebas Neue", sans-serif'; ctx.textAlign = "center";
  ctx.fillText(o.team.name.toUpperCase(), w / 2, 840, w - 120);
  ctx.fillStyle = "rgba(232,222,196,.75)"; ctx.font = "600 38px Inter, sans-serif";
  ctx.fillText(`Temporada ${o.year}`, w / 2, 910);
  ctx.font = "48px serif"; ctx.fillText("🏆", w / 2, 990);
  let blob: Blob | null = null;
  try { blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")); } catch { blob = null; }
  if (!blob) return "failed";
  try {
    const file = new File([blob], o.file, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Título conquistado!", text: o.text });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = o.file;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
