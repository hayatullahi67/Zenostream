// Local development server. On Vercel the files in /api run as serverless
// functions instead, so this file is not used there.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import configHandler from '../api/config.js';
import verifyHandler from '../api/verify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/config', configHandler);
app.get('/api/verify', verifyHandler);

// After "npm run build", this server also serves the React app.
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Zenostream API running at http://localhost:${PORT}`);
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.log('PAYSTACK_SECRET_KEY is missing. Add it to the .env file, then restart.');
  }
});
