import express from 'express';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Proxy /supabase to the actual Supabase project
  if (SUPABASE_URL) {
    app.use(
      '/supabase',
      createProxyMiddleware({
        target: SUPABASE_URL,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/supabase': '', // remove /supabase prefix when forwarding
        },
        on: {
          proxyReq: (proxyReq, req, res) => {
            if (proxyReq.path.startsWith('/auth/v1/')) {
              proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
            } else if (proxyReq.path.startsWith('/rest/v1/') || proxyReq.path.startsWith('/graphql/v1/') || proxyReq.path.startsWith('/storage/v1/')) {
              proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
              // Do NOT inject service role key, let the client's Authorization header pass through
            }
          },
          proxyReqWs: (proxyReq, req, socket, options, head) => {
            proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
          }
        }
      })
    );
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
