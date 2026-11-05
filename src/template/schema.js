import Konva from 'konva';

const HEX_CORTO = /^#?([0-9a-f]{3})$/i;
const HEX_LARGO = /^#?([0-9a-f]{6})$/i;

export const MIN_AUTO_FIT_FONT_SIZE = 8;
export const MODOS_OVERFLOW_TEXTO = ['ajustar', 'recortar', 'libre'];
export const DEFAULT_TEXT_BOX = {
  width: 500,
  height: 120,
  autoFit: false,
  overflow: 'libre',
};

export const clamp = (valor, min, max) => Math.min(max, Math.max(min, valor));

export function redondear(valor, decimales = 0) {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) || 0) * factor) / factor;
}

export function esHexValido(valor) {
  return typeof valor === 'string' && (HEX_CORTO.test(valor.trim()) || HEX_LARGO.test(valor.trim()));
}

export function normalizarHex(valor, respaldo = '#000000') {
  if (typeof valor !== 'string') return respaldo;
  const limpio = valor.trim();
  const corto = limpio.match(HEX_CORTO);
  if (corto) {
    const [r, g, b] = corto[1].toLowerCase().split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const largo = limpio.match(HEX_LARGO);
  if (largo) return `#${largo[1].toLowerCase()}`;
  return respaldo;
}

export function hexARgb(hex) {
  const limpio = normalizarHex(hex, '#000000').slice(1);
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  };
}

export function rgbAHex(r, g, b) {
  const aHex = (canal) => clamp(Math.round(canal), 0, 255).toString(16).padStart(2, '0');
  return `#${aHex(r)}${aHex(g)}${aHex(b)}`;
}

export function interpolarColorHex(colorA, colorB, t) {
  const a = hexARgb(colorA);
  const b = hexARgb(colorB);
  const factor = clamp(Number(t) || 0, 0, 1);
  return rgbAHex(
    a.r + (b.r - a.r) * factor,
    a.g + (b.g - a.g) * factor,
    a.b + (b.b - a.b) * factor,
  );
}

export function colorEnOffset(stops, offset) {
  const ordenados = normalizarStops(stops);
  const pos = clamp(Number(offset) || 0, 0, 1);
  if (pos <= ordenados[0].offset) return ordenados[0].color;
  const ultimo = ordenados[ordenados.length - 1];
  if (pos >= ultimo.offset) return ultimo.color;
  for (let i = 0; i < ordenados.length - 1; i += 1) {
    const actual = ordenados[i];
    const siguiente = ordenados[i + 1];
    if (pos >= actual.offset && pos <= siguiente.offset) {
      const tramo = siguiente.offset - actual.offset;
      const t = tramo <= 0 ? 0 : (pos - actual.offset) / tramo;
      return interpolarColorHex(actual.color, siguiente.color, t);
    }
  }
  return ordenados[0].color;
}

export function normalizarStops(stops) {
  const base = Array.isArray(stops) && stops.length >= 2
    ? stops.slice(0, 8)
    : [
      { offset: 0, color: '#ff8800' },
      { offset: 1, color: '#ffdd00' },
    ];
  return base
    .map((stop, index) => ({
      offset: redondear(clamp(Number.isFinite(Number(stop?.offset)) ? Number(stop.offset) : index / Math.max(1, base.length - 1), 0, 1), 4),
      color: normalizarHex(stop?.color, index === 0 ? '#ff8800' : '#ffdd00'),
    }))
    .sort((a, b) => a.offset - b.offset);
}

export function esFillDegradado(fill) {
  return Boolean(fill && typeof fill === 'object' && (fill.type === 'linear' || fill.type === 'radial'));
}

export function esFillSolidoObjeto(fill) {
  return Boolean(fill && typeof fill === 'object' && fill.type === 'solid');
}

// DECISION: conservar cadenas hex para rellenos sólidos nuevos y aceptar también { type: 'solid', color } al leer.
export function normalizarFill(fill, respaldo = '#000000') {
  if (typeof fill === 'string') return normalizarHex(fill, respaldo);
  if (esFillSolidoObjeto(fill)) {
    return { type: 'solid', color: normalizarHex(fill.color, respaldo) };
  }
  if (fill && typeof fill === 'object' && fill.type === 'linear') {
    const angulo = Number.isFinite(Number(fill.angle)) ? ((Math.round(Number(fill.angle)) % 360) + 360) % 360 : 0;
    return {
      type: 'linear',
      angle: Number(fill.angle) === 360 ? 360 : angulo,
      stops: normalizarStops(fill.stops),
    };
  }
  if (fill && typeof fill === 'object' && fill.type === 'radial') {
    return {
      type: 'radial',
      centerX: redondear(clamp(Number.isFinite(Number(fill.centerX)) ? Number(fill.centerX) : 0.5, 0, 1), 4),
      centerY: redondear(clamp(Number.isFinite(Number(fill.centerY)) ? Number(fill.centerY) : 0.5, 0, 1), 4),
      stops: normalizarStops(fill.stops),
    };
  }
  return normalizarHex('', respaldo);
}

export function colorSolidoDeFill(fill, respaldo = '#000000') {
  if (typeof fill === 'string') return normalizarHex(fill, respaldo);
  if (esFillSolidoObjeto(fill)) return normalizarHex(fill.color, respaldo);
  if (esFillDegradado(fill) && Array.isArray(fill.stops) && fill.stops.length > 0) {
    return normalizarHex(fill.stops[0].color, respaldo);
  }
  return respaldo;
}

export function esFillOscuro(fill) {
  if (esFillDegradado(fill) && Array.isArray(fill.stops) && fill.stops.length > 0) {
    const luminancias = fill.stops.map((stop) => {
      const { r, g, b } = hexARgb(stop.color);
      return (r * 299 + g * 587 + b * 114) / 1000;
    });
    const promedio = luminancias.reduce((acc, v) => acc + v, 0) / luminancias.length;
    return promedio < 140;
  }
  const { r, g, b } = hexARgb(colorSolidoDeFill(fill, '#ffffff'));
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function fillACss(fill) {
  if (!esFillDegradado(fill)) return colorSolidoDeFill(fill, '#ffffff');
  const paradas = normalizarStops(fill.stops)
    .map((stop) => `${stop.color} ${redondear(stop.offset * 100, 1)}%`)
    .join(', ');
  if (fill.type === 'radial') {
    const cx = redondear((fill.centerX ?? 0.5) * 100, 1);
    const cy = redondear((fill.centerY ?? 0.5) * 100, 1);
    return `radial-gradient(circle at ${cx}% ${cy}%, ${paradas})`;
  }
  // En CSS 0deg apunta hacia arriba y 90deg hacia la derecha; sumamos 90° para que 0° sea → y 90° sea ↓.
  const cssAngle = ((Number(fill.angle) || 0) + 90) % 360;
  return `linear-gradient(${cssAngle}deg, ${paradas})`;
}

export function konvaFillProps(fill, { minX = 0, minY = 0, width = 1, height = 1, isCircle = false } = {}) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);

  if (fill && typeof fill === 'object' && fill.type === 'linear') {
    const stops = normalizarStops(fill.stops);
    const flatStops = stops.flatMap((stop) => [stop.offset, stop.color]);
    const rad = ((Number(fill.angle) || 0) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    const halfLen = isCircle
      ? w / 2
      : (Math.abs(dx) * w) / 2 + (Math.abs(dy) * h) / 2;

    return {
      fillPriority: 'linear-gradient',
      fill: '',
      fillLinearGradientStartPoint: { x: cx - dx * halfLen, y: cy - dy * halfLen },
      fillLinearGradientEndPoint: { x: cx + dx * halfLen, y: cy + dy * halfLen },
      fillLinearGradientColorStops: flatStops,
      fillRadialGradientColorStops: null,
    };
  }

  if (fill && typeof fill === 'object' && fill.type === 'radial') {
    const stops = normalizarStops(fill.stops);
    const flatStops = stops.flatMap((stop) => [stop.offset, stop.color]);
    const cxFrac = clamp(Number.isFinite(Number(fill.centerX)) ? Number(fill.centerX) : 0.5, 0, 1);
    const cyFrac = clamp(Number.isFinite(Number(fill.centerY)) ? Number(fill.centerY) : 0.5, 0, 1);
    const px = minX + cxFrac * w;
    const py = minY + cyFrac * h;
    const endRadius = isCircle
      ? Math.max(1, w / 2 + Math.hypot((cxFrac - 0.5) * w, (cyFrac - 0.5) * h))
      : Math.max(1, Math.hypot(Math.max(cxFrac * w, (1 - cxFrac) * w), Math.max(cyFrac * h, (1 - cyFrac) * h)));

    return {
      fillPriority: 'radial-gradient',
      fill: '',
      fillRadialGradientStartPoint: { x: px, y: py },
      fillRadialGradientEndPoint: { x: px, y: py },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: endRadius,
      fillRadialGradientColorStops: flatStops,
      fillLinearGradientColorStops: null,
    };
  }

  return {
    fillPriority: 'color',
    fill: colorSolidoDeFill(fill, '#000000'),
    fillLinearGradientColorStops: null,
    fillRadialGradientColorStops: null,
  };
}

export function normalizarStroke(stroke, colorRespaldo = '#222222', anchoRespaldo = 0) {
  return {
    color: normalizarHex(stroke?.color, colorRespaldo),
    width: Math.max(0, Math.round(Number.isFinite(Number(stroke?.width)) ? Number(stroke.width) : anchoRespaldo)),
  };
}

export function plantillaTieneDegradado(plantilla) {
  if (!plantilla) return false;
  if (esFillDegradado(plantilla.canvas?.background?.fill)) return true;
  return (plantilla.capas || []).some((capa) => {
    if (capa.tipo === 'rect') return esFillDegradado(capa.rect?.fill);
    if (capa.tipo === 'circulo') return esFillDegradado(capa.circulo?.fill);
    if (capa.tipo === 'texto') return esFillDegradado(capa.texto?.fill);
    return false;
  });
}

export function plantillaTieneTextoConCaja(plantilla) {
  if (!plantilla) return false;
  return (plantilla.capas || []).some(
    (capa) => capa.tipo === 'texto' && capa.texto && typeof capa.texto.caja === 'object' && capa.texto.caja !== null,
  );
}

export function actualizarVersionPlantilla(plantilla) {
  let version = 1;
  if (plantillaTieneTextoConCaja(plantilla)) {
    version = 3;
  } else if (plantillaTieneDegradado(plantilla)) {
    version = 2;
  }
  return plantilla.version === version ? plantilla : { ...plantilla, version };
}

export function crearPlantillaVacia(nombre = 'Proyecto sin título', width = 1080, height = 1080, backgroundFill = '#ffffff') {
  const fill = normalizarFill(backgroundFill, '#ffffff');
  return actualizarVersionPlantilla({
    version: 1,
    nombre,
    canvas: {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      background: { fill },
    },
    capas: [],
  });
}

export function crearIdCapa(existentes = []) {
  const usados = new Set(existentes);
  const caracteres = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id;
  do {
    const bytes = new Uint8Array(6);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    id = `obj_${Array.from(bytes, (byte) => caracteres[byte % caracteres.length]).join('')}`;
  } while (usados.has(id));
  return id;
}

const ALIAS_TIPOS = {
  rect: 'rect',
  circulo: 'circulo',
  circle: 'circulo',
  ellipse: 'circulo',
  linea: 'linea',
  line: 'linea',
  texto: 'texto',
  text: 'texto',
  imagen: 'imagen',
  image: 'imagen',
};

export function normalizarTipoCapa(tipo) {
  return ALIAS_TIPOS[tipo] || tipo;
}

// DECISION: encajar imágenes nuevas en un máximo de 480 × 360 px conservando su proporción inicial.
export function dimensionesInicialesImagen(naturalWidth, naturalHeight) {
  const ancho = naturalWidth || 1;
  const alto = naturalHeight || 1;
  const escala = Math.min(480 / ancho, 360 / alto);
  return {
    width: Math.max(1, Math.round(ancho * escala)),
    height: Math.max(1, Math.round(alto * escala)),
  };
}

export function medirCajaTexto(textoSpec = {}) {
  const contenido = String(textoSpec.texto ?? '');
  const fontSize = Math.max(MIN_AUTO_FIT_FONT_SIZE, Number(textoSpec.fontSize) || 48);
  const lineHeight = Number(textoSpec.lineHeight) || 1.2;
  const letterSpacing = Number(textoSpec.letterSpacing) || 0;
  if (typeof document !== 'undefined' && Konva?.Text) {
    const nodo = new Konva.Text({
      text: contenido || ' ',
      fontFamily: `${textoSpec.fontFamily || 'Inter'}, system-ui, sans-serif`,
      fontSize,
      fontStyle: textoSpec.fontStyle === 'bold' ? 'bold' : 'normal',
      align: textoSpec.align || 'left',
      letterSpacing,
      lineHeight,
      wrap: 'none',
    });
    const width = Math.max(1, Math.round(nodo.getTextWidth()));
    const height = Math.max(1, Math.round(nodo.height()));
    nodo.destroy();
    return { width, height };
  }
  const lineas = (contenido || ' ').split('\n');
  const maxChars = Math.max(1, ...lineas.map((l) => l.length));
  return {
    width: Math.max(1, Math.round(maxChars * fontSize * 0.55 + Math.max(0, maxChars - 1) * letterSpacing)),
    height: Math.max(1, Math.round(fontSize * lineas.length * lineHeight)),
  };
}

export function medirTextoEnCaja(textoSpec = {}, boxWidth = DEFAULT_TEXT_BOX.width) {
  const anchoCaja = Math.max(8, Number(boxWidth) || DEFAULT_TEXT_BOX.width);
  const contenido = String(textoSpec.texto ?? '');
  const fontSize = Math.max(MIN_AUTO_FIT_FONT_SIZE, Number(textoSpec.fontSize) || 48);
  const lineHeight = Number(textoSpec.lineHeight) || 1.2;
  const letterSpacing = Number(textoSpec.letterSpacing) || 0;

  if (typeof document !== 'undefined' && Konva?.Text) {
    const nodo = new Konva.Text({
      text: contenido,
      fontFamily: `${textoSpec.fontFamily || 'Inter'}, system-ui, sans-serif`,
      fontSize,
      fontStyle: textoSpec.fontStyle === 'bold' ? 'bold' : 'normal',
      align: textoSpec.align || 'left',
      letterSpacing,
      lineHeight,
      width: anchoCaja,
      wrap: 'word',
    });
    const height = nodo.height();
    const maxLineWidth = nodo.getTextWidth();
    const palabras = contenido.split(/\s+/).filter(Boolean);
    const maxWordWidth = palabras.reduce((max, palabra) => {
      const base = nodo.measureSize(palabra).width;
      const extra = palabra.length > 0 ? palabra.length * letterSpacing : 0;
      return Math.max(max, base + extra);
    }, 0);
    nodo.destroy();
    return {
      width: anchoCaja,
      height,
      maxLineWidth,
      maxWordWidth,
    };
  }

  const base = medirCajaTexto({ ...textoSpec, fontSize });
  const lineasEstimadas = Math.max(1, Math.ceil(base.width / anchoCaja));
  return {
    width: anchoCaja,
    height: lineasEstimadas * fontSize * lineHeight,
    maxLineWidth: Math.min(anchoCaja, base.width),
    maxWordWidth: base.width,
  };
}

// DECISION: usar reducción decremental de 1 px desde el fontSize actual hasta un piso mínimo de 8 px usando Konva.Text temporal.
export function calcularFontSizeAutoFit(textoSpec = {}, boxWidth = DEFAULT_TEXT_BOX.width, boxHeight = DEFAULT_TEXT_BOX.height) {
  const ancho = Math.max(8, Number(boxWidth) || DEFAULT_TEXT_BOX.width);
  const alto = Math.max(8, Number(boxHeight) || DEFAULT_TEXT_BOX.height);
  const inicial = Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(textoSpec.fontSize) || 48));

  if (!String(textoSpec.texto ?? '').trim()) return inicial;

  for (let size = inicial; size > MIN_AUTO_FIT_FONT_SIZE; size -= 1) {
    const medida = medirTextoEnCaja({ ...textoSpec, fontSize: size }, ancho);
    if (medida.height <= alto + 0.5 && medida.maxLineWidth <= ancho + 0.5 && medida.maxWordWidth <= ancho + 0.5) {
      return size;
    }
  }
  return MIN_AUTO_FIT_FONT_SIZE;
}

// DECISION: al leer plantillas v1/v2 sin texto.caja, derivar width/height desde la medición real con mínimo 500×120 y aplicar autoFit: false, overflow: "libre".
export function normalizarCajaTexto(caja, textoSpec = null) {
  if (!caja || typeof caja !== 'object') {
    const medida = textoSpec ? medirCajaTexto(textoSpec) : DEFAULT_TEXT_BOX;
    return {
      width: Math.max(DEFAULT_TEXT_BOX.width, Math.round(Number(medida.width) || DEFAULT_TEXT_BOX.width)),
      height: Math.max(DEFAULT_TEXT_BOX.height, Math.round(Number(medida.height) || DEFAULT_TEXT_BOX.height)),
      autoFit: false,
      overflow: 'libre',
    };
  }

  let overflow = MODOS_OVERFLOW_TEXTO.includes(caja.overflow) ? caja.overflow : 'libre';
  let autoFit = Boolean(caja.autoFit);
  if (caja.overflow !== undefined && MODOS_OVERFLOW_TEXTO.includes(caja.overflow)) {
    autoFit = overflow === 'ajustar';
  } else if (caja.autoFit !== undefined) {
    overflow = autoFit ? 'ajustar' : 'libre';
  }

  return {
    width: Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(caja.width) || DEFAULT_TEXT_BOX.width)),
    height: Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(caja.height) || DEFAULT_TEXT_BOX.height)),
    autoFit,
    overflow,
  };
}

export function sincronizarCambioCajaTexto(actual, parcial = {}) {
  const base = normalizarCajaTexto(actual);
  let overflow = base.overflow;
  let autoFit = base.autoFit;

  if (parcial.overflow !== undefined && MODOS_OVERFLOW_TEXTO.includes(parcial.overflow)) {
    overflow = parcial.overflow;
    autoFit = overflow === 'ajustar';
  } else if (parcial.autoFit !== undefined) {
    autoFit = Boolean(parcial.autoFit);
    overflow = autoFit ? 'ajustar' : (base.overflow === 'ajustar' ? 'libre' : base.overflow);
  }

  const width = parcial.width !== undefined
    ? Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(parcial.width) || base.width))
    : base.width;
  const height = parcial.height !== undefined
    ? Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(parcial.height) || base.height))
    : base.height;

  return { width, height, autoFit, overflow };
}

export function hidratarPlantilla(plantillaEntrada) {
  if (!plantillaEntrada || typeof plantillaEntrada !== 'object') {
    return crearPlantillaVacia();
  }
  const canvasWidth = Math.max(1, Math.round(Number(plantillaEntrada.canvas?.width) || 1080));
  const canvasHeight = Math.max(1, Math.round(Number(plantillaEntrada.canvas?.height) || 1080));
  const canvasFill = normalizarFill(plantillaEntrada.canvas?.background?.fill, '#ffffff');
  const capasEntrada = Array.isArray(plantillaEntrada.capas) ? plantillaEntrada.capas : [];

  const capas = capasEntrada.map((capa) => {
    const tipo = normalizarTipoCapa(capa.tipo);
    if (tipo !== 'texto' || !capa.texto) return { ...capa, tipo };
    const caja = normalizarCajaTexto(capa.texto.caja, capa.texto);
    const fontSizeBase = Math.max(MIN_AUTO_FIT_FONT_SIZE, Math.round(Number(capa.texto.fontSize) || 48));
    const textoNormalizado = {
      ...capa.texto,
      fontSize: fontSizeBase,
      caja,
    };
    if (caja.autoFit) {
      textoNormalizado.fontSize = calcularFontSizeAutoFit(textoNormalizado, caja.width, caja.height);
    }
    return {
      ...capa,
      tipo,
      texto: textoNormalizado,
    };
  });

  return actualizarVersionPlantilla({
    version: Number(plantillaEntrada.version) || 1,
    nombre: String(plantillaEntrada.nombre ?? 'Proyecto sin título'),
    canvas: {
      width: canvasWidth,
      height: canvasHeight,
      background: { fill: canvasFill },
    },
    capas,
  });
}

export function crearCapa(tipoEntrada, plantilla, opciones = {}) {
  const tipo = normalizarTipoCapa(tipoEntrada);
  const nombresBase = {
    rect: 'Rectángulo',
    circulo: 'Círculo',
    linea: 'Línea',
    texto: 'Texto',
    imagen: 'Imagen',
  };
  if (!nombresBase[tipo]) {
    throw new Error(`Tipo de capa no admitido: ${tipoEntrada}`);
  }

  const existentes = (plantilla.capas || []).map((capa) => capa.id);
  const cantidadMismoTipo = (plantilla.capas || []).filter((capa) => capa.tipo === tipo).length;
  const capa = {
    id: crearIdCapa(existentes),
    tipo,
    nombre: cantidadMismoTipo === 0 ? nombresBase[tipo] : `${nombresBase[tipo]} ${cantidadMismoTipo + 1}`,
    visible: true,
    bloqueada: false,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
  };

  const cx = plantilla.canvas.width / 2;
  const cy = plantilla.canvas.height / 2;

  if (tipo === 'rect') {
    const width = 360;
    const height = 240;
    capa.x = Math.round(cx - width / 2);
    capa.y = Math.round(cy - height / 2);
    capa.rect = {
      width,
      height,
      fill: '#b9e878',
      stroke: { color: '#222222', width: 0 },
      cornerRadius: 12,
    };
  } else if (tipo === 'circulo') {
    // DECISION: en Konva.Circle (x, y) representa el centro geométrico del círculo.
    const radius = 120;
    capa.x = Math.round(cx);
    capa.y = Math.round(cy);
    capa.circulo = {
      radius,
      fill: '#7cc6fe',
      stroke: { color: '#222222', width: 0 },
    };
  } else if (tipo === 'linea') {
    // DECISION: mantener sincronizados linea.stroke.width y linea.strokeWidth según el contrato v2.
    const longitud = 280;
    capa.x = Math.round(cx - longitud / 2);
    capa.y = Math.round(cy);
    capa.linea = {
      points: [0, 0, longitud, 0],
      stroke: { color: '#1f2b23', width: 4 },
      strokeWidth: 4,
    };
  } else if (tipo === 'texto') {
    const caja = { ...DEFAULT_TEXT_BOX };
    const textoSpec = {
      texto: 'Doble clic para editar',
      fontFamily: 'Inter',
      fontSize: 48,
      fill: '#111111',
      align: 'center',
      fontStyle: 'bold',
      letterSpacing: 0,
      lineHeight: 1.2,
      caja,
    };
    capa.x = Math.round(cx - caja.width / 2);
    capa.y = Math.round(cy - caja.height / 2);
    capa.texto = textoSpec;
  } else if (tipo === 'imagen') {
    const dims = dimensionesInicialesImagen(opciones.naturalWidth, opciones.naturalHeight);
    capa.x = Math.round(cx - dims.width / 2);
    capa.y = Math.round(cy - dims.height / 2);
    capa.imagen = {
      src: opciones.src || '',
      width: dims.width,
      height: dims.height,
    };
  }

  return capa;
}

export function extraerPlaceholdersTexto(contenido) {
  if (typeof contenido !== 'string' || !contenido.includes('{{')) return [];
  const encontrados = [];
  const expresion = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;
  let match = expresion.exec(contenido);
  while (match) {
    const nombre = match[1].trim();
    if (nombre && !encontrados.includes(nombre)) encontrados.push(nombre);
    match = expresion.exec(contenido);
  }
  return encontrados;
}
