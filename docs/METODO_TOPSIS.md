# Método TOPSIS: fundamento, implementación y verificación

## 1. Fundamento

TOPSIS (*Technique for Order of Preference by Similarity to Ideal Solution*) fue propuesto por Hwang y Yoon (1981). Parte de una idea geométrica: si cada alternativa es un punto en un espacio de *n* dimensiones (una por criterio), la mejor alternativa es la que está **más cerca de la solución ideal positiva** (el mejor valor de cada criterio) y **más lejos de la solución ideal negativa** (el peor).

Es un método **compensatorio**: un mal desempeño en un criterio puede compensarse con un buen desempeño en otro, en la proporción que fijen los pesos.

## 2. Formulación

Sean *m* alternativas, *n* criterios, la matriz de decisión $X = [x_{ij}]$ y los pesos $w_j \ge 0$ con $\sum_j w_j = 1$. Llamamos $B$ al conjunto de criterios de beneficio (maximizar) y $C$ al de criterios de costo (minimizar).

| Paso | Operación | Fórmula |
| --- | --- | --- |
| 1 | Normalización vectorial | $r_{ij} = x_{ij} \big/ \sqrt{\sum_{i=1}^{m} x_{ij}^2}$ |
| 2 | Ponderación | $v_{ij} = w_j \, r_{ij}$ |
| 3 | Solución ideal positiva (SIP) | $A^+_j = \max_i v_{ij}$ si $j \in B$; $\min_i v_{ij}$ si $j \in C$ |
| 3 | Solución ideal negativa (SIN) | $A^-_j = \min_i v_{ij}$ si $j \in B$; $\max_i v_{ij}$ si $j \in C$ |
| 4 | Distancias euclidianas | $D^+_i = \sqrt{\sum_j (v_{ij} - A^+_j)^2}$, $\quad D^-_i = \sqrt{\sum_j (v_{ij} - A^-_j)^2}$ |
| 5 | Proximidad relativa | $C_i = D^-_i / (D^+_i + D^-_i)$, $\quad 0 \le C_i \le 1$ |

El ranking ordena las alternativas por $C_i$ de mayor a menor. $C_i = 1$ significa que la alternativa coincide con la SIP y $C_i = 0$, que coincide con la SIN.

### ¿Por qué normalización vectorial?

Los criterios tienen unidades y escalas muy distintas: dólares (C1), puntos (C2), millones de tokens (C3), tokens por segundo (C4) y escalas Likert (C5, C6). La normalización vectorial:

- deja cada columna adimensional y con norma 1, de modo que los pesos son la única fuente de importancia relativa;
- es **invariante a la escala**: expresar C3 en tokens o en miles de tokens da el mismo resultado (esto se verifica en los tests);
- es la normalización del TOPSIS clásico de Hwang y Yoon, que es la que usa la cátedra.

## 3. Implementación

El motor está en [`src/engine/topsis.ts`](../src/engine/topsis.ts). Es una función pura, `topsis(input) → result`, que no depende de la base de datos ni de la interfaz y devuelve **todos los pasos intermedios** (normas, R, V, SIP, SIN, D⁺, D⁻, C y ranking). El backend la ejecuta en `POST /api/topsis` y la interfaz muestra cada paso.

### Validaciones (precondiciones del método)

| Condición | Motivo |
| --- | --- |
| Al menos 2 alternativas y 1 criterio | Con una sola alternativa no hay ranking. |
| Dimensiones consistentes (m × n, n pesos) | Evita errores silenciosos. |
| Valores finitos y $x_{ij} \ge 0$ | La normalización vectorial supone valores no negativos. |
| Tipo de cada criterio: `benefit` o `cost` | Define el sentido de la SIP y la SIN. |
| $w_j \ge 0$ y $\lvert\sum w_j - 1\rvert \le 10^{-6}$ | Tolerancia para errores de redondeo al ingresar porcentajes. |

Si una entrada no cumple alguna condición, la API responde **422** con un mensaje descriptivo.

### Casos degenerados

| Caso | Tratamiento |
| --- | --- |
| Una columna vale 0 en todas las alternativas | $\sqrt{\sum x^2} = 0$: en lugar de dividir 0/0 se toma $r_{ij} = 0$. El criterio no discrimina y no aporta a las distancias. Se emite una advertencia. |
| Todas las alternativas son idénticas en los criterios con peso > 0 | SIP = SIN, entonces $D^+ = D^- = 0$ y $C_i$ queda indeterminado (0/0). Se asigna $C_i = 0{,}5$ a todas, se informa el empate y se emite una advertencia. |
| Empates en $C_i$ | Con una tolerancia de $10^{-12}$, las alternativas empatadas comparten puesto con ranking de competencia (1, 2, 2, 4) y conservan el orden original. |

### Análisis de sensibilidad

[`src/engine/sensitivity.ts`](../src/engine/sensitivity.ts) hace variar el peso de un criterio $k$ entre 0 y 1 y reparte el resto entre los demás criterios manteniendo sus proporciones:

$$w'_k = t, \qquad w'_j = w_j \frac{1 - t}{1 - w_k} \quad (j \ne k)$$

Así $\sum w' = 1$ para todo $t$. Para cada $t$ se ejecuta TOPSIS completo y se registran los pesos en los que cambia la alternativa ganadora.

## 4. Verificación

`npm test` corre 75 tests con Vitest:

1. **Ejemplos resueltos a mano** (`tests/topsis.test.ts`). Por ejemplo, un solo criterio con valores 1, 2 y 3: la norma es $\sqrt{14}$, $D^+ = (2, 1, 0)/\sqrt{14}$, $D^- = (0, 1, 2)/\sqrt{14}$ y por lo tanto $C = (0;\ 0{,}5;\ 1)$. También un caso de 2 × 2 que mezcla un criterio de beneficio con uno de costo.
2. **Implementación de referencia independiente en Python/numpy** ([`scripts/topsis_reference.py`](../scripts/topsis_reference.py)). Se escribió aparte, con álgebra matricial, y genera 31 casos: la matriz semilla con los 6 perfiles y 25 matrices aleatorias de hasta 11 × 8 que mezclan criterios de costo y beneficio. El motor TypeScript coincide **en cada paso intermedio con 12 decimales**.
3. **Propiedades matemáticas**: $C_i \in [0, 1]$; invariancia ante cambios de escala de un criterio; invariancia ante permutaciones de filas; un criterio con peso 0 no altera el resultado; una alternativa dominante obtiene $C = 1$; si un criterio de beneficio pasa a ser de costo, el ranking se invierte.
4. **Casos degenerados y validación de entradas** (columna nula, alternativas idénticas, empates, pesos inválidos, valores negativos o NaN).
5. **Ejercicio de la cátedra**: *pendiente*. Cuando esté disponible se agregará como caso de prueba en `tests/topsis.test.ts`.

## 5. Ejemplo completo con los datos de la aplicación

Salida de `npx tsx scripts/example-markdown.ts programacion`. Los valores intermedios se muestran redondeados a 4 decimales; el cálculo se hace en doble precisión.

**Perfil:** Programación — w = (0.1, 0.35, 0.25, 0.15, 0.05, 0.1)

**Paso 0 — Matriz de decisión X**

| Modelo | C1 | C2 | C3 | C4 | C5 | C6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 8 | 53.58 | 1000000 | 87.4 | 2 | 4 |
| GPT-6 Astra | 20 | 50.92 | 1000000 | 56 | 2 | 4 |
| Gemini 3.8 Flash | 1.5 | 40.93 | 1000000 | 338.2 | 4 | 4 |
| Grok 4.7 | 3 | 46.33 | 500000 | 58.3 | 2 | 4 |
| Muse Spark 1.3 | 2 | 48.09 | 1000000 | 226.8 | 3 | 2 |
| DeepSeek V4.1 Flash | 0.525 | 39.46 | 1000000 | 236.1 | 2 | 5 |
| Mistral Medium 3.5 | 3 | 14.19 | 256000 | 144.1 | 2 | 5 |
| Qwen3.8 Max | 3 | 45.42 | 983616 | 39.7 | 2 | 3 |

**Paso 1 — Normas de columna** √Σx²: C1 = 22.3053, C2 = 124.1752, C3 = 2506598.5788, C4 = 508.0111, C5 = 7.0000, C6 = 11.2694

| r_ij | C1 | C2 | C3 | C4 | C5 | C6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 0.3587 | 0.4315 | 0.3989 | 0.1720 | 0.2857 | 0.3549 |
| GPT-6 Astra | 0.8966 | 0.4101 | 0.3989 | 0.1102 | 0.2857 | 0.3549 |
| Gemini 3.8 Flash | 0.0672 | 0.3296 | 0.3989 | 0.6657 | 0.5714 | 0.3549 |
| Grok 4.7 | 0.1345 | 0.3731 | 0.1995 | 0.1148 | 0.2857 | 0.3549 |
| Muse Spark 1.3 | 0.0897 | 0.3873 | 0.3989 | 0.4464 | 0.4286 | 0.1775 |
| DeepSeek V4.1 Flash | 0.0235 | 0.3178 | 0.3989 | 0.4648 | 0.2857 | 0.4437 |
| Mistral Medium 3.5 | 0.1345 | 0.1143 | 0.1021 | 0.2837 | 0.2857 | 0.4437 |
| Qwen3.8 Max | 0.1345 | 0.3658 | 0.3924 | 0.0781 | 0.2857 | 0.2662 |

**Paso 2 — Matriz ponderada V**

| v_ij | C1 | C2 | C3 | C4 | C5 | C6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 0.0359 | 0.1510 | 0.0997 | 0.0258 | 0.0143 | 0.0355 |
| GPT-6 Astra | 0.0897 | 0.1435 | 0.0997 | 0.0165 | 0.0143 | 0.0355 |
| Gemini 3.8 Flash | 0.0067 | 0.1154 | 0.0997 | 0.0999 | 0.0286 | 0.0355 |
| Grok 4.7 | 0.0134 | 0.1306 | 0.0499 | 0.0172 | 0.0143 | 0.0355 |
| Muse Spark 1.3 | 0.0090 | 0.1355 | 0.0997 | 0.0670 | 0.0214 | 0.0177 |
| DeepSeek V4.1 Flash | 0.0024 | 0.1112 | 0.0997 | 0.0697 | 0.0143 | 0.0444 |
| Mistral Medium 3.5 | 0.0134 | 0.0400 | 0.0255 | 0.0425 | 0.0143 | 0.0444 |
| Qwen3.8 Max | 0.0134 | 0.1280 | 0.0981 | 0.0117 | 0.0143 | 0.0266 |

**Paso 3 — Soluciones ideales**

|  | C1 | C2 | C3 | C4 | C5 | C6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A⁺ (SIP) | 0.0024 | 0.1510 | 0.0997 | 0.0999 | 0.0286 | 0.0444 |
| A⁻ (SIN) | 0.0897 | 0.0400 | 0.0255 | 0.0117 | 0.0143 | 0.0177 |

**Pasos 4 y 5 — Distancias, proximidad relativa y ranking**

| Puesto | Modelo | D⁺ | D⁻ | C_i |
| --- | ---: | ---: | ---: | ---: |
| 1 | Gemini 3.8 Flash | 0.0370 | 0.1623 | 0.8144 |
| 2 | Muse Spark 1.3 | 0.0461 | 0.1557 | 0.7716 |
| 3 | DeepSeek V4.1 Flash | 0.0519 | 0.1492 | 0.7419 |
| 4 | Claude Opus 5.5 | 0.0830 | 0.1457 | 0.6371 |
| 5 | Qwen3.8 Max | 0.0946 | 0.1375 | 0.5925 |
| 6 | Grok 4.7 | 0.1007 | 0.1223 | 0.5484 |
| 7 | GPT-6 Astra | 0.1221 | 0.1287 | 0.5132 |
| 8 | Mistral Medium 3.5 | 0.1464 | 0.0864 | 0.3711 |

**Lectura del resultado.** Aunque el perfil Programación le da a C2 el mayor peso (35 %), Gemini 3.8 Flash queda primero. En C2 los modelos están relativamente parejos (39–54 puntos, salvo Mistral Medium 3.5) y la normalización vectorial comprime esas diferencias: la brecha en $v_{ij}$ entre el mejor y el sexto es de apenas 0,036. En cambio, C4 tiene mucha dispersión (40–338 tokens/s) y Gemini, además, es el segundo modelo más barato. Claude Opus 5.5, el mejor en C2, pierde por costo y velocidad. El análisis de sensibilidad muestra que, con este perfil, Claude Opus 5.5 pasa a ser el ganador cuando el peso de C2 supera aproximadamente el 68 %.

## 6. Limitaciones conocidas del método

- **Inversión de rangos (rank reversal).** Agregar o quitar una alternativa puede cambiar el orden relativo de otras dos, porque las normas de columna y las soluciones ideales dependen del conjunto evaluado.
- **Compensación.** Un modelo con un valor muy malo en un criterio puede quedar bien ubicado si sobresale en otros. Si se necesita un umbral mínimo (por ejemplo, "privacidad ≥ 4"), hay que filtrar las alternativas antes de evaluar.
- **Subjetividad de los pesos y de las escalas Likert.** El método es objetivo *dado* un juego de pesos y una matriz. Por eso los perfiles, las rúbricas y las fuentes de datos están documentados en [DATOS.md](DATOS.md).

## Referencias

- Hwang, C. L., & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications*. Springer-Verlag.
- Behzadian, M., Otaghsara, S. K., Yazdani, M., & Ignatius, J. (2012). A state-of-the-art survey of TOPSIS applications. *Expert Systems with Applications*, 39(17), 13051–13069.
