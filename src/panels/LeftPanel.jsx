import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { extraerCamposPlantilla, normalizarNombreCampo } from '../template/fields.js';
import { valoresDeFila } from '../sheets/mapper.js';
import GoogleSheetsConnector from './GoogleSheetsConnector.jsx';

const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export function analizarFilas(texto, total) {
  if (!texto.trim()) return { filas: [], error: '' };
  const filas = new Set();
  const tokens = texto.trim().replace(/\s*-\s*/g, '-').split(/[,;\s]+/).filter(Boolean);
  for (const token of tokens) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(token);
    if (!m) return { filas: [], error: `Formato inválido: ${token}. Usa 3,6,10-50,69.` };
    const desde = Number(m[1]); const hasta = m[2] ? Number(m[2]) : desde;
    if (!Number.isSafeInteger(desde) || !Number.isSafeInteger(hasta) || desde < 1 || hasta > total || desde > hasta) return { filas: [], error: `Rango inválido: ${token}. Usa filas entre 1 y ${total}, en orden ascendente.` };
    for (let n = desde; n <= hasta; n++) filas.add(n - 1);
  }
  return { filas: [...filas].sort((a, b) => a - b), error: '' };
}
const estilos = `
.gp-left{width:320px;min-width:320px;height:100%;display:flex;flex-direction:column;background:#0f172a;color:#e2e8f0;border-right:1px solid #1e293b;font-family:Inter,system-ui,sans-serif}
.gp-tabs{display:flex;border-bottom:1px solid #334155}.gp-tabs button{flex:1;padding:14px 4px;border:0;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;font-weight:600}.gp-tabs button[aria-selected=true]{background:#1e293b;color:#7dd3fc}
.gp-body{overflow:auto;padding:20px 16px 24px;display:flex;flex-direction:column;gap:18px}.gp-body section{display:flex;flex-direction:column;gap:14px}.gp-body h2{font-size:17px;margin:0}.gp-body p{font-size:12px;margin:0;line-height:1.55;color:#94a3b8}.gp-body button,.gp-body input,.gp-body select{font:inherit;font-size:13px;border:1px solid #334155;border-radius:10px;padding:10px 12px;background:#1e293b;color:#e2e8f0;box-sizing:border-box}.gp-body button{cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}.gp-body button:disabled{opacity:.45;cursor:not-allowed}.gp-body input:not([type=checkbox]),.gp-body select{width:100%}.gp-row{display:flex;gap:8px;align-items:center}.gp-row>*{flex:1}.gp-card{border:1px solid #334155;padding:12px;border-radius:12px;background:#111c2e;display:flex;flex-direction:column;gap:8px}.gp-block{border:1px solid #1e293b;border-radius:14px;background:#111c2e;overflow:hidden}.gp-block>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#7dd3fc}.gp-block>summary::-webkit-details-marker{display:none}.gp-block>summary::after{content:'+';font-size:16px;color:#94a3b8}.gp-block[open]>summary::after{content:'–'}.gp-block>div{padding:0 14px 14px;display:flex;flex-direction:column;gap:12px}.gp-primary{background:#0ea5e9;border-color:#0ea5e9;color:#04121d;font-weight:700}.gp-primary:hover:not(:disabled){background:#38bdf8}.gp-error{color:#fca5a5}.gp-ok{color:#86efac}.gp-thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gp-thumb{display:flex;flex-direction:column;gap:4px;border:1px solid #334155;border-radius:10px;padding:8px;background:#0b1220}.gp-thumb.active{border-color:#38bdf8;box-shadow:0 0 0 1px rgba(56,189,248,.4)}.gp-thumb label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#cbd5f5}.gp-thumb img{width:100%;height:44px;object-fit:cover;border-radius:6px}.gp-thumb button{padding:6px;font-size:11px}.gp-layer{display:flex;gap:6px;align-items:center}.gp-layer>button:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:left}.gp-selected{outline:1px solid #38bdf8}
`;
export default function LeftPanel({ onInsertText, onInsertRect, onInsertCircle, onInsertLine, onInsertImage, onImageUrl, onGenerarLote, onCancelarLote, onReintentarLote, onActualizarDatos, loteEstado, locked }) {
  const [tab, setTab] = useState('elementos');
  const [nuevo, setNuevo] = useState('');
  const [buscar, setBuscar] = useState('');
  const [modo, setModo] = useState('todas');
  const [texto, setTexto] = useState('');
  const template = useTemplateStore(s => s.template);
  const fields = useTemplateStore(s => s.fields);
  const sheets = useTemplateStore(s => s.sheets);
  const selectedIds = useTemplateStore(s => s.selectedIds);
  const mapColumnToField = useTemplateStore(s => s.mapColumnToField);
  const setActiveRowIndex = useTemplateStore(s => s.setActiveRowIndex);
  const detectados = useMemo(() => extraerCamposPlantilla({ capas: template.capas }), [template.capas]);
  const nombres = useMemo(() => [...new Set([...detectados.map(c => c.nombre), ...Object.keys(fields)])], [detectados, fields]);
  const intentados = useRef(new Set());
  useEffect(() => { intentados.current.clear(); setModo('todas'); setTexto(''); }, [sheets.headers, sheets.rows]);
  useEffect(() => {
    if (locked || sheets.status !== 'ready') return;
    for (const header of sheets.headers) {
      const clave = normalizar(header);
      if (!clave || sheets.columnToField[header]) continue;
      const candidatos = nombres.filter(n => normalizar(n) === clave);
      if (candidatos.length !== 1) continue;
      const id = JSON.stringify([header, candidatos[0]]);
      if (intentados.current.has(id)) continue;
      intentados.current.add(id); mapColumnToField(header, candidatos[0]);
    }
  }, [locked, sheets.status, sheets.headers, sheets.columnToField, nombres, mapColumnToField]);
  useEffect(() => { if (sheets.status === 'ready' && sheets.rows.length && sheets.activeRowIndex == null) setActiveRowIndex(0); }, [sheets.status, sheets.rows.length, sheets.activeRowIndex, setActiveRowIndex]);
  const activa = sheets.activeRowIndex ?? 0;
  const seleccion = analizarFilas(texto, sheets.rows.length);
  const indices = modo === 'todas' ? sheets.rows.map((_, i) => i) : seleccion.filas;
  const elegidas = new Set(indices);
  const ir = indice => { if (!locked && indice >= 0 && indice < sheets.rows.length) setActiveRowIndex(indice); };
  function alternar(indice) {
    const siguiente = new Set(indices); siguiente.has(indice) ? siguiente.delete(indice) : siguiente.add(indice);
    setModo('seleccion'); setTexto([...siguiente].sort((a, b) => a - b).map(i => i + 1).join(','));
  }
  const inicio = Math.max(0, Math.min(activa - 5, sheets.rows.length - 12));
  const miniaturas = sheets.rows.slice(inicio, inicio + 12).map((fila, offset) => {
    const valores = valoresDeFila(fila, sheets.headers, sheets.columnToField, fields);
    const imagen = detectados.find(c => c.tipo === 'imagen' && valores[c.nombre]);
    return { indice: inicio + offset, url: imagen ? valores[imagen.nombre] : '' };
  });
  const valores = sheets.rows[activa] ? valoresDeFila(sheets.rows[activa], sheets.headers, sheets.columnToField, fields) : {};
  const store = () => useTemplateStore.getState();
  return <aside className="gp-left"><style>{estilos}</style>
    <div className="gp-tabs" role="tablist">{['elementos', 'campos', 'datos', 'capas'].map(t => <button type="button" key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
    <div className="gp-body">
      {tab === 'elementos' && <section><h2>Elementos</h2>{[['Añadir texto', onInsertText, 'text'], ['Rectángulo', onInsertRect, 'square'], ['Círculo', onInsertCircle, 'circle'], ['Línea', onInsertLine, 'line'], ['Añadir imagen', onInsertImage, 'image'], ['Imagen desde URL', onImageUrl, 'link']].map(([label, accion, icono]) => <button type="button" key={label} disabled={locked} onClick={accion}><Icon name={icono} size={16} /><span>{label}</span></button>)}</section>}
      {tab === 'campos' && <section><h2>Campos</h2><p>Escribe [nombre] en una capa para crear un campo dinámico.</p><form className="gp-row" onSubmit={e => { e.preventDefault(); const n = normalizarNombreCampo(nuevo); if (!locked && n && !fields[n]) { store().addField(n); setNuevo(''); } }}><input aria-label="Nuevo campo" value={nuevo} disabled={locked} onChange={e => setNuevo(e.target.value)} /><button type="submit" aria-label="Añadir campo" title="Añadir campo" disabled={locked || !normalizarNombreCampo(nuevo)}><Icon name="plus" size={16} /></button></form>
        {Object.values(fields).map(c => <article className="gp-card" key={c.nombre}><strong>{c.nombre}</strong><span>{c.tipo}</span><input aria-label={`Valor por defecto de ${c.nombre}`} disabled={locked} value={c.defaultValue ?? ''} onChange={e => store().setFieldDefault(c.nombre, e.target.value)} /><div className="gp-row"><button type="button" aria-label="Insertar en la capa seleccionada" title="Insertar en la capa seleccionada" disabled={locked || selectedIds.length !== 1} onClick={() => { const capa = template.capas.find(capa => capa.id === selectedIds[0]); if (capa?.tipo === 'texto') store().updateObject(capa.id, { texto: { ...capa.texto, texto: `${capa.texto?.texto ?? ''}[${c.nombre}]` } }); if (capa?.tipo === 'imagen') store().updateObject(capa.id, { imagen: { ...capa.imagen, src: `[${c.nombre}]` } }); }}><Icon name="plus" size={15} /></button><button type="button" aria-label="Renombrar campo" title="Renombrar campo" disabled={locked} onClick={() => { const n = window.prompt('Nuevo nombre', c.nombre); if (n) store().renameField(c.nombre, normalizarNombreCampo(n)); }}><Icon name="edit" size={15} /></button><button type="button" aria-label="Eliminar campo" title="Eliminar campo" disabled={locked} onClick={() => store().removeField(c.nombre)}><Icon name="trash" size={15} /></button></div></article>)}
      </section>}
      {tab === 'datos' && <section><h2>Datos</h2>
        <details className="gp-block" open><summary>Conexión</summary><div><GoogleSheetsConnector locked={locked} /><button type="button" disabled={locked} onClick={onActualizarDatos}><Icon name="refresh" size={15} /><span>Actualizar datos</span></button></div></details>
        {sheets.status === 'ready' && <>
          <details className="gp-block"><summary>Mapeo de columnas</summary><div><p>{sheets.title || 'Hoja conectada'} · {sheets.rows.length} filas</p><input type="search" aria-label="Buscar columna" placeholder="Buscar columna" value={buscar} onChange={e => setBuscar(e.target.value)} /><div className="gp-row"><button type="button" disabled={locked} onClick={() => sheets.headers.forEach(h => { if (sheets.columnToField[h]) return; const clave = normalizar(h); if (!clave) return; const n = nombres.find(n => normalizar(n) === clave) || nombres.find(n => normalizar(n) && (normalizar(n).includes(clave) || clave.includes(normalizar(n)))); if (n) mapColumnToField(h, n); })}><Icon name="sparkle" size={15} /><span>Mapeo automático</span></button><button type="button" disabled={locked} onClick={() => Object.keys(sheets.columnToField).forEach(h => mapColumnToField(h, ''))}><Icon name="close" size={15} /><span>Limpiar</span></button></div>
            {sheets.headers.filter(h => normalizar(h).includes(normalizar(buscar))).map(h => <label className="gp-card" key={h}>{h} · {sheets.columnToField[h] ? 'Mapeada' : 'Sin mapear'}<select disabled={locked} aria-label={`Campo para ${h}`} value={sheets.columnToField[h] || ''} onChange={e => mapColumnToField(h, e.target.value)}><option value="">Sin mapear</option>{nombres.map(n => <option key={n} value={n}>{`[${n}]`}</option>)}</select></label>)}
          </div></details>
          <details className="gp-block"><summary>Navegación</summary><div><div className="gp-row"><button type="button" aria-label="Fila anterior" title="Fila anterior" disabled={locked || activa <= 0} onClick={() => ir(activa - 1)}>←</button><span style={{ textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Fila {sheets.rows.length ? activa + 1 : 0} de {sheets.rows.length}</span><button type="button" aria-label="Fila siguiente" title="Fila siguiente" disabled={locked || activa >= sheets.rows.length - 1} onClick={() => ir(activa + 1)}>→</button></div>
            <div className="gp-thumbs">{miniaturas.map(m => <div key={m.indice} className={`gp-thumb ${m.indice === activa ? 'active' : ''}`}><label><input type="checkbox" aria-label={`Seleccionar fila ${m.indice + 1}`} disabled={locked || Boolean(seleccion.error && modo === 'seleccion')} checked={elegidas.has(m.indice)} onChange={() => alternar(m.indice)} />{m.indice + 1}</label><button type="button" disabled={locked} aria-label={`Ver fila ${m.indice + 1}`} onClick={() => ir(m.indice)}>{m.url ? <img src={String(m.url)} alt="" /> : 'Ver'}</button></div>)}</div>
            <div className="gp-card"><strong>Vista previa · fila {activa + 1}</strong>{nombres.map(n => <p key={n}>{`[${n}]`}: {String(valores[n] ?? '') || '—'}</p>)}</div>
          </div></details>
          <details className="gp-block" open><summary>Generación</summary><div><select aria-label="Modo de selección" value={modo} disabled={locked} onChange={e => setModo(e.target.value)}><option value="todas">Todas las filas</option><option value="seleccion">Solo seleccionadas</option></select><label>Filas o rangos<input aria-label="Filas o rangos" disabled={locked} placeholder="3,6,10-50,69" value={texto} onChange={e => { setTexto(e.target.value); setModo('seleccion'); }} /></label><p>10-50 incluye ambas filas. La fila 1 es el primer registro de datos, sin contar el encabezado.</p><div className="gp-row"><button type="button" disabled={locked} onClick={() => setModo('todas')}>Todas</button><button type="button" disabled={locked || !sheets.rows.length} onClick={() => { setModo('seleccion'); setTexto(String(activa + 1)); }}>Solo activa</button><button type="button" disabled={locked} onClick={() => { setModo('seleccion'); setTexto(''); }}>Limpiar</button></div>{modo === 'seleccion' && seleccion.error ? <p role="alert" className="gp-error">{seleccion.error}</p> : <p>{indices.length} filas seleccionadas</p>}<button type="button" className="gp-primary" disabled={locked || !indices.length || (modo === 'seleccion' && Boolean(seleccion.error))} onClick={() => onGenerarLote(indices)}><Icon name="download" size={16} /><span>Generar y descargar {indices.length} imágenes (ZIP)</span></button></div></details>
        </>}
        {loteEstado.estado === 'generando' && <details className="gp-block" open><summary>Progreso</summary><div><progress value={loteEstado.actual} max={loteEstado.total || 1} /><p>{loteEstado.actual} / {loteEstado.total}</p><button type="button" onClick={onCancelarLote}>Cancelar</button></div></details>}
        {loteEstado.estado === 'listo' && <p className="gp-ok">Listo: {loteEstado.exitosos} de {loteEstado.total} imágenes.</p>}
        {loteEstado.error && <p role="alert" className="gp-error">{loteEstado.error}</p>}
        {(loteEstado.detalles || []).map(d => <p key={d.fila} className="gp-error">Fila {d.fila}: {d.motivo}</p>)}
        {loteEstado.fallidos.length > 0 && !locked && <button type="button" onClick={() => onReintentarLote(loteEstado.fallidos.map(n => n - 1))}><Icon name="refresh" size={15} /><span>Reintentar {loteEstado.fallidos.length} filas</span></button>}
      </section>}
      {tab === 'capas' && <section><h2>Capas</h2>{template.capas.map((c, i) => <div className={`gp-layer ${selectedIds.includes(c.id) ? 'gp-selected' : ''}`} key={c.id}><button type="button" disabled={locked} onClick={() => store().selectLayer(c.id)} onDoubleClick={() => { const n = window.prompt('Nombre de la capa', c.nombre); if (n) store().renameLayer(c.id, n); }}>{c.nombre}</button><button type="button" disabled={locked} title="Visibilidad" onClick={() => store().toggleLayerVisible(c.id)}>{c.visible ? 'Ocultar' : 'Mostrar'}</button><button type="button" disabled={locked} title="Bloqueo" onClick={() => store().toggleLayerLocked(c.id)}>{c.bloqueada ? 'Liberar' : 'Bloquear'}</button><button type="button" disabled={locked || i === template.capas.length - 1} onClick={() => store().reorderLayer(i, i + 1)}>↑</button><button type="button" disabled={locked || i === 0} onClick={() => store().reorderLayer(i, i - 1)}>↓</button></div>)}</section>}
    </div>
  </aside>;
}
