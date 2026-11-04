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
