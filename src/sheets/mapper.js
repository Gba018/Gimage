export function normalizarRespuestaValues(values) {
  const filas = (values ?? []).map((fila) => (Array.isArray(fila) ? fila.map((celda) => String(celda ?? '')) : []));
  const headers = (filas[0] ?? []).map((header, index) => (header.trim() || `Columna ${index + 1}`));
  const datos = filas.slice(1).map((fila) => {
    const normalizada = headers.map((_, index) => fila[index] ?? '');
    return normalizada;
  });
  return { headers, rows: datos };
}

export function valoresDeFila(row, headers, columnToField, fields = {}) {
  const valores = {};
  headers.forEach((header, index) => {
    const campo = columnToField[header];
    if (!campo) return;
    const valor = row[index] ?? '';
    valores[campo] = valor;
  });
  Object.keys(fields).forEach((campo) => {
    if (valores[campo] == null || valores[campo] === '') {
      valores[campo] = fields[campo]?.defaultValue ?? '';
    }
  });
  return valores;
}
