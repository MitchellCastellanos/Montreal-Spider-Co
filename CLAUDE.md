## Prompts para generar imágenes con ChatGPT

Cuando el usuario pida preparar las imágenes necesarias para el proyecto, primero
inspecciona el código para identificar:

- cuáles imágenes hacen falta;
- dónde se utilizará cada imagen;
- la ruta y el nombre exactos que espera el código;
- la orientación, relación de aspecto y estilo visual apropiados;
- las imágenes existentes que sirvan como referencia visual.

Después, genera prompts finales listos para copiar y pegar directamente en ChatGPT.

### Formato obligatorio de entrega

El resultado NO debe ser una ficha técnica, auditoría, explicación ni especificación
detallada por imagen.

NO utilices secciones individuales como:

- “Utilizada en”
- “Texto alternativo”
- “Resolución recomendada”
- “Prompt”
- “Contexto del proyecto”
- “Especificaciones técnicas”
- “Fin del lote”

Tampoco expliques al usuario cómo guardar las imágenes después del prompt.

Cada lote debe ser un único prompt natural, compacto y autosuficiente, similar al
siguiente formato:

Vas a generar [cantidad] imágenes para [descripción breve del proyecto]. Te voy a dar
las [cantidad] descripciones de una vez, pero quiero que las generes de UNA EN UNA:
genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen
2, y así sucesivamente hasta terminar las [cantidad]. No generes más de una imagen por
turno.

Estilo visual que deben compartir las imágenes (aplícalo a todas): [guía visual
completa pero compacta, escrita como un solo párrafo].

IMAGEN 1 — archivo: [ruta exacta/nombre.ext]
[Descripción completa de la imagen.]

IMAGEN 2 — archivo: [ruta exacta/nombre.ext]
[Descripción completa de la imagen.]

[Continuar con las demás imágenes.]

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".

### Reglas para los lotes

- Divide las imágenes en grupos de máximo 7.
- Si hay más de 7 imágenes, entrega varios bloques independientes.
- Cada bloque debe poder copiarse y pegarse directamente en un chat nuevo.
- Cada bloque debe repetir el contexto, el estilo visual y la instrucción de generar
  una sola imagen y esperar “siguiente”.
- Dentro de cada lote, reinicia la numeración desde IMAGEN 1.
- Indica la cantidad real del lote: si el último lote contiene 2 imágenes, escribe
  “Vas a generar 2 imágenes”.
- Pon cada lote dentro de su propio bloque de código para que pueda copiarse fácilmente.
- Fuera del bloque puedes escribir únicamente un título breve como “LOTE 1 DE 2”.
- No agregues comentarios, análisis ni instrucciones después del bloque.
- No pongas cada descripción dentro de un campo llamado “Prompt”.
- La descripción que aparece debajo de cada IMAGEN ya es el prompt.
- Mantén las descripciones suficientemente detalladas para obtener resultados
  consistentes, pero evita convertirlas en fichas técnicas enormes.
- Toda información compartida debe aparecer una sola vez en el párrafo de estilo
  visual, no repetirse en las siete descripciones.

### Nombres y rutas

Después de inspeccionar el código, escribe la ubicación completa dentro de `archivo:`.

Ejemplo:

IMAGEN 1 — archivo: public/images/blog/how-to-sex-a-tarantula.png

Esto permite que el usuario sepa tanto el nombre como el directorio donde debe guardar
la imagen.

Respeta exactamente:

- carpetas;
- nombre del archivo;
- mayúsculas y minúsculas;
- guiones;
- extensión.

Si el código todavía no define la ruta, selecciona una ruta coherente con la estructura
actual del proyecto.

### Restricción importante

La respuesta final debe parecerse al prompt que una persona le escribiría directamente
a ChatGPT para generar varias imágenes consecutivas. No debe parecer documentación
técnica destinada a explicar el proceso.