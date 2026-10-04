---
project: Obowiązki
version: 1
status: draft
created: 2026-09-29
updated: 2026-10-04
prd_version: 2
main_goal: speed
top_blocker: time
# co-blocker (wywiad): skills — nieznajomość stosu Astro/Supabase/Cloudflare
milestone_id: first-family-chore-loop
milestone_seq: 1
milestone_status: open
---

# Roadmap: Obowiązki

> Derived from `context/foundation/prd.md` (v2) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Pierwsza pętla obowiązków na dziś** — Status: open

- **Intent:** Jedna rodzina (rodzic, syn, córka) może w przeglądarce — także na telefonie — przejść pełną regułę: dziecko odhacza, rodzic potwierdza, dopiero wtedy jest zrobione; rodzic może zdjąć pomyłkę zanim potwierdzi.
- **Framing (wywiad):** cel sekwencjonowania = `speed`; główne ryzyka = **czas** (deadline / budżet MVP) **oraz nieznajomość stosu** (Astro + Supabase + Cloudflare zamiast codziennego C#/Vue) — w frontmatter `top_blocker: time` jako oś kolejności; skills zapisane tu jako współbieżne ryzyko.
- **Source materials:** `context/foundation/prd.md` (v2)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-012, US-01, US-02

## Vision recap

Co wieczór i rano rodzic wielokrotnie powtarza dzieciom listę obowiązków; kartka i notatki nie dają dwóch widoków naraz — rodzic chce wiedzieć, że już zrobili, dzieci chcą wiedzieć, co jeszcze zostało. Produkt rozwiązuje ten ból koordynacyjny: osobne konta, lista na dziś, odhaczenie przez dziecko i potwierdzenie przez rodzica.

## North star

**S-03: Rodzic widzi odhaczenia i potwierdza** — Dopiero po tym kawałku widać, czy rdzeń produktu (reguła biznesowa z PRD) działa end-to-end z udziałem dziecka i rodzica.

> **Gwiazda przewodnia** to najmniejszy kawałek pracy, który dowodzi głównej hipotezy produktu — tu: „zrobione” znaczy odhaczenie dziecka plus potwierdzenie rodzica. Kawałki S-04 (usunięcie pomyłki) i S-05 (drugie dziecko) idą tuż po niej, zgodnie z Twoim wyborem wczesnej ścieżki MVP.

## At a glance

| ID   | Change ID                      | Outcome (user can …)                                              | Prerequisites | PRD refs              | Status   |
| ---- | ------------------------------ | ----------------------------------------------------------------- | ------------- | --------------------- | -------- |
| F-01 | family-data-and-roles          | (foundation) model rodziny, ról i wierszy obowiązków na dziś      | —             | Access Control, NFR   | done |
| S-01 | parent-add-child-and-chore     | rodzic doda dziecko i obowiązek na dziś dla tego dziecka          | F-01          | US-01, FR-001–002,005–006 | done |
| S-02 | child-view-and-checkoff        | dziecko zobaczy listę na dziś i odhaczy pozycję                   | S-01          | US-01, FR-003–004,008–010 | proposed |
| S-03 | parent-confirm-chores          | rodzic zobaczy listę dziecka i potwierdzi odhaczenie              | S-02          | US-01, FR-007,011     | proposed |
| S-04 | parent-remove-unconfirmed-chore | rodzic usunie niepotwierdzony obowiązek z listy dziecka na dziś | S-01          | US-02, FR-012         | proposed |
| S-05 | second-child-isolation         | rodzic doda drugie dziecko; każde widzi tylko swoje obowiązki     | S-03, S-04    | US-01, US-02, FR-005  | proposed |

## Baseline

What's already in place in the codebase as of `2026-09-29` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 7 + React 19, layout i strony startowe (`src/pages/`, `src/components/`); brak ekranów obowiązków.
- **Backend / API:** partial — trasy auth (`src/pages/api/auth/`); brak API obowiązków i rodziny.
- **Data:** partial — klient Supabase (`src/lib/supabase.ts`); brak migracji tabel pod rodzinę i obowiązki (`supabase/migrations/` puste).
- **Auth:** present — logowanie, sesja cookie, middleware (`src/middleware.ts`); brak ról rodzic/dziecko i polityk na dane rodzinne.
- **Deploy / infra:** partial — `wrangler.jsonc`, CI lint/build/smoke (`.github/workflows/ci.yml`); brak auto-deploy przy merge z tech-stack.
- **Observability:** absent — brak integracji śledzenia błędów lub metryk.

## Foundations

### F-01: Model rodziny, ról i obowiązków na dziś

- **Outcome:** (foundation) istnieje minimalny kontrakt danych i dostępu: rodzina, rola rodzic/dziecko, wiersze obowiązków na dziś ze stanami (do zrobienia, odhaczone przez dziecko, potwierdzone przez rodzica); dziecko nie widzi list rodzeństwa.
- **Change ID:** family-data-and-roles
- **PRD refs:** Access Control, Business Logic, NFR (telefon — dane dostępne z SSR/API)
- **Unlocks:** S-01, S-02, S-03, S-04, S-05; weryfikacja reguły „zrobione dopiero po potwierdzeniu”
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy konto dziecka zakłada rodzic (zaproszenie/hasło), czy osobna rejestracja — Owner: user. Block: no.
- **Risk:** Bez tego enablera każdy kawałek UI byłby nieplanowalny; trzymamy zakres minimalny — tylko to, co odblokowuje pierwszą pętlę, bez katalogu obowiązków ani kalendarza. Główne ryzyka milestone: czas do deadline oraz nieznajomość stosu (Astro/Supabase/Cloudflare zamiast codziennego C#/Vue) — dlatego F-01 jest wąski i plannable od razu.
- **Status:** done

## Slices

### S-01: Rodzic dodaje dziecko i obowiązek na dziś

- **Outcome:** user can (as parent) sign in, add one child account to the family, add a today-chore for that child, and sign out.
- **Change ID:** parent-add-child-and-chore
- **PRD refs:** US-01, FR-001, FR-002, FR-005, FR-006
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Pierwszy kawałek łączy stos (Astro + Supabase) z domeną — celowo wąski (jedno dziecko), żeby szybko zweryfikować model danych z F-01.
- **Status:** done

### S-02: Dziecko widzi listę i odhacza

- **Outcome:** user can (as child) sign in, see what they still have to do today and what they already checked off, check off a chore, and sign out.
- **Change ID:** child-view-and-checkoff
- **PRD refs:** US-01, FR-003, FR-004, FR-008, FR-009, FR-010
- **Prerequisites:** S-01
- **Parallel with:** S-04 (po S-01)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** NFR „telefon w przeglądarce” powinien być sprawdzony na tym ekranie — lista czytelna na wąskim viewportcie.
- **Status:** proposed

### S-03: Rodzic potwierdza odhaczenia

- **Outcome:** user can (as parent) see the child's today list with check-off state and confirm a checked item so it counts as done.
- **Change ID:** parent-confirm-chores
- **PRD refs:** US-01, FR-007, FR-011
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To jest rdzeń reguły biznesowej; błąd tutaj unieważnia cały MVP — warto trzymać ten kawałek tuż po odhaczeniu dziecka.
- **Status:** proposed

### S-04: Rodzic usuwa niepotwierdzony obowiązek

- **Outcome:** user can (as parent) remove an unconfirmed today-chore from a child's list; it disappears for parent and child and is neither done nor todo.
- **Change ID:** parent-remove-unconfirmed-chore
- **PRD refs:** US-02, FR-012
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03 (logicznie po S-01; można planować równolegle z S-02 gdy F-01 i S-01 są jasne)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Celowo wcześnie w sekwencji (Twój wybór przy gwiazdzie przewodniej); nie wymaga potwierdzenia, ale wymaga spójności stanów z S-02/S-03.
- **Status:** proposed

### S-05: Drugie dziecko w tej samej rodzinie

- **Outcome:** user can (as parent) add a second child; each child sees and checks off only their own chores, not a sibling's list.
- **Change ID:** second-child-isolation
- **PRD refs:** US-01, US-02 (guardrails), FR-005, Success Criteria Secondary
- **Prerequisites:** S-03, S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Drugie kryterium sukcesu z PRD; sekwencjonowane po pętli jednego dziecka, żeby nie mnożyć ryzyka na starcie.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                      | Suggested issue title                              | Ready for `/10x-plan` | Notes                                      |
| ---------- | ------------------------------ | -------------------------------------------------- | --------------------- | ------------------------------------------ |
| F-01       | family-data-and-roles          | Fundament: rodzina, role, obowiązki na dziś        | no                    | Plan in progress — `context/changes/family-data-and-roles/` |
| S-01       | parent-add-child-and-chore     | Rodzic: dodaj dziecko i obowiązek na dziś          | no                    | Wymaga F-01                                |
| S-02       | child-view-and-checkoff        | Dziecko: lista na dziś i odhaczenie                | no                    | Wymaga S-01                                |
| S-03       | parent-confirm-chores          | Rodzic: podgląd listy i potwierdzenie              | no                    | Gwiazda przewodnia — wymaga S-02           |
| S-04       | parent-remove-unconfirmed-chore | Rodzic: usuń niepotwierdzony obowiązek              | no                    | Wczesna ścieżka MVP; wymaga S-01           |
| S-05       | second-child-isolation         | Drugie dziecko — izolacja list                     | no                    | Wymaga S-03, S-04                          |

## Open Roadmap Questions

(brak — PRD §Open Questions puste)

## Parked

- **Powiadomienia i lista „nie zrobiłeś wczoraj”** — Why parked: PRD §Non-Goals; v1 to tylko dziś.
- **Natywna aplikacja na telefon** — Why parked: PRD §Non-Goals; web w przeglądarce wystarczy.
- **Osobne listy weekday vs święta** — Why parked: PRD §Non-Goals; dodawanie obowiązków zostaje, warianty kalendarza później.
- **Wiele gospodarstw / admin dla innych rodzin** — Why parked: PRD §Non-Goals; pierwsza wersja to ta rodzina.
- **Edycja tekstu obowiązku, przepisanie na drugie dziecko, usunięcie konta dziecka** — Why parked: PRD §Non-Goals; jedyny delete w v1 to FR-012.
- **Auto-deploy produkcyjny i observability** — Why parked: cel sekwencjonowania `speed`; baseline ma CI i wrangler; pełny deploy i monitoring po zamknięciu pętli MVP.

## Milestone History

## Done

- **F-01: (foundation) istnieje minimalny kontrakt danych i dostępu: rodzina, rola rodzic/dziecko, wiersze obowiązków na dziś ze stanami (do zrobienia, odhaczone przez dziecko, potwierdzone przez rodzica); dziecko nie widzi list rodzeństwa.** — Archived 2026-10-04 → `context/archive/2026-10-01-family-data-and-roles/`. Lesson: —.
- **S-01: user can (as parent) sign in, add one child account to the family, add a today-chore for that child, and sign out.** — Archived 2026-10-04 → `context/archive/2026-10-04-parent-add-child-and-chore/`. Lesson: —.
