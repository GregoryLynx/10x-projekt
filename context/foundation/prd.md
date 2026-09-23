---
project: Obowiązki
version: 2
status: draft
created: 2026-09-17
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: 2026-11-04
  after_hours_only: false
---

## Vision & Problem Statement

Co wieczór rodzic musi wielokrotnie powtarzać synowi i córce, żeby posprzątali pokój przed spaniem, umyli zęby, wyrzucili śmieci, spakowali plecak i zrobili kanapki na rano. Rano trzeba jeszcze powtórzyć, żeby zabrali kanapki, umyli zęby i sprawdzili, czy zmywarka jest załadowana albo wyładowana.

Kartka albo notatki w telefonie nie dają dwóch widoków naraz: rodzic chce wiedzieć, że już to zrobili; dzieci chcą wiedzieć, co mają jeszcze zrobić. Ból jest koordynacyjny — wieczór i poranek wymagają zgrania rodzica z dziećmi. Przy dużo większej liczbie osób reguła zostaje ta sama: dziecko odhacza, rodzic potwierdza, każdy w swojej rodzinie.

## User & Persona

Rodzic i dzieci są równorzędnymi osobami produktu (decyzja: bez jednej roli „ważniejszej”).

### Parent

Rodzic w domu, wieczór przed spaniem i poranek. Sięga po produkt, żeby nie powtarzać listy głosem i żeby widzieć, czy syn i córka już wykonali obowiązki.

### Child (son and daughter)

Syn i córka. Wieczór przed spaniem i poranek. Sięgają po produkt, żeby wiedzieć, co jeszcze zostało do zrobienia na tę porę dnia.

## Success Criteria

### Primary

- Rodzic loguje się, dodaje dziecko, dodaje temu dziecku obowiązek na dziś; dziecko loguje się, widzi obowiązki na dziś i odhacza; rodzic widzi to na liście i potwierdza — dopiero wtedy jest zrobione.

### Secondary

- W tej samej rodzinie są dwa dzieci (syn i córka), nie tylko jedno konto dziecka.

### Guardrails

- Dziecko widzi i odhacza tylko swoje obowiązki — nie listy rodzeństwa i nie konto rodzica.
- Dziecko nie usuwa obowiązków. Rodzic może usunąć tylko niepotwierdzony obowiązek z listy dziecka na dziś.

## User Stories

### US-01: Rodzic dodaje obowiązek na dziś, dziecko odhacza, rodzic widzi zrobione

- **Given** rodzic ma konto i loguje się
- **When** dodaje dziecko, dodaje mu obowiązek na dziś, to dziecko loguje się, widzi obowiązek i odhacza
- **Then** dziecko odhacza, rodzic widzi to na liście i potwierdza; dopiero wtedy pozycja jest zrobiona; dziecko widzi, co miało do zrobienia i co już zrobiło

#### Acceptance Criteria

- After the child checks off, the parent sees it and confirms; only then it is done
- The child sees both what is still to do today and what they already did
- Confirmed by user as the primary MVP path

### US-02: Rodzic usuwa pomyłkowo dodany obowiązek

- **Given** rodzic dodał dziecku obowiązek na dziś i jeszcze go nie potwierdził
- **When** usuwa tę pozycję z listy dziecka
- **Then** pozycja znika z listy rodzica i dziecka; nie jest zrobiona ani do zrobienia

#### Acceptance Criteria

- Parent can remove an unconfirmed today-chore from a child's list
- Child cannot remove chores
- After parent confirmation, the chore cannot be removed in v1

## Functional Requirements

### Authentication

- FR-001: Parent can log in. Priority: must-have
  > Socrates: Counter-argument considered: "Jedno wspólne logowanie na rodzinę." Resolution: kept. User: rodzic jedno konto, członkowie każdy z osobna, bo dzieci nie mogą sobie odejmować zadań.
- FR-002: Parent can log out. Priority: must-have
  > Socrates: Counter-argument considered: "Wylogowanie tylko utrudnia na telefonie w domu." Resolution: kept. User: rodzic wylogowuje się, żeby dzieci na jego koncie nie robiły zmian.
- FR-003: Child can log in. Priority: must-have
  > Socrates: Counter-argument considered: "Dziecko korzysta z telefonu rodzica bez własnego konta." Resolution: kept. User: dziecko loguje się u siebie i wylogowuje.
- FR-004: Child can log out. Priority: must-have
  > Socrates: Counter-argument considered: "Dzieci zapominają wylogować się — zbytek w v1." Resolution: kept. User: będą się wylogowywać; jak ktoś zostawi otwarte konto, ktoś inny może odhaczyć że nie zrobił albo że zrobił; mają pracować na swoim koncie.

### Family

- FR-005: Parent can add a child. Priority: must-have
  > Socrates: Counter-argument considered: "Wystarczy na sztywno syn i córka, bez ekranu dodaj dziecko." First resolution: accepted (no add screen). Revisit: user restored add-child window so parent adds son and daughter; not unlimited members.

### Chores

- FR-006: Parent can add chores. Priority: must-have
  > Socrates: Counter-argument considered: "Lista jest zawsze ta sama — dodawanie zbędne." Resolution: kept. User: dobrze później dodać obowiązek, bo w tygodniu i dni świąteczne obowiązki się różnią; samo dodawanie zostaje w v1, rozróżnienie tydzień/święta później.

- FR-007: Parent can see what the child has done. Priority: must-have
  > Socrates: Counter-argument considered: "Wystarczy tak/nie, nie cała lista." Resolution: kept as a list with tak/nie beside each item.

- FR-008: Child can see what they have to do. Priority: must-have
  > Socrates: Counter-argument considered: "Rodzic i tak przeczyta listę na głos." Resolution: kept. User: rodzic nie będzie już mówił.

- FR-009: Child can check off a chore. Priority: must-have
  > Socrates: Counter-argument considered: "Rodzic odhacza po pytaniu dziecka." Resolution: kept. User: dziecko musi zrobić i odhaczyć.

- FR-010: Child can see what they have already done. Priority: must-have
  > Socrates: Counter-argument considered: "Lista już zrobione zaśmieca ekran." Resolution: kept. User: widzi i to i to, żeby wiedział, co już zrobił.
- FR-011: Parent can confirm a child's check-off. Priority: must-have
  > Socrates: Added in business-logic phase. Counter-argument considered: "Rodzic tylko patrzy." Resolution: user chose confirmation — done counts only after parent confirms.
- FR-012: Parent can remove an unconfirmed chore from a child's today list. Priority: must-have
  > Socrates: Counter-argument considered: "Odłączenie od dziecka to edycja; usuwanie zbędne." Resolution: v1 has no chore catalog — a today-row is created for one child (FR-006), so removing it is Delete, not Edit. No text edit, no reassign to the other child, no delete-child in v1. Child cannot delete. Allowed only until the parent has confirmed.

## Non-Functional Requirements

- A parent or child can complete the flow in a web browser on a phone, not only on a computer.

## Business Logic

Aplikacja rozstrzyga, co jest do zrobienia, a co nie: zrobione jest dopiero wtedy, gdy dziecko odhaczy i rodzic to potwierdzi.

Wejścia, które użytkownik podaje: obowiązek dodany przez rodzica na dziś, odhaczenie przez dziecko, potwierdzenie przez rodzica, usunięcie niepotwierdzonego obowiązku przez rodzica. Wynik, który widać: pozycja jest jeszcze do zrobienia, jest zrobiona, albo zostaje zdjęta z listy.

Dziecko widzi swoją listę (co ma zrobić i co już zrobiło). Rodzic ma wgląd w tę samą listę i potwierdza odhaczenie. Dopóki rodzic nie potwierdzi, obowiązek nie jest zrobiony. Rodzic może usunąć niepotwierdzoną pozycję; znika wtedy u rodzica i u dziecka. Po potwierdzeniu pozycji nie usuwa się w v1.

## Access Control

Logowanie loginem i hasłem. Osobne konta: rodzic oraz każde dziecko (syn, córka).

Role:
- Rodzic — zakłada / podpina dzieci (syn i córkę), ustawia obowiązki, widzi, czy są zrobione, usuwa niepotwierdzony obowiązek z listy dziecka na dziś.
- Dziecko — loguje się na swoje konto, widzi swoje obowiązki, odhacza je. Nie może odejmować zadań rodzeństwu ani usuwać obowiązków.

Niezalogowana osoba nie korzysta z list obowiązków.

First version family size: parent + son + daughter (not unlimited).

## Non-Goals

- No notifications and no “didn’t do this yesterday” list — v1 is today’s list only; alerts and overdue from yesterday were deferred.
- No native installable phone application — the product is a web app in the browser, including on a phone.
- No separate weekday vs holiday chore lists — adding chores stays in v1; calendar variants are later.
- No multi-family product or admin for other households — first version is this family only.
- No editing chore text, reassigning a chore to another child, or removing a child account — v1 delete is only FR-012 (parent removes an unconfirmed today-chore).

## Open Questions

(none recorded)
