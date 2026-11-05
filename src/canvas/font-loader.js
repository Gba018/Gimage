import { useEffect, useState } from 'react';
import WebFont from 'webfontloader';

export const GOOGLE_FONTS_CATALOG = [
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
];

const estadoPorFuente = new Map();
const promesasEnCurso = new Map();
const suscriptores = new Set();
let revisionGlobal = 0;

function notificar(familia, estado) {
  revisionGlobal += 1;
  suscriptores.forEach((fn) => {
    try {
      fn({ family: familia, status: estado, revision: revisionGlobal });
    } catch {
      // Ignorar errores de suscriptores individuales
    }
  });
}

export function normalizarNombreFuente(familia) {
  return String(familia ?? '').replace(/["']/g, '').trim();
}

export function estadoGoogleFont(familia) {
  const limpia = normalizarNombreFuente(familia);
  if (!limpia) return 'idle';
  return estadoPorFuente.get(limpia.toLowerCase()) || 'idle';
}

export function suscribirFuentes(listener) {
  suscriptores.add(listener);
  return () => suscriptores.delete(listener);
}

export function cargarGoogleFont(familia) {
  const limpia = normalizarNombreFuente(familia);
  if (!limpia) return Promise.resolve({ loaded: false, family: '' });

  const clave = limpia.toLowerCase();
  if (estadoPorFuente.get(clave) === 'loaded') {
    return Promise.resolve({ loaded: true, family: limpia });
  }
  if (promesasEnCurso.has(clave)) {
    return promesasEnCurso.get(clave);
  }

  if (typeof window === 'undefined' || !WebFont?.load) {
    estadoPorFuente.set(clave, 'loaded');
    return Promise.resolve({ loaded: true, family: limpia });
  }

  estadoPorFuente.set(clave, 'loading');
  notificar(limpia, 'loading');

  const promesa = new Promise((resolve) => {
    let resuelta = false;
    let algunaVarianteActiva = false;

    const finalizar = (exito) => {
      if (resuelta) return;
      resuelta = true;
      window.clearTimeout(timer);
      promesasEnCurso.delete(clave);
      const estadoFinal = exito ? 'loaded' : 'error';
      estadoPorFuente.set(clave, estadoFinal);
      notificar(limpia, estadoFinal);
      resolve({ loaded: exito, family: limpia });
    };

    const timer = window.setTimeout(() => {
      finalizar(algunaVarianteActiva);
    }, 4500);

    try {
      WebFont.load({
        google: {
          families: [`${limpia}:400,700`],
        },
        timeout: 4000,
        fontactive: (familyName) => {
          if (normalizarNombreFuente(familyName).toLowerCase() === clave) {
            algunaVarianteActiva = true;
          }
        },
        active: () => {
          finalizar(true);
        },
        inactive: () => {
          finalizar(algunaVarianteActiva);
        },
      });
    } catch {
      finalizar(false);
    }
  });

  promesasEnCurso.set(clave, promesa);
  return promesa;
}

export function useFontLoaderState(familia) {
  const [, setTick] = useState(0);
  useEffect(() => suscribirFuentes(() => setTick((n) => n + 1)), []);
  return {
    status: estadoGoogleFont(familia),
    revision: revisionGlobal,
  };
}
