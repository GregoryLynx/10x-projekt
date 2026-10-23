# Dziecko widzi listę i odhacza — Plan Brief

> Full plan: `context/changes/child-view-and-checkoff/plan.md`

## What & Why

Dziecko ma się zalogować, zobaczyć własne obowiązki na dziś, odhaczyć pozycję i zobaczyć, co jeszcze zostało oraz co już odhaczyło. Bez tego rodzic nie ma czego potwierdzać w następnym kawałku.

## Starting Point

Konto dziecka, dzisiejsze wiersze i wylogowanie już są. Dashboard dla sesji dziecka mówi tylko, że ekran jest dla rodzica. Baza pozwala dziecku zmieniać wyłącznie `child_checked_at` na własnych wierszach, zanim rodzic potwierdzi.

## Desired End State

Dziecko na `/dashboard` widzi dzisiejszą listę od najstarszego obowiązku, odhacza ją i może cofnąć odhaczenie do czasu potwierdzenia. Rodzic nadal tylko dodaje obowiązki. Dziecko się wylogowuje.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Cofnięcie | Dziecko czyści `child_checked_at`, dopóki `parent_confirmed_at` jest puste | Pomyłka nie czeka na S-03 ani S-04, a RLS już puszcza taki update | Plan |
| Po potwierdzeniu | Undo jest odrzucone | Potwierdzenie rodzica zamyka odhaczenie | Plan |
| Kolejność | `created_at` rosnąco, przy tym samym czasie `id` rosnąco | Dwa „Umyj zęby” zostają w kolejności dodania | Plan |
| Ekran | Ten sam `/dashboard`, gałąź po roli | Logowanie już tam prowadzi, a inna trasa nie jest chroniona | Plan |
| Podział listy | To do / Checked off po `child_checked_at`, nie po `isDone()` | „Już odhaczone” jest widoczne zanim rodzic potwierdzi | Plan |
| Napisy | Angielski | Tak są napisane dashboard i formularze auth | Plan |

## Scope

**In scope:**

- Endpoint odhaczenia i cofnięcia dla własnego obowiązku z dziś
- Lista dziecka na `/dashboard`, w tym pusta lista i wąskie okno
- Wylogowanie, które już jest na tej stronie

**Out of scope:**

- Potwierdzenie rodzica (S-03) i lista na ekranie rodzica
- Usuwanie obowiązku (S-04)
- Drugie dziecko (S-05)
- Nowa migracja i obowiązki z innego dnia

## Architecture / Approach

Strona Astro czyta dzisiejsze wiersze sesją dziecka. Wyspa React wysyła formularz na `POST /api/family/chore-check`. Endpoint aktualizuje tylko `child_checked_at`. Osobny plik trasy omija istniejący `chores.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Odhaczenie | Zapis i cofnięcie `child_checked_at` | Update ruszy inną kolumnę i trigger go odrzuci |
| 2. Ekran dziecka | Lista, przyciski, wylogowanie | Gałąź dziecka nadpisze formularz rodzica |

**Prerequisites:** S-01 zrobione: jedno dziecko i możliwość dodania obowiązków na dziś. Lokalny Supabase.
**Estimated effort:** Dwie fazy w jednym kawałku, bez migracji.

## Open Risks & Assumptions

- „Dziś” oznacza `Europe/Warsaw`, tak jak przy dodawaniu obowiązku. Po północy wczorajsze wiersze znikają z tej listy.
- W aplikacji nikt jeszcze nie ustawia `parent_confirmed_at`. Ścieżka „bez Undo” jest strażnikiem na wiersze ustawione poza ekranem.
- Dwa wiersze z tym samym `created_at` rozstrzyga `id` rosnąco. Para dodana rano i wieczorem i tak idzie chronologicznie.

## Success Criteria (Summary)

- Dziecko widzi własne obowiązki na dziś, starsze wyżej, i rozróżnia To do od Checked off.
- Odhacza pozycję i cofa to, zanim rodzic potwierdzi. Po potwierdzeniu cofnięcie nie zmienia wiersza.
- Rodzic nadal dodaje obowiązki. Dziecko się wylogowuje.
