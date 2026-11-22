import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

// En desarrollo el servidor de salas (worker/) corre dentro de Vite: un solo `npm run dev`.
// `vite build` solo genera la web estática (dist/) para Vercel; el servidor se despliega aparte con wrangler.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), command === 'serve' && cloudflare()],
}));
