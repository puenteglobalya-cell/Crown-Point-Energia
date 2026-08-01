# Simulador de reservas — análisis contra el estándar y el software del mercado

Revisión del 2026-08-01. Complementa `MEJORAS-SIMULADOR.md` (que mira usabilidad)
con una comparación contra **el estándar regulatorio que CPE ya usa** y contra
los paquetes comerciales del sector.

---

## El dato que reencuadra todo

El sitio de la empresa ya lo declara (`components/Footer.tsx`):

> "Las reservas de petróleo y gas se reportan conforme a los estándares de la
> Canadian Securities Administrators (CSA) **National Instrument 51-101**."

Y las reservas están certificadas por **Sproule ERCE**, reportadas en **2P**
(`supabase/20260722_reserves_2p_and_tdf_removal.sql`), con Crown Point Energy
Inc. cotizando en **TSXV: CWV**.

Es decir: el simulador no tiene que parecerse a un modelo genérico de
valuación, tiene que producir **las salidas que pide el Form 51-101F1**. Hoy
no las produce. Eso es lo que hace que el gap sea concreto y no una cuestión
de gusto.

Nota sobre SEC: no aplica. Las reglas SEC piden valor presente sólo de
reservas probadas, a precio constante (promedio de 12 meses) y a 10% —
distinto de NI 51-101, que pide precios de pronóstico y cinco tasas. Si
en algún momento hay un listado en EE.UU., es un segundo juego de salidas.

---

## Implementado en esta revisión

### 1. VAN a las cinco tasas obligatorias, antes y después de impuestos ✅

NI 51-101 exige el valor presente del *future net revenue* **sin descontar y a
5%, 10%, 15% y 20%**, y **antes y después** de deducir el impuesto a las
ganancias. El simulador calculaba una sola tasa y sólo después de impuestos.

Ahora la pestaña "Calcular escenario" muestra la tabla completa en el formato
del Form 51-101F1. El flujo antes de impuestos se reconstruye de las columnas
que ya se guardaban, así que no hizo falta cambiar el esquema.

`lib/reservas/engine.ts` → `calcularNpvPorTasa()`, `TASAS_NI_51_101`.

### 2. Costo de abandono y remediación (ARO) ✅

NI 51-101 pide informar el valor de las reservas **neto de los costos futuros
de abandono y remediación**. El motor cortaba el pozo por límite económico y
simplemente dejaba de generar filas: el cierre salía gratis y **todo escenario
tenía el VAN sobrestimado**.

Ahora hay `pozos.costo_abandono_usd`, que se imputa como salida de caja en el
último mes de vida económica del pozo, ponderada por la participación.

⚠️ Requiere correr `supabase/20260801_reservas_abandono.sql`. El motor lee la
columna de forma defensiva (`?? 0`), así que funciona con o sin la migración —
sin ella, el comportamiento es el de antes.

Limitación conocida: el costo se suma dentro de `capex_usd` en lugar de tener
columna propia, porque PostgREST exige que todas las filas de un insert tengan
las mismas claves. Consecuencia: el "CAPEX total" del Pareto ahora incluye el
abandono. Si conviene separarlo, es agregar `cashflow_mensual.abandono_usd` en
la misma migración.

### 3. Generador de curvas por declinación de Arps ✅

Cargar una curva eran 240 filas a mano o un Excel con el formato exacto. Ahora
con **caudal inicial, declinación efectiva anual y factor b** queda definida la
curva completa, con preview del EUR antes de guardar y límite de abandono
opcional.

Arps es el método convencional de análisis de declinación y el estándar para
reservas convencionales — que es el caso de CPE (Golfo San Jorge, Neuquina,
Cuyana). Los paquetes del mercado lo tienen como funcionalidad central: Val Nav
destaca "rapid type well creation" y DCA asistida; el DCA es el núcleo de
ComboCurve.

`lib/reservas/arps.ts` — verificado numéricamente: b=0 con De=25% da
exactamente 0,7500 del caudal inicial al año 1; la armónica (b=1) declina más
lento que la exponencial a igual De (23,0 vs 5,6 bbl/d a 10 años); EUR en BOE
respeta 6 Mcf = 1 BOE.

---

## Lo que falta, por prioridad

### 4. 🔴 Reconciliación de reservas — 7 categorías obligatorias

**El gap más grande contra el estándar.** NI 51-101 exige explicar el cambio
de reservas año contra año en categorías definidas:

| Categoría | ¿La tenemos? |
|---|---|
| Producción | ✅ (`reservas_depletion_anual.depletion_boe`) |
| Revisiones técnicas | ❌ |
| Extensiones y recuperación mejorada | ❌ |
| Descubrimientos | ❌ |
| Adquisiciones | ❌ |
| Cesiones (dispositions) | ❌ |
| Factores económicos | ❌ |

Tenemos **1 de 7**. Nuestro roll-forward es apertura → producción → cierre,
que no es una reconciliación: es sólo depleción. Sin las otras seis, el
simulador no puede producir la tabla que se presenta al regulador ni explicar
por qué las reservas cambiaron.

Val Nav vende "automated reserves reconciliation" como funcionalidad
destacada, lo que da una idea de cuánto pesa en el flujo de trabajo real.

Esquema propuesto:

```sql
create table reservas_movimientos (
    id             bigint generated always as identity primary key,
    yacimiento_id  bigint not null references yacimientos(id),
    categoria      text not null check (categoria in ('P1','P2','P3')),
    anio           int not null,
    tipo           text not null check (tipo in (
                     'produccion','revision_tecnica','extension_recuperacion_mejorada',
                     'descubrimiento','adquisicion','cesion','factores_economicos')),
    boe            numeric(16,2) not null,  -- con signo
    nota           text
);
```

La producción la sigue calculando el motor; las otras seis se cargan a mano
(vienen del informe del evaluador). El roll-forward pasa a ser
apertura + Σ movimientos = cierre, con un chequeo de que cierre el cuadre.

**Esfuerzo**: medio.

### 5. 🔴 Semántica de P1/P2/P3 y el factor de certeza — decisión pendiente

Hay una ambigüedad real en el esquema. `reservas_anuales.categoria` es
`P1|P2|P3`, y el motor las trata como **tres bolsas independientes**, cada una
con su apertura y cada una depletada por la producción total del yacimiento.

Eso es consistente si P1/P2/P3 significan **1P / 2P / 3P acumulados** (que es
como reporta CPE: "2P Sproule ERCE"). Pero entonces el factor de certeza que
dejé conectado (`parametros_certeza_reservas`: P1=100%, P2=50%, P3=20%) **no
tiene sentido aplicado a un total acumulado** — NI 51-101 no pondera así las
categorías acumuladas, y multiplicar un 2P por 0,5 da un número sin
significado estándar.

Si en cambio significan **Probadas / Probables / Posibles incrementales**, el
factor de certeza sí es una práctica interna razonable, pero entonces la
depleción está mal: no se puede restar la producción total de cada bolsa por
separado.

**Las dos lecturas no pueden ser ciertas a la vez y hoy el código mezcla
ambas.** Necesito la definición para corregirlo. Lo dejé como estaba y lo
marco acá en lugar de elegir yo, porque cambia los números de reservas
reportados.

### 6. 🟠 Categorías de estado de desarrollo (PDP / PDNP / PUD)

NI 51-101 distingue, dentro de las probadas, entre **desarrolladas en
producción**, **desarrolladas no en producción** y **no desarrolladas**. El
esquema no tiene esta dimensión, y es la que gobierna cuánto capital futuro
hace falta y qué parte de las reservas ya está en línea.

Es una columna más en `reservas_anuales` y en `pozos_tipo`, pero cambia el
reporte: hoy no podemos decir qué porción del 2P es PUD.

### 7. 🟠 Capital de desarrollo futuro (FDC) por año

NI 51-101 pide informar los costos de desarrollo futuro por año. La
información está en `intervenciones.capex_usd` con su fecha, así que es
**agregarla y mostrarla** — no hace falta cargar nada nuevo. Es una vista
nueva sobre datos que ya existen, probablemente la mejora de mejor relación
esfuerzo/valor que queda.

### 8. 🟠 Precios de pronóstico y precios constantes

NI 51-101 pide el valor de las reservas bajo **precios de pronóstico**
(el deck del evaluador) y también bajo **precios constantes**. Hoy sólo hay un
juego de precios por escenario. Se resuelve con los *price decks* nombrados que
propuse como mejora #2 en `MEJORAS-SIMULADOR.md`: un deck "constante" y un
deck "pronóstico Sproule", y el mismo escenario corrido contra los dos.

### 9. 🟠 Casos base / wedge / total

Val Nav modela "base, wedge, or total cases – standalone or in combination".
*Wedge* es el término del sector para el incremento sobre el caso base — o
sea, exactamente la economía incremental que propuse como mejora #8. Vale
adoptar la nomenclatura del mercado en la UI: quien venga de Val Nav o Aries
la va a reconocer.

### 10. 🟠 Metadatos del evaluador

`reservas_anuales` tiene `fecha_corte` pero no **quién** evaluó, con qué deck
de precios y bajo qué fecha efectiva. Para un informe certificado por Sproule
ERCE eso es parte del dato, no un adorno: sin esos campos no se puede
distinguir una estimación interna de una certificación externa.

### 11. 🟢 Reserve Life Index (RLI) y relación R/P

Reservas dividido producción anual. Es un KPI de una línea que ya se puede
calcular con lo que hay, y es de los primeros números que mira un inversor.

### 12. 🟢 Agregación aritmética vs probabilística

Sumar 1P propiedad por propiedad es conservador y sumar 3P es optimista, por
cómo se combinan las probabilidades. Hoy el motor suma aritméticamente. Es
correcto como primera aproximación y consistente con la práctica
determinística, pero conviene dejarlo dicho en la UI para que nadie lea el
consolidado como si fuera probabilístico.

---

## Posicionamiento contra los paquetes del mercado

| | ARIES | PHDwin | Val Nav | ComboCurve | **CPE hoy** |
|---|---|---|---|---|---|
| Economía mensual | ✅ | ✅ | ✅ | ✅ | ✅ |
| Escenarios | case-centric | scenario-centric | ✅ | ✅ | parcial |
| DCA / curvas tipo | ✅ | ✅ | ✅ | ✅ (núcleo) | ✅ *(nuevo)* |
| VAN multi-tasa | ✅ | ✅ | ✅ | ✅ | ✅ *(nuevo)* |
| ARO / abandono | ✅ | ✅ | ✅ | ✅ | ✅ *(nuevo)* |
| Reconciliación de reservas | ✅ | ✅ | ✅ automatizada | ✅ | ❌ |
| PDP/PDNP/PUD | ✅ | ✅ | ✅ custom | ✅ | ❌ |
| Sensibilidad / tornado | ✅ | ✅ | ✅ | ✅ | ❌ |
| Validación previa | parcial | ✅ por diseño | ✅ | ✅ | ❌ |
| Base/wedge/total | ✅ | ✅ | ✅ | ✅ | ❌ |
| GHG / emisiones | ❌ | ❌ | parcial | ✅ | ❌ |

La diferencia de fondo entre los dos históricos: **ARIES es case-centric y
confía en que el usuario mantenga la consistencia; PHDwin es scenario-centric
y la impone desde la arquitectura**. Nuestro simulador está hoy más cerca de
ARIES sin su madurez. Las mejoras 4, 5 y la validación previa son las que lo
mueven hacia el modelo que impone consistencia, que es el que conviene cuando
el número termina en un informe regulado.

---

## Orden sugerido

1. Definir la semántica de P1/P2/P3 (#5) — bloquea cualquier trabajo de reservas.
2. Correr `20260801_reservas_abandono.sql` y cargar costos de abandono.
3. FDC por año (#7) — datos ya cargados, sólo falta la vista.
4. Reconciliación de 7 categorías (#4) — el gap grande contra el estándar.
5. Price decks pronóstico/constante (#8) — habilita también sensibilidad.
6. PDP/PDNP/PUD (#6).

---

## Fuentes

- [Companion Policy 51-101 (OSC)](https://www.osc.ca/en/securities-law/instruments-rules-policies/5/51-101/companion-policy-51-101-standards-disclosure-oil-and-gas-activities-blacklined)
- [NI 51-101 texto (BC Laws)](https://www.bclaws.gov.bc.ca/civix/document/id/loo79/loo79/34_342_2003)
- [Form 51-101F1 — Statement of Reserves Data (BCSC)](https://www.bcsc.bc.ca/-/media/PWS/Resources/Securities_Law/HistPolicies/HistPolicy5/51101F1-Statement-of-reserves-data-and-other-oil-and-gas-information-F-Blackline-Amendment-Proposed.DOC)
- [NI 51-101 Reserves Reconciliation, Part 1 (JCPT / OnePetro)](https://www.onepetro.org/journal-paper/PETSOC-04-11-HT)
- [CSA Notice 51-313 — 51-101 FAQs (ASC)](https://www.asc.ca/-/media/ASC-Documents-part-1/Regulatory-Instruments/2018/10/1444857-v6-51-101-FAQs-CSA-NOTICE-51-313-Pub-Apr-8-04-1.pdf)
- [NI 51-101 sets standards (CIM)](https://mrmr.cim.org/en/library/magazine-articles/oil-and-gas-disclosure-requirements-and-new-issues-ni-51-101-sets-standards/)
- [ARIES vs PHDwin](https://phdwin.com/aries-vs-phdwin/)
- [Val Nav — Planning, Economics and Reserves (Quorum)](https://aucerna.com/products/val-nav/)
- [Val Nav 2021 release](https://aucerna.com/blog/val-nav-2021-release-announcement/)
- [ComboCurve para reservas](https://combocurve.com/blog/blog-combocurve-for-oil-and-gas-reserves/)
- [Arps decline analysis (IHS Harmony)](https://www.ihsenergy.ca/support/documentation_ca/Harmony_Enterprise/latest/content/html_files/analysis_types/arps_decline_analysis.htm)
- [Arps DCA — guía práctica (RFour Energy)](https://rfourenergy.com/blog/arps-dca-practical-guide)
