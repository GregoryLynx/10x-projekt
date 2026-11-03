# Drugie dziecko i osobne listy — Plan Brief

> Full plan: `context/changes/second-child-isolation/plan.md`

## What & Why

Rodzic ma dodać drugie dziecko do tej samej rodziny i widzieć obie listy na dziś. Jedno konto dziecka nie domyka drugiego kryterium PRD: w domu są syn i córka, a każde widzi tylko swoje obowiązki.

## Starting Point

Endpoint i dashboard zatrzymują się na jednym, najstarszym dziecku. Zdanie na ekranie mówi, że drugie przyjdzie w następnym kawałku. RLS i ekran dziecka już oddzielają listy rodzeństwa. Baza nie liczy dzieci.

## Desired End State

Na telefonie rodzic z jednym dzieckiem widzi jego listę i formularz drugiego dziecka. Po zapisie widzi dwie listy, od najstarszego konta, z emailami do logowania. Formularza trzeciego dziecka nie ma. Dziecko nie widzi obowiązków brata ani siostry. Rodzic potwierdza i zdejmuje niepotwierdzony obowiązek na każdej z dwóch list.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Ekran rodzica | Dwie listy na jednym `/dashboard` | Rodzic widzi obie listy bez przełączania i bez nowej trasy. |
| Limit | Dwoje dzieci, trzecie odrzucone | PRD trzyma rodzica, syna i córkę, nie dowolną liczbę. |
| Baza | Bez migracji i bez twardego limitu SQL | F-01 i S-01 zostawiły ten próg w aplikacji. |
| Izolacja dziecka | Bez zmian w RLS i w ekranie dziecka | Dziecko już czyta tylko `child_profile_id` równe własnemu id. |
| Napisy | Angielski, jak reszta dashboardu | Nowe zdanie błędu nie otwiera tłumaczenia istniejących ekranów. |

## Scope

**In scope:**

- Drugie konto dziecka tą samą ścieżką co pierwsze i odmowa trzeciego.
- Dwie listy na `/dashboard`, formularz dziecka dopóki jest ich mniej niż dwoje, usunięcie zdania o następnym kawałku.
- Ręczne sprawdzenie, że dziecko nie widzi ani nie odhacza listy rodzeństwa.

**Out of scope:**

- Trzecie dziecko, limit w SQL, usuwanie konta dziecka, edycja tytułu, przeniesienie obowiązku.
- Nowe reguły potwierdzania i usuwania, nowa trasa, tłumaczenie ekranów.

## Architecture / Approach

`POST /api/family/children` liczy dzieci rodziny tak, żeby widzieć dwa, i przy dwóch kończy bez `createUser`. Dashboard czyta co najwyżej dwa profile i dokleja dzisiejsze obowiązki po `child_profile_id`. Wyspa rysuje dzisiejszy panel raz na dziecko. Endpointy obowiązku, potwierdzenia i odhaczenia zostają.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Drugie konto | Drugie dziecko powstaje, trzecie nie | Dwa równoległe zapisy przy jednym dziecku mogą oba minąć licznik |
| 2. Dwie listy | Obie listy i formularz, dopóki jest miejsce | Dashboard dziś ucina odczyt do jednego dziecka |

**Prerequisites:** S-03 i S-04 zrobione. Lokalny Supabase i `SUPABASE_SERVICE_ROLE_KEY` już używane przy zakładaniu dziecka.
**Estimated effort:** około jednej sesji, dwie fazy.

## Open Risks & Assumptions

- Licznik dzieci nie jest transakcją. Dwa równoległe utworzenia przy jednym dziecku mogą oba przejść, tak jak przy limicie jednego w S-01. Twardego ograniczenia w SQL nie dodajemy.
- Profil dziecka wstawiony ręcznie w bazie, ponad dwoje, nie dostaje formularza. Ekran pokazuje dwa najstarsze.
- Brak emaila z `getUserById` zostawia dziecko na liście z dzisiejszym zdaniem, że adresu nie udało się wczytać.

## Success Criteria (Summary)

- Rodzic dodaje drugie dziecko i zostaje zalogowany. Trzecie konto nie powstaje.
- Na wąskim ekranie widać obie listy albo, przy jednym dziecku, listę i formularz drugiego.
- Dziecko widzi i odhacza tylko swoje obowiązki. Rodzic potwierdza i usuwa niepotwierdzony obowiązek na liście każdego z dwojga.
