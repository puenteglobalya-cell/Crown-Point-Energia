# Simulador de reservas — 10 mejoras propuestas

Revisión del 2026-08-01. Complementa las 14 correcciones ya aplicadas al motor
(commit "Fix 14 faults in the reserves simulator engine and screen").

Referencia de mercado: ARIES (Landmark/Halliburton), PHDwin V3, ComboCurve.
La diferencia arquitectónica relevante es que **ARIES es case-centric y confía
en que el usuario mantenga la consistencia, mientras PHDwin es scenario-centric
y la impone desde el sistema**. Nuestro simulador hoy está más cerca de ARIES
sin la madurez de ARIES: 22 tablas de carga manual y ninguna validación previa.
Las mejoras de abajo empujan hacia el modelo scenario-centric.

## Objetivo del simulador (confirmado por el cliente)

**La participación de CPE en la concesión cambia de porcentaje en el tiempo, así
que hay que decidir cuándo perforar cada pozo para optimizar el cash flow.**
Esa es la pregunta que el simulador tiene que responder, y ordena las
prioridades de abajo.

Implementado: **campañas de perforación con restricción de equipos**
(`supabase/20260801_campanas_perforacion.sql`, `lib/reservas/cronograma.ts`,
pestaña "Cronograma").

Se cargan días de perforación, días de terminación, días de mudanza y cantidad
de equipos, y el cronograma se **deriva** — cada pozo va al primer equipo que
se libera, en lugar de escribir cada fecha a mano:

- **1 equipo de perforación** → perforaciones escalonadas, una atrás de la otra.
- **2 equipos** → dos pozos avanzan en paralelo.
- **Equipos de terminación aparte** → el equipo de perforación pasa al pozo
  siguiente mientras otro termina el anterior. Es el solapamiento parcial, y
  hace visible el cuello de botella: con 2 equipos de perforación y 1 de
  terminación, la terminación es la que manda.

Los días de cada etapa se pueden pisar pozo por pozo
(`intervenciones.dias_perforacion`) para el pozo que se sabe más lento.

El cronograma se previsualiza con un Gantt y recién se aplica cuando se
confirma; al aplicar escribe la primera producción como fecha de arranque de la
curva y el inicio de perforación como mes de imputación del CAPEX.

### Barrido automático de fechas de inicio ✅

`POST /api/portal/reservas/campana/barrido`, dentro de la pestaña "Cronograma".
Reprograma la campaña completa mes a mes sobre un rango, corre el motor con
cada arranque y grafica VAN contra fecha de inicio, marcando en rojo los
cambios de participación. No escribe nada: es una herramienta de decisión.

Dos detalles que hacen que el resultado sea válido:

1. **Todos los candidatos se descuentan a la misma fecha base.** Si cada uno se
   descontara a su propio primer mes de flujo, postergar tendría menos meses de
   descuento y el barrido recomendaría siempre esperar.

2. **Se carga el contexto una sola vez.** El motor se separó en `cargarContexto()`
   y la simulación, así que 36 candidatos son 16 queries en total y no 576.
   Correr con `persistir: false` evita además reescribir `cashflow_mensual` en
   cada iteración.

Al aplicar un cronograma, para las intervenciones de tipo perforación también
se mueve `pozos.fecha_alta`: el pozo nuevo nace con la campaña. Un workover no
la toca, porque ese pozo ya venía produciendo.

### El caso real de CPE: la participación CAE (95% → ~80%)

Confirmado por el cliente: hoy la participación es del 95% y más adelante baja
a ~80%. Eso invierte la economía respecto del caso contrario, y cambia cuál es
la pregunta importante.

Verificado numéricamente (6 pozos, 1 equipo, caída en 2028-01):

| Arranque | VAN | Pozos produciendo antes de la caída |
|---|---|---|
| 2026-09 (ya) | **18,78 MM** | 6/6 |
| 2027-03 | 17,16 MM | 6/6 |
| 2027-09 | 15,51 MM | 6/6 |
| 2028-01 | 16,25 MM | 0/6 |
| 2028-09 | 15,24 MM | 0/6 |

Tres conclusiones:

1. **El óptimo es arrancar cuanto antes.** Con la participación cayendo, cada
   mes de demora saca producción de la ventana del 95%.

2. **La curva no es monótona.** Hay un repunte local justo después de la caída
   (15,51 → 16,25 MM): una vez adentro del 80% se paga el 80% del CAPEX en vez
   del 95%. No cambia la decisión, pero es la clase de forma que un tanteo a
   ojo se pierde.

3. **La pregunta relevante deja de ser "cuándo" y pasa a ser "con cuántos
   equipos".** Si la respuesta es "arrancar ya", lo único que queda por decidir
   es cuántos pozos entran en la ventana de participación alta, y eso lo decide
   la cantidad de equipos.

Por eso el barrido compara también cantidades de equipo. Con 20 pozos y la
caída de participación, el segundo equipo agrega **3,05 MM** de VAN; sin cambio
de participación agregaría sólo 1,88 MM. Es decir: **más de un millón de la
value del segundo equipo viene de la caída de participación**, no del descuento.
Esa diferencia es exactamente el argumento para contratarlo, y hay que
compararla contra la tarifa del equipo — que el simulador no conoce.

**Caso inverso, por si aparece en otra concesión.** Con participación que
*sube* (20% → 80%), el óptimo no cae en el mes del cambio sino uno o dos meses
antes: conviene perforar pagando el 20% del CAPEX y producir cobrando el 80%.

**Simplificación a revisar**: el motor multiplica el flujo neto de cada mes por
la participación **de ese mes**, incluida la amortización de un CAPEX que quizá
se incurrió bajo otro porcentaje. En un análisis que gira justamente alrededor
de un cambio de participación, ese detalle puede mover el óptimo uno o dos
meses. Si importa a ese nivel de precisión, hay que trackear la participación
a la que se incurrió cada CAPEX y amortizarlo a esa.

---

Prioridad: 🔴 alta (bloquea confianza en el número) · 🟠 media · 🟢 nice-to-have.

---

## 1. ✅ Preflight: validar el escenario ANTES de correrlo

**Hoy**: los diagnósticos que agregué aparecen *después* de calcular. Si falta
la cotización de Brent de un mes, el motor asume precio 0, produce ingresos 0
para ese mes y devuelve un NPV que parece válido.

**Propuesta**: un semáforo por escenario en la pestaña "Calcular", antes de
apretar el botón. Verde/amarillo/rojo por dimensión: curvas de producción,
precios, regalías, participación, OPEX, impuestos. Con link directo a la
sección de carga que falta completar.

Es el punto donde PHDwin gana: consistencia impuesta por arquitectura, no por
disciplina del usuario.

**Esfuerzo**: medio. Reutiliza la clase `Diagnosticos` de `lib/reservas/engine.ts`
extrayéndola a una función `validarEscenario()` que no escriba nada.

---

## 2. ✅ Price decks nombrados y reutilizables

**Hoy**: `precios_referencia` se carga fila por fila, un registro por
referencia y por mes. Para 20 años son 240 registros a mano por cada
referencia, y cambiar el supuesto de precio implica reescribirlos todos.

**Propuesta**: un objeto "price deck" = precio base + escalación anual (%) +
opcional override por mes, con nombre propio ("Base 2026", "Bull", "Bear",
"Strip NYMEX"). Un escenario referencia un deck. Cambiar el deck recalcula
todo lo que lo usa.

Es el patrón estándar del sector: precio base con escalación, más OPEX fijo y
variable e impuestos. La crítica documentada a las herramientas legacy es
justamente que los inputs quedan hardcodeados y actualizar un price deck
obliga a rehacer el trabajo.

**Esfuerzo**: medio-alto. Tabla nueva `price_decks` + `price_deck_puntos`,
`escenarios.price_deck_id`, y `precioEn()` resolviendo contra el deck.

---

## 3. ✅ Análisis de sensibilidad con tornado chart

**Hoy**: no existe. Para saber cuánto pesa el precio del crudo en el NPV hay
que crear escenarios a mano y compararlos en el Pareto.

**Propuesta**: sobre un escenario ya calculado, mover ±10%/±20% cada variable
(precio petróleo, precio gas, OPEX, CAPEX, producción, tasa de descuento) y
graficar el impacto en NPV ordenado por magnitud. Un tornado chart es
exactamente la visualización que compara el impacto de cada fuente de
incertidumbre sobre un resultado, y es el estándar de presentación para
decisiones de inversión (variables que importan en el tornado, tabla de
sensibilidad de las 2-3 principales, y casos Bull/Base/Bear aparte).

**Esfuerzo**: medio. El motor ya es determinístico y rápido; es correrlo N
veces con multiplicadores. El SVG puede seguir el patrón de `ParetoScatter`,
sin librería nueva.

---

## 4. 🟠 Clonar escenario + diff de supuestos

**Hoy**: crear una variante del caso base implica recargar los datos a mano.
Y en el Pareto se comparan escenarios sin poder ver en qué se diferencian.

**Propuesta**: botón "Duplicar escenario" que copia intervenciones y supuestos,
y una vista de diff lado a lado ("este escenario cambia: CAPEX de WO +15%,
2 pozos nuevos en Bloque G"). Sin esto, comparar escenarios es un acto de fe.

**Esfuerzo**: bajo-medio.

---

## 5. 🟠 Vista "one-line" por pozo y por yacimiento

**Hoy**: o cash flow mes a mes (decenas de miles de filas, ahora paginadas), o
agregado anual. Falta el nivel intermedio, que es el que se usa para decidir.

**Propuesta**: una fila por pozo (y una por yacimiento) con NPV, IRR, payback,
EUR petróleo/gas, netback USD/BOE, primer año de producción, fecha de corte
por límite económico. Ordenable y exportable. El "one-line report" es el
entregable estándar de un reserve report.

**Esfuerzo**: medio. Requiere calcular NPV/IRR por pozo, no solo consolidado —
el motor ya tiene el cashflow por pozo, es agrupar y reusar `irrAnual`.

---

## 6. 🟠 Carga masiva (pegar desde Excel / CSV) en todas las tablas

**Hoy**: el importador de Excel existe solo para curvas de producción. Las
otras 21 secciones son un formulario de un registro a la vez. Cargar precios
mensuales de 3 referencias × 20 años son 720 submits.

**Propuesta**: en cada sección, un área de "pegar desde Excel" que acepte
tabulado/CSV, muestre un preview con las filas válidas e inválidas, y confirme
en un solo insert. ComboCurve vende explícitamente la importación masiva desde
Aries/PHDwin como diferencial.

**Esfuerzo**: medio. `entityConfig.ts` ya declara tipos y campos por tabla, así
que el parser puede ser genérico.

---

## 7. 🟠 Gráficos, no solo tablas

**Hoy**: todo resultado es una tabla de números. El único gráfico es el scatter
del Pareto.

**Propuesta**: tres gráficos que responden las preguntas que siempre se hacen:
perfil de producción (bbl y Mcf por mes, apilado por yacimiento), cash flow
acumulado con el cruce de payback marcado, y waterfall de ingreso bruto →
regalías → OPEX → impuestos → cash flow neto.

**Esfuerzo**: medio. Chart.js ya se usa en el generador de reportes de
ingresos, o SVG a mano como el Pareto.

---

## 8. 🟠 Economía incremental (la intervención vs. no hacerla)

**Hoy**: el motor calcula el valor absoluto de un escenario. El valor de un
workover, en cambio, es el **delta** contra el caso de no intervenir.

**Propuesta**: marcar un escenario como "incremental respecto de X" y reportar
NPV/IRR/payback del diferencial. Esto es directamente el caso de la curva
`GSJ_WO`: lo que se decide no es el valor del pozo, es si el WO paga.

**Esfuerzo**: bajo-medio. Es restar dos series de cashflow ya calculadas y
correr las métricas sobre la diferencia.

---

## 9. 🟠 Trazabilidad de corridas

**Hoy**: `escenario_metricas` guarda el resultado pero no cuándo se corrió ni
con qué datos. Si alguien edita un precio después de calcular, el Pareto sigue
mostrando el NPV viejo sin ninguna advertencia. El Pareto puede estar mezclando
corridas de fechas distintas.

**Propuesta**: sellar cada corrida (timestamp, usuario, tasa, horizonte, hash
de los inputs) y mostrar en la UI "calculado hace 3 días — los datos cambiaron
desde entonces, volvé a correr". Es una advertencia de una línea que evita
presentar un número desactualizado en un directorio.

**Esfuerzo**: bajo.

---

## 10. ✅ Export a Excel con fórmulas vivas

`GET /api/portal/reservas/export?escenario_id=N`, botón en la pestaña
"Resultados". Cinco hojas: Portada (con la convención de bases explicada),
Cash flow mensual, Resumen anual, VAN NI 51-101 y Depleción de reservas.

Lo importante es que **las columnas derivadas van como fórmulas de Excel, no
como valores**. El cash flow neto sale como `=((RAG−Gcias)+Amort−CAPEX)×Part`,
que es literalmente lo que hace el motor: se abre la celda y se ve de dónde
viene el número. Lo mismo con EBITDA, EBIT, BOE, netback, el cierre de
depleción y los totales. Cambiar un supuesto en el detalle recalcula el resto
de la planilla.

Con formato: encabezados con color, panel congelado, autofiltro, anchos y
formatos numéricos (miles, USD, porcentaje), y la fila de consolidado
resaltada.

### Informe final en PDF, con dashboard ✅

`/portal/reservas/informe?escenario_id=N`, con botón en la pestaña
"Resultados". Es una página pensada para imprimirse: fondo blanco, tinta
oscura, saltos de página controlados y sin nada de la interfaz de edición.
Se guarda como PDF con Imprimir → Guardar como PDF, sin sumar dependencias.

Contenido: portada con escenario y proyecto, **dashboard** de ocho KPIs (VAN,
TIR, payback, CAPEX, EUR, netback, cash flow, horizonte), perfil de producción
apilado petróleo/gas en BOE, flujo anual con la curva de acumulado y el cruce
de payback marcado, tabla de VAN a las cinco tasas de NI 51-101, resumen anual
consolidado, detalle por yacimiento y depleción de reservas.

Los gráficos son **SVG inline y no canvas**: el canvas se imprime mal y según
el navegador sale en blanco.

Verificado imprimiendo de verdad. Los gráficos y la hoja de estilos se
extrajeron a `informe/piezas.tsx` para poder renderizarlos fuera de Next, y
con eso se generó un PDF A4 con Chromium headless: salen 3 páginas, con los
cortes donde corresponde y los gráficos vectoriales nítidos.

---

## 11. ✅ Proyectos, costo de entrada y consolidado

`supabase/20260801_proyectos_consolidado.sql` + pestaña "Consolidado".

Se agregó un nivel por encima del escenario: **proyecto**. Cada proyecto
agrupa sus escenarios y el marcado como base es el que entra al consolidado,
que —definido por el cliente— es la **suma de los proyectos**.

Lo que no entraba en el modelo anterior son los desembolsos que no cuelgan de
un pozo, y son justo los que deciden un negocio nuevo: `costos_proyecto` cubre
**precio de compra del área**, bono de firma, compromiso exploratorio, G&A del
proyecto y pasivo de abandono asumido.

La vista separa **VAN operativo** de **costo de entrada**, que es la lectura
que importa para una adquisición: un área puede tener una operación muy buena
y aun así no cerrar al precio que piden por ella. El total se informa además a
las cinco tasas de NI 51-101.

Dos decisiones de modelado explícitas:

- **Base del monto.** El resto de los inputs se carga al 100% y el motor los
  netea, pero un precio de compra normalmente ya es lo que paga CPE por la
  porción que adquiere. Por eso `aplicar_participacion` es un check explícito
  en el formulario y no un supuesto silencioso.
- **Fecha base común.** Todos los proyectos se descuentan a la misma fecha —
  la más temprana entre el primer flujo y el primer costo de entrada, porque
  una compra de área se paga antes de que el activo produzca. Sin eso, sumar
  proyectos que arrancan en años distintos no significa nada.

**Lo que el consolidado todavía NO hace**: no baja G&A corporativo ni intereses
de deuda (`deuda_notas` sigue sin usarse y `intereses_usd` sigue en 0). Es la
suma de los proyectos, no un valor de empresa. Falta también amortizar el
costo de entrada a efectos del impuesto a las ganancias: la columna
`amortizable_meses` ya está en el esquema pero el cálculo todavía lo trata como
salida de caja pura.

---

## Extra — unidades explícitas en la UI

No es una de las 10, pero es riesgo real: el parser convierte m3/d → bbl/mes y
Mm3/d → Mcf/mes, y las tablas muestran números sin unidad. Un dato cargado en
la unidad equivocada no da error, da un resultado plausible y equivocado.
Etiquetar la unidad en cada columna y cada campo de carga es barato y evita la
clase de error más difícil de detectar.

---

## Definiciones del negocio — estado

1. ✅ **`GSJ_WO` resuelto.** Las cuatro curvas del Golfo San Jorge quedaron
   definidas: `GSJ_CH` → El Tordillo (resto de proyectos de ET), `GSJ_PQO` →
   Puesto Quiroga, `GSJ_BLG` → Bloque G, `GSJ_WO` → El Tordillo, categoría
   workover. ET = El Tordillo; la concesión es El Tordillo, La Tapera y Puesto
   Quiroga (LTPQ), Chubut. Seed en
   `supabase/20260801_pozos_tipo_gsj.sql`.

2. ✅ **P1/P2/P3 resuelto**: son Probadas / Probables / Posibles incrementales.
   Ver `ANALISIS-MERCADO-RESERVAS.md` §5 — la depleción se corrigió para
   cascadear entre categorías.

3. ✅ **Base del resumen anual resuelta**: los inputs se cargan al **100% del
   proyecto** y el motor los afecta por la participación. El resumen anual pasó
   a ser **neto a CPE en todas sus líneas, incluidos los volúmenes**, ponderando
   cada mes con su propia participación antes de sumar el año (no sirve aplicar
   un promedio al total, porque la participación cambia en el tiempo).
   `cashflow_mensual` sigue guardando las líneas al 100% con la participación
   del mes en una columna aparte: es la pista de auditoría del proyecto
   completo. Reservas y depleción quedan en volumen físico al 100% — son
   barriles en el subsuelo.


---

## Estado al cierre de esta ronda

Implementado, además de las 14 correcciones del motor:

| | Estado |
|---|---|
| VAN a las 5 tasas de NI 51-101, antes y después de impuestos | ✅ |
| Costo de abandono (ARO) | ✅ |
| Curvas por declinación de Arps | ✅ |
| Campañas con restricción de equipos + Gantt | ✅ |
| Barrido de fechas de inicio + comparación de equipos | ✅ |
| Base neta a CPE en todo el reporte | ✅ |
| Export a Excel con fórmulas vivas | ✅ |
| Proyectos, precio de compra de áreas y consolidado | ✅ |
| Informe PDF con dashboard | ✅ |
| Validación previa (preflight) | ✅ |
| Sensibilidad con tornado | ✅ |
| Reconciliación de reservas — 7 categorías | ✅ |
| Escudo fiscal del costo de entrada | ✅ |
| Capa corporativa: G&A + intereses → valor de empresa | ✅ |
| Price decks (pronóstico y constante) | ✅ |

Pendiente, sin bloquear nada:

- **PDP / PDNP / PUD** (mejora 6 del análisis de mercado): NI 51-101 distingue,
  dentro de las probadas, entre desarrolladas en producción, desarrolladas no
  en producción y no desarrolladas. El esquema no tiene esa dimensión, así que
  hoy no se puede decir qué porción del 2P es PUD.
- **Capital de desarrollo futuro (FDC) por año**: los datos ya están en
  `intervenciones`; falta la vista que los agregue.
- **Clonar escenario + diff**, **vista one-line por pozo**, **carga masiva
  pegando desde Excel**, **gráficos en la pantalla de resultados**,
  **economía incremental (wedge)**, **trazabilidad de corridas**.
- **Amortización del CAPEX a la participación con la que se incurrió**: hoy se
  amortiza a la participación del mes corriente. En un análisis que gira
  alrededor de un cambio de participación puede correr el óptimo uno o dos
  meses.
