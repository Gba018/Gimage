const TOKEN = /(?:\[\s*|\{\{\s*)([\w.-]+)(?:\s*\]|\s*\}\})/g;

function extraerTokens(valor) {
  const texto = String(valor ?? '');
  const tokens = [];
  let coincidencia;
  TOKEN.lastIndex = 0;
  while ((coincidencia = TOKEN.exec(texto)) !== null) {
    tokens.push(coincidencia[1]);
  }
  return tokens;
}

function cajaAproximada(capa) {
  if (capa.tipo === 'rect') return { width: capa.rect?.width ?? 0, height: capa.rect?.height ?? 0 };
  if (capa.tipo === 'circulo') { const radio = capa.circulo?.radius ?? 0; return { width: radio * 2, height: radio * 2 }; }
  if (capa.tipo === 'linea') { const [x1=0,y1=0,x2=0,y2=0]=capa.linea?.points??[]; return { width: Math.abs(x2-x1), height: Math.abs(y2-y1) }; }
  if (capa.tipo === 'texto') return { width: capa.texto?.caja?.width ?? capa.texto?.width ?? 0, height: capa.texto?.caja?.height ?? capa.texto?.height ?? 0 };
  if (capa.tipo === 'imagen') return { width: capa.imagen?.width ?? 0, height: capa.imagen?.height ?? 0 };
  return { width: 0, height: 0 };
}

function esUrlImagenValida(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return false;
  if (texto.startsWith('data:image/')) return true;
  try { const url = new URL(texto); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
}

export function validarPlantilla({ template, fields = {}, sheets = null }) {
  const errores = [];
  const advertencias = [];
  const camposUsados = new Set();
  const canvas = template?.canvas;
  const capas = Array.isArray(template?.capas) ? template.capas : [];

  capas.forEach((capa) => {
    if (capa.tipo === 'texto') extraerTokens(capa.texto?.texto).forEach((campo) => camposUsados.add(campo));
    if (capa.tipo === 'imagen') {
      const src = String(capa.imagen?.src ?? '');
      const tokens = extraerTokens(src);
      tokens.forEach((campo) => camposUsados.add(campo));
      if (!src.trim()) errores.push({ tipo: 'imagen-vacia', capaId: capa.id, mensaje: `La imagen “${capa.nombre}” no tiene una URL o archivo asignado.` });
      else if (tokens.length) {
        const campo = tokens[0];
        const tieneDefecto = Boolean(String(fields[campo]?.defaultValue ?? '').trim());
        if (!tieneDefecto && sheets?.status !== 'ready') advertencias.push({ tipo: 'imagen-sin-defecto', capaId: capa.id, mensaje: `La imagen “${capa.nombre}” usa [${campo}] pero no tiene valor por defecto para previsualizarla.` });
      } else if (!esUrlImagenValida(src)) errores.push({ tipo: 'imagen-invalida', capaId: capa.id, mensaje: `La imagen “${capa.nombre}” tiene una URL inválida. Usa http(s) o un archivo local.` });
    }
    const caja = cajaAproximada(capa);
    const derecha = capa.x + caja.width;
    const abajo = capa.y + caja.height;
    if (canvas && (capa.x >= canvas.width || capa.y >= canvas.height || derecha <= 0 || abajo <= 0)) advertencias.push({ tipo: 'capa-fuera', capaId: capa.id, mensaje: `La capa “${capa.nombre}” está completamente fuera del lienzo y no aparecerá en las imágenes.` });
  });

  if (sheets?.status === 'ready') {
    Object.entries(sheets.columnToField ?? {}).forEach(([columna, campo]) => {
      if (!campo) return;
      if (!camposUsados.has(campo)) errores.push({ tipo: 'mapeo-invalido', mensaje: `La columna “${columna}” está mapeada a [${campo}], pero ese campo no existe en la plantilla.` });
    });
    if (!Object.keys(sheets.columnToField ?? {}).length) advertencias.push({ tipo: 'sin-mapeo', mensaje: 'La hoja está conectada, pero todavía no mapeaste ninguna columna a un campo.' });
  }

  return { errores, advertencias, ok: errores.length === 0, total: errores.length + advertencias.length };
}
