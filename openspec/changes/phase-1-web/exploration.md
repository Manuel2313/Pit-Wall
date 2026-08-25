# Exploration: phase-1-web — Fase 1 MVP web (Angular + Supabase + TDD)

## Current State

Fase 0 (`.sto` parser) is **archived and closed** (2026-08-19, master @ `e70dfc3`). Baseline:
- `packages/@pit-wall/sto-parser` (public): container parse/serialize with byte-identical round-trip, UTF-16LE notes trailer, typed `CarSetup` overlay via Zod 4. **P4 re-plan reality: the `.sto` payload is opaque/encrypted — typed values come from the official garage HTML export (`parseFerrariSetupHtml`), NOT from `.sto` bytes.** Public API: `parseSto`, `serializeSto`, `StoDocument` (header/payload/trailer/notes/overlay:null), `carSetupSchema`/`safeParseCarSetup`, `parseFerrariSetupHtml`.
- `packages/@pit-wall/sto-validation-oracle` (private): read-only fixture registry (5 files, 4 distinct cars, SHA-256-pinned), byte-diff RE harness, mutator, HTML oracle, acceptance gate `GATE_MIN_CARS = 4`. `IRacingSetups/` is read-only; no writes ever.
- Toolchain: npm workspaces (`packages/*`), TypeScript **7.0.2** at root (strict base tsconfig), Vitest 3.2.7, Zod 4.4.3. npm 10.8.1 rejects `workspace:*`; packages link by plain `"0.0.0"` (README-documented). Root `npx tsc --noEmit` and `npx vitest run` are green (67/67).
- `openspec/config.yaml` still targets **not-yet-installed** runners (`ng test`, `npx playwright test`) and carries historical **≥5-car** wording (pending item **S3**); context block still says "PRD v0.3". Archive report recommends aligning S3 **before Fase 1 spec work**.
- No web app, no Supabase, no CI, no deployment exists yet. Delivery in Fase 0 landed directly on master; **for Fase 1 the human decided: work units go on branches with PRs BEFORE merging to master** (stacked-to-main).

## Fase 1 MVP Surface (PRD §5/§6/§7)

### User stories per epic
| Epic | Stories | MVP acceptance (PRD) |
|---|---|---|
| Cuenta y acceso | Login Discord OAuth + email/password; sesión persistente; recuperación de contraseña (email) | Ambos métodos vía Supabase Auth |
| Gestión de setups | Import `.sto` (mostrar valores parseados antes de guardar); carga manual (fallback); organización por auto → pista → condición | Auto GT3/Porsche Cup, pista con layout, condición (quali/carrera/lluvia/etc.) |
| Versionado y diff | Cada modificación = nueva versión; diff claro entre dos versiones (solo campos modificados) | Referencia a versión anterior en el modelo |
| Bitácora de feedback | Texto libre + delta de vuelta por versión; historial cronológico | Sin campos estructurados por parámetro (simple a propósito) |
| Comparación | 2+ setups lado a lado | — |
| Exportación | Descargar `.sto` para copiarlo a la carpeta de iRacing | Instalación manual, sin companion app |
| Tags | Etiquetas personalizadas sobre un Setup | — |

### Data model entities (PRD §7 → Postgres/Supabase)
- `Usuario` → `profiles` (extends `auth.users`), owner of everything; **RLS por `auth.uid()`**.
- `Auto` — catálogo fijo: Ferrari 296 GT3, Mustang GT3, Mercedes-AMG GT3, Porsche 911 GT3 Cup 992 (los 4 autos validados). GT4 NO (fuera de alcance §5).
- `Pista` — catálogo con variantes de layout (iRacing track id).
- `Setup` — agrupador lógico `(user_id, car_id, track_id, condition)`.
- `VersiónSetup` — snapshot: número de versión, `parent_version_id`, archivo `.sto` original (Supabase **Storage**), SHA-256, overlay tipado `jsonb` (nullable — solo si vino de export HTML o entrada manual), notas.
- `CampoSetup` — PRD lo lista; implementación pragmática: el overlay tipado (`categories: Record<string, Record<string, string>>`, ya definido en sto-parser) cubre este rol sin tabla de EAV.
- `FeedbackEntry` — `(setup_id, version_id, text, lap_delta, created_at)`.
- `Etiqueta` + relación setup↔tag (user-scoped).

### Non-functional constraints
- RLS multi-tenancy desde el día 1 (cada usuario solo ve lo suyo; buckets de Storage también).
- TDD estricto (RED→GREEN), TS estricto en todo el proyecto.
- Portabilidad: export `.sto` nativo — el usuario nunca queda atado a la plataforma.
- Hosting: Vercel/Netlify (frontend) + Supabase Cloud (backend). Web responsive, sin apps nativas.

### Key product tension (must be resolved in proposal)
**PRD acceptance "al subir el archivo, se muestran los valores parseados para confirmar" cannot be met from the `.sto` alone** — Fase 0 proved the payload is encrypted/opaque. Viable re-scope: (a) import shows parsed *metadata* (auto/track ids crudos, notas UTF-16LE, tamaño, SHA-256) + (b) opcionalmente el export HTML oficial del garage para valores tipados + (c) entrada manual como fallback. Consecuencias en cadena: el **diff tipado** y la **comparación** solo existen cuando hay overlay (HTML/manual); sin overlay queda diff/byte-diff a nivel de regiones (el harness byte-diff de Fase 0 ya modela ese vocabulario). El **export `.sto`** es byte-idéntico para versiones importadas (round-trip probado); versiones creadas 100% manuales NO tienen export `.sto` en el MVP — la UI debe decirlo explícitamente.

## Affected Areas

- `apps/web/` (nuevo) — aplicación Angular standalone/signals/zoneless + Tailwind 4.
- `packages/sto-parser` — consumido por la app (workspace link plain "0.0.0"); **no se modifica** salvo S1/S4 wording opcional.
- `openspec/config.yaml` — alinear S3 (≥5→≥4, PRD v0.4, lock de runners post-scaffold) **antes de la planificación de Fase 1**.
- `openspec/changes/archive/2026-08-19-phase-0-parser/proposal.md` — refs históricas ≥5 (S3; orchestrator-owned).
- `package.json` (root) — scripts nuevos (`test:web`, `test:e2e`, `build:web`).
- `README.md` — sección Fase 1 (stack, comandos, política de entornos).
- `PRD.md` — inconsistencia de wording §10 "GT3/GT4" vs §5/§6 "GT3 + Porsche Cup" (clarificar con el usuario).

## Stack vs Available Skills

| Pieza | Skill curada | Match / riesgo |
|---|---|---|
| Angular (standalone, signals, zoneless) | `angular/core`, `angular/architecture`, `angular/forms`, `angular/performance` | ✅ Alto. Recomendación: **Angular 22** (zoneless por defecto, Vitest estándar, Signal Forms experimental). |
| Tailwind CSS 4 | `tailwind-4` | ✅ Alto (`@tailwindcss/vite` con el builder Vite de Angular). |
| Zod 4 | `zod-4` | ✅ Alto (overlay, validación de env, DTOs). |
| TypeScript estricto | `typescript` | ✅ Alto — con matiz: root usa TS **7.0.2**; Angular 22 exige TS `>=6.0.0 <6.1.0` → TS 6.x anidado en `apps/web` (npm lo instala aparte). Verificar en el scaffold. |
| Playwright E2E | `playwright`, `playwright-expert` | ✅ Alto (instalar browsers; auth E2E contra Supabase real o mock de red). |
| Supabase (Auth/Postgres/RLS/Storage/CLI) | **ninguna** | ⚠️ Gap real: RLS, políticas, migraciones, CLI, local dev. Mitigación: docs oficiales vía context7 en design/apply + los pasos humanos (cuenta, proyecto, Discord app). |
| Diseño de API/contratos | `api-designer` | 🟡 Parcial: útil para definir la capa de datos/cliente Supabase como contrato tipado. |
| UI | `frontend-design` | 🟡 Para pulido visual en work units posteriores (no en el primer slice). |

### Environment mismatches (verified, not guessed)
1. **Node v20.16.0 NO satisface Angular 20/21/22** (requieren `^20.19.0 || ^22.12.0 || ^24.0.0`; Angular 22: `^22.22.3 || ^24.15.0 || >=26`). Node 20 está EOL (30-abr-2026). Angular 19 (única versión que aceptaría 20.16.0) está EOL (19-may-2026). **→ Upgrade de Node a 22 LTS (≥22.22.3) o 24 es requisito previo obligatorio.** Decisión humana + cambio de entorno (nvm-windows/winget).
2. **Docker NO está instalado** → `supabase start` (stack local) no es viable. Camino realista: **proyecto Supabase hosted (free tier)** con `supabase link` + migraciones vía CLI; E2E contra el proyecto dev con usuario de test dedicado. Decisión humana (cuenta/credenciales).
3. Workspace linking de `sto-parser` (TS crudo exportado vía `exports` → `./src/index.ts`) dentro de la app Angular: debe funcionar con el builder Vite/esbuild, pero **se valida en el primer work unit** (import smoke + `tsc` + `ng build`).
4. npm 10: usar versión plana `"0.0.0"` (documentado en README); no usar `workspace:*`.

## First Slice Evaluation (PRD §12.3–§12.4)

- §12.3 "Levantar el proyecto base: Angular + Supabase + TDD configurado desde el primer commit" → **sí, es el primer work unit** (base) + segundo work unit (fundación Supabase).
- §12.4 "Primer flujo end-to-end: login → importar setup vía parser → ver historial" → tercer work unit, **con email/password primero** (Discord OAuth espera: requiere la app de desarrollador de Discord del usuario + provider config en Supabase).

**En el primer work unit** (base, PR1): scaffold `apps/web` (Angular 22, standalone, signals, zoneless, Tailwind 4, TS estricto), runner unit Vitest (`@angular/build:unit-test`, `runner: vitest`) con primer test RED→GREEN (app renderiza), Playwright instalado con smoke E2E, import smoke de `@pit-wall/sto-parser`, scripts root, docs mínimas. **Espera**: Supabase (auth/schema/RLS), login, import, historial, diff, feedback, comparación, export, tags, Discord OAuth, deploy.

## Approaches

1. **Monorepo extendido: `apps/web` + `packages/*` existentes** — Angular 22, Tailwind 4, Vitest unit, Playwright E2E, `@supabase/supabase-js` directo, hosted Supabase.
   - Pros: consumir `sto-parser` sin fricción; un solo repo (PRD/openspec/registry ya viven aquí); config.yaml y TDD ya declarados; PRD §8 alineado.
   - Cons: Node upgrade obligatorio; sin skill Supabase; RLS requiere cuidado manual.
   - Effort: Medium (base) / High (Fase 1 completa)
2. **Angular 19 sobre Node 20.16 actual** — sin upgrade de entorno.
   - Pros: cero cambio de entorno.
   - Cons: framework EOL en 3 meses; arrancar un MVP nuevo en EOL es deuda desde el día 1.
   - Effort: Low (scaffold) / High (deuda)
3. **Repo web separado** (fuera de este monorepo).
   - Pros: aislamiento total.
   - Cons: pierde consumo directo de `sto-parser`, PRD/openspec, y el registro de skills; duplica config.
   - Effort: High
4. **Supabase local vía Docker** (instalar Docker Desktop).
   - Pros: TDD/RLS loop local completo, sin tocar datos reales.
   - Cons: cambio de entorno pesado; Docker Desktop en Windows es lento/volátil; alternativo al camino hosted.
   - Effort: Medium

## Recommendation

**Approach 1, con estos matices:**
- **Angular 22** + **Node 22 LTS (≥22.22.3) o 24** — prerequisito de entorno, decidido por el humano ANTES de proponer el primer work unit.
- **Supabase hosted (free tier)**: `supabase init/link`, migraciones versionadas en `supabase/migrations/` (tablas + RLS + bucket policies), cliente tipado con env validado por Zod. Sin Docker.
- **Primer flujo §12.4 con email/password**; Discord OAuth como work unit posterior (depende de credenciales del usuario).
- **Re-scope del criterio de import** (payload opaco): metadata + notas + (opcional) export HTML + entrada manual — decisión de producto a confirmar en proposal/specs.
- **S3 timing**: alinear `config.yaml` (≥5→≥4, PRD v0.4, runners) y anotar `proposal.md` archivado **durante la fase de proposal de phase-1-web, antes de spec** (las rules de specs derivan del config). Commit docs pequeño, orchestrator-owned.

### Work-unit / branch / PR plan (stacked-to-main, presupuesto 400 líneas)
Cada unit = rama + PR hacia master, en cadena:
1. **PR1 — `feat/web-base`**: scaffold Angular 22 + Tailwind 4 + Vitest + Playwright smoke + import smoke de sto-parser + scripts root + docs. (~400 líneas autoradas; archivos generados excluidos del conteo de riesgo). Rollback: borrar `apps/web` + revert scripts.
2. **PR2 — `feat/supabase-foundation`**: migraciones (profiles, cars, tracks, setups, setup_versions, feedback_entries, tags, join; RLS; bucket Storage) + cliente `supabase-js` tipado (Zod env) + login email/password + E2E login. Rollback: revert migración + código.
3. **PR3 — `feat/first-e2e-flow`**: import `.sto` vía `@pit-wall/sto-parser` (preview metadata/notas) → confirmar → guardar versión (Storage + DB) → historial cronológico de versiones → E2E completo: login → import → historial (PRD §12.4). Rollback: revert feature code.
4. **WUs posteriores** (fuera del primer slice): entrada manual, versionado/diff, feedback, comparación, export `.sto`, tags, Discord OAuth, deploy Vercel/Netlify, pulido responsive.

## Risks

- **Node 20.16 EOL/incompatible con Angular 20+** — bloquea el scaffold; requiere upgrade humano (Node 22.22.3+/24). Riesgo Alto, mitigación: decidir antes de proposal.
- **Sin Docker → Supabase hosted obligatorio** — E2E/RLS dependen de un proyecto real con credenciales del usuario y usuario de test dedicado. Riesgo Medio.
- **Sin skill curada de Supabase** — RLS mal escrito = fuga multi-tenant. Mitigación: docs oficiales (context7) en design/apply, revisión de políticas por work unit, tests de RLS (usuario A no ve datos de B).
- **Payload `.sto` opaco vs criterio PRD** — re-scope necesario (metadata/HTML/manual); si no se confirma, el MVP no cumple el criterio literal. Riesgo de alcance, decisión de producto.
- **Export `.sto` solo para versiones importadas** — versiones manuales sin export; comunicar en UI. Riesgo de expectativa.
- **TS 7 root vs TS 6.x de Angular** — verificar anidamiento en PR1 (`tsc` + `ng build`).
- **Workspace link de TS crudo en la app Angular** — validar en PR1; fallback: build previo de sto-parser a `dist/` (cambio en el paquete, revisar con cuidado).
- **PRD §10 "GT3/GT4" vs §5/§6 "GT3 + Porsche Cup"** — clarificar con el usuario (afecta catálogo de autos).
- **Presupuesto de review** — scaffold generado es grande; mantener PR1 bajo 400 líneas autoradas (excluir archivos generados del conteo, como en Fase 0).

## Open Questions

1. ¿Autorizás upgrade de Node a 22 LTS (≥22.22.3) o 24? (prerequisito, no es cambio de código)
2. ¿Tenés cuenta de Supabase y preferís proyecto hosted free-tier (sin Docker) o instalar Docker para stack local?
3. ¿Están disponibles las credenciales de la app de desarrollador de Discord (client id/secret) para OAuth, o lo diferimos a un work unit posterior?
4. PRD §10 dice "GT3/GT4" pero §5/§6 dicen "GT3 + Porsche Cup" — ¿cuál es el alcance real del catálogo de autos? (los 4 validados son GT3 + Porsche Cup; GT4 no está validado)
5. ¿Aceptás el re-scope del import: metadata + notas + opcional export HTML + entrada manual en vez de "valores parseados del `.sto`"?
6. Vercel o Netlify (preferencia) — para el work unit de deploy posterior.

## Ready for Proposal

**Sí** — con 3 decisiones del usuario antes/durante proposal: (1) upgrade de Node, (2) camino Supabase (hosted vs Docker), (3) re-scope del criterio de import + wording GT3/GT4 del PRD §10. El orquestador debería además alinear S3 (config.yaml ≥5→≥4, PRD v0.4, runners) como commit docs propio en la fase de proposal, antes de spec.