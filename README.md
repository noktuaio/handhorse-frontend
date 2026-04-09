# appai (HandHorse UI)

Next.js 14 — interface do produto HandHorse.

## APIs em desenvolvimento

O front corre em **http://localhost:3000**. As APIs HandHorse (serverless-offline) usam **outras portas** para não colidir com o Next:

- **3001** — access-control (`/auth/*`, `/users/*`)
- **3002** — animals (`/animals/*`, JWT)

Copiar `.env.example` para `.env.local` e ajustar se necessário. Detalhes: [handhorse/docs/FRONT-INTEGRATION.md](../handhorse/docs/FRONT-INTEGRATION.md).

```bash
npm install
npm run dev
```
