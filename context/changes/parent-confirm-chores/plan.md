# Rodzic potwierdza odhaczenia — Implementation Plan

## Overview

Rodzic na `/dashboard` widzi dzisiejszą listę pierwszego dziecka i potwierdza odhaczenie. Dopiero wtedy pozycja jest zrobiona. Potwierdzenia nie cofa.

## Current State Analysis

S-02 jest zrobione. Dziecko na `/dashboard` widzi własne obowiązki z dziś i woła `POST /api/family/chore-check`. „Check off” ustawia `child_checked_at`. „Undo” czyści je tylko, gdy `parent_confirmed_at` jest puste. Po potwierdzeniu cofnięcie jest odrzucone, a przycisk Undo znika.

Ekran rodzica nie ładuje `today_chores`. Bierze pierwsze dziecko (`order created_at`, `limit 1`) i pokazuje imię, email, formularz nowego tytułu oraz napis, że drugie dziecko przyjdzie w kolejnym kawałku (`src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`). Prywatna funkcja `ChildToday` w tym pliku to formularz rodzica, nie lista zalogowanego dziecka.

`parent_confirmed_at` nie jest nigdzie zapisywane w `src/`. `isDone()` w `src/types.ts` jest prawdziwe dopiero, gdy oba znaczniki są ustawione. Polityka `today_chores_update_parent` pozwala rodzicowi zaktualizować wiersz swojej rodziny. Ograniczenie `today_chores_confirmed_implies_checked` odrzuca potwierdzenie bez `child_checked_at`. Trigger `today_chores_child_column_lock` dotyczy tylko roli dziecka i nie podbija `updated_at` przy zapisie rodzica.

## Desired End State

Rodzic loguje się i na tym samym `/dashboard` nadal dodaje obowiązek pierwszemu dziecku. Pod formularzem widzi dzisiejszą listę tego dziecka, starszy wiersz wyżej. Nieodhaczony obowiązek jest w To do, bez przycisku. Odhaczony i niepotwierdzony jest w Waiting for confirmation, z przyciskiem Confirm. Po Confirm wiersz jest w Done, `parent_confirmed_at` jest ustawione, a przycisku nie ma. Drugie naciśnięcie nie zmienia znacznika. Dziecko nie potwierdza i po potwierdzeniu nadal nie cofa swojego odhaczenia.

### Key Discoveries:

- Potwierdzenie nie potrzebuje migracji. RLS rodzica i constraint już opisują dozwolony zapis (`supabase/migrations/20261001180000_family_data_and_roles.sql`).
- Nowy endpoint jest rodzeństwem `chore-check.ts`: `src/pages/api/family/chore-confirm.ts`. Katalog `src/pages/api/family/chores/` obok pliku `chores.ts` zderzy trasy Astro.
- Lista rodzica używa tego samego dnia (`warsawToday()`) i tej samej kolejności co lista dziecka: `created_at` rosnąco, przy remisie `id` rosnąco.
- `isDone()` dzieli grupę Done. Grupa Waiting to odhaczenie bez potwierdzenia. Grupa To do to brak `child_checked_at`.

## What We're NOT Doing

- Cofanie potwierdzenia. Po Confirm pozycja zostaje zrobiona.
- Usuwanie niepotwierdzonego obowiązku (S-04).
- Wybór drugiego dziecka i jego lista (S-05). Ekran dalej pokazuje tylko pierwsze dziecko.
- Zmiana grup na ekranie dziecka. „Checked off” nadal znaczy odhaczenie dziecka, także przed potwierdzeniem.
- Edycja tytułu, zmiana daty, odhaczanie za dziecko i nowa migracja SQL.
- Tłumaczenie istniejących napisów. Nowe napisy są po angielsku.

## Implementation Approach

Faza 1 dodaje `POST /api/family/chore-confirm`. Przyjmuje samo `chore_id`. Sesja musi być rodzicem. Wiersz musi być z dziś i z rodziny tej sesji. Zapis ustawia tylko `parent_confirmed_at` i `updated_at`. Wiersz już potwierdzony kończy się sukcesem bez drugiego zapisu. Brak odhaczenia, cudza rodzina, inny dzień i sesja dziecka kończą się błędem bez zapisu.

Faza 2, na gałęzi rodzica w `/dashboard`, dociąga dzisiejsze wiersze pierwszego dziecka i rysuje trzy grupy w widoku, który już ma formularz dodawania. Przycisk Confirm jest tylko w Waiting for confirmation. Pusta grupa się nie rysuje.

## Critical Implementation Details

Payload update to dokładnie `parent_confirmed_at` i `updated_at`, oba z tym samym znacznikiem ISO. Trigger kolumn dziecka nie rusza się dla rodzica, więc samo `parent_confirmed_at` zostawiłoby stare `updated_at`. Przy wierszu już potwierdzonym nie wolno robić update: drugi zapis nie jest potrzebny, a test ma zobaczyć ten sam znacznik. Nie wolno mylić prywatnej funkcji `ChildToday` w `ParentToday.tsx` z `src/components/family/ChildToday.tsx`.

## Faza 1: Potwierdzenie

### Overview

Rodzic zapisuje potwierdzenie odhaczonego obowiązku z dziś. Dziecko i wiersz bez odhaczenia nie zmieniają bazy.

### Changes Required:

#### 1. Endpoint potwierdzenia

**File**: `src/pages/api/family/chore-confirm.ts`

**Intent**: Rodzic potwierdza jedno odhaczenie. Dziecko nie dostaje tej drogi, a powtórne potwierdzenie nie rusza znacznika.

**Contract**: `POST`, `prerender = false`, zod z samym `chore_id` jako uuid. Brak pola `intent`. Rola inna niż `parent` wraca na `/dashboard?error=Only%20a%20parent%20can%20confirm%20a%20chore`. Odczyt idzie sesją użytkownika, po `id` i `chore_date = warsawToday()`. Brak wiersza, inny dzień albo inna rodzina: `That chore is not on today's list`. `child_checked_at` puste: `That chore has not been checked off`, bez update. `parent_confirmed_at` już ustawione: przekierowanie na `/dashboard?confirmed=1` bez update. Inaczej update tylko `{ parent_confirmed_at, updated_at }` i ten sam filtr, potem `/dashboard?confirmed=1`. Błąd odczytu: `Could not confirm the chore`. Błąd zapisu: `Could not save the confirmation`. Wzorzec przekierowań i formularza jest w `src/pages/api/family/chore-check.ts`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/api/family/chore-confirm.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Sesja rodzica potwierdza odhaczony obowiązek dziecka z dziś; `parent_confirmed_at` się ustawia, a drugie potwierdzenie zostawia ten sam znacznik
- Obowiązek bez odhaczenia, obowiązek spoza dziś albo spoza rodziny oraz sesja dziecka nie ustawiają `parent_confirmed_at`

**Implementation Note**: Po tej fazie i zielonych sprawdzeniach automatycznych zatrzymaj się na ręczne potwierdzenie, zanim zacznie się lista.

---

## Faza 2: Lista rodzica

### Overview

Rodzic widzi trzy stany dzisiejszej listy pierwszego dziecka i potwierdza czekający wiersz z ekranu.

### Changes Required:

#### 1. Odczyt listy na dashboardzie

**File**: `src/pages/dashboard.astro`

**Intent**: Gałąź rodzica, gdy pierwsze dziecko jest już wczytane, dokłada jego obowiązki z dziś. Gałąź dziecka zostaje bez zmian.

**Contract**: Ten sam select co u dziecka: `id`, `title`, `child_checked_at`, `parent_confirmed_at`, `created_at`. Filtr `child_profile_id` tego dziecka i `chore_date = warsawToday()`. Kolejność `created_at` rosnąco, potem `id` rosnąco. Błędny wiersz albo błąd zapytania: flaga nieudanego odczytu, bez formularzy Confirm. Parametr `confirmed=1` idzie tylko do widoku rodzica. Dziecko go nie czyta. Formularz wylogowania zostaje dla obu ról.

#### 2. Trzy grupy i przycisk Confirm

**File**: `src/components/family/ParentToday.tsx`

**Intent**: W widoku pierwszego dziecka, obok formularza dodawania, rodzic widzi listę i potwierdza tylko to, co dziecko już odhaczyło.

**Contract**: Grupy, pusta grupa pominięta: To do (`child_checked_at` puste, bez przycisku), Waiting for confirmation (odhaczone i niepotwierdzone, formularz `POST /api/family/chore-confirm` z samym `chore_id`, przycisk Confirm), Done (oba znaczniki, bez przycisku). Zero wierszy: `Nothing on today's list.` Formularz dodawania, imię, email i zdanie o drugim dziecku zostają. Nieudany odczyt: `Could not load today's list.` jako wyrażenie JS, nie surowy apostrof w JSX. Sukces `confirmed=1`: `Chore confirmed.` Istniejący błąd z `?error=` zostaje. Nie ruszać `src/components/family/ChildToday.tsx`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Rodzic widzi trzy grupy w kolejności starszy wyżej; Confirm przenosi czekający wiersz do Done i pokazuje „Chore confirmed.”
- Po potwierdzeniu dziecko nie cofa odhaczenia, a rodzic nadal ma formularz dodawania i napis o drugim dziecku

**Implementation Note**: Po tej fazie i zielonych sprawdzeniach automatycznych zatrzymaj się na ręczne przejście listy na wąskim oknie.

---

## Testing Strategy

### Unit Tests:

- W repozytorium nie ma runnera testów jednostkowych. Tej zmiany nie pokrywa nowy runner.

### Integration Tests:

- Brak nowego testu integracyjnego. Strażnikiem zapisu zostaje ręczne sprawdzenie na lokalnym Supabase oraz istniejące polityki RLS.

### Manual Testing Steps:

1. Jako dziecko odhacz jeden obowiązek z dziś i zostaw drugi nieodhaczony.
2. Jako rodzic wyślij `POST /api/family/chore-confirm` na odhaczony wiersz. `parent_confirmed_at` jest ustawione. Drugi POST zostawia ten sam znacznik.
3. Ten sam POST na nieodhaczony wiersz, na wiersz z innego dnia i z sesji dziecka nie ustawia `parent_confirmed_at`.
4. Na `/dashboard` rodzica widać To do, Waiting for confirmation i Done. Confirm przenosi wiersz do Done.
5. Dziecko nie ma Undo przy potwierdzonym wierszu. Rodzic nadal dodaje obowiązek.

## Performance Considerations

Jeden dodatkowy odczyt wierszy jednego dziecka z dziś, taki sam jak odczyt na ekranie dziecka. Bez paginacji i bez cache.

## Migration Notes

Migracji nie ma. Istniejące wiersze z pustym `parent_confirmed_at` zostają niepotwierdzone. Potwierdzenie ich nie przepisuje historii.

## References

- Roadmapa: `context/foundation/roadmap.md` (S-03)
- PRD: `context/foundation/prd.md` (US-01, FR-007, FR-011)
- Poprzedni kawałek: `context/archive/2026-10-16-child-view-and-checkoff/plan.md`
- Wzorzec endpointu: `src/pages/api/family/chore-check.ts`
- Ekran rodzica: `src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`
- Reguły bazy: `supabase/migrations/20261001180000_family_data_and_roles.sql`, `supabase/migrations/20261001202800_today_chores_child_column_lock.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Potwierdzenie

#### Automated

- [x] 1.1 `npx eslint src/pages/api/family/chore-confirm.ts` przechodzi — fd5612e
- [x] 1.2 `npx astro check` przechodzi — fd5612e

#### Manual

- [x] 1.3 Sesja rodzica potwierdza odhaczony obowiązek dziecka z dziś; `parent_confirmed_at` się ustawia, a drugie potwierdzenie zostawia ten sam znacznik — fd5612e
- [x] 1.4 Obowiązek bez odhaczenia, obowiązek spoza dziś albo spoza rodziny oraz sesja dziecka nie ustawiają `parent_confirmed_at` — fd5612e

### Phase 2: Lista rodzica

#### Automated

- [x] 2.1 `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- [x] 2.2 `npx astro check` przechodzi

#### Manual

- [x] 2.3 Rodzic widzi trzy grupy w kolejności starszy wyżej; Confirm przenosi czekający wiersz do Done i pokazuje „Chore confirmed.”
- [x] 2.4 Po potwierdzeniu dziecko nie cofa odhaczenia, a rodzic nadal ma formularz dodawania i napis o drugim dziecku
