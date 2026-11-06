import React from 'react';
import { BrandMark, Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';

export default function TopBar({
  zoom,
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
}) {
  const nombre = useTemplateStore((state) => state.template.nombre);
  const canvas = useTemplateStore((state) => state.template.canvas);
  const canUndo = useTemplateStore((state) => state.past.length > 0);
  const canRedo = useTemplateStore((state) => state.future.length > 0);
  const setName = useTemplateStore((state) => state.setName);
  const undo = useTemplateStore((state) => state.undo);
  const redo = useTemplateStore((state) => state.redo);

  return (
    <header className="topbar">
      <div className="brand" aria-label="Lienzo, estudio de diseño">
        <BrandMark />
        <div className="brand-wordmark">lienzo<span>.</span><small>ESTUDIO</small></div>
      </div>
      <div className="topbar-divider brand-divider" />
      <div className="project-name-wrap">
        <div className="project-name-label">PROYECTO <span className="project-status-dot" /></div>
        <input
          aria-label="Nombre del proyecto"
          className="project-name-input"
          value={nombre}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => { if (!nombre.trim()) setName('Proyecto sin título'); }}
        />
      </div>
      <div className="header-canvas-size" title="Dimensiones del lienzo">
        {canvas.width} <span>×</span> {canvas.height} <small>px</small>
      </div>

      <div className="history-group" aria-label="Historial">
        <button
          type="button"
          className="icon-button"
          aria-label="Deshacer"
          title="Deshacer (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          <Icon name="undo" size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Rehacer"
          title="Rehacer (Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        >
          <Icon name="redo" size={16} />
        </button>
      </div>

      <div className="topbar-spacer" />
      <div className="quick-insert" aria-label="Insertar objeto">
        <button className="quick-insert-button" type="button" onClick={onInsertText} aria-label="Insertar texto" title="Insertar texto">
          <Icon name="text" size={16} /><span>Texto</span>
        </button>
        <button className="quick-insert-button" type="button" onClick={onInsertRect} aria-label="Insertar rectángulo" title="Insertar rectángulo">
          <Icon name="square" size={16} /><span>Rect</span>
        </button>
        <button className="quick-insert-button" type="button" onClick={onInsertCircle} aria-label="Insertar círculo" title="Insertar círculo">
          <Icon name="circle" size={16} /><span>Círculo</span>
        </button>
        <button className="quick-insert-button" type="button" onClick={onInsertLine} aria-label="Insertar línea" title="Insertar línea">
          <Icon name="line" size={16} /><span>Línea</span>
        </button>
        <button className="quick-insert-button" type="button" onClick={onInsertImage} aria-label="Insertar imagen desde archivo" title="Insertar imagen desde archivo">
          <Icon name="image" size={16} /><span>Imagen</span>
        </button>
      </div>
      <div className="topbar-divider zoom-divider" />
      <div className="zoom-group" aria-label="Controles de zoom">
        <button type="button" className="icon-button" aria-label="Alejar" title="Alejar" onClick={onZoomOut}><Icon name="minus" size={16} /></button>
        <span className="zoom-value" data-testid="zoom-value">{Math.round(zoom * 100)}%</span>
        <button type="button" className="icon-button" aria-label="Acercar" title="Acercar" onClick={onZoomIn}><Icon name="plus" size={16} /></button>
        <button type="button" className="zoom-100" onClick={onZoom100} title="Ajustar al 100 %">100%</button>
        <button type="button" className="icon-button fit-button" onClick={onFit} aria-label="Ajustar a pantalla" title="Ajustar a pantalla"><Icon name="fit" size={17} /></button>
      </div>
      <div className="project-actions" aria-label="Guardar y abrir plantilla">
        <button type="button" className="icon-button" onClick={onOpenTemplate} aria-label="Abrir plantilla JSON" title="Abrir plantilla JSON">
          <Icon name="folder" size={16} />
        </button>
        <button type="button" className="icon-button" onClick={onSaveTemplate} aria-label="Guardar plantilla como archivo JSON" title="Guardar plantilla como archivo JSON">
          <Icon name="download" size={16} />
        </button>
      </div>
      <button type="button" className="new-project-button" onClick={onNewProject} aria-label="Nuevo proyecto">
        <Icon name="plus" size={16} /><span>Nuevo proyecto</span>
      </button>
    </header>
  );
}
