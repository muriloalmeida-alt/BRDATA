// Move o index.html gerado pelo Vite pra public/carreira-v2.html (rota de
// entrada da v2); os assets continuam em public/carreira-v2/.
import { renameSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const from = join(root, "carreira-v2", "index.html");
if (!existsSync(from)) throw new Error(`build sem index.html: ${from}`);
renameSync(from, join(root, "carreira-v2.html"));
console.log("entrada publicada em public/carreira-v2.html");
