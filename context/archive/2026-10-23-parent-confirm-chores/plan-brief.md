# Rodzic potwierdza odhaczenia — Plan Brief

> Full plan: `context/changes/parent-confirm-chores/plan.md`

## What & Why

Rodzic widzi, co dziecko odhaczyło dziś, i potwierdza to. Dopiero oba kroki znaczą, że obowiązek jest zrobiony. Bez tego ekranu pętla z PRD urywa się na odhaczeniu dziecka.

## Starting Point

Dziecko już odhacza i cofa na `/dashboard`, dopóki `parent_confirmed_at` jest puste. Ekran rodzica pokazuje tylko pierwsze dziecko i formularz dodawania. Żaden kod nie zapisuje potwierdzenia, choć baza rodzica już na to pozwala.

## Desired End State

Rodzic na tym samym dashboardzie widzi listę pierwszego dziecka w trzech grupach. Confirm jest tylko przy odhaczonym i jeszcze niepotwierdzonym wierszu. Po nim wiersz jest w Done i tam zostaje. Dziecko nie cofa już tego odhaczenia.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Potwierdzenie | Ostateczne, bez cofania | Po Confirm pozycja zostaje zrobiona; zdjęcie potwierdzenia nie jest w PRD. |
| Stany listy | To do, Waiting for confirmation, Done | Confirm jest tylko w środkowej grupie, bo Done wymaga obu znaczników. |
| Dziecko na ekranie | Pierwsze, jak dziś | Drugie dziecko i jego lista należą do S-05. |
| Endpoint | `chore-confirm.ts`, tylko `parent_confirmed_at` i `updated_at` | Katalog `chores/` zderzyłby się z istniejącym `chores.ts`, a trigger rodzica nie podbija `updated_at`. |
| Już potwierdzone | Sukces bez drugiego zapisu | Powtórny Confirm zostawia ten sam znacznik czasu. |
| Napisy | Angielskie | Takie są dashboard i formularze. |
| Kolejność pracy | Najpierw zapis, potem lista | Endpoint da się sprawdzić zanim powstanie ekran. |

## Scope

**In scope:**

- `POST /api/family/chore-confirm` dla rodzica, tylko obowiązek z dziś z jego rodziny, już odhaczony.
- Lista trzech stanów na dashboardzie rodzica i przycisk Confirm.
- Odmowa dla dziecka, wiersza bez odhaczenia, innego dnia i innej rodziny.

**Out of scope:**

- Cofanie potwierdzenia, usuwanie obowiązku (S-04), drugie dziecko (S-05).
- Zmiana grup na liście dziecka, edycja tytułu, migracja SQL.

## Architecture / Approach

Strona Astro na gałęzi rodzica czyta dzisiejsze wiersze pierwszego dziecka. Wyspa, która już ma formularz dodawania, rysuje trzy grupy i wysyła `POST` z samym `chore_id`. Endpoint sesją rodzica zapisuje potwierdzenie albo wraca z błędem na `/dashboard`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Potwierdzenie | Zapis `parent_confirmed_at` bez drugiego zapisu, gdy już potwierdzone | Update z inną kolumną albo bez `updated_at` |
| 2. Lista rodzica | Trzy grupy i Confirm przy czekających | Pomylenie formularza rodzica z listą dziecka |

**Prerequisites:** S-02 zrobione, lokalny Supabase, jedno dziecko z odhaczonym obowiązkiem na dziś.
**Estimated effort:** Około jednej sesji, dwie fazy. Podobny ciężar jak odhaczanie dziecka.

## Open Risks & Assumptions

- Rodzic, który ma już dwoje dzieci, zobaczy tylko pierwsze. Odhaczenia drugiego czekają na S-05.
- Pusta grupa się nie rysuje. Przy zerze wierszy zostaje formularz dodawania i zdanie, że listy nie ma.
- `npx eslint` na kopii roboczej potrafi zgłosić same końce linii CRLF, gdy git trzyma LF. To nie jest błąd reguły potwierdzenia.

## Success Criteria (Summary)

- Rodzic potwierdza odhaczony obowiązek z dziś i widzi go jako zrobiony.
- Drugie potwierdzenie nie zmienia znacznika, a dziecko nie cofa tego odhaczenia.
- Nieodhaczony obowiązek, inny dzień, inna rodzina i sesja dziecka nie ustawiają potwierdzenia.
