# Barnedåb – invitation og tilmelding

Personlige invitationer og tilmelding til en barnedåb. Hver gæst (eller husstand) får et personligt link og en kode.
Når koden er tastet, åbner en kuvert sig og invitationen glider op. Gæsterne svarer for hver person og kan skrive en note.

- **Gæsteside:** `/i/<link-id>`
- **Admin:** `/admin` (kodeord), her oprettes invitationer, links kopieres, og man ser svar, åbninger og linkbesøg.

## Teknik

- React + Vite (TypeScript) i `src/`
- Cloudflare Pages Functions i `functions/` (API) med fælles kode i `server/`
- Cloudflare D1 (SQLite) som database, skemaet ligger i `migrations/`

Koden tjekkes på serveren, så gæster kan kun se deres egen invitation, og kun når både link og kode passer.

## Opsætning på Cloudflare (én gang)

Opret en D1-database og indsæt dens id i `wrangler.toml` (`npx wrangler d1 create barnedaab-invitation`), og kør skemaet: `npx wrangler d1 migrations apply barnedaab-invitation --remote`.

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → vælg dette repo.
2. Build-indstillinger: framework **None**, build command `npm run build`, output directory `dist`.
3. Når projektet er oprettet: **Settings → Variables and Secrets** → tilføj secret `ADMIN_PASSWORD` (for Production), og lav en ny deploy.
4. Gå til `https://<projekt>.pages.dev/admin`, log ind, og udfyld **Dagens detaljer** (navn, dato, kirke osv.).

Ingen personlige oplysninger ligger i koden. Alt om dagen og gæsterne indtastes i admin og gemmes i databasen.

Hver gang der skubbes til `main`, udgives siden automatisk.

### Eget domæne

Pages-projektet → **Custom domains** → **Set up a custom domain**. Ligger domænet ikke hos Cloudflare, skal der laves en CNAME til `<projekt>.pages.dev` hos den, der styrer DNS.

## Lokal udvikling

```sh
npm install
echo "ADMIN_PASSWORD=test" > .dev.vars
npm run db:migrate:local
npm run preview        # http://localhost:8788
```
