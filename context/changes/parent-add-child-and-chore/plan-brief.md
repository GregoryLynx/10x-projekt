# Rodzic dodaje dziecko i obowiązek na dziś — Plan Brief

> Full plan: `context/changes/parent-add-child-and-chore/plan.md`

## What & Why

Rodzic po zalogowaniu zakłada jedno konto dziecka i dopisuje mu obowiązki na dziś. Bez tego ekranu fundament F-01 nie ma ścieżki, którą da się przejść w przeglądarce. Kolejnego wieczoru ten sam rodzic dopisuje następne obowiązki, bez nowego konta.

## Starting Point

Działają tabele, RLS i trigger: `role=child` nie zakłada rodziny, a profil dziecka wstawia rodzic. Logowanie jest emailem i hasłem na kliencie z ciasteczkiem. Nie ma klucza service role ani ekranu rodziny. Dashboard tylko wita i wylogowuje.

## Desired End State

Rodzic ląduje na `/dashboard`, tworzy dziecko loginem i hasłem, widzi `login@family.local` i zostaje zalogowany. Dodaje kilka obowiązków na datę z kalendarza Polski. Przy następnej wizycie formularza dziecka nie ma. Drugiego dziecka z tego ekranu nie założysz.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Dziś | Data `Europe/Warsaw` | O 00:30 w Polsce UTC jest jeszcze poprzednim dniem, a obowiązek ma wpaść na „dziś” rodziny. | Plan |
| Powrót | Obowiązek dla istniejącego dziecka | FR-006 dotyczy kolejnych dni, nie tylko pierwszej pary konto + jeden obowiązek. | Plan |
| Login | Krótki login rodzica, email `login@family.local`, hasło rodzica, email widoczny na ekranie | Dziecko wpisuje adres, który da się podyktować; polskie znaki zostają w imieniu. | Plan |
| Drugie dziecko | Blokada na jednym w aplikacji | S-05 jest osobnym kawałkiem; baza nie dostaje twardego limitu. | Plan |
| Utworzenie konta | Service role `createUser` z `role=child` | `signUp` na kliencie z ciasteczkiem podmieniłby sesję rodzica. | F-01 |
| Hasło | Co najmniej 6 znaków | Taka sama reguła jak rejestracja rodzica w `SignUpForm`. | Plan |

## Scope

**In scope:** sekret service role, endpoint dziecka, endpoint obowiązku z datą polską, `/dashboard` w dwóch stanach, przekierowanie po logowaniu na `/dashboard`, zależność `zod`

**Out of scope:** odhaczenie, potwierdzenie, usuwanie, drugie dziecko, reset hasła, migracja SQL, tłumaczenie starych ekranów auth

## Architecture / Approach

Przeglądarka rozmawia tylko z sesją rodzica. Utworzenie użytkownika auth idzie serwerowym klientem service role bez ciasteczek, a profil i obowiązek wracają na klienta sesji, żeby zostały pod RLS. Email dziecka strona czyta przez `getUserById`, bo w `profiles` go nie ma.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Konto dziecka | Jeden użytkownik `role=child` w rodzinie rodzica, drugie odrzucone | Podmiana sesji albo sierota w `auth.users`, gdy profil się nie zapisze |
| 2. Obowiązek na dziś | Wiersze z jawną datą polską | Ciche zejście na domyślne UTC kolumny |
| 3. Ekran rodzica | Dwa stany dashboardu i widoczny email | Dziecko albo drugi rodzic zobaczy formularz zakładania |

**Prerequisites:** Lokalny Supabase i `SUPABASE_SERVICE_ROLE_KEY` w `.env` albo `.dev.vars` (nie w gicie). F-01 zaaplikowane.
**Estimated effort:** Jedna sesja implementacji w 3 fazach. Ręczne kroki wymagają działającego Dockera.

## Open Risks & Assumptions

- Bez lokalnego service role faza 1 nie da się przejść ręcznie. Build CI sekretu nie potrzebuje, bo pole jest opcjonalne.
- Dwa równoległe create mogą oba przejść licznik „jedno dziecko”, zanim powstanie wiersz. Dla jednego gospodarstwa to akceptowalne; ograniczenia w bazie nie dodajemy.
- `@family.local` nie odbiera poczty, więc `email_confirm: true` jest obowiązkowe.

## Success Criteria (Summary)

- Rodzic loguje się, zakłada jedno dziecko, widzi jego email i dodaje obowiązki na dziś w Polsce.
- Kolejna wizyta dopisuje obowiązek bez nowego konta.
- Drugie dziecko nie powstaje, a sesja rodzica nie jest podmieniana.
