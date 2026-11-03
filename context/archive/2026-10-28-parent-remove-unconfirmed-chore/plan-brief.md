# Rodzic usuwa niepotwierdzony obowiązek — Plan Brief

> Full plan: `context/changes/parent-remove-unconfirmed-chore/plan.md`

## What & Why

Rodzic może zdjąć pomyłkowo dodany obowiązek z listy dziecka na dziś, zanim go potwierdzi. Bez tego FR-012 / US-02 zostają niezamknięte.

## Starting Point

S-03 jest zrobione: rodzic widzi To do / Waiting / Done i potwierdza. RLS `today_chores_delete_parent_unconfirmed` już pozwala rodzicowi usunąć wiersz z pustym `parent_confirmed_at`. W aplikacji nie ma jeszcze endpointu ani przycisku Remove.

## Desired End State

Na dashboardzie rodzica przy pozycjach To do i Waiting jest Remove (jedno kliknięcie). Po usunięciu wiersz znika u rodzica i dziecka, komunikat „Chore removed.” Done nie ma Remove. Dziecko nie usuwa.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Gdzie Remove | To do + Waiting | Zgodne z RLS i FR-012; Done jest już potwierdzone. |
| UX | Jedno kliknięcie | Jak Confirm; bez dialogu na telefonie. |
| Sukces | `?removed=1` → „Chore removed.” | Ten sam wzorzec co `confirmed=1`. |
| Endpoint | `chore-remove.ts`, POST + `chore_id` | Rodzeństwo `chore-confirm`; katalog `chores/` zderzy trasy. |
| Migracja | Brak | Polityka DELETE już jest w F-01. |

## Scope

**In scope:**

- `POST /api/family/chore-remove` dla rodzica, tylko obowiązek z dziś z jego rodziny, niepotwierdzony.
- Przycisk Remove w To do i Waiting na dashboardzie rodzica.
- Odmowa dla dziecka, potwierdzonego wiersza, innego dnia i innej rodziny.

**Out of scope:**

- Cofanie usunięcia, usuwanie Done, edycja tytułu, drugie dziecko (S-05), migracja SQL.

## Architecture / Approach

Wyspa rodzica wysyła formularz z `chore_id`. Endpoint sesją rodzica czyta wiersz z dziś, odrzuca potwierdzone, potem `delete` z filtrem `parent_confirmed_at is null` (RLS jako druga warstwa).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Usuwanie | Endpoint bez UI | Usunięcie potwierdzonego albo cudzego wiersza |
| 2. Przycisk | Remove w To do i Waiting | Remove na Done albo pominięcie Waiting |

**Prerequisites:** S-03 zrobione, lokalny Supabase, obowiązki w To do / Waiting.
**Estimated effort:** Jedna sesja, dwie fazy. Lżejsze niż potwierdzenie.

## Open Risks & Assumptions

- Równoległe Confirm i Remove: kto pierwszy — ten wygrywa; drugi dostaje błąd albo pusty delete.
- Pierwsze dziecko na ekranie; drugie czeka na S-05.

## Success Criteria (Summary)

- Rodzic usuwa niepotwierdzony obowiązek z To do lub Waiting; wiersz znika u obu ról.
- Potwierdzony obowiązek, dziecko i zły dzień/rodzina nie usuwają wiersza.
- Komunikat „Chore removed.” po sukcesie.
