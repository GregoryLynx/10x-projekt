# Rodzic usuwa niepotwierdzony obowiązek — Implementation Plan

## Overview

Rodzic na `/dashboard` usuwa niepotwierdzony obowiązek pierwszego dziecka z dziś. Po usunięciu pozycja znika u rodzica i dziecka. Potwierdzonych nie usuwa.

## Current State Analysis

S-03 jest zrobione. Rodzic widzi trzy grupy i potwierdza przez `POST /api/family/chore-confirm`. Dziecko odhacza przez `chore-check`. Polityka `today_chores_delete_parent_unconfirmed` pozwala rodzicowi usunąć wiersz swojej rodziny, gdy `parent_confirmed_at` jest puste (`supabase/migrations/20261001180000_family_data_and_roles.sql`). W `src/` nie ma `.delete()` na `today_chores` ani przycisku Remove.

## Desired End State

Rodzic w To do i Waiting for confirmation ma przycisk Remove. Jedno kliknięcie wysyła `chore_id`, wiersz znika, ekran pokazuje „Chore removed.” Done nie ma Remove. Sesja dziecka i wiersz już potwierdzony kończą się błędem bez usunięcia.

### Key Discoveries:

- Usuwanie nie potrzebuje migracji. RLS rodzica już opisuje dozwolony DELETE.
- Nowy endpoint jest rodzeństwem `chore-confirm.ts`: `src/pages/api/family/chore-remove.ts`.
- Filtr `chore_date = warsawToday()` jak w confirm/check.

## What We're NOT Doing

- Cofanie usunięcia.
- Usuwanie potwierdzonych obowiązków (Done).
- Drugie dziecko (S-05).
- Edycja tytułu, zmiana daty, odhaczanie za dziecko i nowa migracja SQL.
- Tłumaczenie istniejących napisów. Nowe napisy są po angielsku.

## Implementation Approach

Faza 1 dodaje `POST /api/family/chore-remove`. Przyjmuje samo `chore_id`. Sesja musi być rodzicem. Wiersz musi być z dziś. Już potwierdzony kończy się błędem bez delete. Inaczej delete z filtrem `parent_confirmed_at is null`.

Faza 2 dodaje Remove w To do i Waiting oraz `removed=1` na widoku rodzica.

## Critical Implementation Details

Przed delete odrzuć wiersz z ustawionym `parent_confirmed_at` czytelnym komunikatem. Na samym delete też filtruj `.is("parent_confirmed_at", null)`, żeby wyścig z Confirm nie skasował potwierdzonego wiersza. Nie mylić prywatnej `ChildToday` w `ParentToday.tsx` z `ChildToday.tsx`.

## Faza 1: Usuwanie

### Overview

Rodzic usuwa niepotwierdzony obowiązek z dziś. Dziecko i wiersz potwierdzony nie zmieniają bazy.

### Changes Required:

#### 1. Endpoint usuwania

**File**: `src/pages/api/family/chore-remove.ts`

**Intent**: Rodzic usuwa jedno niepotwierdzone odhaczenie/pozycję. Dziecko nie dostaje tej drogi.

**Contract**: `POST`, `prerender = false`, zod z samym `chore_id` jako uuid. Rola inna niż `parent` wraca na `/dashboard?error=Only%20a%20parent%20can%20remove%20a%20chore`. Odczyt po `id` i `chore_date = warsawToday()`. Brak wiersza: `That chore is not on today's list`. `parent_confirmed_at` ustawione: `That chore cannot be removed`, bez delete. Inaczej `.delete()` z tym samym filtrem i `.is("parent_confirmed_at", null)`, potem `/dashboard?removed=1`. Błąd odczytu/zapisu: `Could not remove the chore`. Wzorzec w `chore-confirm.ts`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/api/family/chore-remove.ts` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Sesja rodzica usuwa niepotwierdzony obowiązek z dziś; wiersz znika z `today_chores`
- Potwierdzony obowiązek, obowiązek spoza dziś albo spoza rodziny oraz sesja dziecka nie usuwają wiersza

---

## Faza 2: Przycisk Remove

### Overview

Rodzic usuwa czekający lub nieodhaczony wiersz z ekranu.

### Changes Required:

#### 1. Flaga sukcesu na dashboardzie

**File**: `src/pages/dashboard.astro`

**Intent**: Parametr `removed=1` idzie tylko do widoku rodzica.

**Contract**: `choreRemoved` z `removed=1` przekazywane do `ParentToday`. Gałąź dziecka bez zmian.

#### 2. Remove w To do i Waiting

**File**: `src/components/family/ParentToday.tsx`

**Intent**: Przycisk Remove obok pozycji, które jeszcze nie są Done.

**Contract**: `RemoveForm` → `POST /api/family/chore-remove` z `chore_id`, przycisk Remove. `showRemove` na To do i Waiting. Done bez Remove. Sukces: `Chore removed.` Formularz dodawania, Confirm i napis o drugim dziecku zostają. Nie ruszać `ChildToday.tsx`.

### Success Criteria:

#### Automated Verification:

- `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- `npx astro check` przechodzi

#### Manual Verification:

- Remove w To do i Waiting usuwa wiersz i pokazuje „Chore removed.”
- Done nie ma Remove; dziecko nie widzi Remove; potwierdzony wiersz nie znika

---

## Testing Strategy

### Unit Tests:

- Brak nowego runnera jednostkowego.

### Integration Tests:

- Strażnikiem zapisu zostaje ręczne sprawdzenie oraz istniejące RLS (`family-rls-smoke.sql`).

### Manual Testing Steps:

1. Jako rodzic usuń pozycję z To do — znika z listy rodzica i dziecka.
2. Jako dziecko odhacz pozycję; jako rodzic usuń z Waiting — znika.
3. Potwierdź pozycję; Remove nie ma / API odrzuca.
4. Sesja dziecka na `chore-remove` nie usuwa wiersza.

## Performance Considerations

Jeden delete jednego wiersza. Bez paginacji.

## Migration Notes

Migracji nie ma.

## References

- Roadmapa: `context/foundation/roadmap.md` (S-04)
- PRD: `context/foundation/prd.md` (US-02, FR-012)
- Poprzedni kawałek: `context/archive/2026-10-23-parent-confirm-chores/plan.md`
- Wzorzec endpointu: `src/pages/api/family/chore-confirm.ts`
- Ekran rodzica: `src/pages/dashboard.astro`, `src/components/family/ParentToday.tsx`
- Reguły bazy: `supabase/migrations/20261001180000_family_data_and_roles.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Usuwanie

#### Automated

- [x] 1.1 `npx eslint src/pages/api/family/chore-remove.ts` przechodzi
- [x] 1.2 `npx astro check` przechodzi

#### Manual

- [x] 1.3 Sesja rodzica usuwa niepotwierdzony obowiązek z dziś; wiersz znika z `today_chores`
- [x] 1.4 Potwierdzony obowiązek, obowiązek spoza dziś albo spoza rodziny oraz sesja dziecka nie usuwają wiersza

### Phase 2: Przycisk Remove

#### Automated

- [x] 2.1 `npx eslint src/pages/dashboard.astro src/components/family/ParentToday.tsx` przechodzi
- [x] 2.2 `npx astro check` przechodzi

#### Manual

- [x] 2.3 Remove w To do i Waiting usuwa wiersz i pokazuje „Chore removed.”
- [x] 2.4 Done nie ma Remove; dziecko nie widzi Remove; potwierdzony wiersz nie znika
