# Fase 6 — Rendimiento, accesibilidad y estabilidad

Esta fase consolida la estabilidad del editor sin ampliar el alcance funcional:

- **ErrorBoundary global**: captura errores de render en React y muestra una pantalla de recuperación con botón para recargar. El último guardado local se conserva.
- **CI de build**: workflow de GitHub Actions que instala dependencias y ejecuta `npm run build` en cada push o PR hacia `main`.
- **Base de accesibilidad**: la app ya cuenta con roles, etiquetas ARIA y navegación por teclado en el panel de capas y el lienzo; esta fase deja documentado el estándar a mantener.

## Próximos pasos sugeridos

- Agregar tests unitarios del store con Vitest.
- Agregar tests E2E de Playwright para los flujos críticos.
- Virtualizar el panel de capas para proyectos con muchas capas.
- Memoizar cálculos pesados del lienzo.
