# MSC — Auditoría de integración de proveedores (TarCan) e inventario híbrido

Fecha: 2026-11-27 · Rama: `claude/msc-supplier-integration-audit-exgww4` · Estado: **solo investigación. No se implementó nada, no se tocó producción ni ninguna base de datos de MSC.**

Convención: **[H]** hecho verificado en esta sesión (con evidencia) · **[E]** estimación · **[P]** propuesta · **[?]** desconocido / requiere confirmación.

---

## A. Executive Summary

**Viabilidad técnica: alta.** El modelo actual (Species → Product → Specimen, checkout por Stripe Checkout, fulfillment, cron en Vercel) admite una capa de "ofertas externas" sin crear ejemplares ficticios, siempre que las ofertas externas vivan en tablas propias y solo se conviertan en `Specimen` al recibir el animal físico.

**Viabilidad comercial: condicionada, no demostrada.**
- [H] La fuente de datos de TarCan existe y es pública, pero **no contiene cantidades de stock** (ver C). Por tanto cualquier política "stock proveedor → máximo ofrecido" es inaplicable hoy; hay que operar con disponibilidad *desconocida*.
- [H] Los términos de TarCan dicen: *"Animals are sold on a first come, first served basis… Animals are not placed on hold with a quote or estimate"* y *"Prices and availability are subject to change without notice"*. **MSC no puede reservar un ejemplar en TarCan antes de comprarlo.** El paso 3 del flujo conceptual del brief ("confirmar o reservar con el proveedor") no existe sin un acuerdo explícito con TarCan.
- [H] TarCan está en Laval, QC y vende directamente al público a esos mismos precios. MSC compite con su propio proveedor; el valor de MSC (retiro local, Verified Origin, curaduría) debe justificar el sobreprecio. [E] Con la regla de $12 y 25 %, un sling de $25 pasa a ~$45.
- [H] Existe programa de precios mayoristas para "authorized commercial clients" (TOS). Negociar reventa es el siguiente paso obvio, antes de escribir código.

**Principales riesgos:** (1) cobrar y no poder cumplir (sin reserva ni cantidades); (2) el webhook actual falla tras el pago si falta stock, sin reembolso automático (bug preexistente, se agrava con ofertas externas); (3) fotos representativas vs reales (hoy ninguna foto de ejemplar llega a la tienda y la marca de agua se aplica a todo); (4) uso no autorizado de un endpoint no documentado y de imágenes de TarCan; (5) CITES/legalidad (Brachypelma es Apéndice II [?]); (6) admin con contraseña única y cron fail-open.

**Recomendación general:** proceder en fases, **empezando por lo que no depende de TarCan** (etiquetas de foto ilustrativa/real, Fase 1) y por una conversación comercial con TarCan (feed autorizado + precios de reventa + reserva). La v1 de pedidos externos debe ser **"solicitud → confirmación manual → enlace de pago"**, sin mezclar carritos y sin autorizaciones de Stripe. No construir sincronización automática hasta tener permiso escrito.

---

## B. Estado actual del repositorio [H]

### B.1 Modelos (`prisma/schema.prisma`)
| Modelo | Hecho relevante |
|---|---|
| `Species` (l.34) | Ficha reutilizable; `scientific` único; campos EN/FR; `image` único. `experience/type/temperament` son **obligatorios** (no nulos). |
| `Product` (l.71) | **Duplica** todos los campos de ficha de `Species` (no los lee de ella). `speciesId` opcional. `slug` único. Es la página pública. |
| `Specimen` (l.305) | Animal individual: `sizeCm`, `sex`, `price`, `unitCost`, `supplier` (String libre), `purchasedAt`, `photoUrl`, `qrToken`, `tarantulAppId`, `status` (available/consignment[legacy]/allocated/sold/written_off), `locationType` (warehouse/consignment/transit). |
| `InventoryMovement` | Ya existe tipo `purchase`, `allocation`, `release`, `sale`, `write_off`, `correction`. Reutilizable para la recepción. |
| `OrderLine` / `OrderLineSpecimen` | Línea guarda `productId, sizeCm, sex, unitPrice, qty`; vínculo a specimen con `@@unique([specimenId])`. |
| `Fulfillment` | Un registro por pedido; estados pending→preparing→ready→completed/no_show/cancelled; reembolso Stripe automático. |
| `OperationsTask` | Tareas internas (tipos: no_show_disposition, audit_investigation, inventory_correction, restock_approval, general), con `orderId`. Reutilizable para "adquisiciones pendientes". |
| `SpeciesLibraryImage` (l.216) | `url, label, scientific, genus, slug, notes`. **Sin metadata de tipo de foto**. |
| `PageView` | Visitas por `path` (sin locale), `visitorHash` diario. Única telemetría de demanda. |
| `WishlistItem`, `ArrivalAlert`, `Order`, `OrderLine` | Señales de demanda reales (cuando haya datos). |
| `ProductDistributorStock`, `StoreLocation.isDistributor` | Consignación (legacy por contador + Specimen con `locationType=consignment`). |

### B.2 Flujos reales
- **Disponibilidad pública:** `lib/data/products.ts#attachAvailability` agrupa `Specimen` por `(sizeCm, sex, price)` → `AvailableUnit.key = "${sizeCm}:${sex}:${price}"` (`listAvailabilityGroups`, `lib/data/specimens.ts`). **El precio forma parte de la clave**: un cambio de precio invalida carritos y wishlist (`WishlistItem.unitKey`).
- **Checkout** (`lib/checkout-stripe.ts`): valida cada línea con `countPurchasableStock`, arma `Stripe Checkout Session` en modo `payment` con `price_data` dinámico; **solo pickup/meetup** (la entrega a domicilio fue retirada); impuestos como línea ("TPS + TVQ", `SITE.taxRate = 0.14975`). No hay reserva: el stock solo se verifica al crear la sesión. Sin rate limiting en `/api/stripe/checkout`.
- **Webhook** (`api/stripe/webhook`): solo `checkout.session.completed` → `fulfillCheckoutSession` (`lib/orders/fulfill-checkout.ts`). Es idempotente por `stripeSessionId`. Dentro de una transacción vuelve a contar stock, crea Order(`paid`) + OrderLines, asigna FIFO (`allocateSpecimensFifo`: warehouse primero, luego consignación) y crea Fulfillment.
  - ⚠️ **Bug preexistente:** si el stock ya no existe al llegar el webhook, la transacción lanza error → HTTP 500 → Stripe reintenta durante días → el cliente pagó y **no hay Order ni reembolso automático** (no se maneja `checkout.session.expired` ni `async_payment_*` tampoco).
- **Fulfillment** (`lib/fulfillment/fulfillment.ts`): `refundOrder` reembolsa por `stripePaymentIntentId` (o crea tarea de reembolso manual); plazo de retiro = `pickupBusinessDays` (default 5) sobre días abiertos del punto (`lib/business-days.ts`, TZ `America/Toronto`).
- **Cron** (`vercel.json`): `/api/cron/fulfillment` diario 13:00 UTC y `/api/cron/seo-audit` lunes 12:00 UTC. ⚠️ Ambos validan `CRON_SECRET` **solo si la variable existe** (`if (secret)`): sin la variable, los endpoints quedan abiertos. [?] El límite de frecuencia depende del plan de Vercel (no verificado; en plan Hobby los crons se limitan a ejecución diaria — confirmar plan).
- **Esquema/migraciones:** no hay carpeta `prisma/migrations`; el build ejecuta `scripts/db-deploy.mjs` → `prisma db push` (los cambios aditivos se aplican solos; los destructivos hacen fallar el build) más scripts de backfill. **Todo cambio de schema se despliega con el build.** Implica: solo cambios aditivos, y probar en una rama de Neon.
- **Admin:** contraseña única (`ADMIN_PASSWORD`); la cookie `msc_admin` contiene un HMAC **constante** (`lib/auth.ts`), no hay usuarios, roles ni revocación individual (se invalida rotando `AUTH_SECRET`). Server actions en `app/[locale]/admin/actions.ts` (~730 líneas) y `ops-actions.ts`.
- **Fotos:** `SpeciesImage` renderiza `product.image` (fallback: imagen de la especie → imagen por defecto) y **siempre** superpone `PhotoWatermark` ("Bernardo Illanez · PHOTOGRAPHY") sobre cualquier imagen. `Specimen.photoUrl` se mapea a `AvailableUnit.photo` (`products.ts:132`) pero **ningún componente de tienda lo usa** (grep en `src/components` y `src/app`: sin usos). Es decir: hoy la tienda solo muestra una foto por producto, nunca del ejemplar.
- **SEO:** `lib/seo.ts#productSchema` emite `InStock`/`OutOfStock`, `offerCount`, `highPrice`. Páginas ISR `revalidate = 60`; `generateStaticParams` solo con productos visibles (`hideWhenSoldOut`).
- **Ficha ChatGPT:** `lib/species-chatgpt-prompt.ts` (prompt + parser línea a línea por etiquetas `COMMON_EN:`…); `SpeciesChatGptHelper.tsx` solo se usa dentro de `ProductForm.tsx` (una especie a la vez). El parser acepta alias de etiquetas, pero **no valida enums** (solo `toLowerCase`), no devuelve errores por campo, y el prompt **no pide `SCIENTIFIC`** (viene del formulario), por lo que no sirve tal cual para lotes. `species-utils.ts` ya tiene `isSpeciesContentMissing()` (descripción+humedad+tamaño vacíos) — útil como definición de "ficha pendiente".
- **Pruebas:** [H] no hay archivos `*.test.*`/`*.spec.*`, ni framework de tests, ni CI (`.github` ausente); solo `eslint` y el type-check de `next build`. El plan de pruebas (G) parte de cero.
- **i18n:** diccionarios `src/i18n/dictionaries/{en,fr}.json`; `Dictionary` se tipa desde `en.json`.

### B.3 Qué se reutiliza / modifica / afecta
- **Reutilizar tal cual:** `Specimen` + `InventoryMovement(purchase)` para la recepción; `OrderLineSpecimen`; `Fulfillment`/`refundOrder`; `OperationsTask` para adquisiciones; cron + `CRON_SECRET`; `isSpeciesContentMissing`; parser ChatGPT (extendido); `notifyStaff`/`sendNotification`; `PageView`, `WishlistItem`, `ArrivalAlert` para demanda.
- **Modificar:** `attachAvailability`/`Product` types (añadir ofertas externas como unidades), `ProductCard`, `AddToCart`, página de producto, `productSchema`, `checkout-stripe.ts`, `fulfill-checkout.ts`, `SpeciesImage`/`PhotoWatermark`, `SpeciesLibraryImage`, admin nav.
- **Afectados indirectamente:** FinanceDashboard/`getFinanceSummary` (COGS), settlement/distributor reports (no deben ver ofertas externas), `sitemap`, `ad-studio`, chat bot (`lib/chat/bot.ts` recomienda inventario), emails de pedido, `UnitFulfillmentBadge`.

---

## C. Investigación de Tarantula Canada

### C.0 Acceso y alcance de lo hecho
El entorno bloqueaba `tarantulacanada.ca`. Con aprobación del usuario creé un entorno personal `montreal-spider-co` y permití **solo** `tarantulacanada.ca`, `www.tarantulacanada.ca` y `api.tarantulacanada.ca`. Peticiones realizadas (lectura, GET, User-Agent `MSC-audit/1.0 (read-only)`): home y bundle JS, `items/read.php?language=en` ×2, `tos/read.php?language=en` ×1. **No** se accedió a endpoints `wholesale/*`, `list/*` (incluye `list/update.php`) ni se intentó autenticación.

### C.1 Fuente real de datos [H]
- La web es una SPA Angular (`<app-root>`, `main-KCTW4QPR.js`). `/robots.txt`, `/products.json` y `/wp-json/...` devuelven el `index.html` de la SPA (HTTP 200): **no es Shopify ni WooCommerce y no hay robots.txt publicado**.
- El bundle define `environment.apiUrl = "https://api.tarantulacanada.ca/"`. Endpoints públicos listados en el bundle (no todos probados): `items/read.php?language=`, `categories/read.php`, `taxa/read.php`, `sales/read.php`, `tos/read.php`, `images/*`, `hours/current.php`, `list/new.php`, etc. El bundle añade `&wholesale=true` cuando la sesión tiene acceso mayorista (requiere login; **no probado**).
- **URL de catálogo:** `GET https://api.tarantulacanada.ca/items/read.php?language=en` → `200 application/json`, ~134 KB, PHP 8.2.36 / LiteSpeed, `access-control-allow-origin: *`. Sin `ETag`, `Last-Modified` ni `Cache-Control` en la respuesta.

### C.2 Ejemplo real (un registro, sin imágenes)
```json
{"itemid":1291,"category":1,"image":"Brachypelma-verdezi.jpg","price":45,"saleprice":0,
 "wholesale2":0,"active":1,"i_table":"i_animal","notes":" ","genus":"Tliltocatl",
 "species":"verdezi","size":"2\"","sex":0,"mexican":0,"sting":null,
 "name":"Tliltocatl verdezi","videos":[],"unique":true,"subitems":[]}
```
Otro: `{"itemid":2371,... "price":250,"sex":2,"size":"3\"","sting":"New Arrival!","notes":"New Arrival! ","name":"Chromatopelma cyaneopubescens"}`.

### C.3 Respuestas a las preguntas del brief
| Pregunta | Resultado |
|---|---|
| **¿Cantidades exactas por variante?** | **NO [H].** Claves presentes en las 445 filas: `itemid, category, image, price, saleprice, wholesale2, active, i_table, notes, sting, name, videos, unique, subitems` (+ `size, genus, species, sex, mexican` en animales; `ord`, `title`, `author`, `language` en otras categorías). Ningún campo de cantidad, stock ni disponibilidad. Un regex sobre las claves (`qty|quant|stock|avail|inv|count|date|time|updated|created`) no encontró nada. |
| Identificador | `itemid` (entero). Estable *dentro* de las dos lecturas hechas; **estabilidad temporal desconocida [?]** (requiere snapshots durante semanas). |
| Nombre científico | `genus` + `species` + `name` (con localidad/forma en comillas o paréntesis: `Aphonopelma seemanni (Nicaragua)`, `Neoholothele incei "GOLD color form"`, `Grammostola quirogai  (hobby G pulchra)` con **doble espacio**). `name` mezcla sinónimos comerciales (`formerly G. porteri`). |
| Tamaño y unidad | Cadena `size` en **pulgadas** con fracciones (`1/4"`, `3/4"`, `2.5"`, `1/3"`); un valor malformado `3"3` (2 filas). No se declara si es cuerpo o *leg span* [?]. |
| Sexo | Entero `sex`: 0=unsexed (176), 1=macho (19), 2=hembra (14) en 209 variantes únicas. 1=macho confirmado por una nota ("mature male" con sex=1); 2=hembra **inferido** (patrón de precio y nombres `-F.jpg`). |
| Precio individual | `price` (CAD, sin impuestos según TOS). |
| Precio promocional | `saleprice` (0 = sin promo; 8 filas con valor, p. ej. price 150 / saleprice 100). Semántica "precio efectivo = saleprice" **inferida**. |
| Precios por volumen | **Solo texto libre en `notes`** (`"3 for $90 special"`, `"5 for $100 special"`, `"(communal of 5)"`). No estructurados, formato inconsistente (`3 for 90$ special`, `$90special`). Son **condiciones comerciales de promoción, no cantidades disponibles** (el texto no implica stock ≥3). `wholesale2` es 0 (o `""` en 1 fila) en la vista pública; los valores mayoristas reales probablemente solo aparecen con sesión mayorista [?]. |
| Indicadores de disponibilidad | `active`: 1 (444 filas) / 2 (1 fila). Semántica desconocida [?]. No hay `available`. |
| Nuevas llegadas | Campo `sting` (nombre engañoso): `"New Arrival!"` (59 filas) / `"Just hatched"` (3), repetido en `notes`. |
| Fechas/timestamps | **Ninguno.** No se puede calcular antigüedad ni última modificación desde la fuente. |
| Comportamiento al agotarse | **Desconocido [?]**: no observado. Hipótesis (a probar con snapshots): la variante desaparece o pasa a `active != 1`. |
| Estructura/agrupación | 358 ítems de primer nivel; 445 filas contando `subitems`. **La anidación no es determinista**: en dos lecturas consecutivas el mismo `itemid` aparece como padre en una y como hijo en otra (ej. 1291 y 2915), `unique` cambia de valor y `subitems` se reordena. Los 87 `itemid` hijos aparecen también como primer nivel. **Conclusión: aplanar y deduplicar por `itemid`; ignorar `unique` y `subitems`.** Resultado: 209 variantes de animal únicas, 179 nombres distintos. |
| Imágenes | `image` = nombre de archivo → `https://www.tarantulacanada.ca/gallery/{image}` (y `/thumb160h/`). Varias variantes comparten la misma foto (ej. B. hamorii usa `B-hamorii-F.jpg` para machos, hembras y slings). |

### C.4 Condiciones y restricciones (`tos/read.php`) [H]
Citas: "Animals are shipped from Laval, QC"; "Prices and availability are subject to change without notice"; "All specimens are unsexed unless otherwise noted"; "first come, first served… not placed on hold with a quote or estimate"; "All payments must be made prior to shipment"; "Only authorized commercial clients are eligible for wholesale pricing. Please contact us if you wish to open a wholesale account. All sales are final."; garantía de llegada viva solo con servicio next-day (FedEx/aerolínea) y caja con calefacción en invierno; DOA en 24 h con fotos; garantía de 7 días **se anula si el comprador revende o regala**; días de envío habituales: lunes, martes, miércoles.
- No encontré cláusulas sobre acceso automatizado, scraping, API, ni derechos sobre fotos/descripciones (busqué `scrap`, `reproduc`, `copyright`, `image`, `photo`). **La ausencia de una cláusula no es autorización.** El endpoint es público y sin autenticación (es la misma llamada que hace el navegador de cualquier visitante), pero no está documentado y puede cambiar.
- Consecuencias: (a) las fotos y textos de TarCan **no se copian**; (b) la garantía de TarCan no se transfiere a clientes de MSC: MSC asume DOA/7 días ante su cliente y solo tendría recurso contra TarCan si compra como cliente final con sus condiciones [?]; (c) la reventa requiere cuenta mayorista [?].

### C.5 Conclusiones
1. Existe fuente JSON pública utilizable para **precio, tamaño, sexo, nombre, presencia en catálogo y "nueva llegada"**.
2. **No hay cantidades.** La política 0–2/3–4/5–9/10–19/20+ queda sin datos; se deja configurable pero inactiva.
3. La presencia en el JSON es la única señal de disponibilidad, y TarCan avisa que puede cambiar sin previo aviso y sin reservas.
4. Recomendación: pedir a TarCan por escrito (i) permiso de lectura periódica o un feed dedicado con `qty` y `updated_at`, (ii) cuenta mayorista y precios de reventa, (iii) posibilidad de apartar ejemplares 24–48 h con depósito, (iv) retiro local en Laval vs. envío, (v) uso de fotos. Mientras no haya respuesta: solo lectura manual/ocasional para análisis, sin cron.

---

## D. Análisis comercial

### D.1 Disponibilidad real de la lista orientativa (snapshot 2026-11-27) [H]
- **Presentes:** B. hamorii (1/3", 1.5", 2" M/F, 3" M), B. boehmei (1/2", 2.5" M/F), B. emilia (1"), G. pulchripes (3/4"), C. cyaneopubescens (1/2", 3" M/F), A. seemanni (1/4", 3/4"), T. albopilosus (2" M), L. parahybana (1/4", 3" M), V. chromatus (3/4"), N. incei (1", gold 1/2"), Lasiocyano sazimai (1/4").
- **G. pulchra:** aparece como `Grammostola quirogai (hobby G pulchra)` (1" y 1.5" M) → **identificación ambigua; no fusionar automáticamente** con `Grammostola pulchra`.
- **No listadas hoy:** Caribena versicolor, Avicularia avicularia, Acanthoscurria geniculata (solo A. chacoana y A. cordubensis). Hay otras Avicularia (juruensis "Peru Purple" $50, purpurea, minatrix, braunshauseni $85–95).
- Otros candidatos baratos del catálogo real: Tliltocatl vagans (2"–3", $35–45), T. verdezi, Brachypelma auratum 3/4" $35, Nhandu tripepii 3" M $45, Lasiodora klugi 2.5" M $50, Phormictopus auratus 1/2" $45, Ephebopus rufescens 1/2" $50, Psalmopoeus cambridgei 1/2" $25 (defensiva: solo intermediate).
- ⚠️ CITES [?]: todo *Brachypelma* (y *Aphonopelma albiceps*, listado aquí como "Brachypelma albiceps" id 1269) está en Apéndice II según mi conocimiento general (no verificado hoy). Requiere confirmar procedencia (nacida en Canadá vs importada) y obligaciones antes de publicar.

### D.2 Modelo de precio (supuestos explícitos [E])
Costo C = precio TarCan sin impuestos (supone que MSC recupera GST/QST de compra [?]). Por unidad: transporte/embalaje T = $4 (supuesto; depende de si se retira en Laval o se envía), reserva por pérdidas 4 % de C, comisión de pago 2.9 % + $0.30 sobre el total **con impuestos** (tarifa Stripe a confirmar en el dashboard), overhead 0. Precio mínimo = el mayor entre (ganancia operativa ≥ $12) y (margen operativo ≥ 25 %), redondeado a múltiplos de $5. **No se investigaron precios de competidores** → el "PVP recomendado" es un *piso*, no una validación de mercado.

Definiciones: *markup* = (P−C)/C; *gross profit* = P−C; *gross margin* = (P−C)/P; *contribution* = P−C−T−reserva−comisión; *ganancia operativa estimada* = contribution − overhead asignado (0 por ahora); margen operativo = ganancia operativa/P.

| ID | Especie | Tamaño | Sexo | Disp. | Costo | Costo vol. | PVP piso | G. bruta | G. oper. | Mg oper. | Mg bruto | Demanda [E] | Recomendación |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1286 | B. hamorii | 1/3" | unsexed | desconocida | 35 | 30 (3 x $90) | 60 | 25 | 17.3 | 29 % | 42 % | Alta | Publicar (permanente) |
| 1288 | B. hamorii | 1.5" | unsexed | desc. | 55 | – | 90 | 35 | 25.5 | 28 % | 39 % | Alta | Publicar |
| 1289 | B. hamorii | 2" | M | desc. | 55 | – | 90 | 35 | 25.5 | 28 % | 39 % | Media | Rotativo |
| 1297 | B. hamorii | 2" | F | desc. | 150 | – | 225 | 75 | 57.2 | 25 % | 33 % | Media | Seguimiento (ticket alto, riesgo capital) |
| 1275 | B. boehmei | 1/2" | unsexed | desc. | 40 | – | 65 | 25 | 16.9 | 26 % | 38 % | Alta | Publicar |
| 2696 | B. boehmei | 2.5" | M | desc. | 45 | – | 75 | 30 | 21.4 | 29 % | 40 % | Media | Rotativo |
| 2365 | B. emilia | 1" | unsexed | desc. | 35 | 30 | 60 | 25 | 17.3 | 29 % | 42 % | Media | Rotativo |
| 1493 | G. pulchripes | 3/4" | unsexed | desc. | 50 | – | 80 | 30 | 21.0 | 26 % | 38 % | Alta | Publicar |
| 1501 | G. quirogai (hobby "pulchra") | 1" | unsexed | desc. | 105 | – | 160 | 55 | 41.2 | 26 % | 34 % | Media | Seguimiento; resolver taxonomía |
| 1375 | C. cyaneopubescens | 1/2" | unsexed | desc. | 55 | – | 90 | 35 | 25.5 | 28 % | 39 % | Alta | Publicar |
| 2383 | C. cyaneopubescens | 3" | M | desc. | 75 | – | 115 | 40 | 28.9 | 25 % | 35 % | Media | Rotativo |
| 1767 | V. chromatus | 3/4" | unsexed | desc. | 25 | 20 (5 x $100) | 45 | 20 | 13.2 | 29 % | 44 % | Media | Rotativo (margen justo, precio poco competitivo) |
| 1663 | L. parahybana | 1/4" | unsexed | desc. | 25 | 20 | 45 | 20 | 13.2 | 29 % | 44 % | Alta | Rotativo; solo si se compra por lote |
| 2605 | L. parahybana | 3" | M | desc. | 45 | – | 75 | 30 | 21.4 | 29 % | 40 % | Media | Rotativo |
| 1191 | A. seemanni | 1/4" | unsexed | desc. | 25 | 20 | 45 | 20 | 13.2 | 29 % | 44 % | Alta | Rotativo; lote |
| 1193 | A. seemanni | 3/4" | unsexed | desc. | 45 | – | 75 | 30 | 21.4 | 29 % | 40 % | Media | Rotativo |
| 2234 | T. albopilosus (Nicaragua) | 2" | M | desc. | 45 | – | 75 | 30 | 21.4 | 29 % | 40 % | Alta | Publicar |
| 2622 | T. vagans (loc. México) | 2" | unsexed | desc. | 35 | 30 | 60 | 25 | 17.3 | 29 % | 42 % | Media | Rotativo |
| 1760 | N. incei | 1" | unsexed | desc. | 35 | – | 60 | 25 | 17.3 | 29 % | 42 % | Media | Rotativo |
| 2282 | Lasiocyano sazimai | 1/4" | unsexed | desc. | 35 | 30 | 60 | 25 | 17.3 | 29 % | 42 % | Media-alta | Experimentación |
| 2755 | A. juruensis "Peru Purple" | 1/2" | unsexed | desc. | 50 | – | 80 | 30 | 21.0 | 26 % | 38 % | Alta | Publicar (arborícola, intermedio) |
| 1960 | P. cambridgei | 1/2" | unsexed | desc. | 25 | 20 | 45 | 20 | 13.2 | 29 % | 44 % | Media | Rotativo, solo intermediate |

Lectura: (1) en slings baratos manda la regla de $12; en el resto, la de 25 %. (2) Los precios por volumen de TarCan (3 x $90, 5 x $100) bajan el costo $5 por unidad (p. ej. $25→$20, $35→$30) pero **solo si MSC compra el lote**: entran como regla de compra agrupada, no como costo por defecto. (3) El markup necesario (60–80 %) es alto frente al precio directo de TarCan: negociar reventa es el mayor palanca de rentabilidad. (4) Una variante con precio ya promocionado (`saleprice`) debe usar el precio efectivo, y una subida del proveedor debe **congelar la oferta** hasta aprobación.

### D.3 Commercial Score (propuesta determinista, sin IA de pago)
`score = 0.35·venta + 0.30·rentabilidad + 0.20·disponibilidad + 0.10·mantenimiento + 0.05·visual` (pesos en `SiteSetting`).
- **venta:** prior cualitativo por especie [E] → se reemplaza por datos MSC (vistas de `/product/{slug}` en `PageView`, `WishlistItem`, `ArrivalAlert`, pedidos) cuando haya ≥ N observaciones.
- **rentabilidad:** de la ganancia operativa y margen calculados al precio objetivo.
- **disponibilidad:** fracción de sincronizaciones recientes en que la variante apareció + número de variantes (proxy; no hay stock).
- **mantenimiento / visual:** campos de `Species` (experience, type, temperament) + valor admin.
- **Compuertas duras (no compensables por puntaje):** margen operativo mínimo no cumplido → no publicar; `legalOk` y `welfareOk` (bool admin, default false) → no publicar; vista en < X de las últimas Y sincronizaciones → no publicar; ficha de especie no aprobada → no publicar.
- Clases: ≥80 permanente, 65–79 rotativo, 50–64 seguimiento, <50 descartado.

Puntajes de ejemplo (**[E] valores subjetivos, solo para ilustrar la mecánica**): B. hamorii 84 · T. albopilosus 75 · C. cyaneopubescens 74 · B. boehmei 71 · G. pulchripes 70 · B. emilia / L. parahybana / A. seemanni 64 · N. incei / A. juruensis 62 · Lasiocyano 57 · V. chromatus 52. Con estos pesos casi nada llega a "permanente": los umbrales deben calibrarse con datos reales.

### D.4 Catálogo inicial y rotación [P]
- **Meta 12–18 especies** (60/30/10): permanentes (≈8): B. hamorii, B. boehmei, G. pulchripes, C. cyaneopubescens, T. albopilosus, A. seemanni, L. parahybana, N. incei. Rotativas (≈4): B. emilia, T. vagans, A. juruensis, V. chromatus. Experimentación (≈2): Lasiocyano sazimai, Nhandu tripepii.
- **Revisión quincenal** (pantalla admin, nada autónomo): tabla con ventas, vistas, conversión, solicitudes, apariciones en sincronización, margen, volatilidad de precio, días publicado → botones "mantener / rotar fuera / promover a compra física". Rotar = `status = paused`; **nunca borrar** Species, Product, imágenes, pedidos ni URLs (solo cambia disponibilidad; la página sigue existiendo con "agotado/avísame" para preservar SEO).
- **Promoción a inventario propio:** si una variante acumula ≥ K solicitudes/ventas en 30 días y el costo mayorista por lote da mejor margen → crear compra física vía flujo `receiveBatchAction` existente.
- **Datos históricos de MSC:** [?] **No disponibles para esta auditoría.** El conector Neon de la sesión muestra proyectos (`ed-lux-gifts`, `soraya-demission`, `salut-bon-bon-the`, `pichijourney`, `redwood-growth`, `GarageOS`) que no identifico como la base de MSC, y no consulté ninguno. Consultas a correr por el dueño (solo lectura): pedidos por producto en 90 días (`OrderLine`), vistas por path (`PageView`), `WishlistItem`/`ArrivalAlert` por producto/género.

---

## E. Arquitectura recomendada [P]

### E.1 Principio
Una **oferta externa** es una *promesa condicionada de compra*, no inventario. Se modela aparte, aparece como otra unidad de la misma página de producto y solo se convierte en `Specimen` al recibirse físicamente.

### E.2 Modelos (aditivos; aplicables con `db push`)
Alternativa mínima respecto a la lista del brief (5 tablas nuevas en lugar de 5 + Procurement, y sin `SupplierOfferSnapshot`):

1. **`Supplier`**: `id, slug, name, active, suspendedAt/By/reason` (kill switch), `lastSyncAt`, `lastSuccessAt`, `lastRunStatus`, `lockedUntil` (candado), `config Json` (TTLs, lead time, política de cantidad, markup/parámetros de costo). Un registro `tarcan`.
2. **`SupplierOffer`**: `supplierId, externalId (itemid), unique(supplierId, externalId)`; datos crudos normalizados `rawName, sizeRaw, sizeInches?, sizeCm?, sex, costCents, salePriceCents?, noteRaw, isNewArrival`; vínculo `speciesId?` / `productId?` (null = sin ficha); `quantityKnown Int?` (**null = desconocida, nunca 0**); `status` (`detected|approved|published|paused|stale|missing|rejected`); `msrpOverride?`, `leadDaysMin/Max?`; `firstSeenAt, lastSeenAt, lastChangedAt, missingRuns`; `commercialScore?`, `legalOk`, `welfareOk`; `photoUrl?` (propia, nunca de TarCan por defecto). Costos y márgenes **solo en servidor** (nunca en `Product`/JSON público).
3. **`SupplierSyncRun`**: `supplierId, startedAt, finishedAt, status (ok|partial|failed|suspect), itemCount, newCount, changedCount, missingCount, error, payloadHash`.
4. **`SupplierOfferEvent`**: `offerId, runId, type (appeared|price_change|reappeared|missing|reclassified), old, new, at` → historial de precios/disponibilidad sin guardar payloads completos (sustituye a `SupplierOfferSnapshot`).
5. **`SupplierRequest`** (sustituye a `Procurement` en v1): solicitud de cliente por oferta (`offerId, qty, contacto, quotedPrice, status requested|confirmed|payment_link_sent|paid|procuring|received|failed|cancelled, expiresAt, stripeSessionId?`).
- **Cambios en tablas existentes:** `OrderLine.supplierOfferId String?` (+ `fulfillmentSource`); `SpeciesLibraryImage.kind` y `Specimen.photoIsActual` (ver F/I). La adquisición se rastrea con `OperationsTask` (nuevo `TaskType.procurement`), no con otra tabla.
- **Se evita:** `Specimen` ficticios, columnas de proveedor en `Product`, estado nuevo en `OrderStatus`.

### E.3 Sincronización
- Ruta `GET /api/cron/supplier-sync`, **mismo patrón y secreto** que los crons actuales, pero **fail-closed** (401 si falta `CRON_SECRET`).
- Pasos: tomar candado (compare-and-set sobre `Supplier.lockedUntil`) → `fetch` único con timeout y UA identificable → validar con esquema estricto (zod no está instalado; validación manual) → aplanar y dedupe por `itemid` → normalizar tamaño/sexo/nombre → upsert por `(supplierId, externalId)` en transacción → eventos solo si cambió → liberar candado → registrar `SupplierSyncRun`.
- **Seguridad de la corrida:** si el payload está vacío/inválido, o el número de animales cae >40 % respecto a la última corrida OK → `suspect`: **no se procesan desapariciones** y se alerta al admin. Nunca `DELETE`.
- **Frecuencia:** diaria (acorde con los crons actuales y con el límite probable del plan Hobby [?]); 1 request por corrida (~134 KB) es mínimo. No hay costo de API.
- **Caducidad:** oferta `fresh` si `lastSeenAt` < 36 h; 36–72 h → no se puede solicitar ("verificando"); > 72 h o 2 corridas OK consecutivas sin verla → `stale/missing` → oculta en tienda. Si el feed falla varios días, todo expira solo (no se vende con datos viejos y no se borra nada). Recuperación: la siguiente corrida OK reactiva solo lo que reaparece y estaba `approved` (la aprobación manual se conserva).
- **Cantidad ofrecida:** `quantityKnown = null` → `maxPerOrder = 1`, `maxOpenRequests = 2` por oferta (configurables). La tabla 0–2/3–4/… se implementa como `Supplier.config.qtyPolicy` pero solo se activa si algún día hay `qty` real. Aun con cantidad real, se trata como dato perecedero (TTL).
- **Alertas:** `notifyStaff` en `suspect`/`failed`, cambios de precio en ofertas publicadas, y nuevas llegadas candidatas.

### E.4 Mapeo con fichas
- Coincidencia automática **solo** por `Species.scientific` normalizada exacta (sin comillas, sin localidad). Todo lo demás (sinónimos, `G. quirogai (hobby G pulchra)`, `Brachypelma albiceps` vs *Aphonopelma albiceps*) queda **sin vincular → cola de revisión**. El admin vincula manualmente; el vínculo se aplica a futuras ofertas con el mismo `rawName`.
- Una oferta aprobada sin `Product` crea uno (`deriveSlug`, ficha de `Species`); con ficha vacía, sigue invisible hasta aprobar la ficha (`isSpeciesContentMissing`).

### E.5 Página de producto y catálogo (una sola página por especie)
- `AvailableUnit` gana `source: "own" | "external"`, `leadTime?`, `photo?`, `photoKind`. `attachAvailability` fusiona unidades propias + ofertas `published` y frescas.
- Orden: propias primero; si existe unidad propia equivalente (misma talla±tolerancia y sexo), la externa se **oculta** o va debajo.
- Etiquetas: *In stock / En stock* vs *Available to order / Disponible sur commande* + plazo estimado ("1–3 días hábiles tras confirmación").
- Claves: `ext:{offerId}` (sin precio dentro de la clave, para no romper carritos/wishlist).
- `productSchema`: ofertas externas **no** deben declararse `InStock`. Usar `BackOrder`/`PreOrder` o no incluirlas [?] (validar con Rich Results Test). `offerCount/highPrice` solo con ofertas realmente comprables.
- Filtros/búsqueda/orden: considerar "Disponible sur commande" como filtro; agotados propios + oferta externa → el producto deja de mostrarse "Sold out".
- Chat bot y `getRelated`: excluir ofertas externas hasta que el flujo esté estable.

### E.6 Fotografías ilustrativas vs reales
- `SpeciesLibraryImage.kind: representative | actual` (default `representative`; migración = ninguna fila cambia: **todo lo existente queda como representativo**).
- `Specimen.photoIsActual Boolean @default(false)`; `Product.image`/`Species.image` = siempre representativa. Marcar "real" es acción manual del admin, individual o por lote; **nunca se asume** por tener `photoUrl`.
- UI: nueva `PhotoNotice`: etiqueta discreta "Representative photo / Photo représentative" en tarjetas y página (esquina inferior izquierda; ya hay marca de agua a la derecha) + aviso completo bajo la imagen y junto al selector de variante, con los textos del brief. Al cambiar de variante, la foto y la etiqueta cambian según la clasificación de *esa* foto. Tamaño y sexo salen de la variante, nunca de la foto.
- `PhotoWatermark` ("Bernardo Illanez PHOTOGRAPHY") hoy se pinta sobre toda imagen; debe aplicarse solo a fotos de ese autor [?] (decisión I-5).
- Fotos de TarCan: no se descargan ni se muestran sin autorización escrita.

### E.7 Checkout y adquisición (v1: lo más simple y seguro)
Flujo recomendado v1 — **"solicitud → confirmación manual → enlace de pago"**:
1. El cliente envía una solicitud (sin pago) de una oferta externa (no entra al carrito normal). Se crea `SupplierRequest` y una `OperationsTask(procurement)`; se notifica a staff.
2. Staff **compra al proveedor** (o confirma) y marca confirmada con precio y plazo; **solo ahí** se emite un `Stripe Checkout Session` (reutilizando `validateAndBuildCheckout` con una línea externa y `supplierRequestId` en metadata, expira en 24–48 h).
3. Webhook `checkout.session.completed` → crea `Order(paid)` con `OrderLine.supplierOfferId` (sin asignación FIFO) y `Fulfillment` bloqueado (no "ready").
4. Recepción física: acción admin "Recibir para pedido" → crea `Specimen` (`status=allocated`, `unitCost` real, `supplier="TarCan"`, QR) + `InventoryMovement(purchase)` + `OrderLineSpecimen`. Solo entonces se puede marcar `ready`.
5. Entrega/pickup y cierre por el flujo existente.
- Si el proveedor ya no lo tiene → solicitud `failed` (nunca hubo cobro): sin reembolso, sin contabilidad que corregir. Cancelación posterior al pago → `refundOrder` existente.
- **Carritos mixtos:** no en v1 (checkout externo separado). **Múltiples proveedores:** una solicitud por oferta.
- **Alternativa B, autorización Stripe + captura manual:** más fluida pero la autorización de tarjetas expira (≈7 días [?]), no todos los métodos (Klarna, mostrado en el sitio) soportan captura manual [?], y no hay garantía de que TarCan tenga el animal al capturar. Evaluar en una fase posterior.
- **Alternativa C, pagar primero y reembolsar si falla:** descartada para v1 (la comisión de Stripe no se devuelve en reembolsos [?], y el bug de webhook sin reembolso automático lo empeora).
- Entregas: plazo configurable (`leadDaysMin/Max`, default 1–3 días hábiles tras confirmación) calculado con `business-days.ts`; no prometer "al día siguiente". Agrupar compras a TarCan en días fijos (su envío habitual es lun–mié) protege margen y reduce costo de transporte; clima/welfare: pausar ofertas manualmente (kill switch) en olas de frío/calor.

### E.8 Admin
Integrar dentro de las herramientas existentes (patrón de hubs: `InventoryHub`, `DistributorInventoryHub`, `OperationsHub`): nueva pestaña **"Proveedores"** en el área de inventario, con subvistas: Ofertas (detectadas/aprobadas/publicadas/pausadas, acciones por lote: aprobar, pausar, vincular especie), Fichas pendientes, Precios y márgenes, Historial/eventos, Sincronizaciones y errores, Rotación quincenal, Solicitudes/adquisiciones (comparte la lista de `OperationsHub`). Botón **"Pausar proveedor"** = `Supplier.suspendedAt` (las ofertas desaparecen de la tienda; inventario propio intacto). Sección independiente no se justifica en v1.

### E.9 Generador de fichas por lotes
Compatible hacia atrás: el prompt individual y `parseSpeciesChatGptResponse` no cambian. Nuevo `buildSpeciesBatchPrompt(species[])` que pide, por especie, un bloque:
```
BEGIN_SPECIES
SCIENTIFIC: Brachypelma hamorii
COMMON_EN: …  (mismas 23 etiquetas)
VALID_NAME: …  SYNONYMS: …  TAXONOMY_NOTE: …   ← nuevas, opcionales
END_SPECIES
```
y `parseSpeciesBatchResponse(text)` que parte por delimitadores, reutiliza el parser actual por bloque, y devuelve por especie `{fields, errors[], warnings[]}`: campos obligatorios, enums (`experience|type|temperament` contra lista cerrada), `careGuide` contra slugs existentes, EN/FR no vacíos, duplicados por `scientific`, coincidencia con `Species` existente (exacta → "ya existe, reutilizar"; sinónimo dudoso → advertencia, **nunca fusión automática**). Vista previa editable por tarjeta, aprobar individual o por lote → `upsert` de `Species` y creación del `Product`. Cola de pendientes = ofertas con especie sin ficha o `isSpeciesContentMissing`. Recomendación: exigir revisión humana de cuidados (temperatura, humedad, temperamento) — el LLM puede equivocarse; añadir al prompt "si no estás seguro de un dato, escribe UNKNOWN".

### E.10 Seguridad (resumen; detalle de riesgos abajo)
SSRF: la URL del proveedor es constante en código/variable de entorno, no editable desde la UI; sin redirects. XSS/inyección: nunca `dangerouslySetInnerHTML` con texto de proveedor (`notes`, `name`); escapar y limitar longitud. Precios: validar rango/tipo, subida >X % → pausa automática. Autorización: server actions con `isAdminAuthed()` (hoy existe; recomendable rate-limit al login). Cron fail-closed. Logs sin datos personales ni costos en cliente. Costos solo en columnas leídas desde código `server-only`; nunca en tipos `Product`/`AvailableUnit`.
- **Verificado:** estructura actual de auth/cron (B.2). **Requiere confirmación jurídica/comercial [?]:** ley de protección del consumidor de Québec para contratos a distancia/precommande y publicidad de plazos; términos de TarCan sobre reventa/acceso automatizado; CITES (Brachypelma, *A. albiceps*); permisos de importación de especies; garantía y DOA frente al cliente final; obligaciones fiscales (ITC/ITR de compras al proveedor); transporte de animales vivos y bienestar (temperatura, tiempo en tránsito, cajas).

---

## F. Impact analysis

| Archivo / componente | Cambio | Motivo | Riesgo | Dependencias | Pruebas |
|---|---|---|---|---|---|
| `prisma/schema.prisma` | +5 modelos, +campos en `OrderLine`, `SpeciesLibraryImage`, `Specimen`, `TaskType` | Ofertas, sync, fotos | Medio: `db push` en cada build | Rama Neon de prueba | `prisma validate`, push en branch |
| `lib/data/products.ts` (`attachAvailability`) | Fusionar unidades externas | Una sola página por especie | Alto: lectura central de la tienda | Tipos en `lib/types.ts` | Unitarias de fusión/orden; regresión stock propio |
| `lib/types.ts` (`AvailableUnit`, `isSoldOut`, `totalStock`) | `source`, `leadTime`, `photoKind` | UI y checkout | Alto: usado en toda la tienda | ProductCard, AddToCart, CartContext | Tests de `totalStock/isSoldOut` con externas |
| `components/ProductCard.tsx`, `AddToCart.tsx`, página de producto | Etiquetas stock/encargo, `PhotoNotice`, flujo "solicitar" | UX/legal | Medio | i18n en/fr | Visual, responsive, EN/FR |
| `components/SpeciesImage.tsx`, `PhotoWatermark.tsx` | Etiqueta ilustrativa, marca condicional | Requisito foto | Bajo | `kind` | Snapshot con/sin foto real |
| `lib/checkout-stripe.ts` | Línea externa vía solicitud confirmada; sin mezcla | Aislar riesgo | Alto | Stripe metadata | Sesión de prueba Stripe test-mode |
| `lib/orders/fulfill-checkout.ts` | Rama `supplierRequestId` sin FIFO; **arreglar fallo post-pago por stock** | Integridad | Alto | Webhook, Fulfillment | Webhook repetido (idempotencia), stock agotado |
| `lib/fulfillment/fulfillment.ts` | Bloquear `ready` sin Specimens vinculados | Evitar entregar sin animal | Medio | `OrderLineSpecimen` | Estados, reembolso |
| `lib/data/specimens.ts` (recepción) | Acción "recibir para pedido" | Convertir oferta en ejemplar | Medio | InventoryMovement | Contabilidad (COGS) |
| `lib/seo.ts` | Disponibilidad solo real | Datos estructurados | Bajo | — | Rich Results |
| `lib/species-chatgpt-prompt.ts`, `SpeciesChatGptHelper`, `SpeciesLibraryManager` | Batch + validación; flag foto real | Fichas por lotes | Bajo si compatible | `species-utils` | Parser: formato individual idéntico |
| `app/[locale]/admin/*`, `AdminNav` | Pestaña Proveedores, acciones batch | Operación | Medio | `isAdminAuthed` | Permisos |
| `app/api/cron/*`, `vercel.json` | Nuevo cron; **hacer fail-closed** los existentes | Seguridad | Bajo | `CRON_SECRET` en Vercel | 401 sin/ con secreto |
| `lib/data/*` analytics/finance/settlement/distributor-report | Excluir ofertas externas | No contaminar métricas | Medio | — | Regresión consignación |
| `lib/chat/bot.ts`, sitemap, ad-studio | Excluir/gestionar externas | Coherencia | Bajo | — | Manual |
| `i18n/dictionaries/{en,fr}.json` | Textos nuevos | EN/FR | Bajo | — | Paridad de claves |

---

## G. Alternativas y plan de pruebas

### G.1 Alternativas
| Opción | Veredicto |
|---|---|
| **Propuesta del brief** (Supplier, SupplierOffer, SyncRun, Procurement, Snapshot) | Conservar `Supplier`, `SupplierOffer`, `SyncRun`. **Cambiar** Snapshot → `SupplierOfferEvent` (más barato, suficiente para decisiones). **Eliminar** `Procurement` en v1: `SupplierRequest` + `OperationsTask`. |
| Sin sincronización: lista curada manual de ofertas (admin escribe precios) | Mucho más simple y sin riesgo de scraping; válida como **Fase 1.5** mientras TarCan responde. Recomendada como primer paso real. |
| Feed autorizado de TarCan (CSV/JSON con qty) | Es la mejor opción si lo conceden; la arquitectura es la misma (cambia el adaptador). |
| Dropship/"pedido a TarCan" sin catálogo en MSC | Descartada: sin control de experiencia ni SEO. |
| Pago inmediato con reembolso | Descartada (fee no recuperable, riesgo de ruptura). |
| Autorización Stripe + captura | Posible en fase tardía, tras confirmar métodos soportados y expiración. |

### G.2 Plan de pruebas
Hoy no hay framework. Propongo **Vitest** (unitarias de normalización/parser/precios/caducidad con fixtures sanitizadas y fixtures con anidación no determinista) + **Playwright** (ya preinstalado en el entorno de desarrollo) para E2E de tienda; Stripe en modo test con `stripe trigger`/CLI para webhooks; rama Neon para pruebas de schema.
Cobertura: importación y reimportación idempotente; duplicados por `itemid`; anidación variable; nombres con localidad/sinónimo; cantidad desconocida ≠ 0; subida/bajada de precio; desaparición de variante (1 corrida vs 2); respuesta vacía/HTML/JSON inválido/caída >40 %; candado de ejecución simultánea; parser individual (golden test del formato actual) y batch (bloque corrupto no rompe el resto); selección de variante y cambio de foto/etiqueta; foto representativa por defecto y real marcada; carrito sin mezcla; dos solicitudes simultáneas a una oferta (límite); Stripe: webhook duplicado, expirado, pago fallido; recepción→Specimen→OrderLineSpecimen; cancelación/reembolso; COGS/finanzas sin cambios retroactivos (pedidos existentes intactos); permisos admin; paridad EN/FR; responsive; JSON-LD; regresión completa de inventario propio y consignación (distribuidor walk-in, settlement, QR).

---

## H. Roadmap (fases pequeñas y reversibles)

**Fase 0 — Decisiones y acuerdo con TarCan** (sin código). Alcance: carta a TarCan (feed/permiso, mayorista, reserva, retiro, fotos). Criterio: respuesta escrita. Rollback: n/a.

**Fase 1 — Fotos ilustrativas vs reales (independiente, sirve a todo MSC).**
- Archivos: `schema.prisma` (`SpeciesLibraryImage.kind`, `Specimen.photoIsActual`), `SpeciesImage.tsx`, `PhotoWatermark.tsx`, `ProductCard`, página de producto, admin (`SpeciesLibraryManager`, `InventoryHub`), `en/fr.json`.
- BD: 2 columnas con default (aditivo). Migración conservadora: todo `representative`.
- Aceptación: etiqueta visible en tarjeta y detalle; aviso completo (EN/FR) cerca de la foto y del selector; cambiar variante cambia etiqueta; sin foto real asumida; marca de agua solo donde corresponda [decisión].
- Pruebas: Playwright EN/FR móvil/escritorio; snapshot. Rollback: revert + columnas ignoradas.

**Fase 2 — Fichas por lotes.** `species-chatgpt-prompt.ts`, helper, `SpeciesLibraryManager`, nueva vista previa; sin BD. Aceptación: formato individual idéntico (golden), lote con errores por especie, aprobar por lote. Rollback: feature flag.

**Fase 3 — Modelo de ofertas + carga manual (sin sync).** Modelos `Supplier`, `SupplierOffer`, `SupplierOfferEvent`; admin "Proveedores" (alta manual/CSV); mapeo a especies; cálculo de precio/margen/score. BD aditiva. Aceptación: oferta no aprobada no aparece; costo no sale al cliente. Rollback: ocultar pestaña + `Supplier.suspendedAt`.

**Fase 4 — Catálogo público con "Disponible sur commande"** (solo lectura/solicitud, sin pago): fusión de unidades, etiquetas, SEO. Aceptación: JSON-LD veraz; propias priorizadas; sin duplicar URLs. Rollback: flag que excluye `source=external`.

**Fase 5 — Solicitudes y adquisición:** `SupplierRequest`, tareas, enlace de pago, webhook rama externa, recepción→Specimen, guard en fulfillment; **corregir antes el bug de pago sin stock en `fulfill-checkout`**. Rollback: pausar proveedor + reembolso manual.

**Fase 6 — Sincronización automática** (solo con permiso/feed): cron fail-closed, candado, validaciones, caducidad, alertas. Rollback: quitar entrada del `vercel.json`; las ofertas expiran solas.

**Fase 7 — Score, rotación quincenal y promoción a inventario propio.**

---

## I. Decisiones pendientes (solo las que requieren tu aprobación)
1. **¿Contactar a TarCan antes de construir la sincronización?** Recomiendo sí (feed/permiso + mayorista + reserva). Sin respuesta: lista manual (Fase 3) sin cron.
2. **Modelo de compra v1:** recomiendo "solicitud → confirmación → enlace de pago", sin carritos mixtos.
3. **Regla de ganancia** ($12 / 25 %) y supuestos: transporte $4, reserva 4 %, comisión Stripe. Recomiendo aceptar como parámetros editables y validar con 3 compras reales.
4. **Compra por lotes** (días fijos, mín. 3–5 unidades para aprovechar "3 x $90 / 5 x $100"): recomiendo sí, lo que implica plazos de 1–3 días hábiles después de la confirmación, no 24 h.
5. **Marca de agua "Bernardo Illanez PHOTOGRAPHY":** hoy cubre toda foto. ¿Aplica solo a sus fotos? Recomiendo flag por imagen.
6. **Aprobar las primeras ~12 especies** (D.4) y las compuertas legales (CITES Brachypelma).
7. **Prioridad:** recomiendo ejecutar Fase 1 y 2 de inmediato (no dependen de TarCan).
8. **Entorno de esta sesión:** creé el entorno `montreal-spider-co` con 3 hosts de TarCan permitidos. Si no lo quieres, se puede borrar desde Settings.

---

## J. Mejoras adicionales
**Críticas para esta integración**
- `fulfill-checkout.ts`: pago exitoso sin stock → 500 permanente, sin Order ni reembolso. Manejar (crear Order en estado a revisar o reembolsar automáticamente) y manejar `checkout.session.expired`.
- Crons con `CRON_SECRET` opcional (`if (secret)`): hacerlos fail-closed.
- Claves de unidad con precio embebido (`sizeCm:sex:price`): para externas, usar clave por oferta.
- `Specimen.photoUrl`/`AvailableUnit.photo` no se usa en la tienda; decidir su semántica (representativa vs real) antes de mostrarlo.
- Sin pruebas automáticas: agregar un mínimo (Vitest) antes de tocar checkout/fulfillment.

**Recomendadas**
- `Product` duplica campos de `Species`: riesgo de deriva al aprobar fichas por lote; sincronizar al aprobar o leer de `Species`.
- Admin con contraseña única y token constante: añadir expiración/rotación y rate-limit en login; roles si entra más gente.
- Sin rate limiting en `/api/stripe/checkout` ni en `/api/contact`.
- `parseSpeciesChatGptResponse` no valida enums: un valor inválido llega al formulario.
- Datos de demanda limitados (`PageView` por path sin eventos de carrito): añadir eventos `add_to_cart`/`request` para la rotación.
- Deploy ejecuta `db push` en cada build: considerar migraciones versionadas (`prisma migrate`) antes de agregar muchas tablas.

**Mejoras independientes futuras**
- `ProductSize`/`sizeKey` legados sin uso: limpiar.
- Notificación "avísame" (`ArrivalAlert`/Wishlist) para ofertas encargables.
- Dashboard de margen real por pedido con costo de adquisición exacto.

---

### Anexo — Limitaciones de esta auditoría
- No se accedió a la base de datos de MSC ni a Stripe/Vercel; no se verificó el plan de Vercel, tarifas Stripe, ni normativa. Los precios de TarCan son un snapshot del 2026-11-27, dos lecturas del mismo día. No se estudiaron precios de competidores. Los puntajes y la demanda son estimaciones.
