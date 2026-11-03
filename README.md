# Obowiązki

Rodzic i dwoje dzieci prowadzą listę obowiązków na dziś. Dziecko widzi tylko swoje pozycje i je odhacza. Rodzic widzi obie listy i potwierdza odhaczenie — dopiero wtedy obowiązek jest zrobiony. Niepotwierdzoną pomyłkę rodzic może usunąć. Po potwierdzeniu pozycji nie da się usunąć.

Opis produktu: [context/foundation/prd.md](context/foundation/prd.md).

Aplikacja działa w przeglądarce, także na wąskim ekranie telefonu. Nie ma osobnego adresu produkcyjnego: recenzent uruchamia ją lokalnie.

## Stos

Astro 7 (SSR), React 19, TypeScript, Tailwind 4, Supabase, Cloudflare Workers.

## Uruchomienie lokalne

Potrzebne są Node.js 22.14.0 (`.nvmrc`), npm i Docker.

```bash
git clone https://github.com/GregoryLynx/10x-projekt.git
cd 10x-projekt
npm install
npx supabase start
```

Z wydruku `npx supabase status` przepisz adres API, klucz anon i klucz service role do `.env` i `.dev.vars` (oba pliki są w `.gitignore`):

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Klucz service role jest potrzebny, żeby rodzic mógł założyć konto dziecka. Nie commituj tych plików.

```bash
npm run dev
```

Aplikacja jest pod http://localhost:4321/. Studio bazy jest pod http://127.0.0.1:54323/.

Zatrzymanie bazy: `npx supabase stop`.

## Jak przejść pętlę

1. Załóż konto rodzica na `/auth/signup` i zaloguj się. Trafisz na `/dashboard`.
2. Dodaj dziecko: imię, pełny email i hasło o długości co najmniej 6. Dziecko loguje się tym samym emailem.
3. Dodaj drugie dziecko. Trzecie jest odrzucane.
4. Dopisz obowiązek na dziś przy wybranym dziecku.
5. Wyloguj się i zaloguj jako to dziecko. Widać tylko jego listę. Odhaczenie można cofnąć, dopóki rodzic nie potwierdzi.
6. Zaloguj się jako rodzic. Potwierdź odhaczenie albo usuń niepotwierdzoną pozycję. Potwierdzonej nie da się usunąć.

## Skrypty

- `npm run dev` — serwer deweloperski
- `npm run build` / `npm run preview` — build i podgląd
- `npm run lint` — ESLint
- `npm run smoke` — smoke logowania, nie obejmuje listy obowiązków (`BASE_URL`, domyślnie `http://localhost:4321`)
- `npm test` — Vitest: izolacja rodzeństwa, reguła „zrobione” i granica „dziś”. Wymaga lokalnego Supabase i działającego `npm run dev` na porcie 4321.

GitHub Actions na `master` uruchamia lint, `astro check`, build oraz smoke logowania na lokalnym Supabase. Actions nie uruchamia `npm test`.
