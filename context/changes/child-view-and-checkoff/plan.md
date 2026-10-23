# Dziecko widzi listę i odhacza — Implementation Plan

## Overview

Zalogowane dziecko widzi własne obowiązki na dziś, odhacza pozycję i może cofnąć odhaczenie, dopóki rodzic jej nie potwierdzi. Lista idzie od najstarszego. Wylogowanie zostaje na tym samym ekranie.

## Current State Analysis

S-01 jest zrobione. Rodzic zakłada jedno dziecko i dopisuje obowiązki na dziś przez `POST /api/family/chores`. Data to `warsawToday()` (`Europe/Warsaw`). Logowanie i wylogowanie kończą się na `/dashboard` (`src/pages/api/auth/signin.ts`, `src/pages/api/auth/signout.ts`). Jedyna chroniona trasa to `/dashboard` (`src/middleware.ts`).

Sesja dziecka dostaje na tym ekranie komunikat, że jest on dla rodzica (`src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`). Lista obowiązków nigdzie się nie rysuje. Rodzic widzi imię dziecka, email i formularz nowego tytułu.

Tabela `today_chores` ma `child_checked_at` i `parent_confirmed_at`. Dziecko może w polityce RLS aktualizować tylko własne wiersze i tylko gdy `parent_confirmed_at` jest puste (`supabase/migrations/20261001180000_family_data_and_roles.sql`, polityka `today_chores_update_child`). Trigger `today_chores_child_column_lock` odrzuca zmianę każdej kolumny poza `child_checked_at` i sam ustawia `updated_at`. `isDone()` w `src/types.ts` jest prawdziwe dopiero po odhaczeniu i potwierdzeniu. Potwierdzenia w aplikacji jeszcze nie ma.

## Desired End State

Dziecko loguje się i na `/dashboard` widzi własne obowiązki z `chore_date` równym dniowi w Polsce. Nieodhaczane są w grupie To do, odhaczone w Checked off. W każdej grupie starszy wiersz jest wyżej. „Check off” ustawia `child_checked_at`. „Undo” czyści je, dopóki `parent_confirmed_at` jest puste. Po potwierdzeniu cofnięcie jest odrzucone. Pusta lista mówi, że na dziś nic nie ma. Rodzic po swoim logowaniu nadal widzi formularz dodawania obowiązku. Dziecko się wylogowuje.

### Key Discoveries:

- Odhaczenie nie potrzebuje migracji. RLS i trigger już puszczają zmianę samego `child_checked_at` w obie strony, zanim rodzic potwierdzi.
- `src/pages/api/family/chores.ts` jest plikiem. Obok niego nie może powstać katalog `chores/`, bo Astro zderzy te trasy. Nowy endpoint jest rodzeństwem: `src/pages/api/family/chore-check.ts`.
- Ekran idzie wzorcem S-01: strona Astro czyta dane, wyspa React wysyła `POST` `formData`, błąd wraca w `?error=`.
- `isDone()` nie dzieli listy dziecka. „Już odhaczone” znaczy `child_checked_at` ustawione, także zanim rodzic potwierdzi.

## What We're NOT Doing

- Potwierdzenie odhaczenia przez rodzica (S-03) i lista obowiązków na ekranie rodzica.
- Usuwanie niepotwierdzonego obowiązku (S-04).
- Drugie dziecko i izolacja list rodzeństwa jako osobny ekran (S-05). Polityka i tak ogranicza dziecko do `child_profile_id = auth.uid()`.
- Odhaczanie wierszy z innego dnia, edycja tytułu, usuwanie konta dziecka.
- Nowa migracja SQL i tłumaczenie istniejących napisów. Nowe napisy są po angielsku, jak dashboard i formularze auth.

## Implementation Approach

`/dashboard` rozgałęzia się po `profile.role`. Dla dziecka strona ładuje dzisiejsze wiersze sesją użytkownika, więc RLS zostaje strażnikiem. Wyspa pokazuje dwie grupy i na każdym wierszu formularz `POST` na `/api/family/chore-check`. Endpoint przyjmuje `chore_id` i `intent`, sprawdza profil dziecka, a potem albo ustawia `child_checked_at` na `now()`, albo czyści je. Update wysyła tylko tę kolumnę. Rodzic, cudzy wiersz, inny dzień i cofnięcie po potwierdzeniu kończą się przekierowaniem z błędem, bez zapisu.

## Critical Implementation Details

Update dziecka musi zawierać wyłącznie `child_checked_at`. Trigger rzuca `42501`, gdy zmieni się tytuł, data, właściciel albo `parent_confirmed_at`, i sam nadpisuje `updated_at`. Przy wierszu już potwierdzonym „Check off” jest pustym sukcesem bez update, bo ponowny zapis naruszyłby `with check` (`parent_confirmed_at is null`). „Undo” na takim wierszu jest błędem. Ograniczenie `today_chores_confirmed_implies_checked` i tak nie pozwala wyczyścić `child_checked_at`, gdy potwierdzenie jest ustawione.

## Phase 1: Odhaczenie

### Overview

Dziecko ustawia albo czyści `child_checked_at` na własnym obowiązku z dziś. Rodzic i obcy wiersz nie zmieniają bazy.

### Changes Required:

#### 1. Endpoint odhaczenia

**File**: `src/pages/api/family/chore-check.ts`

**Intent**: Przyjąć od dziecka decyzję odhaczenia albo cofnięcia i zapisać ją na jednym dzisiejszym wierszu.

**Contract**: `export const prerender = false` i `POST`. `formData`: `chore_id` (uuid), `intent` równe `check` albo `undo`. Wywołujący musi mieć profil `role=child`. Brak sesji albo inna rola: przekierowanie na `/dashboard?error=` z komunikatem, że odhaczyć może tylko dziecko. Wiersz jest szukany na kliencie sesji: `id = chore_id`, `child_profile_id` równe id profilu, `chore_date = warsawToday()`. Brak wiersza: błąd, że tego obowiązku nie ma na dzisiejszej liście. Gdy `intent=check` i `child_checked_at` już stoi, także przy ustawionym `parent_confirmed_at`: przekierowanie na `/dashboard?checked=1` bez update. Gdy `intent=undo` i `parent_confirmed_at` stoi: błąd, że tego obowiązku nie da się już zmienić, bez update. Gdy `intent=undo` i `child_checked_at` już jest puste: przekierowanie na `/dashboard?undone=1` bez update. W pozostałych przypadkach update tylko `{ child_checked_at: now }` albo `{ child_checked_at: null }`. Sukces: `?checked=1` albo `?undone=1`. Błąd zapisu, w tym wyjątek triggera: przekierowanie z błędem, że nie udało się zapisać odhaczenia.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/api/family/chore-check.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Sesja dziecka odhacza własny obowiązek z dziś i cofa go; `child_checked_at` wraca do null
- Sesja rodzica oraz obowiązek spoza dziś albo cudzy nie zmieniają wiersza

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne, zanim zacznie się faza 2.

---

## Phase 2: Ekran dziecka

### Overview

`/dashboard` pokazuje dziecku listę na dziś, odhaczenie i cofnięcie. Ekran rodzica zostaje.

### Changes Required:

#### 1. Lista na dashboardzie

**File**: `src/pages/dashboard.astro`, `src/components/family/ChildToday.tsx`

**Intent**: Dać dziecku własny widok na tym samym chronionym ekranie, na którym już ląduje po haśle.

**Contract**: W `ParentToday.tsx` prywatna funkcja `ChildToday` zostaje formularzem rodzica i nie dostaje listy ani przycisków odhaczenia. Ekran zalogowanego dziecka jest tylko w nowym pliku. Przy `profile.role === "child"` strona czyta `today_chores` sesją dziecka: `id`, `title`, `child_checked_at`, `parent_confirmed_at`, `created_at`, filtr `child_profile_id` równe id profilu i `chore_date = warsawToday()`, kolejność `created_at` rosnąco, potem `id` rosnąco. Błąd odczytu: komunikat, że listy nie udało się wczytać, plus `?error=`, bez formularzy odhaczenia. Zero wierszy: jedno zdanie „Nothing to do today.” Inaczej dwie grupy, w tej kolejności: To do (`child_checked_at` puste), potem Checked off (pozostałe). Pusta grupa się nie renderuje. W grupie kolejność zostaje ta z zapytania. Każdy wiersz To do ma formularz `POST /api/family/chore-check` z `chore_id` i `intent=check` oraz przyciskiem „Check off”. Wiersz Checked off z pustym `parent_confirmed_at` ma taki sam formularz z `intent=undo` i przyciskiem „Undo”. Wiersz z ustawionym `parent_confirmed_at` zostaje w Checked off bez przycisku. `?checked=1` i `?undone=1` dają krótki komunikat sukcesu, jak `?added=1` u rodzica. `?error=` idzie przez istniejący `ServerError`. Klasy przez `cn()`. Gałąź rodzica i zdanie o drugim dziecku bez zmian. Formularz `POST /api/auth/signout` zostaje na stronie dla obu ról. Klienta admin nie wołać przy sesji dziecka.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/dashboard.astro src/components/family/ChildToday.tsx` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- W wąskim oknie dziecko loguje się, widzi dwa „Umyj zęby” starszy wyżej, odhacza górny, widzi go w Checked off, cofa i wylogowuje się
- Rodzic po logowaniu nadal widzi formularz dodawania obowiązku, bez listy dziecka

**Implementation Note**: Po zielonych sprawdzeniach automatycznych zatrzymaj się na potwierdzenie ręczne. To ostatnia faza.

---

## Testing Strategy

### Unit Tests:

- Brak runnera w repozytorium. Uuid, `intent` i rola sprawdzają się przez `zod` oraz ręczne kroki poniżej.

### Integration Tests:

- `npm run smoke` zostaje testem auth i nie pokrywa listy dziecka. Dowód tej zmiany to kryteria ręczne faz 1–2 na lokalnym Supabase.

### Manual Testing Steps:

1. Miej konto rodzica, jedno dziecko i dwa dzisiejsze obowiązki o tytule „Umyj zęby”, dodane jeden po drugim.
2. Zaloguj dziecko. Na wąskim oknie starszy „Umyj zęby” jest wyżej, oba w To do. Odhacz górny. Ląduje w Checked off, dolny zostaje w To do. Cofnij. Oba wracają do To do, w tej samej kolejności.
3. Wyloguj dziecko. Zaloguj rodzica. Widać formularz nowego obowiązku i nie widać listy ani przycisków Check off / Undo.
4. Dla fazy 1: `POST` sesją rodzica oraz `POST` z `chore_id` z wczoraj albo z cudzego id nie zmienia `child_checked_at`.

## Performance Considerations

Jedno dziecko i kilka wierszy na dzień. Bez cache i bez paginacji. Odczyt listy pada raz, przy wejściu na `/dashboard`.

## Migration Notes

Bez nowej migracji SQL. Odhaczenia zrobione ręcznie w bazie, z pustym `parent_confirmed_at`, pokażą się w Checked off i dadzą się cofnąć. Wiersz z ustawionym `parent_confirmed_at` pokaże się w Checked off bez Undo.

## References

- PRD: `context/foundation/prd.md` — US-01, FR-003, FR-004, FR-008, FR-009, FR-010
- Roadmapa: `context/foundation/roadmap.md` — S-02
- Poprzedni kawałek: `context/changes/parent-add-child-and-chore/plan.md`
- Schemat i RLS: `supabase/migrations/20261001180000_family_data_and_roles.sql`
- Trigger kolumn: `supabase/migrations/20261001202800_today_chores_child_column_lock.sql`
- Dzień: `src/lib/today.ts`
- Profil: `src/lib/profile.ts`
- Typy: `src/types.ts`
- Ekran rodzica: `src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Odhaczenie

#### Automated

- [x] 1.1 `npx eslint src/pages/api/family/chore-check.ts` przechodzi — 961a925
- [x] 1.2 `npx astro check` przechodzi — 961a925

#### Manual

- [x] 1.3 Sesja dziecka odhacza własny obowiązek z dziś i cofa go; `child_checked_at` wraca do null — 961a925
- [x] 1.4 Sesja rodzica oraz obowiązek spoza dziś albo cudzy nie zmieniają wiersza — 961a925

### Phase 2: Ekran dziecka

#### Automated

- [x] 2.1 `npx eslint src/pages/dashboard.astro src/components/family/ChildToday.tsx` przechodzi — a59c19f
- [x] 2.2 `npx astro check` przechodzi — a59c19f

#### Manual

- [x] 2.3 W wąskim oknie dziecko loguje się, widzi dwa „Umyj zęby” starszy wyżej, odhacza górny, widzi go w Checked off, cofa i wylogowuje się — a59c19f
- [x] 2.4 Rodzic po logowaniu nadal widzi formularz dodawania obowiązku, bez listy dziecka — a59c19f
