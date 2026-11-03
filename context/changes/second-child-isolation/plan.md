# Drugie dziecko i osobne listy — Implementation Plan

## Overview

Zalogowany rodzic dodaje drugie dziecko do tej samej rodziny i na `/dashboard` widzi obie listy na dziś, jedną pod drugą. Trzecie dziecko jest odrzucane. Każde dziecko dalej widzi i odhacza tylko swoje obowiązki.

## Current State Analysis

S-01 trzyma limit jednego dziecka w aplikacji. `POST /api/family/children` bierze co najwyżej jeden profil `child` (`.limit(1)`) i przy `length > 0` wraca na `/dashboard?error=` z tekstem „A second child arrives in the next slice” (`src/pages/api/family/children.ts` linie 54–66). Baza tego limitu nie ma: `profiles_insert_parent_for_family` sprawdza rodzica, tę samą rodzinę i `role = child` (`supabase/migrations/20261001180000_family_data_and_roles.sql` linie 147–156).

Dashboard rodzica też bierze jedno, najstarsze dziecko (`src/pages/dashboard.astro` linie 60–66 i 96–101) i tylko jego obowiązki na dziś (linie 103–109). Wyspa dostaje jednego `child` i jedną tablicę `chores` (`src/components/family/ParentToday.tsx` linie 22–31 i 292–303). Pod imieniem jest na stałe zdanie „A second child arrives in the next slice.” (linia 250). Formularz obowiązku wysyła `child_profile_id` tego jedynego dziecka (linie 255–256).

Endpointy obowiązku, potwierdzenia i usunięcia nie zakładają „pierwszego” dziecka: dodanie sprawdza, że profil jest dzieckiem tej rodziny, a potwierdzenie i usunięcie idą po `chore_id` w rodzinie. Dziecko ładuje wiersze z `child_profile_id = profile.id` (dashboard, linie 130–138). RLS powtarza to samo: rodzic widzi wiersze rodziny, dziecko tylko `child_profile_id = auth.uid()` (migracja, linie 159–169 i 198–210).

## Desired End State

Rodzic bez dziecka nadal widzi sam formularz imię / login / hasło. Przy jednym dziecku widzi jego listę i ten sam formularz drugiego dziecka. Przy dwojgu widzi dwie listy, od najstarszego konta, bez formularza i bez zdania o następnym kawałku. Trzeci `POST` nie tworzy profilu ani drugiej rodziny. Na każdej liście zostają grupy To do, Waiting for confirmation i Done, dodawanie obowiązku, potwierdzenie i usunięcie niepotwierdzonego. Dziecko A nie widzi listy dziecka B.

### Key Discoveries:

- Limit „jedno dziecko” to `length > 0` na wyniku `.limit(1)`. Samo podniesienie progu, bez szerszego odczytu, dalej nie zobaczy drugiego wiersza.
- Dashboard i wyspa mają jeden obiekt dziecka. Zapytanie obowiązków rodzica nie zwraca `child_profile_id`, bo adresat jest jeden.
- Izolacja dziecka jest już w zapytaniu i w RLS. Ten kawałek nie dokłada polityki ani migracji.
- Miękki limit „rodzic i do dwojga dzieci” jest opisany w `src/types.ts` linia 6 i w PRD: pierwsza wersja to rodzic, syn i córka.

## What We're NOT Doing

- Trzecie dziecko, dowolna liczba członków i twarde ograniczenie w SQL.
- Usuwanie konta dziecka, edycja tytułu, przeniesienie obowiązku na rodzeństwo.
- Zmiana reguł odhaczania, potwierdzania i usuwania oraz nowa trasa poza `/dashboard`.
- Tłumaczenie istniejących napisów. Nowe zdanie błędu jest po angielsku, jak reszta dashboardu.
- Powiadomienia, listy dzień powszedni / święto, osobne gospodarstwa.

## Implementation Approach

Zostaje warstwa aplikacji z S-01. Endpoint dzieci liczy profile `child` w rodzinie tak, żeby widzieć dwa, i przy dwóch albo więcej kończy bez zapisu. Tworzenie drugiego konta idzie tą samą ścieżką co pierwsze: `createUser` z `{login}@family.local` i `role=child`, potem insert profilu sesją rodzica. Dashboard czyta co najwyżej dwa profile, od najstarszego `created_at`, dokleja email przez admin `getUserById` i dzieli dzisiejsze obowiązki po `child_profile_id`. Wyspa powtarza dzisiejszy panel dziecka raz na dziecko i dokłada istniejący formularz dziecka, dopóki jest ich mniej niż dwa.

## Critical Implementation Details

Sprawdzenie w `children.ts` i odczyt na dashboardzie mają osobne `.limit(1)`. Podniesienie warunku do „dwoje” bez zmiany limitu zapytania nadal zwraca co najwyżej jeden wiersz: drugie dziecko dalej wpadnie w dzisiejszy błąd, a trzecie nie zostanie odróżnione. Zapytanie obowiązków rodzica musi nieść `child_profile_id`, inaczej dwóch adresatów nie da się rozdzielić. Błąd odczytu listy zostaje zdaniem „Could not load today's list.”, a nie pustą listą „Nothing on today's list.”

## Phase 1: Drugie konto

### Overview

Rodzic, będąc zalogowany, tworzy drugie konto dziecka. Trzecie jest odrzucane. Sesja rodzica zostaje.

### Changes Required:

#### 1. Limit dwojga w endpoincie

**File**: `src/pages/api/family/children.ts`

**Intent**: Puścić drugie dziecko tą samą ścieżką co pierwsze i zatrzymać trzecie, zanim powstanie użytkownik auth.

**Contract**: `POST` i `prerender = false` bez zmian. Body, `zod` i wymóg `role=parent` bez zmian. Odczyt profili `child` w `family_id` rodzica musi móc zobaczyć dwa wiersze. Zero albo jeden: dalszy ciąg jak dziś (`createUser`, insert profilu sesją rodzica, redirect `/dashboard?created=`). Dwa albo więcej: redirect `/dashboard?error=` z tekstem „This family already has two children.”, bez `createUser` i bez insertu. Zajęty login, brak klucza service role i nieudany insert po `deleteUser` zostają obecnymi błędami.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/api/family/children.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Sesja rodzica tworzy drugie dziecko i rodzic zostaje zalogowany; w `profiles` są dwa wiersze `child` w tej rodzinie, a nowy `auth.users` ma `role=child`
- Trzecie wywołanie jest odrzucone i nie pojawia się kolejny profil ani druga rodzina

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne, zanim zacznie się faza 2.

---

## Phase 2: Dwie listy

### Overview

`/dashboard` pokazuje zero, jedno albo dwoje dzieci na jednym ekranie telefonu. Formularz drugiego dziecka jest obok listy, dopóki w rodzinie jest mniej niż dwoje.

### Changes Required:

#### 1. Odczyt dwojga dzieci i ich list

**File**: `src/pages/dashboard.astro`

**Intent**: Nakarmić wyspę co najwyżej dwoma dziećmi i obowiązkami każdego z nich na dziś w Polsce.

**Contract**: Dla rodzica odczyt profili `child` tej rodziny, `created_at` rosnąco, co najwyżej dwa wiersze. Zero dzieci: widok samego formularza, jak dziś. Jeden albo dwa: dla każdego email z `createAdminClient().auth.admin.getUserById`; brak emaila zostawia dziecko na ekranie z dzisiejszym „The login email could not be loaded.” Obowiązki na `warsawToday()` niosą `child_profile_id` i trafiają do swojego dziecka. Wiersz dziecka spoza tych dwóch profili nie wchodzi na ekran. Błąd odczytu listy ustawia istniejący stan niepowodzenia, nie pustą listę. Ścieżka `role=child` bez zmian. Wylogowanie zostaje.

#### 2. Dwie sekcje i formularz drugiego dziecka

**File**: `src/components/family/ParentToday.tsx`

**Intent**: Pokazać listy jedna pod drugą i pozwolić dodać drugie dziecko, zanim rodzina je ma.

**Contract**: Wyspa przyjmuje listę co najwyżej dwóch dzieci, każde ze swoimi `chores`. Sekcja dziecka zostaje dzisiejszym panelem: imię, email, To do / Waiting for confirmation / Done, potwierdzenie, usunięcie i formularz tytułu z ukrytym `child_profile_id` tego dziecka. Przy mniej niż dwóch dzieciach pod spodem jest istniejący `AddChildForm` (`POST /api/family/children`). Przy dwóch formularza nie ma. Zdanie „A second child arrives in the next slice.” znika. `view` „unavailable” i „child-unavailable” zostają, z tymi samymi zdaniami co dziś. Klasy przez `cn()`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- W wąskim oknie przy jednym dziecku widać jego listę i formularz drugiego dziecka; po dodaniu drugiego widać obie listy z emailami, a formularza i zdania „A second child arrives in the next slice.” nie ma
- Dziecko A nie widzi obowiązku dziecka B; odhaczenie A nie zmienia listy B; rodzic potwierdza i usuwa niepotwierdzony obowiązek na liście każdego dziecka

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne. To ostatnia faza.

---

## Testing Strategy

### Unit Tests:

- Brak runnera w repozytorium. Limit dwojga i podział list sprawdzają endpoint oraz ręczne kroki poniżej.

### Integration Tests:

- `npm run smoke` zostaje testem auth i nie pokrywa rodziny. Dowód tej zmiany to kryteria ręczne faz 1–2 na lokalnym Supabase.

### Manual Testing Steps:

1. Zaloguj rodzica, który ma już jedno dziecko. `POST /api/family/children` z nowym loginem i hasłem o długości co najmniej 6. Zostajesz rodzicem. W `profiles` są dwa wiersze `child` tej rodziny, a nowy użytkownik ma `role=child`.
2. Powtórz create z trzecim loginem. Odpowiedź to „This family already has two children.” Trzeciego profilu i drugiej rodziny nie ma.
3. W wąskim oknie, na rodzinie z jednym dzieckiem, widać listę i formularz drugiego dziecka. Po zapisie widać obie listy i emaile `{login}@family.local`. Formularza dziecka i zdania o następnym kawałku nie ma.
4. Dodaj obowiązek każdemu dziecku. Zaloguj dziecko A: widać tylko jego wiersz. Odhacz go. Lista dziecka B się nie zmienia. Rodzic potwierdza wiersz A i usuwa niepotwierdzony wiersz B.

## Performance Considerations

Jedno gospodarstwo i dwie listy na dzień. Bez cache i bez paginacji. `getUserById` pada raz na dziecko przy wejściu rodzica, czyli co najwyżej dwa razy.

## Migration Notes

Bez nowej migracji SQL. Rodzina z jednym dzieckiem zostaje. Po fazie 2 rodzic widzi jego listę i formularz drugiego dziecka. Dzieci wstawione wcześniej skryptem RLS nie dostają konta z tego ekranu, jeśli jest ich już dwoje: widać dwa najstarsze profile.

## References

- PRD: `context/foundation/prd.md` — FR-005, Success Criteria Secondary, Access Control
- Roadmapa: `context/foundation/roadmap.md` — S-05
- Poprzedni limit: `context/changes/parent-add-child-and-chore/plan.md`
- Schemat: `supabase/migrations/20261001180000_family_data_and_roles.sql`
- Endpoint: `src/pages/api/family/children.ts`
- Ekran: `src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`
- Limit opisany w typach: `src/types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Drugie konto

#### Automated

- [x] 1.1 `npx eslint src/pages/api/family/children.ts` przechodzi — 6c7df36
- [x] 1.2 `npx astro check` przechodzi — 6c7df36

#### Manual

- [x] 1.3 Sesja rodzica tworzy drugie dziecko i rodzic zostaje zalogowany; w `profiles` są dwa wiersze `child` w tej rodzinie, a nowy `auth.users` ma `role=child` — 6c7df36
- [x] 1.4 Trzecie wywołanie jest odrzucone i nie pojawia się kolejny profil ani druga rodzina — 6c7df36

### Phase 2: Dwie listy

#### Automated

- [x] 2.1 `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- [x] 2.2 `npx astro check` przechodzi

#### Manual

- [x] 2.3 W wąskim oknie przy jednym dziecku widać jego listę i formularz drugiego dziecka; po dodaniu drugiego widać obie listy z emailami, a formularza i zdania „A second child arrives in the next slice.” nie ma
- [x] 2.4 Dziecko A nie widzi obowiązku dziecka B; odhaczenie A nie zmienia listy B; rodzic potwierdza i usuwa niepotwierdzony obowiązek na liście każdego dziecka
