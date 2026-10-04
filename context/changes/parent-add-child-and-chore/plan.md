# Rodzic dodaje dziecko i obowiązek na dziś — Implementation Plan

## Overview

Zalogowany rodzic zakłada jedno konto dziecka i dopisuje mu obowiązki na dziś (kalendarz `Europe/Warsaw`). Kolejnego wieczoru dodaje następne obowiązki bez nowego konta. Drugie dziecko jest w tym kawałku odrzucane.

## Current State Analysis

F-01 jest zarchiwizowane. Tabele `families`, `profiles` i `today_chores`, RLS oraz trigger `handle_new_user` już działają. Trigger zakłada rodzinę tylko wtedy, gdy metadane nie mają `role=child`; konto dziecka nie dostaje profilu samo (`supabase/migrations/20261001180000_family_data_and_roles.sql` linie 84–87 i 147–156). Rodzic może wstawić profil dziecka i wiersz obowiązku (polityki `profiles_insert_parent_for_family`, `today_chores_insert_parent`).

Logowanie to email i hasło na kliencie z ciasteczkiem (`src/lib/supabase.ts`, `src/pages/api/auth/signin.ts`). Nie ma klucza service role (`astro.config.mjs` linie 20–21, `.env.example`). `signUp` na tym kliencie podmieniłoby sesję rodzica. `zod` nie jest zależnością projektu. Nie ma runnera testów jednostkowych; bramki to ESLint i `npx astro check`.

`getCurrentProfile` (`src/lib/profile.ts`) nie jest używany przez strony. Jedyna chroniona trasa to `/dashboard` (`src/middleware.ts`). Rejestracja wymaga hasła o długości co najmniej 6 (`src/components/auth/SignUpForm.tsx` linia 8). Domyślna `chore_date` to data UTC (migracja, linia 29).

## Desired End State

Rodzic loguje się i ląduje na `/dashboard`. Gdy nie ma dziecka, podaje imię, krótki login i hasło. Powstaje użytkownik `{login}@family.local` z metadanymi `role=child` i profil w rodzinie rodzica. Rodzic zostaje zalogowany i widzi ten email. Potem dodaje jeden lub więcej obowiązków na dzisiejszą datę w Polsce. Przy kolejnej wizycie formularza dziecka nie ma; jest formularz obowiązków. Próba drugiego dziecka kończy się komunikatem, że wejdzie w następnym kawałku. Wylogowanie zostaje.

### Key Discoveries:

- Konto dziecka wymaga `auth.admin.createUser` na kliencie service role bez ciasteczek. Profil wstawia dopiero endpoint, bo trigger przy `role=child` nic nie tworzy.
- Polityka INSERT na `today_chores` już puszcza rodzica. Data musi być podana jawnie, inaczej kolumna weźmie UTC.
- Limit jednego dziecka jest regułą aplikacji. F-01 celowo nie dodał twardego ograniczenia w bazie, bo S-05 podniesie je do dwojga.
- Ekran idzie istniejącym wzorcem: wyspa React, `POST` `formData`, błąd w `?error=`.

## What We're NOT Doing

- Lista i odhaczenie dziecka (S-02), potwierdzenie rodzica (S-03), usuwanie obowiązku (S-04), drugie dziecko (S-05).
- Prawdziwy email dziecka, reset hasła, potwierdzanie skrzynki dla `@family.local`.
- Edycja treści obowiązku, przeniesienie na inne dziecko, usuwanie konta dziecka.
- Twarde ograniczenie `1 dziecko` w bazie, powiadomienia, listy dzień powszedni / święto.
- Tłumaczenie istniejących ekranów logowania. Nowe napisy są po angielsku, jak dashboard i formularze auth.

## Implementation Approach

Sekret `SUPABASE_SERVICE_ROLE_KEY` zasila osobny klient admin, który nie czyta ani nie zapisuje ciasteczek. Endpoint dziecka woła `createUser`, potem wstawia profil już na kliencie sesji rodzica, więc RLS zostaje strażnikiem. Endpoint obowiązku też używa sesji rodzica i sam wylicza datę `Europe/Warsaw`. `/dashboard` czyta profil i, dla istniejącego dziecka, email przez admin `getUserById`. Po udanym logowaniu przekierowanie idzie na `/dashboard`.

## Critical Implementation Details

Klient service role nie może korzystać z ciasteczek rodzica. `signUp` na obecnym kliencie podmieniłby sesję. Trigger nie tworzy profilu przy `role=child`, więc profil wstawia endpoint; gdy wstawienie się nie uda, endpoint kasuje właśnie utworzonego użytkownika auth (`deleteUser`) i zwraca błąd, żeby ten sam login dało się powtórzyć. `chore_date` jest dniem kalendarza `Europe/Warsaw` policzonym w aplikacji. Domyślna wartość kolumny to UTC i nie wolno jej zostawić pustej.

## Phase 1: Konto dziecka

### Overview

Rodzic, będąc zalogowany, tworzy jedno konto dziecka. Drugie jest odrzucane. Sesja rodzica zostaje.

### Changes Required:

#### 1. Sekret i klient admin

**File**: `astro.config.mjs`, `.env.example`, `src/lib/supabase-admin.ts`

**Intent**: Dać serwerowi klucz service role, którego nie ma w przeglądarce i który nie rusza ciasteczek sesji.

**Contract**: Nowe pole env `SUPABASE_SERVICE_ROLE_KEY`, `context: server`, `access: secret`, `optional: true` (jak `SUPABASE_KEY`, żeby build CI nie wymagał sekretu). `.env.example` dostaje pusty placeholder. `createAdminClient()` zwraca klient Supabase z tym kluczem albo `null`, gdy sekretu brakuje. Bez `cookies`. Brak sekretu nie powoduje cichego zejścia na klucz anon.

#### 2. Walidacja i endpoint

**File**: `package.json`, `src/pages/api/family/children.ts`

**Intent**: Przyjąć imię, login i hasło od rodzica i utworzyć użytkownika dziecka w jego rodzinie.

**Contract**: Dodać zależność `zod`. `export const prerender = false` i `POST`. Body `formData`: `display_name`, `login`, `password`. Reguły: imię po trimie 1–80 znaków; login po trimie i zejściu na małe litery pasuje do `^[a-z0-9]{3,32}$`; hasło ma co najmniej 6 znaków. Wywołujący musi mieć profil `role=parent`. Gdy w rodzinie jest już co najmniej jeden profil `role=child`, odpowiedź to przekierowanie z błędem, bez zapisu. W przeciwnym razie:

```ts
auth.admin.createUser({
  email: `${login}@family.local`,
  password,
  email_confirm: true,
  user_metadata: { role: "child" },
})
```

Potem insert `profiles` (`id` nowego użytkownika, `family_id` rodzica, `role: "child"`, `display_name`) na kliencie sesji rodzica. Sukces: przekierowanie na `/dashboard?created={login}`. Błąd, w tym zajęty email i nieudany insert po `deleteUser`: przekierowanie na `/dashboard?error=`. Brak klucza service role też jest błędem, nie `signUp`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/lib/supabase-admin.ts src/pages/api/family/children.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Sesja rodzica tworzy jedno dziecko i rodzic zostaje zalogowany; w `profiles` jest jeden wiersz `child` w tej rodzinie, a `auth.users` ma `role=child`
- Drugie wywołanie jest odrzucone i nie pojawia się kolejny profil ani druga rodzina

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne, zanim zacznie się faza 2.

---

## Phase 2: Obowiązek na dziś

### Overview

Rodzic dopisuje obowiązek istniejącemu dziecku. Data jest dniem w Polsce. Pustego tytułu nie ma. Tego samego dnia może być kilka obowiązków.

### Changes Required:

#### 1. Dzień w Polsce

**File**: `src/lib/today.ts`

**Intent**: Jedno miejsce, które mówi, jaki jest dziś dzień dla rodziny, niezależnie od UTC bazy.

**Contract**: `warsawToday(): string` zwraca `YYYY-MM-DD` dla `Europe/Warsaw` w chwili wywołania. Format z `en-CA` daje ten układ bez składania stringa ręcznie.

#### 2. Endpoint obowiązku

**File**: `src/pages/api/family/chores.ts`

**Intent**: Zapis tytułu na dziś dla dziecka z rodziny rodzica.

**Contract**: `export const prerender = false` i `POST`. `formData`: `title`, `child_profile_id`. Tytuł po trimie 1–120 znaków. Wywołujący ma profil `role=parent`. `child_profile_id` jest profilem `role=child` w tej samej `family_id`. Insert na kliencie sesji rodzica: `family_id`, `child_profile_id`, `title`, `chore_date: warsawToday()`. Nie wysyłać `child_checked_at` ani `parent_confirmed_at`. Sukces i błąd: przekierowanie na `/dashboard` z `?added=1` albo `?error=`. Dziecko i obcy `child_profile_id` dostają błąd, bez wiersza.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/lib/today.ts src/pages/api/family/chores.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Dwa obowiązki tego samego dziecka z tym samym tytułem zapisują się z datą dnia w Polsce; pusty tytuł nie tworzy wiersza
- Sesja dziecka nie tworzy obowiązku

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne, zanim zacznie się faza 3.

---

## Phase 3: Ekran rodzica

### Overview

`/dashboard` prowadzi rodzica przez oba stany: brak dziecka albo dziecko już jest. Email do logowania widać przy dziecku, nie tylko w chwili zapisu.

### Changes Required:

#### 1. Ekran

**File**: `src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`

**Intent**: Zastąpić powitanie na dashboardzie ścieżką rodzica, tym samym szkłem i wyspą formularza co auth.

**Contract**: Strona ładuje profil przez `getCurrentProfile`. Brak profilu albo `role !== "parent"`: krótki komunikat, że ekran jest dla rodzica, plus istniejące wylogowanie; bez formularzy i bez listy obowiązków. Rodzic bez dziecka: formularz imię / login / hasło, `POST` na `/api/family/children`. Rodzic z dzieckiem: imię, email z `createAdminClient().auth.admin.getUserById(child.id)`, formularz tytułu `POST` na `/api/family/chores` z `child_profile_id`, oraz zdanie, że drugie dziecko wejdzie w następnym kawałku. Formularza drugiego dziecka nie ma. Błędy z `?error=` jak w `SignInForm`. Po `?created=` email i tak jest na stronie przy dziecku. Wylogowanie zostaje `POST /api/auth/signout`. Klasy przez `cn()`.

#### 2. Wejście po logowaniu

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Po haśle rodzic ma od razu trafić na ten ekran.

**Contract**: Udane logowanie przekierowuje na `/dashboard` zamiast na `/`. Ścieżki błędu bez zmian.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx src/pages/api/auth/signin.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- W wąskim oknie przeglądarki rodzic loguje się, zakłada dziecko, widzi `{login}@family.local`, dodaje dwa obowiązki i wylogowuje się
- Kolejne logowanie dodaje trzeci obowiązek bez nowego konta; na ekranie nie da się założyć drugiego dziecka

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne. To ostatnia faza.

---

## Testing Strategy

### Unit Tests:

- Brak runnera w repozytorium. Reguły loginu, hasła, tytułu i daty sprawdzają endpointy przez walidację `zod` oraz ręczne kroki poniżej.

### Integration Tests:

- `npm run smoke` zostaje testem auth i nie pokrywa rodziny. Dowód tej zmiany to kryteria ręczne faz 1–3 na lokalnym Supabase.

### Manual Testing Steps:

1. W `.env` albo `.dev.vars` wstaw `SUPABASE_SERVICE_ROLE_KEY` z `npx supabase status`. Nie commituj wartości.
2. Zaloguj rodzica, załóż dziecko loginem `zosia` i hasłem o długości co najmniej 6. Zostajesz rodzicem. Widać `zosia@family.local`. W bazie jest jeden profil `child` i brak drugiej rodziny.
3. Dodaj dwa razy „umyj zęby”. Oba wiersze mają `chore_date` równe dniu w Polsce.
4. Wyloguj się, zaloguj, dodaj trzeci obowiązek. Formularza nowego dziecka nie ma.
5. Powtórz create z drugim loginem (ręczny `POST`, jeśli UI go nie pokazuje) i sprawdź odrzucenie.

## Performance Considerations

Jedno gospodarstwo i kilka wierszy na dzień. Bez cache i bez paginacji. `getUserById` pada raz na wejście rodzica, gdy dziecko już jest.

## Migration Notes

Bez nowej migracji SQL. Istniejący rodzic z F-01 zostaje; dziecko pojawia się dopiero z tego ekranu. Jedyna zmiana operacyjna to opcjonalny sekret service role lokalnie. Build CI nie dostaje tego sekretu, bo pole env jest opcjonalne.

## References

- PRD: `context/foundation/prd.md` — FR-001, FR-002, FR-005, FR-006, US-01
- Roadmapa: `context/foundation/roadmap.md` — S-01
- Fundament: `context/archive/2026-10-01-family-data-and-roles/plan-brief.md`
- Schemat: `supabase/migrations/20261001180000_family_data_and_roles.sql`
- Sesja: `src/lib/supabase.ts`, `src/pages/api/auth/signin.ts`
- Hasło: `src/components/auth/SignUpForm.tsx`
- Profil: `src/lib/profile.ts`, `src/types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Konto dziecka

#### Automated

- [x] 1.1 `npx eslint src/lib/supabase-admin.ts src/pages/api/family/children.ts` przechodzi
- [x] 1.2 `npx astro check` przechodzi

#### Manual

- [x] 1.3 Sesja rodzica tworzy jedno dziecko i rodzic zostaje zalogowany; w `profiles` jest jeden wiersz `child` w tej rodzinie, a `auth.users` ma `role=child`
- [x] 1.4 Drugie wywołanie jest odrzucone i nie pojawia się kolejny profil ani druga rodzina

### Phase 2: Obowiązek na dziś

#### Automated

- [ ] 2.1 `npx eslint src/lib/today.ts src/pages/api/family/chores.ts` przechodzi
- [ ] 2.2 `npx astro check` przechodzi

#### Manual

- [ ] 2.3 Dwa obowiązki tego samego dziecka z tym samym tytułem zapisują się z datą dnia w Polsce; pusty tytuł nie tworzy wiersza
- [ ] 2.4 Sesja dziecka nie tworzy obowiązku

### Phase 3: Ekran rodzica

#### Automated

- [ ] 3.1 `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx src/pages/api/auth/signin.ts` przechodzi
- [ ] 3.2 `npx astro check` przechodzi

#### Manual

- [ ] 3.3 W wąskim oknie przeglądarki rodzic loguje się, zakłada dziecko, widzi `{login}@family.local`, dodaje dwa obowiązki i wylogowuje się
- [ ] 3.4 Kolejne logowanie dodaje trzeci obowiązek bez nowego konta; na ekranie nie da się założyć drugiego dziecka
