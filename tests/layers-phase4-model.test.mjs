import test from 'node:test';
import assert from 'node:assert/strict';

import { esDescendiente, getDescendantIds, puedeMoverCapa } from '../src/state/layers-selectors.js';

const capas = [
  { id: 'grupo', tipo: 'grupo', parentId: null },
  { id: 'a', tipo: 'rect', parentId: null },
  { id: 'b', tipo: 'rect', parentId: 'grupo' },
  { id: 'c', tipo: 'rect', parentId: 'grupo' },
];

test('puedeMoverCapa permite reordenar dentro del mismo padre', () => {
  assert.equal(puedeMoverCapa(capas, 'a', 'grupo', 'before'), true);
  assert.equal(puedeMoverCapa(capas, 'a', 'grupo', 'after'), true);
});

test('puedeMoverCapa permite anidar en un grupo', () => {
  assert.equal(puedeMoverCapa(capas, 'a', 'grupo', 'inside'), true);
});

test('puedeMoverCapa bloquea anidar un grupo en su descendiente', () => {
  assert.equal(puedeMoverCapa(capas, 'grupo', 'b', 'inside'), false);
});

test('puedeMoverCapa bloquea movimientos entre padres distintos', () => {
  assert.equal(puedeMoverCapa(capas, 'b', 'a', 'before'), false);
});

test('getDescendantIds obtiene hijos recursivamente', () => {
  assert.deepEqual(getDescendantIds(capas, 'grupo'), ['b', 'c']);
});

test('esDescendiente valida relaciones jerárquicas', () => {
  assert.equal(esDescendiente(capas, 'grupo', 'b'), true);
  assert.equal(esDescendiente(capas, 'b', 'grupo'), false);
});
