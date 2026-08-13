# PRD — Pit Wall
**Setup manager para sim racing (foco inicial: iRacing)**
**Versión:** v0.3 — Alcance ajustado: Porsche Cup reemplaza GT4
**Autor:** Manuel

---

## 1. Resumen ejecutivo

**Pit Wall** es una plataforma web para pilotos de sim racing que quieren **organizar, versionar y validar sus propios setups de auto** a lo largo del proceso de tuning — a diferencia de las herramientas actuales del mercado, orientadas a comprar/descargar setups hechos por terceros.

El corazón del producto es un flujo de **"cambio → feedback → siguiente cambio"**: cada modificación de un setup queda registrada como nueva versión con un diff claro respecto a la anterior, y el piloto puede atar una nota de feedback a esa versión puntual.

**MVP acotado a iRacing, categorías GT3 y Porsche Cup.** Se prioriza tener el parser de archivos `.sto` funcionando antes de construir cualquier pantalla — es la pieza de mayor riesgo técnico y la que más condiciona el resto del producto.

Pensado con ambición de producto (potencial SaaS), aunque se valida primero con uso propio.

---

## 2. Problema y oportunidad

Los pilotos que ajustan sus propios setups hoy dependen de carpetas de archivos `.sto` sueltas, notas mentales o en un bloc aparte, sin forma fácil de ver "¿qué cambié la última vez y qué pasó con eso?".

Relevamiento de la competencia:

| Herramienta | Qué resuelve | Qué NO resuelve |
|---|---|---|
| Garage61 | Setups comunitarios compartidos + telemetría básica (iRacing) | No versiona ni documenta tu propio proceso de tuning |
| Coach Dave Delta | Setups "pro" auto-instalados + coaching con IA + telemetría (multi-sim, pago) | Plataforma pesada y paga; no pensada para tu historial propio |
| GO Setups / SimGrid | Marketplace de setups profesionales | Vendés/comprás setups ajenos, no gestionás los tuyos |
| App "Sim Racing Setups" (iOS) | Guardar setups propios de forma simple | Sin diff, sin bitácora de feedback, solo F1 24/25 |

**Oportunidad:** ser la herramienta específica para el piloto que ajusta sus propios setups y quiere un proceso de tuning estructurado — nicho más chico, mucha menos competencia directa.

---

## 3. Usuario objetivo

**Persona primaria:** piloto de iRacing que compite en GT3 y Porsche Cup, ajusta sus propios setups sesión a sesión, y sigue una metodología de "un cambio por vez + validación con datos reales".

**Persona secundaria (fase futura):** equipos/ligas que comparten y coordinan setups entre varios pilotos del mismo auto.

---

## 4. Propuesta de valor

1. **Diff de versiones** — comparación clara entre iteraciones de un mismo setup.
2. **Bitácora de feedback ligada al cambio** — cada versión lleva una nota de sensación + delta de vuelta.
3. **Foco en iRacing GT3 + Porsche Cup**, sin dispersar esfuerzo en soportar todo desde el día 1.
4. **Pensado para tu propio proceso**, no para vender/comprar setups de otros.

---

## 5. Alcance del MVP

### Dentro del alcance
- **Parser de archivos `.sto` de iRacing** (prioridad #1, se construye y valida antes que cualquier pantalla).
- Login con **Discord OAuth** + email/contraseña como alternativa.
- Carga de setups: importando el archivo `.sto` nativo (parseado automáticamente) o formulario manual como fallback.
- Organización por auto (GT3/Porsche Cup) → pista → condición (quali/carrera/lluvia/etc.).
- Historial de versiones con diff visual entre dos versiones cualquiera.
- Bitácora de feedback: **texto libre + delta de vuelta**, asociada a cada versión. Sin campos estructurados por parámetro — se mantiene simple a propósito, sin diseñar para extensiones futuras.
- Comparación lado a lado de 2+ setups.
- Tags/etiquetas personalizadas.
- **Exportar el setup como archivo `.sto` descargable** — la instalación en la carpeta del juego es manual (el usuario copia el archivo). No hay companion app ni extensión que escriba directo al sistema de archivos en el MVP.

### Fuera de alcance (v1)
- Multi-sim (Le Mans Ultimate, Assetto Corsa) — queda para una fase posterior.
- Categorías de iRacing fuera de GT3 y Porsche Cup (GT4, ovales, monoplaza, etc.).
- Companion app/extensión para instalación automática del setup.
- Telemetría en vivo, coaching con IA.
- Marketplace o compra/venta de setups.
- Apps móviles nativas (solo web responsive).
- Funciones de equipo/liga multi-usuario (preparado en el modelo de datos, no construido).

---

## 6. Historias de usuario (por épica)

### Épica: Cuenta y acceso
- Como piloto, quiero loguearme con Discord o con email/contraseña, para acceder a mis setups desde cualquier PC.
  - *Criterio de aceptación:* login funcional con ambos métodos vía Supabase Auth; sesión persistente; recuperación de contraseña para el método email.

### Épica: Parser de setups (bloqueante, se construye primero)
- Como equipo de desarrollo, necesitamos un parser confiable de archivos `.sto` de iRacing antes de construir cualquier otra funcionalidad.
  - *Criterio de aceptación:* dado un archivo `.sto` real de un auto GT3 o de la Porsche Cup, el parser extrae todos los valores estructurados (aero, suspensión, diferencial, frenos, etc.) sin pérdida de datos, validado contra al menos 5 archivos reales de distintos autos.

### Épica: Gestión de setups
- Como piloto, quiero cargar un setup subiendo el archivo `.sto`, para no tipear cada valor a mano.
  - *Criterio de aceptación:* al subir el archivo, se muestran los valores parseados para confirmar antes de guardar.
- Como piloto, quiero cargar un setup manualmente si no tengo el archivo a mano (fallback).
- Como piloto, quiero organizar mis setups por auto (GT3/Porsche Cup), pista y condición.

### Épica: Versionado y diff
- Como piloto, quiero que cada modificación quede guardada como nueva versión.
- Como piloto, quiero ver un diff claro entre dos versiones (valor anterior → nuevo, solo campos modificados).

### Épica: Bitácora de feedback
- Como piloto, quiero anotar feedback de pista (texto libre) y el delta de vuelta resultante, atado a una versión específica.
- Como piloto, quiero ver el feedback histórico de un setup en orden cronológico.

### Épica: Comparación
- Como piloto, quiero comparar 2+ setups lado a lado.

### Épica: Exportación
- Como piloto, quiero descargar un setup como archivo `.sto` para copiarlo yo mismo a la carpeta de iRacing.

---

## 7. Modelo de datos (entidades principales)

- **Usuario** — cuenta, método de login.
- **Auto** — catálogo fijo inicial: autos GT3 de iRacing y la Porsche Cup (911 GT3 Cup 992).
- **Pista** — catálogo de pistas de iRacing (con variantes de layout).
- **Setup** — agrupador lógico (usuario + auto + pista + condición).
- **VersiónSetup** — snapshot de valores en un momento dado, referencia a la versión anterior (para el diff), archivo `.sto` original adjunto.
- **CampoSetup** — valor individual dentro de una versión (parámetro + valor + unidad); estructura flexible porque cada auto tiene campos distintos.
- **FeedbackEntry** — texto libre + delta de vuelta, asociada a una VersiónSetup.
- **Etiqueta** — tag libre aplicable a un Setup.

---

## 8. Stack tecnológico

Tu entorno de agentes (OpenCode + `gentle-ai`, con workflow de Spec-Driven Development, memoria persistente vía Engram, y skills curadas de `Gentleman-Skills`) ya trae patrones específicos para varias piezas de este stack — eso pesó en la elección.

| Capa | Recomendación | Por qué |
|---|---|---|
| Frontend | **Angular** (standalone components, signals, zoneless) | Ya lo conocés; coincide con las skills curadas `angular/core`, `angular/forms`, `angular/architecture` |
| Estilos | **Tailwind CSS 4** | Skill curada `tailwind-4` |
| Validación de datos | **Zod 4** | Skill curada `zod-4`; clave para validar los datos parseados del `.sto` |
| Lenguaje | **TypeScript estricto** (todo el proyecto) | Skill curada `typescript` |
| Backend / datos / auth | **Supabase** (Postgres + Auth + Storage + Row Level Security) | Sin skill curada propia, pero minimiza infraestructura a mantener; RLS resuelve el aislamiento por usuario desde el día 1, con margen para crecer a SaaS real |
| Testing | **Playwright** (E2E) + TDD estricto desde el día 1 | Skill curada `playwright`; `gentle-ai` activa Strict TDD Mode vía `/sdd-init`; encaja con tu propia metodología de "un cambio por vez + validación" |
| Hosting | Vercel/Netlify (frontend) + Supabase Cloud (backend) | Deploy simple, sin servidores propios |

**Convención de repo:** `PRD.md` (este documento) en la raíz del repo, siguiendo el mismo patrón que usa `gentle-ai` internamente, para que el orquestador SDD lo tome como fuente de verdad y vaya generando specs por feature a medida que se ataca cada pieza.

---

## 9. Consideraciones no funcionales

- **Multi-tenancy y seguridad:** Row Level Security de Supabase desde el día uno — cada usuario accede solo a sus propios setups.
- **Escalabilidad:** Postgres administrado soporta crecimiento sin cambios de arquitectura en el corto/mediano plazo.
- **Portabilidad de datos:** exportación en formato `.sto` nativo, el usuario nunca queda atado a la plataforma.
- **Calidad:** TDD estricto — cada feature se desarrolla con tests antes o junto con la implementación, apoyado por el workflow SDD del entorno de agentes.

---

## 10. Roadmap por fases

0. **Fase 0 — Parser (bloqueante):** validar el parser de `.sto` contra archivos reales de al menos 5 autos (GT3 y Porsche Cup) antes de tocar UI.
1. **Fase 1 — MVP:** todo lo listado en la sección 5, sobre iRacing GT3/GT4 únicamente.
2. **Fase 2:** companion app o extensión para instalación automática del setup (resuelve la limitación de que una web app no puede escribir directo al sistema de archivos); expansión a más categorías de iRacing.
3. **Fase 3:** multi-sim (Le Mans Ultimate, Assetto Corsa); telemetría en vivo.
4. **Fase 4 — Producto/SaaS:** modelo de monetización, funciones de equipo/liga.

---

## 11. Riesgos y preguntas abiertas

- **Parser de `.sto`:** máximo riesgo técnico del proyecto — es binario propietario no documentado oficialmente. Se ataca primero y de forma aislada, antes de comprometer el resto del cronograma.
- **Instalación manual en el MVP:** aceptado como limitación consciente; la automatización queda para fase 2.
- **Modelo de monetización:** no definido — a resolver en fase 4.

---

## 12. Próximos pasos sugeridos

1. Conseguir 5+ archivos `.sto` reales (distintos autos GT3 y al menos uno de la Porsche Cup) y prototipar el parser de forma aislada, sin UI.
2. Una vez validado el parser, definir el modelo de datos exacto por auto (los campos varían entre GT3 y GT4).
3. Levantar el proyecto base: Angular + Supabase + TDD configurado desde el primer commit.
4. Primer flujo end-to-end: login (Discord/email) → importar setup vía parser → ver historial.
