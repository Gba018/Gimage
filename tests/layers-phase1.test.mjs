import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDescendantIds,
  getLayerById,
  getLayerDepth,
  getRenderOrder,
  getVisibleLayers,
  esDescendiente,
} from '../src/state/layers-selectors.js';

const capas = [
  { id: 'fondo', nombre: 'Fondo', visible: true, parentId: null },
  { id: 'grupo', nombre: 'Grupo', visible: true, parentId: null },
  { id: 'texto', nombre: 'Texto', visible: false, parentId: 'grupo' },
  { id: 'imagen', nombre: 'Imagen', visible: true, parentId: 'grupo' },
];

test('getLayerById encuentra una capa por id', () => {
  assert.equal(getLayerById(capas, 'texto')?.nombre, 'Texto');
  assert.equal(getLayerById(capas, 'inexistente'), null);
});

test('getLayerDepth calcula la profundidad jerárquica', () => {
  assert.equal(getLayerDepth(capas, 'fondo'), 0);
  assert.equal(getLayerDepth(capas, 'grupo'), 0);
  assert.equal(getLayerDepth(capas, 'texto'), 1);
});

test('getVisibleLayers filtra capas ocultas', () => {
  const visibles = getVisibleLayers(capas);
  assert.deepEqual(visibles.map((capa) => capa.id), ['fondo', 'grupo', 'imagen']);
});

test('getRenderOrder conserva el orden de la pila', () => {
  assert.deepEqual(getRenderOrder(capas).map((capa) => capa.id), ['fondo', 'grupo', 'texto', 'imagen']);
});

test('getDescendantIds obtiene hijos recursivamente', () => {
  assert.deepEqual(getDescendantIds(capas, 'grupo'), ['texto', 'imagen']);
  assert.deepEqual(getDescendantIds(capas, 'fondo'), []);
});

test('esDescendiente valida relaciones jerárquicas', () => {
  assert.equal(esDescendiente(capas, 'grupo', 'texto'), true);
  assert.equal(esDescendiente(capas, 'texto', 'grupo'), false);
  assert.equal(esDescendiente(capas, 'fondo', 'fondo'), false);
});
