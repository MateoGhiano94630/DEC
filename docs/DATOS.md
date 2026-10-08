# Datos: alternativas, criterios, rúbricas y perfiles

Relevamiento realizado el **25/09/2026**. Los valores se pueden editar desde la sección **Modelos** de la aplicación. Los datos semilla están en [`src/domain/seed.ts`](../src/domain/seed.ts).

## 1. Selección de alternativas

Se eligió **un modelo insignia por proveedor**. El set incluye a los cinco proveedores de la entrega 1 (OpenAI, Anthropic, Google, Mistral y Meta) y suma a xAI, DeepSeek y Alibaba, que hoy son relevantes en el mercado. La entrega 1 mencionaba modelos de 2024 (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Mistral Large, Llama 3); por decisión del grupo se reemplazaron por sus equivalentes vigentes. En el caso de Meta, la línea Llama fue sucedida por Muse Spark.

Cuando un modelo se ofrece con varios niveles de razonamiento, se usó el nivel **high**, o el único publicado si no hay otro, para que la comparación sea homogénea.

## 2. Criterios y fuentes

| Código | Criterio | Sentido | Medición | Fuente |
| --- | --- | --- | --- | --- |
| C1 | Costo de utilización | Minimizar | $(3 \cdot p_{in} + p_{out}) / 4$ en USD por 1M de tokens (proporción 3:1 de entrada/salida) | Precios de la API oficial, relevados por Artificial Analysis |
| C2 | Calidad de razonamiento | Maximizar | *Artificial Analysis Intelligence Index* (0–100): índice compuesto que promedia benchmarks públicos de razonamiento, conocimiento, matemática, programación y tareas agénticas | Artificial Analysis |
| C3 | Ventana de contexto | Maximizar | Tokens por sesión | Artificial Analysis / documentación del proveedor |
| C4 | Velocidad de generación | Maximizar | Mediana de tokens de salida por segundo en la API del proveedor | Artificial Analysis |
| C5 | Soporte multimodal | Maximizar | Likert 1–5 según las modalidades de entrada y salida (rúbrica abajo) | Artificial Analysis (modalidades por modelo) |
| C6 | Privacidad | Maximizar | Likert 1–5 según la política de datos de la API (rúbrica abajo) | Políticas publicadas por cada proveedor |

**¿Por qué la proporción 3:1 en C1?** En el uso típico (chat, RAG, programación) se envían más tokens de los que se reciben. Artificial Analysis usa esta misma proporción para su "precio combinado", lo que permite contrastar los valores.

**¿Por qué un índice compuesto en C2?** Un único benchmark (por ejemplo MMLU) está saturado en los modelos actuales y es sensible a la contaminación de datos de entrenamiento. Un índice que promedia varias evaluaciones es más robusto.

## 3. Rúbricas de los criterios cualitativos

### C5 – Soporte multimodal

| Puntaje | Nivel |
| :-: | --- |
| 1 | Solo texto |
| 2 | Texto + imagen / documentos |
| 3 | Texto + imagen + (video **o** audio) |
| 4 | Texto + imagen + video + audio |
| 5 | Entrada multimodal completa y además **genera** imagen o audio |

### C6 – Privacidad

| Puntaje | Nivel |
| :-: | --- |
| 1 | Usa los datos enviados por la API para entrenar por defecto |
| 2 | No entrena, pero la retención es larga, los términos son poco claros o la jurisdicción no ofrece garantías |
| 3 | No entrena con datos de la API y la retención es acotada (≤ 30 días) |
| 4 | Lo anterior, más opción de retención cero (ZDR) y certificaciones (SOC 2 / ISO 27001) |
| 5 | Pesos abiertos: el modelo se puede autoalojar y los datos nunca salen de la infraestructura propia |

> Decisión del grupo: un modelo de **pesos abiertos** recibe 5, porque el usuario puede evitar por completo enviar datos a un tercero.

## 4. Matriz de decisión inicial

| Modelo | Proveedor | $p_{in}$ | $p_{out}$ | **C1** | **C2** | **C3** | **C4** | **C5** | **C6** |
| --- | --- | --: | --: | --: | --: | --: | --: | :-: | :-: |
| Claude Opus 5.5 (high) | Anthropic | 4,00 | 20,00 | 8,000 | 53,58 | 1.000.000 | 87,4 | 2 | 4 |
| GPT-6 Astra (high) | OpenAI | 10,00 | 50,00 | 20,000 | 50,92 | 1.000.000 | 56,0 | 2 | 4 |
| Gemini 3.8 Flash (high) | Google | 0,75 | 3,75 | 1,500 | 40,93 | 1.000.000 | 338,2 | 4 | 4 |
| Grok 4.7 (high) | xAI | 2,00 | 6,00 | 3,000 | 46,33 | 500.000 | 58,3 | 2 | 4 |
| Muse Spark 1.3 (max) | Meta | 1,25 | 4,25 | 2,000 | 48,09 | 1.000.000 | 226,8 | 3 | 2 |
| DeepSeek V4.1 Flash | DeepSeek | 0,30 | 1,20 | 0,525 | 39,46 | 1.000.000 | 236,1 | 2 | 5 |
| Mistral Medium 3.5 | Mistral | 1,50 | 7,50 | 3,000 | 14,19 | 256.000 | 144,1 | 2 | 5 |
| Qwen3.8 Max (0902) | Alibaba | 2,00 | 6,00 | 3,000 | 45,42 | 983.616 | 39,7 | 2 | 3 |

## 5. Justificación de C5 y C6 por modelo

| Modelo | C5 | Justificación C5 | C6 | Justificación C6 |
| --- | :-: | --- | :-: | --- |
| Claude Opus 5.5 | 2 | Texto + imagen (y PDF) | 4 | No entrena con datos de la API, retención de 30 días, ZDR para cuentas calificadas, SOC 2 Tipo II / ISO 27001 |
| GPT-6 Astra | 2 | Texto + imagen | 4 | No entrena por defecto, retención de 30 días para monitoreo de abuso, ZDR disponible, SOC 2 Tipo II |
| Gemini 3.8 Flash | 4 | Texto + imagen + audio + video | 4 | El tier pago no entrena, retención configurable (7–55 días), ZDR en Gemini API / Vertex AI |
| Grok 4.7 | 2 | Texto + imagen | 4 | No entrena sin permiso explícito, retención de 30 días, ZDR para cuentas enterprise |
| Muse Spark 1.3 | 3 | Texto + imagen + video | 2 | Meta no publicó términos claros sobre entrenamiento y retención; ZDR solo a pedido vía ventas |
| DeepSeek V4.1 Flash | 2 | Texto + imagen | 5 | Pesos abiertos (autoalojable). *Nota: la API oficial se aloja en China; si se usara esa API, el puntaje sería menor.* |
| Mistral Medium 3.5 | 2 | Texto + imagen | 5 | Pesos abiertos (autoalojable); además, la API paga (UE) no entrena con los datos |
| Qwen3.8 Max | 2 | Texto + imagen | 3 | Alibaba Cloud Model Studio declara no usar los datos para entrenar y ofrece regiones fuera de China; no documenta ZDR |

> ⚠ **Para revisar por el grupo.** Los puntajes de C6 surgen de las políticas publicadas al 25/09/2026 y de fuentes secundarias. Conviene verificarlos antes de la entrega final, sobre todo los de Muse Spark y Qwen.

## 6. Perfiles predefinidos

| Perfil | C1 | C2 | C3 | C4 | C5 | C6 | Caso de uso |
| --- | --: | --: | --: | --: | --: | --: | --- |
| Equilibrado | 20 % | 20 % | 15 % | 15 % | 15 % | 15 % | Uso general |
| Programación | 10 % | **35 %** | 25 % | 15 % | 5 % | 10 % | Repositorios grandes: razonamiento y contexto (entrega 1: C2 = 35 %) |
| Uso económico | **40 %** | 20 % | 10 % | 15 % | 5 % | 10 % | Minimizar costo (entrega 1: C1 = 40 %) |
| Datos sensibles | 10 % | 20 % | 15 % | 10 % | 5 % | **40 %** | Información confidencial |
| Multimodal | 15 % | 20 % | 10 % | 10 % | **35 %** | 10 % | Imágenes, documentos, audio y video |
| Tiempo real | 20 % | 15 % | 5 % | **40 %** | 10 % | 10 % | Chatbots, baja latencia |

## 7. Resultados con los datos iniciales

| Perfil | 1º | 2º | 3º |
| --- | --- | --- | --- |
| Equilibrado | Gemini 3.8 Flash (0,888) | DeepSeek V4.1 Flash (0,776) | Muse Spark 1.3 (0,761) |
| Programación | Gemini 3.8 Flash (0,814) | Muse Spark 1.3 (0,772) | DeepSeek V4.1 Flash (0,742) |
| Uso económico | Gemini 3.8 Flash (0,925) | DeepSeek V4.1 Flash (0,899) | Muse Spark 1.3 (0,867) |
| Datos sensibles | DeepSeek V4.1 Flash (0,822) | Gemini 3.8 Flash (0,772) | Claude Opus 5.5 (0,626) |
| Multimodal | Gemini 3.8 Flash (0,885) | Muse Spark 1.3 (0,706) | DeepSeek V4.1 Flash (0,586) |
| Tiempo real | Gemini 3.8 Flash (0,937) | DeepSeek V4.1 Flash (0,732) | Muse Spark 1.3 (0,704) |

Gemini 3.8 Flash domina porque no tiene ningún criterio malo: es el más rápido, el segundo más barato, tiene el mejor puntaje multimodal y buena privacidad. Además, su C2 no está muy lejos del máximo una vez normalizado. El detalle está en [METODO_TOPSIS.md § 5](METODO_TOPSIS.md#5-ejemplo-completo-con-los-datos-de-la-aplicación).

## Fuentes

- Artificial Analysis, leaderboard y páginas de cada modelo: <https://artificialanalysis.ai/leaderboards/models>
- xAI, API Security FAQ: <https://docs.x.ai/developers/faq/security>
- Google, Zero data retention in the Gemini API: <https://ai.google.dev/gemini-api/docs/zdr>
- OpenAI, Zero Data Retention: <https://openai.com/index/offering-zero-data-retention-for-frontier-models/>
- Meta, Muse Spark 1.3 for Developers: <https://developer.meta.com/ai/models/muse-spark/>
- Spheron, Meta Muse Spark API privacy (análisis de terceros): <https://www.spheron.network/blog/meta-muse-spark-api-pricing-vs-self-hosted-llms-cost-privacy-2026/>
- Alibaba Cloud Model Studio, FAQ: <https://www.alibabacloud.com/help/doc-detail/2587658.html>
