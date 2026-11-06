import { test, expect } from '@playwright/test';

test('la app muestra el diagnóstico y no reporta errores en un proyecto vacío', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByTestId('diagnostics-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Sin problemas detectados');
  await expect(panel).toContainText('0 error(es)');
});

test('el diagnóstico permanece accesible mediante teclado', async ({ page }) => {
  await page.goto('/');
  const boton = page.getByRole('button', { name: 'Ocultar diagnóstico' });
  await boton.focus();
  await expect(boton).toBeFocused();
  await boton.click();
  await expect(page.getByRole('button', { name: 'Mostrar diagnóstico' })).toBeVisible();
});
