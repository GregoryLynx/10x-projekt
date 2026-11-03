# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-11-03

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src`, `supabase/migrations`
(10 commits / 30 days; migrations had 0 commits in that window).

## 2. Risk Map

Najgroźniejsze scenariusze dla Obowiązków, od iloczynu skutku i szansy.
Kolumna Źródło mówi, skąd wiemy, że ryzyko jest realne. Nie wskazuje linii kodu.

| # | Ryzyko | Skutek | Szansa | Źródło |
|---|--------|--------|--------|--------|
| 1 | Dziecko widzi listę rodzeństwa albo odhacza cudzy obowiązek. | High | High | Wywiad Q1, Q2. Roadmap S-05. Katalogi `src/pages` (10/30d), `src/pages/api` (6/30d), `src/components/family` (5/30d). |
| 2 | Pozycja jest zrobiona, zanim rodzic potwierdzi, albo po potwierdzeniu dalej widać ją jako niezrobioną. | High | Medium | PRD US-01, FR-011, Business Logic. Roadmap S-03. Commit z 2026-10-23 poprawiał powtórne potwierdzenie. Katalog `src/pages/api` (6/30d). |
| 3 | Dziecko potwierdza albo usuwa obowiązek, osoba niezalogowana korzysta z listy, albo żądanie z cudzym identyfikatorem zmienia wiersz spoza rodziny. | High | Medium | PRD Access Control, FR-011, FR-012. Archiwum F-01. Wywiad Q3. Katalog `src/pages/api` (6/30d). |
| 4 | Usunięta niepotwierdzona pozycja zostaje u rodzica albo u dziecka, albo potwierdzoną da się usunąć. | High | Medium | PRD US-02, FR-012. Roadmap S-04. Wywiad Q1. |
| 5 | Obowiązek z wczoraj widać na liście na dziś albo da się go odhaczyć jako dzisiejszy. | Medium | Medium | PRD: v1 to tylko dziś. Archiwum S-02. Katalogi `src/pages` (10/30d), `src/components/family` (5/30d). |

### Risk Response Guidance

| Ryzyko | Co ma złapać test | Założenie do podważenia | Co ma ustalić research | Najtańsza warstwa | Antywzorzec |
|--------|-------------------|-------------------------|------------------------|-------------------|-------------|
| #1 | Przy dwóch dzieciach każde widzi tylko swoją listę, a odhaczenie cudzego identyfikatora nie zmienia wiersza. | Jedno dziecko na liście oznacza, że rodzeństwo jest odfiltrowane. Zalogowanie oznacza własność wiersza. | Jak powstają dwa konta, jak lista jest czytana, co zwraca odrzucone odhaczenie. | Integracja dwóch sesji. | Test, w którym dziecko A widzi własne obowiązki i na tym koniec. |
| #2 | Odhaczenie zostawia pozycję niezrobioną. Po potwierdzeniu obie strony widzą zrobione. Drugie potwierdzenie nie zmienia znacznika. | Odhaczenie albo sam komunikat sukcesu oznacza „zrobione”. | Wejścia zapisu, odczyt obu ról, reguła powtórnego potwierdzenia. | Integracja przejść stanu i odczytu. | Asercja skopiowana z funkcji, która już liczy „zrobione”. |
| #3 | Dziecko nie potwierdza i nie usuwa. Niezalogowany nie dostaje listy. Identyfikator spoza rodziny nie zmienia wiersza. | Zielony smoke logowania albo zielony skrypt RLS oznacza, że żądanie HTTP też jest odrzucone. | Które akcje są rodzica, jak wygląda brak sesji, skąd bierze się identyfikator. | Integracja niedozwolonych zapisów, bez zaślepiania bazy. | Test tylko szczęśliwej ścieżki rodzica. |
| #4 | Niepotwierdzona pozycja znika u rodzica i u dziecka. Potwierdzonej nie da się usunąć. Dziecko nie usuwa. | Zniknięcie u rodzica oznacza zniknięcie u dziecka. | Kiedy usunięcie jest dozwolone i co widzi druga rola po nim. | Integracja usunięcia i odczytu obu ról. | Samo kliknięcie Remove u rodzica. |
| #5 | Wiersz z wczoraj nie jest na liście na dziś i nie daje się odhaczyć jako dzisiejszy. | Pusta lista oznacza, że filtra dnia nie ma. | Skąd bierze się „dziś” i jak odrzucany jest wczorajszy identyfikator. | Jeden przypadek w tym samym teście integracyjnym co #1 i #2. | Test, który ustawia datę tak samo jak kod produkcji i porównuje wynik z tym kodem. |

## 3. Phased Rollout

Każdy wiersz otwiera własny folder zmiany przez `/10x-new`. Status aktualizuje orchestrator.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Izolacja i reguła zrobione | Postawić Vitest i dowieść izolacji, reguły „zrobione” oraz granicy dnia. | #1, #2, #5 | Vitest + integracja | change opened | context/changes/testing-isolation-and-done-rule/ |
| 2 | Role i usuwanie | Dowieść, że zła rola i cudzy identyfikator nie zapisują, a usunięcie jest spójne. | #3, #4 | integracja | not started | — |
| 3 | Bramka CI | Suite z faz 1–2 leci w CI obok lint, build i smoke. Smoke zostaje testem logowania. | przekrojowe | bramka CI | not started | — |

## 4. Stack

Klasyczna baza testów. Zalecenia pochodzą z manifestu i z dokumentów Astro sprawdzonych w tej sesji.

| Warstwa | Narzędzie | Wersja | Uwagi |
|---------|-----------|--------|-------|
| unit + integration | Vitest przez `getViteConfig()` | brak — patrz §3 Faza 1 | Oficjalny przewodnik Astro, checked: 2026-11-03. Container API jest eksperymentalne i renderuje HTML `.astro` w środowisku `node`; w Astro 7 renderer Reacta bierze się z `@astrojs/react/container-renderer`. To nie zastępuje testu żądania i danych. |
| granica danych | lokalny Supabase, bez zaślepiania bazy | obecny w smoke CI | Ryzyka #1–#4 mają być widoczne na prawdziwym zapisie i odczycie. |
| e2e | brak | — | Poza tym wdrożeniem. Scenariusze widać bez przeglądarki. |
| smoke auth | `node scripts/smoke.mjs` | obecny | CI. Pokrywa logowanie, nie listy obowiązków. |
| smoke SQL | `scripts/family-rls-smoke.sql` | obecny | Skrypt po migracjach, nie runner. Research ma sprawdzić, co już dowodzi, zanim doda test HTTP. |

**Stack grounding tools (current session):**
- Docs: brak Context7 i brak MCP dokumentacji frameworka. Sprawdzone strony: `https://docs.astro.build/en/guides/testing/` oraz `https://docs.astro.build/en/reference/container-reference/`; checked: 2026-11-03.
- Search: Exa.ai jest w sesji, ale połączenie dwa razy wygasło. Użyte zostało wyszukiwanie Cursora; checked: 2026-11-03.
- Runtime/browser: brak Playwright MCP — nieużyty; checked: 2026-11-03.
- Provider/platform: brak MCP GitHub, Cloudflare i Supabase — nieużyte; checked: 2026-11-03.

## 5. Quality Gates

| Bramka | Gdzie | Wymagane? | Co łapie |
|--------|-------|-----------|----------|
| lint + `astro check` | lokalnie + CI | wymagane | składnia i typy |
| build | CI | wymagane | build produkcyjny |
| smoke auth | CI, lokalny Supabase + preview | wymagane | pęknięte logowanie; nie listy obowiązków |
| Vitest (integracja ryzyk #1–#5) | lokalnie | wymagane po §3 Fazie 1 | regresje izolacji, reguły „zrobione”, dnia, ról i usuwania |
| ten sam Vitest w CI | CI na PR | wymagane po §3 Fazie 3 | ta sama podłoga na każdej zmianie |

## 6. Cookbook Patterns

Przepisy dopiszą fazy wdrożenia. Do tego czasu wiersz wskazuje fazę i scenariusz, którego ma bronić.

### 6.1 Test jednostkowy

- Faza 1 nie dodała testu jednostkowego `isDone`, bo taka asercja skopiowałaby `src/types.ts:37-38`. Wyrocznią jest scenariusz HTTP z §6.2. Test jednostkowy dodawać tylko wtedy, gdy research znajdzie czystą regułę, której wyrocznią jest PRD (zrobione dopiero po odhaczeniu i potwierdzeniu), a nie wynik skopiowany z kodu.

### 6.2 Test integracyjny

- Faza 1, ryzyka #1, #2 i #5: jeden scenariusz HTTP w `tests/family-today.integration.test.ts`. Sesje rodzica i dzieci trzymają ciasteczka i wołają preview. Znaczniki czasu (`child_checked_at`, `parent_confirmed_at`) czyta select w sesji rodzica. Wczorajsze `chore_date` bierze się z wstawionego wiersza, a nie z `warsawToday()`.
- TBD — patrz §3 Faza 2 dla odrzuconego zapisu złej roli, cudzego identyfikatora i niespójnego usunięcia.

### 6.3 Test e2e

- Poza tym wdrożeniem. Nie dodawać przeglądarkowego e2e dla ryzyk #1–#5.

### 6.4 Test nowego endpointu obowiązków

- Faza 1, ryzyka #1, #2 i #5: wzorcem jest ten sam scenariusz HTTP co w §6.2 (`tests/family-today.integration.test.ts`). Sesja na ciasteczkach, select znaczników w sesji rodzica, wczorajsze `chore_date` z wstawionego wiersza zamiast `warsawToday()`. Sprawdzić żądanie, odrzucenie oraz to, co potem widzi druga rola.
- TBD — patrz §3 Faza 2. Typ: integracja. Sprawdzić żądanie, odrzucenie oraz to, co potem widzi druga rola.

### 6.5 Notatki faz

Po fazie dopisać tu 2–3 zdania, jeśli rollout nauczył czegoś, czego nie było w §2.

- Faza 1: Vitest podmienia `BASE_URL` ze shella na `/`, a `vitest.config.ts` wcześniej kopiuje prawdziwy origin do `PREVIEW_ORIGIN`. Test czyta `PREVIEW_ORIGIN` i przy braku tej zmiennej używa `http://localhost:4321`.

## 7. What We Deliberately Don't Test

- **Drobne teksty i potwierdzenie maila** — kilka osób w domu, mały skutek pomyłki. Wrócić, gdy produkt wyjdzie poza tę rodzinę. (Wywiad Q5.)
- **Zrzuty wyglądu i e2e telefonu** — NFR „działa w przeglądarce na telefonie” zostaje przy ręcznym spojrzeniu. Automatyczny piksel nie broni ryzyk z §2.
- **OpenRouter i limit CPU Workera** — nie ma tego w wymaganiach produktu. Nie budować pod to testu.
- **Powiadomienia, listy dzień/święto, wiele rodzin, edycja tekstu obowiązku** — poza v1 (PRD Non-Goals). Nie testować funkcji, której nie ma.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-11-03
- Stack versions last verified: 2026-11-03
- AI-native tool references last verified: 2026-11-03 (żadnego narzędzia AI-native nie włączono; przeglądarkowego MCP nie było w sesji)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
