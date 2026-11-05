# 99 - Comportamiento del agente

Reglas de trabajo obligatorias para todas las fases.

## Antes de empezar cualquier fase
1. Leer `00-vision.md`, `01-stack.md` y `02-esquema-plantilla.md` completos.
2. Leer el archivo de la fase indicada.
3. Confirmar en una línea: qué fase se ejecuta y cuál es su objetivo.

## Reglas de ejecución
- **Solo la fase indicada.** No implementar funcionalidad de fases futuras aunque parezca
  obvia o el usuario la vaya a necesitar. Si algo es claramente necesario más adelante,
  se menciona en el resumen final como "nota para fase X", sin implementarlo.
- **No refactorizar** código de fases anteriores sin permiso explícito. Si se detecta un
  bug de una fase anterior, reportarlo y corregirlo solo si se autoriza.
- **El esquema de `02` es intocable**: no agregar ni quitar campos del JSON de plantilla.
  Si una fase lo requiere, se propone el cambio y se espera aprobación.
- **Decisiones no especificadas**: preguntar en vez de asumir. Si preguntar bloquea algo
  pequeño, elegir la opción más simple, dejarla marcada con un comentario `// DECISION:`
  y reportarla en el resumen.
- Cada fase debe terminar con la app **funcionando** (npm run dev sin errores, fase
  anterior intacta).

## Formato de entrega al terminar cada fase
Resumen con:
1. Qué se implementó (viñetas cortas).
2. Archivos creados/modificados.
3. Cómo probarlo paso a paso.
4. Criterios de aceptación marcados ✅/❌.
5. Decisiones tomadas (comentarios `// DECISION:`) y notas para fases futuras.
