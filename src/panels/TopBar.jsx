import React, { useEffect, useRef, useState } from 'react';
import { BrandMark, Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';

const ICONO_POR_TIPO = { 'imagen-vacia':'image','imagen-invalida':'image','imagen-sin-defecto':'image','mapeo-invalido':'link','sin-mapeo':'link','capa-fuera':'square' };

export default function TopBar({
  zoom,
  disabled = false,
  diagnostico,
  onZoomIn,
  onZoomOut,
  onZoom100,
  onFit,
  onNewProject,
  onInsertText,
  onInsertRect,
  onInsertCircle,
  onInsertLine,
  onInsertImage,
  onOpenTemplate,
  onSaveTemplate,
  onExportPng,
}) {
  const nombre = useTemplateStore((state) => state.template.nombre);
  const canvas = useTemplateStore((state) => state.template.canvas);
  const canUndo = useTemplateStore((state) => state.past.length > 0);
  const canRedo = useTemplateStore((state) => state.future.length > 0);
  const setName = useTemplateStore((state) => state.setName);
  const undo = useTemplateStore((state) => state.undo);
  const redo = useTemplateStore((state) => state.redo);
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState(false);
  const diagnosticoRef = useRef(null);

  const errores = diagnostico?.errores ?? [];
  const advertencias = diagnostico?.advertencias ?? [];
  const total = diagnostico?.total ?? 0;
  const estado = errores.length ? 'Con errores' : advertencias.length ? 'Con advertencias' : 'Sin problemas';
  const colorEstado = errores.length ? '#ff6b6b' : advertencias.length ? '#ffc75a' : '#57d9a3';

  useEffect(() => {
    if (!diagnosticoAbierto) return undefined;
    function cerrar(event) {
      if (!diagnosticoRef.current?.contains(event.target)) setDiagnosticoAbierto(false);
    }
    function cerrarConEscape(event) {
      if (event.key === 'Escape') setDiagnosticoAbierto(false);
    }
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [diagnosticoAbierto]);

  return (
    <header className="topbar">
      <div className="brand" aria-label="Lienzo, estudio de diseño">
        <BrandMark />
        <div className="brand-wordmark">lienzo<span>.</span><small>ESTUDIO</small></div>
      </div>
      <div className="topbar-divider brand-divider" />
      <div className="project-name-wrap">
        <div className="project-name-label">PROYECTO <span className="project-status-dot" /></div>
        <input aria-label="Nombre del proyecto" className="project-name-input" value={nombre} disabled={disabled} onChange={(event) => setName(event.target.value)} onBlur={() => { if (!nombre.trim()) setName('Proyecto sin título'); }} />
      </div>
      <div className="header-canvas-size" title="Dimensiones del lienzo">{canvas.width} <span>×</span> {canvas.height} <small>px</small></div>

      <div className="history-group" aria-label="Historial">
        <button type="button" className="icon-button" aria-label="Deshacer" title="Deshacer (Ctrl+Z)" disabled={!canUndo || disabled} onClick={undo}><Icon name="undo" size={16} /></button>
        <button type="button" className="icon-button" aria-label="Rehacer" title="Rehacer (Ctrl+Y)" disabled={!canRedo || disabled} onClick={redo}><Icon name="redo" size={16} /></button>
      </div>

      <div className="topbar-spacer" />
      <div className="quick-insert" aria-label="Insertar objeto">
        <button className="quick-insert-button" type="button" disabled={disabled} onClick={onInsertText} aria-label="Insertar texto" title="Insertar texto"><Icon name="text" size={16} /><span>Texto</span></button>
        <button className="quick-insert-button" type="button" disabled={disabled} onClick={onInsertRect} aria-label="Insertar rectángulo" title="Insertar rectángulo"><Icon name="square" size={16} /><span>Rect</span></button>
        <button className="quick-insert-button" type="button" disabled={disabled} onClick={onInsertCircle} aria-label="Insertar círculo" title="Insertar círculo"><Icon name="circle" size={16} /><span>Círculo</span></button>
        <button className="quick-insert-button" type="button" disabled={disabled} onClick={onInsertLine} aria-label="Insertar línea" title="Insertar línea"><Icon name="line" size={16} /><span>Línea</span></button>
        <button className="quick-insert-button" type="button" disabled={disabled} onClick={onInsertImage} aria-label="Insertar imagen desde archivo" title="Insertar imagen desde archivo"><Icon name="image" size={16} /><span>Imagen</span></button>
      </div>
      <div className="topbar-divider zoom-divider" />
      <div className="zoom-group" aria-label="Controles de zoom">
        <button type="button" className="icon-button" aria-label="Alejar" title="Alejar" onClick={onZoomOut}><Icon name="minus" size={16} /></button>
        <span className="zoom-value" data-testid="zoom-value">{Math.round(zoom * 100)}%</span>
        <button type="button" className="icon-button" aria-label="Acercar" title="Acercar" onClick={onZoomIn}><Icon name="plus" size={16} /></button>
        <button type="button" className="zoom-100" onClick={onZoom100} title="Ajustar al 100 %">100%</button>
        <button type="button" className="icon-button fit-button" onClick={onFit} aria-label="Ajustar a pantalla" title="Ajustar a pantalla"><Icon name="fit" size={17} /></button>
      </div>
      <div className="project-actions" aria-label="Guardar, abrir y exportar">
        <button type="button" className="icon-button" disabled={disabled} onClick={onOpenTemplate} aria-label="Abrir plantilla JSON" title="Abrir plantilla JSON"><Icon name="folder" size={16} /></button>
        <button type="button" className="icon-button" disabled={disabled} onClick={onSaveTemplate} aria-label="Guardar plantilla como archivo JSON" title="Guardar plantilla como archivo JSON"><Icon name="download" size={16} /></button>
        <button type="button" className="icon-button" disabled={disabled} onClick={onExportPng} aria-label="Exportar lienzo como PNG" title="Exportar lienzo como PNG (2x)"><Icon name="image" size={16} /></button>
      </div>

      <div ref={diagnosticoRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="icon-button"
          data-testid="diagnostics-button"
          aria-expanded={diagnosticoAbierto}
          aria-label={`Diagnóstico: ${estado}. ${errores.length} errores y ${advertencias.length} advertencias`}
          title={`Diagnóstico: ${estado}`}
          onClick={() => setDiagnosticoAbierto((valor) => !valor)}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: colorEstado, boxShadow: '0 0 0 3px rgba(255,255,255,.06)' }} />
          <Icon name="info" size={16} />
        </button>

        {diagnosticoAbierto && (
          <section
            data-testid="diagnostics-panel"
            aria-label="Diagnóstico de la plantilla"
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: 340,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,.14)',
              background: 'rgba(16,24,20,.97)',
              color: '#eaf3ee',
              boxShadow: '0 18px 40px rgba(0,0,0,.28)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              zIndex: 80,
            }}
          >
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.10)' }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: colorEstado, boxShadow: '0 0 0 4px rgba(255,255,255,.06)' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{estado}</strong>
                <small style={{ opacity: 0.68 }}>{errores.length} error(es) · {advertencias.length} advertencia(s)</small>
              </div>
              <button type="button" onClick={() => setDiagnosticoAbierto(false)} aria-label="Cerrar diagnóstico" title="Cerrar diagnóstico" style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 6 }}>
                <Icon name="close" size={16} />
              </button>
            </header>
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '10px 14px 14px' }}>
              {total === 0 && <p style={{ margin: 0, fontSize: 13, opacity: 0.78 }}>La plantilla está lista para previsualizar y generar imágenes.</p>}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {errores.map((item, indice) => (
                  <li key={`error-${item.tipo}-${indice}`} role="alert" style={{ display: 'flex', gap: 9, fontSize: 12.5, lineHeight: 1.35, padding: '9px 10px', borderRadius: 10, background: 'rgba(255,107,107,.12)', border: '1px solid rgba(255,107,107,.25)' }}>
                    <Icon name={ICONO_POR_TIPO[item.tipo] || 'info'} size={15} />
                    <span>{item.mensaje}</span>
                  </li>
                ))}
                {advertencias.map((item, indice) => (
                  <li key={`warning-${item.tipo}-${indice}`} style={{ display: 'flex', gap: 9, fontSize: 12.5, lineHeight: 1.35, padding: '9px 10px', borderRadius: 10, background: 'rgba(255,199,90,.10)', border: '1px solid rgba(255,199,90,.22)' }}>
                    <Icon name={ICONO_POR_TIPO[item.tipo] || 'info'} size={15} />
                    <span>{item.mensaje}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      <button type="button" className="new-project-button" disabled={disabled} onClick={onNewProject} aria-label="Nuevo proyecto">
        <Icon name="plus" size={16} /><span>Nuevo proyecto</span>
      </button>
    </header>
  );
}
