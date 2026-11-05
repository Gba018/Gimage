import { test, expect } from '@playwright/test';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#da625b"/></svg>';
const svgAlt = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#4f8fc0"/></svg>';
const imageFile = { name: 'ejemplo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) };
const imageFileAlt = { name: 'reemplazo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svgAlt) };

async function state(page) {
  return page.evaluate(async () => {
    const resource = performance
      .getEntriesByType('resource')
      .find((item) => new URL(item.name).pathname === '/src/state/template-store.js');
    const store = (await import(resource?.name || '/src/state/template-store.js')).useTemplateStore.getState();
    const stage = window.Konva.stages[0];
    const transformer = stage.findOne('Transformer');
    return {
      template: store.template,
      selectedIds: store.selectedIds,
      textBoxes: store.textBoxes,
      guides: store.guides,
      pastCount: store.past.length,
      futureCount: store.future.length,
      view: { x: stage.x(), y: stage.y(), scale: stage.scaleX() },
      transformer: {
        selected: transformer.nodes().map((node) => node.id()),
        anchors: transformer.enabledAnchors(),
      },
      lines: stage.find('Line').map((line) => ({
        id: line.id(),
        color: line.stroke(),
        points: line.points(),
        x: line.x(),
        y: line.y(),
      })),
    };
  });
}

async function konvaNodeFill(page, nodeId) {
  return page.evaluate((id) => {
    const stage = window.Konva.stages[0];
    const node = id ? stage.findOne(`#${id}`) : stage.find('Rect')[0];
    if (!node) return null;
    return {
      fillPriority: node.fillPriority(),
      fill: node.fill(),
      linearStart: node.fillLinearGradientStartPoint(),
      linearEnd: node.fillLinearGradientEndPoint(),
      linearStops: node.fillLinearGradientColorStops(),
      radialStart: node.fillRadialGradientStartPoint(),
      radialEnd: node.fillRadialGradientEndPoint(),
      radialEndRadius: node.fillRadialGradientEndRadius(),
      radialStops: node.fillRadialGradientColorStops(),
    };
  }, nodeId);
}

async function point(page, x, y) {
  const holder = await page.getByTestId('stage-holder').boundingBox();
  const view = (await state(page)).view;
  return { x: holder.x + view.x + x * view.scale, y: holder.y + view.y + y * view.scale };
}

async function anchor(page, name) {
  const holder = await page.getByTestId('stage-holder').boundingBox();
  const position = await page.evaluate(
    (anchorName) => window.Konva.stages[0].findOne('Transformer').findOne(`.${anchorName}`).getAbsolutePosition(),
    name,
  );
  return { x: holder.x + position.x, y: holder.y + position.y };
}

async function drag(page, start, dx, dy, steps = 12) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps });
  await page.mouse.up();
}

async function uploadImage(page, file = imageFile) {
  const countBefore = (await state(page)).template.capas.filter((capa) => capa.tipo === 'imagen').length;
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(async () => (await state(page)).template.capas.filter((capa) => capa.tipo === 'imagen').length)
    .toBeGreaterThanOrEqual(countBefore);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('stage-holder')).toBeVisible();
});

test('arranca con un lienzo vacío, visible y con la plantilla base v2 exacta', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page).toHaveTitle('Lienzo — Estudio de diseño');
  await expect(page.getByText('Todo empieza aquí.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajustar a pantalla' })).toBeVisible();
  await expect(page.getByTestId('right-panel')).toBeVisible();
  const { template, view } = await state(page);
  expect(Object.keys(template).sort()).toEqual(['canvas', 'capas', 'nombre', 'version']);
  expect(template).toEqual({
    version: 1,
    nombre: 'Proyecto sin título',
    canvas: { width: 1080, height: 1080, background: { fill: '#ffffff' } },
    capas: [],
  });
  expect(view.scale).toBeGreaterThanOrEqual(0.25);
  expect(view.scale).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('crea proyectos con presets, tamaño personalizado y fondo sólido', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  await page.locator('#project-title').fill('Historia verde');
  await page.getByRole('button', { name: /Historia/ }).click();
  await page.getByLabel('Color de fondo hexadecimal').fill('#273c2d');
  await page.getByRole('button', { name: 'Crear lienzo' }).click();
  let current = await state(page);
  expect(current.template.nombre).toBe('Historia verde');
  expect(current.template.canvas).toEqual({ width: 1080, height: 1920, background: { fill: '#273c2d' } });
  await expect(page.locator('.empty-canvas-hint')).toHaveClass(/on-dark/);

  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  await page.getByRole('button', { name: /Banner/ }).click();
  await page.getByRole('button', { name: 'Crear lienzo' }).click();
  current = await state(page);
  expect(current.template.canvas).toEqual({ width: 1200, height: 628, background: { fill: '#ffffff' } });

  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  await page.getByRole('button', { name: /Personalizado/ }).click();
  await page.getByLabel('Ancho personalizado en píxeles').fill('640');
  await page.getByLabel('Alto personalizado en píxeles').fill('360');
  await page.getByRole('button', { name: 'Crear lienzo' }).click();
  current = await state(page);
  expect(current.template.canvas.width).toBe(640);
  expect(current.template.canvas.height).toBe(360);
});

test('inserta los cinco tipos de capa centrados tras pan y zoom y cumple estrictamente el esquema v2', async ({ page }) => {
  const holder = await page.getByTestId('stage-holder').boundingBox();
  await page.keyboard.down('Space');
  await drag(page, { x: holder.x + 60, y: holder.y + 70 }, 110, 50);
  await page.keyboard.up('Space');
  await page.mouse.move(holder.x + 270, holder.y + 220);
  await page.mouse.wheel(0, -120);

  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  await page.getByRole('button', { name: 'Añadir círculo' }).click();
  await page.getByRole('button', { name: 'Añadir línea' }).click();
  await page.getByRole('button', { name: 'Añadir texto' }).click();
  await uploadImage(page);
  await expect.poll(async () => (await state(page)).template.capas.length).toBe(5);

  const { template, selectedIds } = await state(page);
  expect(template.capas.map((capa) => capa.tipo)).toEqual(['rect', 'circulo', 'linea', 'texto', 'imagen']);

  const commonKeys = ['id', 'tipo', 'nombre', 'visible', 'bloqueada', 'x', 'y', 'rotation', 'opacity'];
  for (const capa of template.capas) {
    expect(capa.id).toMatch(/^obj_[a-z0-9]{6}$/);
    expect(Object.keys(capa).sort()).toEqual([...commonKeys, capa.tipo].sort());
    expect(capa.opacity).toBe(1);
    expect(capa.visible).toBe(true);
    expect(capa.bloqueada).toBe(false);
  }

  expect(Object.keys(template.capas[0].rect).sort()).toEqual(['width', 'height', 'fill', 'stroke', 'cornerRadius'].sort());
  expect(template.capas[0].x + template.capas[0].rect.width / 2).toBe(540);
  expect(template.capas[0].y + template.capas[0].rect.height / 2).toBe(540);

  expect(Object.keys(template.capas[1].circulo).sort()).toEqual(['radius', 'fill', 'stroke'].sort());
  expect(template.capas[1].x).toBe(540);
  expect(template.capas[1].y).toBe(540);

  expect(Object.keys(template.capas[2].linea).sort()).toEqual(['points', 'stroke', 'strokeWidth'].sort());
  expect(template.capas[2].x + template.capas[2].linea.points[2] / 2).toBe(540);
  expect(template.capas[2].y).toBe(540);

  expect(Object.keys(template.capas[3].texto).sort()).toEqual([
    'texto', 'fontFamily', 'fontSize', 'fill', 'align', 'fontStyle', 'letterSpacing', 'lineHeight',
  ].sort());

  expect(Object.keys(template.capas[4].imagen).sort()).toEqual(['src', 'width', 'height'].sort());
  expect(template.capas[4].imagen.src).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(selectedIds).toEqual([template.capas[4].id]);
});

test('Shift+clic selecciona varios; flechas, arrastre, duplicar y borrar afectan a toda la selección', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Añadir texto' }).click();
  let current = await state(page);
  const [rect] = current.template.capas;
  const rectPoint = await point(page, rect.x + 200, rect.y + 150);
  await page.keyboard.down('Shift');
  await page.mouse.click(rectPoint.x, rectPoint.y);
  await page.keyboard.up('Shift');
  current = await state(page);
  expect(current.selectedIds).toHaveLength(2);
  expect(current.transformer.selected).toHaveLength(2);
  await expect(page.getByText('2 elementos seleccionados')).toBeVisible();

  const beforeKeys = current.template.capas;
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');
  current = await state(page);
  for (let i = 0; i < 2; i += 1) {
    expect(current.template.capas[i].x).toBe(beforeKeys[i].x + 10);
    expect(current.template.capas[i].y).toBe(beforeKeys[i].y + 1);
  }

  const beforeDrag = current.template.capas;
  const start = await point(page, beforeDrag[0].x + 120, beforeDrag[0].y + 100);
  await drag(page, start, 50, 60);
  current = await state(page);
  const dx1 = current.template.capas[0].x - beforeDrag[0].x;
  const dx2 = current.template.capas[1].x - beforeDrag[1].x;
  const dy1 = current.template.capas[0].y - beforeDrag[0].y;
  const dy2 = current.template.capas[1].y - beforeDrag[1].y;
  expect(dx1).toBe(dx2);
  expect(dy1).toBe(dy2);

  await page.keyboard.press('Control+d');
  current = await state(page);
  expect(current.template.capas).toHaveLength(4);
  expect(current.selectedIds).toHaveLength(2);
  expect(current.template.capas[2].x).toBe(current.template.capas[0].x + 24);
  expect(current.template.capas[3].y).toBe(current.template.capas[1].y + 24);
  await page.keyboard.press('Delete');
  current = await state(page);
  expect(current.template.capas).toHaveLength(2);
  expect(current.selectedIds).toHaveLength(0);
});

test('redimensiona y rota rectángulo, círculo, línea e imagen con Transformer', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  let current = await state(page);
  const rectBefore = current.template.capas[0].rect;
  await drag(page, await anchor(page, 'bottom-right'), 55, 25);
  current = await state(page);
  expect(current.template.capas[0].rect.width).toBeGreaterThan(rectBefore.width + 30);
  expect(current.template.capas[0].rect.height).toBeGreaterThan(rectBefore.height + 20);
  await drag(page, await anchor(page, 'rotater'), 100, 30);
  current = await state(page);
  expect(Math.abs(current.template.capas[0].rotation)).toBeGreaterThan(5);

  await page.keyboard.press('Delete');
  await page.getByRole('button', { name: 'Añadir línea' }).click();
  current = await state(page);
  const lenBefore = current.template.capas[0].linea.points[2];
  await drag(page, await anchor(page, 'middle-right'), 70, 0);
  current = await state(page);
  expect(current.template.capas[0].linea.points[2]).toBeGreaterThan(lenBefore + 40);

  await page.keyboard.press('Delete');
  await uploadImage(page);
  await expect.poll(async () => (await state(page)).template.capas.length).toBe(1);
  const imgBefore = (await state(page)).template.capas[0].imagen;
  await page.keyboard.down('Shift');
  await drag(page, await anchor(page, 'middle-right'), 80, 0);
  await page.keyboard.up('Shift');
  current = await state(page);
  const imgAfter = current.template.capas[0].imagen;
  expect(imgAfter.width / imgAfter.height).toBeCloseTo(imgBefore.width / imgBefore.height, 1);
});

test('zoom hacia el puntero, límites 25 %–300 %, paneo y guías inteligentes/manuales funcionan intactos', async ({ page }) => {
  const holder = await page.getByTestId('stage-holder').boundingBox();
  const pointer = { x: holder.x + 310, y: holder.y + 270 };
  let current = await state(page);
  const beforeView = current.view;
  const docPoint = {
    x: (pointer.x - holder.x - beforeView.x) / beforeView.scale,
    y: (pointer.y - holder.y - beforeView.y) / beforeView.scale,
  };
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => (await state(page)).view.scale).toBeGreaterThan(beforeView.scale);
  current = await state(page);
  expect((pointer.x - holder.x - current.view.x) / current.view.scale).toBeCloseTo(docPoint.x, 5);
  expect((pointer.y - holder.y - current.view.y) / current.view.scale).toBeCloseTo(docPoint.y, 5);

  for (let i = 0; i < 20; i += 1) await page.getByRole('button', { name: 'Acercar' }).click();
  expect((await state(page)).view.scale).toBe(3);
  for (let i = 0; i < 25; i += 1) await page.getByRole('button', { name: 'Alejar' }).click();
  expect((await state(page)).view.scale).toBe(0.25);

  await page.getByRole('button', { name: 'Ajustar a pantalla' }).click();
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  current = await state(page);
  let rect = current.template.capas[0];
  let start = await point(page, rect.x + 100, rect.y + 80);
  await drag(page, start, 100 * current.view.scale, 150 * current.view.scale);
  current = await state(page);
  rect = current.template.capas[0];
  start = await point(page, rect.x + 100, rect.y + 80);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 97 * current.view.scale, start.y + 30 * current.view.scale, { steps: 12 });
  await expect.poll(async () => (await state(page)).lines.some((line) => line.color === '#e971ad' && line.points[0] === 540)).toBe(true);
  await page.mouse.up();
  current = await state(page);
  expect(current.template.capas[0].x).toBe(360);

  const horizontal = await page.locator('.ruler-horizontal').boundingBox();
  const destination = await point(page, 300, 220);
  await drag(page, { x: destination.x, y: horizontal.y + 10 }, 0, destination.y - (horizontal.y + 10));
  current = await state(page);
  expect(current.guides).toHaveLength(1);
  expect(current.template).not.toHaveProperty('guides');
});

test('editor de Fill: degradado lineal/radial, vista de ángulo, 2–8 stops y render real en Konva con version 2', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  let current = await state(page);
  const rectId = current.template.capas[0].id;
  expect(current.template.version).toBe(1);

  // Activar degradado lineal 0° naranja -> amarillo
  await page.getByRole('button', { name: 'Degradado' }).click();
  await page.getByLabel('Color parada 1 hexadecimal').fill('#ff8800');
  await page.getByLabel('Color parada 1 hexadecimal').blur();
  await page.getByLabel('Color parada 2 hexadecimal').fill('#ffdd00');
  await page.getByLabel('Color parada 2 hexadecimal').blur();

  await expect(page.getByTestId('angle-direction-preview')).toContainText('0° → derecha');
  current = await state(page);
  expect(current.template.version).toBe(2);
  expect(current.template.capas[0].rect.fill).toEqual({
    type: 'linear',
    angle: 0,
    stops: [
      { offset: 0, color: '#ff8800' },
      { offset: 1, color: '#ffdd00' },
    ],
  });

  // Verificar que Konva renderiza fillLinearGradient* de izquierda (0) a derecha (360)
  let konvaFill = await konvaNodeFill(page, rectId);
  expect(konvaFill.fillPriority).toBe('linear-gradient');
  expect(konvaFill.linearStart.x).toBeCloseTo(0, 3);
  expect(konvaFill.linearEnd.x).toBeCloseTo(360, 3);
  expect(konvaFill.linearStops).toEqual([0, '#ff8800', 1, '#ffdd00']);

  // Cambiar ángulo a 90° (arriba -> abajo) y 270° (abajo -> arriba)
  await page.getByRole('button', { name: '90° ↓' }).click();
  await expect(page.getByTestId('angle-direction-preview')).toContainText('90° ↓ abajo');
  konvaFill = await konvaNodeFill(page, rectId);
  expect(konvaFill.linearStart.y).toBeCloseTo(0, 3);
  expect(konvaFill.linearEnd.y).toBeCloseTo(240, 3);

  await page.getByRole('button', { name: '270° ↑' }).click();
  await expect(page.getByTestId('angle-direction-preview')).toContainText('270° ↑ arriba');
  konvaFill = await konvaNodeFill(page, rectId);
  expect(konvaFill.linearStart.y).toBeCloseTo(240, 3);
  expect(konvaFill.linearEnd.y).toBeCloseTo(0, 3);

  // No permitir borrar stops cuando quedan 2
  await page.getByTestId('gradient-stop-handle-0').dblclick();
  current = await state(page);
  expect(current.template.capas[0].rect.fill.stops).toHaveLength(2);

  // Click en la barra agrega stops hasta el tope máximo de 8
  const bar = await page.getByTestId('gradient-stop-bar').boundingBox();
  const clickRatios = [0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.95];
  for (const ratio of clickRatios) {
    await page.mouse.click(bar.x + bar.width * ratio, bar.y + bar.height / 2);
  }
  current = await state(page);
  expect(current.template.capas[0].rect.fill.stops).toHaveLength(8);
  // Verificar que los stops están ordenados por offset y sin campos extra
  const offsets = current.template.capas[0].rect.fill.stops.map((s) => s.offset);
  expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  for (const stop of current.template.capas[0].rect.fill.stops) {
    expect(Object.keys(stop).sort()).toEqual(['color', 'offset']);
  }

  // Doble clic en stops intermedios los borra hasta volver a 3, y arrastrar mueve un stop
  for (let i = 0; i < 5; i += 1) {
    await page.getByTestId('gradient-stop-handle-1').dblclick();
  }
  current = await state(page);
  expect(current.template.capas[0].rect.fill.stops).toHaveLength(3);

  const handleBox = await page.getByTestId('gradient-stop-handle-1').boundingBox();
  await drag(page, { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 }, 40, 0, 8);
  current = await state(page);
  expect(current.template.capas[0].rect.fill.stops[1].offset).toBeGreaterThan(0.2);

  // Cambiar a Radial con centro desplazado
  await page.getByRole('button', { name: 'Radial' }).click();
  await page.getByLabel('Centro radial X en porcentaje').fill('25');
  await page.getByLabel('Centro radial X en porcentaje').blur();
  await page.getByLabel('Centro radial Y en porcentaje').fill('75');
  await page.getByLabel('Centro radial Y en porcentaje').blur();

  current = await state(page);
  const radialFill = current.template.capas[0].rect.fill;
  expect(Object.keys(radialFill).sort()).toEqual(['centerX', 'centerY', 'stops', 'type']);
  expect(radialFill.type).toBe('radial');
  expect(radialFill.centerX).toBe(0.25);
  expect(radialFill.centerY).toBe(0.75);

  konvaFill = await konvaNodeFill(page, rectId);
  expect(konvaFill.fillPriority).toBe('radial-gradient');
  expect(konvaFill.radialStart).toEqual({ x: 90, y: 180 });

  // Al volver a Sólido y sin otros degradados, version regresa a 1; el fondo del canvas también admite degradado
  await page.getByRole('button', { name: 'Sólido' }).click();
  current = await state(page);
  expect(current.template.version).toBe(1);

  await page.getByRole('button', { name: 'Lienzo', exact: true }).click();
  await page.getByRole('button', { name: 'Degradado' }).click();
  current = await state(page);
  expect(current.template.version).toBe(2);
  expect(current.template.canvas.background.fill.type).toBe('linear');
  const bgKonva = await konvaNodeFill(page, null);
  expect(bgKonva.fillPriority).toBe('linear-gradient');
});

test('propiedades específicas de texto ({{campo}}), círculo, línea, imagen y validación numérica', async ({ page }) => {
  // Texto con placeholders, tipografía, negrita, alineación y degradado
  await page.getByRole('button', { name: 'Añadir texto' }).click();
  await page.getByLabel('Posición X').fill('120.7');
  await page.getByLabel('Posición X').blur();
  await page.getByLabel('Opacidad').fill('0.76');
  await page.getByLabel('Opacidad').blur();
  await page.getByLabel('Contenido del texto').fill('Promo {{titulo}} solo {{precio}}');
  await page.getByLabel('Seleccionar fuente usada').selectOption('Montserrat');
  await page.getByRole('button', { name: 'Negrita' }).click();
  await page.getByRole('button', { name: 'Alinear a la derecha' }).click();
  await page.getByRole('button', { name: 'Degradado' }).click();

  await expect(page.getByTestId('detected-placeholders')).toContainText('{{titulo}}');
  await expect(page.getByTestId('detected-placeholders')).toContainText('{{precio}}');

  let current = await state(page);
  const textoCapa = current.template.capas[0];
  expect(textoCapa.x).toBe(121);
  expect(textoCapa.opacity).toBe(0.8);
  expect(textoCapa.texto.fontFamily).toBe('Montserrat');
  expect(textoCapa.texto.fontStyle).toBe('normal');
  expect(textoCapa.texto.align).toBe('right');
  expect(textoCapa.texto.fill.type).toBe('linear');
  const textKonva = await konvaNodeFill(page, textoCapa.id);
  expect(textKonva.fillPriority).toBe('linear-gradient');

  // Imagen: candado de proporción, reemplazo y recorte básico sin campos extra
  await uploadImage(page, imageFile);
  await expect.poll(async () => (await state(page)).template.capas.length).toBe(2);
  current = await state(page);
  const imgBefore = current.template.capas[1].imagen;
  // Con candado activo (200x100 = 2:1), cambiar ancho a 300 ajusta alto a 150
  await page.getByLabel('Ancho de imagen').fill('300');
  await page.getByLabel('Ancho de imagen').blur();
  current = await state(page);
  expect(current.template.capas[1].imagen.width).toBe(300);
  expect(current.template.capas[1].imagen.height).toBe(Math.round(300 / (imgBefore.width / imgBefore.height)));

  // Reemplazar archivo de imagen
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Reemplazar archivo' }).click(),
  ]);
  await chooser.setFiles(imageFileAlt);
  await expect.poll(async () => (await state(page)).template.capas[1].imagen.width).toBe(360);
  expect((await state(page)).template.capas[1].imagen.height).toBe(360);

  // Recorte básico (50% ancho) actualiza dataURL y dimensiones sin agregar claves al JSON
  await page.getByRole('button', { name: 'Recortar imagen' }).click();
  await page.getByLabel('Ancho de recorte en porcentaje').fill('50');
  await page.getByLabel('Ancho de recorte en porcentaje').blur();
  await page.getByRole('button', { name: 'Aplicar recorte' }).click();
  current = await state(page);
  expect(Object.keys(current.template.capas[1].imagen).sort()).toEqual(['height', 'src', 'width']);
  expect(current.template.capas[1].imagen.src).toMatch(/^data:image\/png;base64,/);
  expect(current.template.capas[1].imagen.width).toBe(180);
});

test('flujo completo de Fase 02: degradado lineal→radial, capas (orden, renombrar, ojo, bloqueo en canvas) y undo/redo', async ({ page }) => {
  // 1. Insertar rectángulo y aplicarle degradado lineal 0° naranja -> amarillo
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  await page.getByRole('button', { name: 'Degradado' }).click();
  await page.getByLabel('Color parada 1 hexadecimal').fill('#ff8800');
  await page.getByLabel('Color parada 1 hexadecimal').blur();
  await page.getByLabel('Color parada 2 hexadecimal').fill('#ffdd00');
  await page.getByLabel('Color parada 2 hexadecimal').blur();

  // 2. Cambiar a radial con centro desplazado
  await page.getByRole('button', { name: 'Radial' }).click();
  await page.getByLabel('Centro radial X en porcentaje').fill('30');
  await page.getByLabel('Centro radial X en porcentaje').blur();
  await page.getByLabel('Centro radial Y en porcentaje').fill('70');
  await page.getByLabel('Centro radial Y en porcentaje').blur();

  // 3. Insertar círculo y reordenar capas (primera = fondo)
  await page.getByRole('button', { name: 'Añadir círculo' }).click();
  let current = await state(page);
  const [rectId, circleId] = current.template.capas.map((c) => c.id);
  expect(current.template.capas.map((c) => c.id)).toEqual([rectId, circleId]);

  await page.getByRole('tab', { name: /Capas/ }).click();
  // Enviar círculo hacia el fondo con Ctrl+[
  await page.keyboard.press('Control+[');
  current = await state(page);
  expect(current.template.capas.map((c) => c.id)).toEqual([circleId, rectId]);

  // Traer círculo de nuevo al frente con botón y luego reordenar con drag & drop
  await page.getByRole('button', { name: 'Traer capa hacia el frente' }).click();
  current = await state(page);
  expect(current.template.capas.map((c) => c.id)).toEqual([rectId, circleId]);

  await page.getByTestId(`layer-item-${circleId}`).dragTo(page.getByTestId(`layer-item-${rectId}`));
  current = await state(page);
  expect(current.template.capas.map((c) => c.id)).toEqual([circleId, rectId]);

  // 4. Doble clic en la fila del rectángulo para renombrar
  await page.getByTestId(`layer-item-${rectId}`).dblclick();
  await page.getByLabel('Nuevo nombre de capa').fill('Fondo oferta');
  await page.getByLabel('Nuevo nombre de capa').press('Enter');
  current = await state(page);
  expect(current.template.capas.find((c) => c.id === rectId).nombre).toBe('Fondo oferta');

  // 5. Ocultar y volver a mostrar con el ojo
  await page.getByRole('button', { name: 'Ocultar Fondo oferta' }).click();
  expect((await state(page)).template.capas.find((c) => c.id === rectId).visible).toBe(false);
  await page.getByRole('button', { name: 'Mostrar Fondo oferta' }).click();
  expect((await state(page)).template.capas.find((c) => c.id === rectId).visible).toBe(true);

  // 6. Bloquear la capa del rectángulo y verificar que NO se puede seleccionar en el canvas
  await page.getByRole('button', { name: 'Bloquear Fondo oferta' }).click();
  current = await state(page);
  const rectLayer = current.template.capas.find((c) => c.id === rectId);
  expect(rectLayer.bloqueada).toBe(true);
  expect(current.selectedIds).not.toContain(rectId);

  // Hacer clic sobre la esquina del rectángulo (donde no está el círculo) en el canvas
  const rectCornerOnCanvas = await point(page, rectLayer.x + 20, rectLayer.y + 20);
  await page.mouse.click(rectCornerOnCanvas.x, rectCornerOnCanvas.y);
  current = await state(page);
  expect(current.selectedIds).toEqual([]);
  expect(current.transformer.selected).toEqual([]);

  // 7. Undo (Ctrl+Z) y Redo (Ctrl+Y) paso a paso
  // Deshacer bloqueo -> bloqueada vuelve a false
  await page.keyboard.press('Control+z');
  current = await state(page);
  expect(current.template.capas.find((c) => c.id === rectId).bloqueada).toBe(false);

  // Ahora sí se puede seleccionar en el canvas
  await page.mouse.click(rectCornerOnCanvas.x, rectCornerOnCanvas.y);
  current = await state(page);
  expect(current.selectedIds).toEqual([rectId]);

  // Rehacer bloqueo con Ctrl+Y -> vuelve a quedar bloqueada y fuera de la selección
  await page.keyboard.press('Control+y');
  current = await state(page);
  expect(current.template.capas.find((c) => c.id === rectId).bloqueada).toBe(true);
  expect(current.selectedIds).toEqual([]);

  // Deshacer todos los pasos hasta dejar el lienzo vacío y luego rehacer
  let safety = 0;
  while ((await state(page)).pastCount > 0 && safety < 30) {
    await page.keyboard.press('Control+z');
    safety += 1;
  }
  current = await state(page);
  expect(current.template.capas).toEqual([]);
  expect(current.template.version).toBe(1);

  while ((await state(page)).futureCount > 0 && safety < 60) {
    await page.keyboard.press('Control+y');
    safety += 1;
  }
  current = await state(page);
  expect(current.template.capas).toHaveLength(2);
  expect(current.template.version).toBe(2);
  expect(current.template.capas.find((c) => c.id === rectId).rect.fill).toEqual({
    type: 'radial',
    centerX: 0.3,
    centerY: 0.7,
    stops: [
      { offset: 0, color: '#ff8800' },
      { offset: 1, color: '#ffdd00' },
    ],
  });
});

test('inserta imagen por URL, informa errores, mantiene diseño móvil accesible y avisa al límite de zoom', async ({ page }) => {
  await page.route('https://images.test/imagen.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    headers: { 'access-control-allow-origin': '*' },
    body: svg,
  }));
  await page.getByRole('button', { name: 'Pegar URL de imagen' }).click();
  await page.getByLabel('URL de la imagen').fill('https://images.test/imagen.svg');
  await page.getByRole('button', { name: 'Añadir imagen' }).click();
  await expect.poll(async () => (await state(page)).template.capas.length).toBe(1);
  expect((await state(page)).template.capas[0].imagen.src).toBe('https://images.test/imagen.svg');

  await page.route('https://images.test/ausente.svg', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.getByRole('button', { name: 'Pegar URL de imagen' }).click();
  await page.getByLabel('URL de la imagen').fill('https://images.test/ausente.svg');
  await page.getByRole('button', { name: 'Añadir imagen' }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar la imagen');

  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Añadir texto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pegar URL de imagen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo proyecto' })).toBeVisible();
  await expect(page.getByRole('button', { name: '100%', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Nuevo proyecto' }).click();
  await page.getByRole('button', { name: /Personalizado/ }).click();
  await page.getByLabel('Ancho personalizado en píxeles').fill('10000');
  await page.getByLabel('Alto personalizado en píxeles').fill('10000');
  await page.getByRole('button', { name: 'Crear lienzo' }).click();
  await expect(page.getByRole('status')).toContainText('zoom mínimo es 25 %');
  expect((await state(page)).view.scale).toBe(0.25);
});

test('admite Fill sólido como objeto { type: "solid", color }, controles de círculo/línea, flechas numéricas y botones Deshacer/Rehacer', async ({ page }) => {
  // Probar círculo: radio, flechas numéricas, borde y Fill sólido como objeto
  await page.getByRole('button', { name: 'Añadir círculo' }).click();
  let current = await state(page);
  const circleId = current.template.capas[0].id;

  await page.getByLabel('Radio del círculo').press('Shift+ArrowUp');
  await page.getByLabel('Ancho de borde').fill('6');
  await page.getByLabel('Ancho de borde').blur();
  await page.getByLabel('Color de borde hexadecimal').fill('#334455');
  await page.getByLabel('Color de borde hexadecimal').blur();

  current = await state(page);
  expect(current.template.capas[0].circulo.radius).toBe(130);
  expect(current.template.capas[0].circulo.stroke).toEqual({ color: '#334455', width: 6 });

  // Verificar soporte de { type: 'solid', color } en capa y fondo sin subir version a 2
  await page.evaluate(async (id) => {
    const resource = performance
      .getEntriesByType('resource')
      .find((item) => new URL(item.name).pathname === '/src/state/template-store.js');
    const store = (await import(resource?.name || '/src/state/template-store.js')).useTemplateStore.getState();
    store.updateObject(id, { circulo: { fill: { type: 'solid', color: '#112233' } } });
    store.setCanvasBackground({ type: 'solid', color: '#f4f6f2' });
  }, circleId);

  current = await state(page);
  expect(current.template.version).toBe(1);
  expect(current.template.capas[0].circulo.fill).toEqual({ type: 'solid', color: '#112233' });
  expect(current.template.canvas.background.fill).toEqual({ type: 'solid', color: '#f4f6f2' });
  const circleFill = await konvaNodeFill(page, circleId);
  expect(circleFill.fillPriority).toBe('color');
  expect(circleFill.fill).toBe('#112233');

  // Probar línea: grosor, color y puntos editables + botones Deshacer/Rehacer de TopBar
  await page.getByRole('button', { name: 'Añadir línea' }).click();
  await page.getByLabel('Grosor de línea').fill('9');
  await page.getByLabel('Grosor de línea').blur();
  await page.getByLabel('Color de línea hexadecimal').fill('#cc4422');
  await page.getByLabel('Color de línea hexadecimal').blur();
  await page.getByLabel('Punto X2').fill('340');
  await page.getByLabel('Punto X2').blur();

  current = await state(page);
  const lineLayer = current.template.capas[1];
  expect(lineLayer.linea).toEqual({
    points: [0, 0, 340, 0],
    stroke: { color: '#cc4422', width: 9 },
    strokeWidth: 9,
  });

  await page.getByRole('button', { name: 'Deshacer' }).click();
  current = await state(page);
  expect(current.template.capas[1].linea.points[2]).toBe(280);

  await page.getByRole('button', { name: 'Rehacer' }).click();
  current = await state(page);
  expect(current.template.capas[1].linea.points[2]).toBe(340);
});

test('el redimensionado múltiple conserva proporciones y no añade campos extra al esquema v2', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir rectángulo' }).click();
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Añadir círculo' }).click();
  let current = await state(page);
  const rect = current.template.capas[0];
  const rectPoint = await point(page, rect.x + 200, rect.y + 150);
  await page.keyboard.down('Shift');
  await page.mouse.click(rectPoint.x, rectPoint.y);
  await page.keyboard.up('Shift');

  const before = (await state(page)).template.capas;
  await drag(page, await anchor(page, 'middle-right'), 100, 0);
  current = await state(page);
  const after = current.template.capas;

  expect(after[0].rect.width / after[0].rect.height).toBeCloseTo(before[0].rect.width / before[0].rect.height, 1);
  expect(after[0].rect.width / before[0].rect.width).toBeCloseTo(after[1].circulo.radius / before[1].circulo.radius, 1);
  for (const capa of after) {
    expect(capa).not.toHaveProperty('skewX');
    expect(capa).not.toHaveProperty('skewY');
  }
});

test('Fase 03: edición inline con doble clic en canvas, Enter, Escape, clic fuera, zoom/paneo y rotación', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir texto' }).click();
  let current = await state(page);
  const textLayer = current.template.capas[0];
  const box = current.textBoxes[textLayer.id];

  // Aplicar zoom y rotación antes de editar inline para comprobar conversión a pantalla y rotación CSS
  await page.getByRole('button', { name: 'Acercar' }).click();
  await page.getByLabel('Rotación').fill('15');
  await page.getByLabel('Rotación').blur();

  current = await state(page);
  const rotatedLayer = current.template.capas[0];
  // Punto cercano a la esquina superior-izquierda rotada 15° sigue cayendo dentro del cuadro 520x80
  const clickTarget = await point(page, rotatedLayer.x + 80, rotatedLayer.y + 45);
  await page.mouse.dblclick(clickTarget.x, clickTarget.y);

  const inlineEditor = page.getByTestId('inline-text-editor');
  await expect(inlineEditor).toBeVisible();
  await expect(inlineEditor).toBeFocused();

  // Verificar estilo y rotación sincronizados y drag deshabilitado en el nodo Konva durante edición
  const editorInfo = await page.evaluate((id) => {
    const el = document.querySelector('[data-testid="inline-text-editor"]');
    const stage = window.Konva.stages[0];
    const groupNode = stage.findOne(`#${id}__box`);
    return {
      transform: el.style.transform,
      textAlign: el.style.textAlign,
      left: parseFloat(el.style.left),
      top: parseFloat(el.style.top),
      width: parseFloat(el.style.width),
      fontSize: parseFloat(el.style.fontSize),
      draggable: groupNode.draggable(),
    };
  }, rotatedLayer.id);

  expect(editorInfo.transform).toBe('rotate(15deg)');
  expect(editorInfo.textAlign).toBe('center');
  expect(editorInfo.left).toBeCloseTo(current.view.x + rotatedLayer.x * current.view.scale, 1);
  expect(editorInfo.top).toBeCloseTo(current.view.y + rotatedLayer.y * current.view.scale, 1);
  expect(editorInfo.width).toBeCloseTo(box.width * current.view.scale, 1);
  expect(editorInfo.fontSize).toBeCloseTo(rotatedLayer.texto.fontSize * current.view.scale, 1);
  expect(editorInfo.draggable).toBe(false);

  // El zoom con rueda sigue funcionando durante la edición inline sin cerrarla
  const holder = await page.getByTestId('stage-holder').boundingBox();
  await page.mouse.move(holder.x + 120, holder.y + 120);
  await page.mouse.wheel(0, -100);
  await expect(inlineEditor).toBeVisible();

  // 1) Confirmar con Enter actualiza store y dispara undo
  const pastBeforeEnter = (await state(page)).pastCount;
  await inlineEditor.fill('Oferta confirmada con Enter');
  await inlineEditor.press('Enter');
  await expect(inlineEditor).toBeHidden();

  current = await state(page);
  expect(current.template.capas[0].texto.texto).toBe('Oferta confirmada con Enter');
  expect(current.pastCount).toBe(pastBeforeEnter + 1);

  // Quitar rotación para probar Escape y clic fuera cómodamente en el centro de la caja
  await page.getByLabel('Rotación').fill('0');
  await page.getByLabel('Rotación').blur();
  current = await state(page);
  const centerPoint = await point(
    page,
    current.template.capas[0].x + current.textBoxes[textLayer.id].width / 2,
    current.template.capas[0].y + current.textBoxes[textLayer.id].height / 2,
  );

  // 2) Escape cancela y restaura el valor anterior sin registrar paso extra en undo
  const pastBeforeEsc = current.pastCount;
  await page.mouse.dblclick(centerPoint.x, centerPoint.y);
  await expect(inlineEditor).toBeVisible();
  await inlineEditor.fill('Texto temporal descartado');
  await inlineEditor.press('Escape');
  await expect(inlineEditor).toBeHidden();

  current = await state(page);
  expect(current.template.capas[0].texto.texto).toBe('Oferta confirmada con Enter');
  expect(current.pastCount).toBe(pastBeforeEsc);

  // 3) Click fuera confirma la edición y actualiza el store
  await page.mouse.dblclick(centerPoint.x, centerPoint.y);
  await expect(inlineEditor).toBeVisible();
  await inlineEditor.fill('Confirmado con clic fuera');
  const outsidePoint = await point(page, 40, 40);
  await page.mouse.click(outsidePoint.x, outsidePoint.y);
  await expect(inlineEditor).toBeHidden();

  current = await state(page);
  expect(current.template.capas[0].texto.texto).toBe('Confirmado con clic fuera');

  // Undo revierte la edición inline
  await page.keyboard.press('Control+z');
  current = await state(page);
  expect(current.template.capas[0].texto.texto).toBe('Oferta confirmada con Enter');
});

test('Fase 03: Google Fonts dinámicas del catálogo curado, familia adicional libre con WebFont.load e indicador de carga', async ({ page }) => {
  // Retrasar levemente la petición de CSS de Pacifico para observar el estado breve de carga
  await page.route('https://fonts.googleapis.com/**', async (route) => {
    if (route.request().url().includes('Pacifico')) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Añadir texto' }).click();

  // Verificar que el select incluye todo el catálogo base curado de Fase 03
  const opcionesCatalogo = await page.getByLabel('Seleccionar fuente usada').locator('option').allTextContents();
  expect(opcionesCatalogo).toEqual(expect.arrayContaining([
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Oswald',
    'Playfair Display',
    'Merriweather',
    'Bebas Neue',
  ]));

  // Elegir una fuente del catálogo (Playfair Display) y comprobar render real en Konva
  await page.getByLabel('Seleccionar fuente usada').selectOption('Playfair Display');
  await expect.poll(async () => page.evaluate(() => {
    const stage = window.Konva.stages[0];
    const textNode = stage.find('Text')[0];
    return textNode?.fontFamily() || '';
  })).toContain('Playfair Display');

  const playfairLoaded = await page.evaluate(() => document.fonts.check('24px "Playfair Display"'));
  expect(playfairLoaded).toBe(true);

  // Escribir una familia adicional de Google Fonts (Pacifico) en el input libre y confirmar
  const freeInput = page.getByLabel('Nombre de fuente libre');
  await freeInput.fill('Pacifico');
  await freeInput.press('Enter');

  // Debe aparecer brevemente el indicador de carga mientras descarga
  await expect(page.getByTestId('font-load-status')).toContainText('Cargando fuente');
  await expect(page.getByTestId('font-load-status')).toBeHidden({ timeout: 8000 });

  await expect.poll(async () => page.evaluate(() => {
    const stage = window.Konva.stages[0];
    const textNode = stage.find('Text')[0];
    return textNode?.fontFamily() || '';
  })).toContain('Pacifico');

  const pacificoLoaded = await page.evaluate(() => document.fonts.check('24px "Pacifico"'));
  expect(pacificoLoaded).toBe(true);

  const current = await state(page);
  expect(current.template.capas[0].texto.fontFamily).toBe('Pacifico');
  // Contrato JSON intacto
  expect(Object.keys(current.template.capas[0].texto).sort()).toEqual([
    'align', 'fill', 'fontFamily', 'fontSize', 'fontStyle', 'letterSpacing', 'lineHeight', 'texto',
  ]);
});

test('Fase 03: Auto-fit, Overflow (ajustar, recortar, libre) verificado en píxeles de Konva, undo/redo y esquema v2', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir texto' }).click();

  // Posicionar en (100, 100) con caja 240 x 70 y tamaño inicial 48 px
  await page.getByLabel('Posición X').fill('100');
  await page.getByLabel('Posición X').blur();
  await page.getByLabel('Posición Y').fill('100');
  await page.getByLabel('Posición Y').blur();
  await page.getByLabel('Ancho del texto').fill('240');
  await page.getByLabel('Ancho del texto').blur();
  await page.getByLabel('Alto del texto').fill('70');
  await page.getByLabel('Alto del texto').blur();
  await page.getByRole('button', { name: 'Alinear a la izquierda' }).click();

  // Escribir texto largo que excede ampliamente 240 x 70 a 48 px
  await page.getByLabel('Contenido del texto').fill(
    'Gran liquidación de temporada con descuentos especiales en toda la tienda online',
  );

  let current = await state(page);
  const textId = current.template.capas[0].id;
  expect(current.template.capas[0].texto.fontSize).toBe(48);
  expect(current.textBoxes[textId]).toEqual({
    width: 240,
    height: 70,
    overflow: 'libre',
    autoFit: false,
  });

  // Helper que cuenta píxeles oscuros del objeto dentro y debajo de la caja (100, 100, 240, 70) sin el marco del Transformer
  async function contarPixelesTexto() {
    return page.evaluate(() => {
      const stage = window.Konva.stages[0];
      const transformer = stage.findOne('Transformer');
      const wasVisible = transformer ? transformer.visible() : false;
      if (transformer) transformer.visible(false);
      const oldPos = { x: stage.x(), y: stage.y(), sx: stage.scaleX(), sy: stage.scaleY() };
      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });
      const snap = stage.toCanvas({ x: 95, y: 95, width: 260, height: 260, pixelRatio: 1 });
      stage.position({ x: oldPos.x, y: oldPos.y });
      stage.scale({ x: oldPos.sx, y: oldPos.sy });
      if (transformer) transformer.visible(wasVisible);
      stage.batchDraw();

      const ctx = snap.getContext('2d');
      // Dentro de la caja: y de 102 a 165 -> en snap es y de 7 a 70
      const insideData = ctx.getImageData(5, 7, 240, 60).data;
      // Justo fuera del borde inferior (y = 171..331 en lienzo -> y = 76..236 en snap)
      const outsideData = ctx.getImageData(5, 76, 240, 160).data;

      let insideDark = 0;
      let outsideDark = 0;
      for (let i = 0; i < insideData.length; i += 4) {
        if (insideData[i] < 180 && insideData[i + 1] < 180 && insideData[i + 2] < 180) insideDark += 1;
      }
      for (let i = 0; i < outsideData.length; i += 4) {
        if (outsideData[i] < 180 && outsideData[i + 1] < 180 && outsideData[i + 2] < 180) outsideDark += 1;
      }
      return { insideDark, outsideDark };
    });
  }

  // 1) En modo "libre" (por defecto), el texto se extiende más allá de los 70 px de alto de la caja
  const pixelesLibre = await contarPixelesTexto();
  expect(pixelesLibre.insideDark).toBeGreaterThan(50);
  expect(pixelesLibre.outsideDark).toBeGreaterThan(50);

  // 2) Cambiar Overflow a "recortar": NO debe dibujar ningún píxel de texto fuera del bounding box
  await page.getByRole('button', { name: 'Overflow recortar' }).click();
  current = await state(page);
  expect(current.textBoxes[textId].overflow).toBe('recortar');
  expect(current.textBoxes[textId].autoFit).toBe(false);
  expect(current.template.capas[0].texto.fontSize).toBe(48);

  const pixelesRecortar = await contarPixelesTexto();
  expect(pixelesRecortar.insideDark).toBeGreaterThan(50);
  expect(pixelesRecortar.outsideDark).toBe(0);

  // 3) Activar Auto-fit (o modo "ajustar"): reduce progresivamente fontSize sin modificar width ni height
  await page.getByRole('button', { name: 'Auto-fit de texto' }).click();
  current = await state(page);
  const reducedFontSize = current.template.capas[0].texto.fontSize;
  expect(current.textBoxes[textId]).toEqual({
    width: 240,
    height: 70,
    overflow: 'ajustar',
    autoFit: true,
  });
  expect(reducedFontSize).toBeLessThan(48);
  expect(reducedFontSize).toBeGreaterThanOrEqual(8);

  // Ahora todo el texto cabe dentro de la caja (sin píxeles desbordando abajo)
  const pixelesAjustar = await contarPixelesTexto();
  expect(pixelesAjustar.insideDark).toBeGreaterThan(30);
  expect(pixelesAjustar.outsideDark).toBe(0);

  // 4) Undo y Redo restauran tanto fontSize como modo de overflow/autoFit sin ensuciar el esquema JSON v2
  await page.keyboard.press('Control+z');
  current = await state(page);
  expect(current.textBoxes[textId].overflow).toBe('recortar');
  expect(current.textBoxes[textId].autoFit).toBe(false);
  expect(current.template.capas[0].texto.fontSize).toBe(48);

  await page.keyboard.press('Control+y');
  current = await state(page);
  expect(current.textBoxes[textId].overflow).toBe('ajustar');
  expect(current.textBoxes[textId].autoFit).toBe(true);
  expect(current.template.capas[0].texto.fontSize).toBe(reducedFontSize);

  // 5) Al cambiar a una fuente más ancha (Merriweather) o encoger la caja con Transformer, Auto-fit re-mide sin alterar width/height inesperadamente
  await page.getByLabel('Seleccionar fuente usada').selectOption('Merriweather');
  await expect.poll(async () => page.evaluate(() => document.fonts.check('16px "Merriweather"'))).toBe(true);
  current = await state(page);
  expect(current.textBoxes[textId].width).toBe(240);
  expect(current.textBoxes[textId].height).toBe(70);
  expect((await contarPixelesTexto()).outsideDark).toBe(0);

  // Encoger el ancho de la caja desde el tirador middle-right del Transformer
  const sizeBeforeDrag = current.template.capas[0].texto.fontSize;
  await drag(page, await anchor(page, 'middle-right'), -60 * current.view.scale, 0);
  current = await state(page);
  expect(current.textBoxes[textId].width).toBeLessThan(200);
  expect(current.template.capas[0].texto.fontSize).toBeLessThanOrEqual(sizeBeforeDrag);

  // Validar contrato estricto 02-esquema-plantilla.md v2 (sin ningún campo extra en template ni en capa.texto)
  expect(Object.keys(current.template).sort()).toEqual(['canvas', 'capas', 'nombre', 'version']);
  expect(Object.keys(current.template.capas[0]).sort()).toEqual([
    'bloqueada', 'id', 'nombre', 'opacity', 'rotation', 'texto', 'tipo', 'visible', 'x', 'y',
  ]);
  expect(Object.keys(current.template.capas[0].texto).sort()).toEqual([
    'align', 'fill', 'fontFamily', 'fontSize', 'fontStyle', 'letterSpacing', 'lineHeight', 'texto',
  ]);
});

