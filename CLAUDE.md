## Generación de prompts para imágenes

Cuando el usuario pida crear, preparar o generar imágenes para este proyecto, no debes generar prompts aislados ni entregar una lista informal. Debes preparar un documento maestro listo para copiar y pegar en ChatGPT o en otro agente generador de imágenes.

### 1. Inspección previa obligatoria

Antes de escribir los prompts:

1. Revisa el código y los assets existentes.
2. Identifica todas las imágenes necesarias.
3. Localiza las rutas, nombres de archivo y placeholders que ya espera el código.
4. No inventes nombres o rutas si ya existen referencias en componentes, datos, CSS o archivos de configuración.
5. Si todavía no existe una referencia, propone un nombre coherente con la estructura del proyecto y aclara que es una ruta nueva.
6. Verifica:
   - formato requerido (`.webp`, `.jpg`, `.png`, etc.);
   - orientación;
   - relación de aspecto;
   - uso de la imagen;
   - resolución recomendada;
   - si necesita fondo transparente;
   - posición del sujeto para evitar conflictos con textos o componentes superpuestos.

### 2. Formato del documento maestro

Crea un solo documento que contenga todos los lotes necesarios.

Divide las imágenes en lotes de un máximo de 7 imágenes. Por ejemplo:

- 1–7 imágenes: 1 lote.
- 8–14 imágenes: 2 lotes.
- 15–21 imágenes: 3 lotes.
- Y así sucesivamente.

Cada lote debe ser completamente autosuficiente, porque el usuario lo copiará y pegará por separado en una conversación con un agente generador de imágenes.

No escribas cosas como “mantén las instrucciones anteriores” o “usa el mismo estilo del lote previo”. Cada lote debe repetir explícitamente todo el contexto, estilo visual, restricciones y flujo de trabajo.

### 3. Instrucción obligatoria para el agente de imágenes

Al comienzo de cada lote, indica claramente al agente:

- Debe generar únicamente la primera imagen del lote en su primera respuesta.
- No debe generar todas las imágenes simultáneamente.
- Después de entregar una imagen, debe esperar a que el usuario escriba exactamente `siguiente`.
- Cada vez que el usuario escriba `siguiente`, debe generar solamente la imagen siguiente.
- Debe continuar así hasta terminar el lote.
- Junto con cada imagen debe devolver:
  1. número de imagen dentro del lote;
  2. nombre exacto del archivo;
  3. ruta exacta donde debe guardarse;
  4. texto alternativo recomendado;
  5. una frase breve identificando qué parte del sitio utiliza la imagen.
- No debe cambiar nombres, extensiones ni rutas.
- No debe agregar texto o logotipos dentro de la imagen salvo que el prompt lo solicite expresamente.
- Al terminar la última imagen, debe indicar claramente que el lote ha finalizado.

### 4. Estructura obligatoria de cada lote

Cada lote debe utilizar esta estructura:

# LOTE [n] — IMÁGENES [inicio] A [fin]

## Instrucciones para el agente generador

[Instrucciones completas del flujo “una por una” y espera de “siguiente”.]

## Contexto del proyecto

[Qué empresa, marca, producto o sitio es; qué función cumplen las imágenes.]

## Guía visual compartida

[Estilo, paleta, iluminación, composición, realismo, restricciones, continuidad visual y elementos prohibidos.]

## Especificaciones técnicas generales

[Formato, relación de aspecto, resolución, espacio negativo, transparencia y demás requisitos.]

## Imagen 1 — [nombre descriptivo]

- Archivo exacto: `[nombre.ext]`
- Ruta exacta: `[ruta/completa/nombre.ext]`
- Utilizada en: `[componente, página o sección]`
- Relación de aspecto: `[valor]`
- Resolución recomendada: `[ancho × alto]`
- Texto alternativo: `[alt text]`
- Prompt: `[prompt completo y autosuficiente]`

[Repetir la estructura para cada imagen del lote.]

### 5. Reglas de precisión

- Las rutas y filenames deben escribirse también dentro de las instrucciones dadas al agente generador, no solamente fuera del prompt.
- Conserva exactamente mayúsculas, minúsculas, guiones, extensiones y directorios usados por el código.
- No reemplaces una ruta existente sin advertirlo.
- Si una misma imagen se usa en varios lugares, indícalo.
- Si el código espera variantes desktop/mobile, trátalas como imágenes distintas.
- Si faltan datos esenciales, pregunta antes de preparar el documento.
- El resultado debe estar listo para copiar y pegar, sin que el usuario tenga que reorganizarlo o reescribir instrucciones.