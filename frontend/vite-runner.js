#!/usr/bin/env node
// vite-runner.js — Keep Vite running indefinitely
import { createServer } from 'vite';

(async () => {
  const server = await createServer({
    server: {
      middlewareMode: false,
      host: '0.0.0.0',
      port: 5173,
    },
  });

  await server.listen();
  console.log('✅ Vite dev server listening on http://localhost:5173');

  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await server.close();
    process.exit(0);
  });
})();
