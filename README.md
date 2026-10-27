# Barnedåb – invitation og tilmelding

Personlige invitationer og tilmelding til en barnedåb. Hver gæst (eller husstand) får et personligt link og en kode.
Når koden er tastet, åbner en kuvert sig og invitationen glider op. Gæsterne svarer for hver person og kan skrive en note.

- **Gæsteside:** `/i/<link-id>`
- **Admin:** `/admin` (kodeord), her oprettes invitationer, links kopieres, og man ser svar, åbninger og linkbesøg.

## Teknik

- React + Vite (TypeScript) i `src/`
- En Cloudflare Worker i `server/` håndterer `/api/*`. Alt andet serveres som statiske filer fra `dist/`.
- Cloudflare D1 (SQLite) som database, skemaet ligger i `migrations/`

Koden tjekkes på serveren, så gæster kan kun se deres egen invitation, og kun når både link og kode passer.

## Opsætning på Cloudflare (én gang)

1. Opret en D1-database og indsæt dens id i `wrangler.toml` (`npx wrangler d1 create barnedaab-invitation`), og kør skemaet: `npx wrangler d1 migrations apply barnedaab-invitation --remote`.
2. Cloudflare → **Workers & Pages** → **Create application** → **Import a repository** → vælg dette repo.
3. Build command: `npm run build`. Deploy command: `npx wrangler deploy` (standard).
4. Workeren → **Settings → Variables and Secrets** → tilføj secret `ADMIN_PASSWORD`.
5. Gå til `https://<worker>.<konto>.workers.dev/admin`, log ind, og udfyld **Dagens detaljer** (navn, dato, kirke osv.).

Ingen personlige oplysninger ligger i koden. Alt om dagen og gæsterne indtastes i admin og gemmes i databasen.
Hver gang der skubbes til `main`, udgives siden automatisk.

### Eget domæne

Workeren → **Settings → Domains & Routes** → **Add** → **Custom domain**. Domænet skal ligge (eller have sine nameservere) hos Cloudflare.

## Lokal udvikling

```sh
npm install
echo "ADMIN_PASSWORD=test" > .dev.vars
npm run db:migrate:local
npm run preview        # http://localhost:8788
```
