import React, { useEffect, useMemo, useRef, useState } from 'react';
import FillEditor, { HexColorControl } from '../components/FillEditor.jsx';
import { Icon } from '../components/Icons.jsx';
import NumericInput from '../components/NumericInput.jsx';
import { useTemplateStore } from '../state/template-store.js';
import {
  clamp,
  extraerPlaceholdersTexto,
  medirCajaTexto,
  normalizarStroke,
  redondear,
} from '../template/schema.js';

const FUENTES_BASE = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Lora',
  'Oswald',
  'Georgia',
  'Courier New',
];

const ETIQUETA_TIPO = {
  rect: 'Rectángulo',
  circulo: 'Círculo',
  linea: 'Línea',
  texto: 'Texto',
  imagen: 'Imagen',
};

function renderTextoConPlaceholders(contenido) {
  const partes = String(contenido ?? '').split(/(\{\{[^{}]+\}\})/g);
  return partes.map((parte, idx) => (
    /^\{\{[^{}]+\}\}$/.test(parte)
      ? <mark key={`ph-${idx}`} className="placeholder-highlight">{parte}</mark>
      : <span key={`tx-${idx}`}>{parte}</span>
  ));
}

export default function RightPanel({
  onReplaceImageFile,
  onReplaceImageUrl,
  onOpenCrop,
}) {
  const template = useTemplateStore((state) => state.template);
  const selectedIds = useTemplateStore((state) => state.selectedIds);
  const clearSelection = useTemplateStore((state) => state.clearSelection);
  const setCanvasBackground = useTemplateStore((state) => state.setCanvasBackground);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const toggleLayerVisible = useTemplateStore((state) => state.toggleLayerVisible);
  const toggleLayerLocked = useTemplateStore((state) => state.toggleLayerLocked);
  const duplicateSelected = useTemplateStore((state) => state.duplicateSelected);
  const deleteSelected = useTemplateStore((state) => state.deleteSelected);
  const beginHistoryBatch = useTemplateStore((state) => state.beginHistoryBatch);
  const endHistoryBatch = useTemplateStore((state) => state.endHistoryBatch);

  const selectedLayer = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return template.capas.find((capa) => capa.id === selectedIds[0]) || null;
  }, [template.capas, selectedIds]);

  const [keepImageRatio, setKeepImageRatio] = useState(true);
  const imageRatioRef = useRef(1);

  useEffect(() => {
    if (selectedLayer?.tipo === 'imagen') {
      const w = selectedLayer.imagen.width || 1;
      const h = selectedLayer.imagen.height || 1;
      imageRatioRef.current = w / h;
    }
  }, [selectedLayer?.id, selectedLayer?.tipo]);

  const fuentesDisponibles = useMemo(() => {
    const usadas = template.capas
      .filter((capa) => capa.tipo === 'texto' && capa.texto?.fontFamily)
      .map((capa) => capa.texto.fontFamily.trim())
      .filter(Boolean);
    return Array.from(new Set([...usadas, ...FUENTES_BASE]));
  }, [template.capas]);

  if (!selectedLayer && selectedIds.length > 1) {
    return (
      <aside className="right-panel" aria-label="Propiedades de selección múltiple" data-testid="right-panel">
        <div className="rp-header">
          <div>
            <span className="rp-kicker">SELECCIÓN MÚLTIPLE</span>
            <h2>{selectedIds.length} capas activas</h2>
          </div>
          <button type="button" className="rp-link-btn" onClick={clearSelection}>
            Fondo del lienzo
          </button>
        </div>
        <div className="rp-section">
          <p className="rp-muted-note">
            Puedes arrastrar, rotar o redimensionar las capas juntas en el lienzo, o usar estas acciones rápidas:
          </p>
          <div className="rp-action-row">
            <button type="button" className="rp-btn" onClick={duplicateSelected}>
              <Icon name="copy" size={14} /> Duplicar ({selectedIds.length})
            </button>
            <button type="button" className="rp-btn rp-btn-danger" onClick={deleteSelected}>
              <Icon name="trash" size={14} /> Eliminar
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedLayer) {
    return (
      <aside className="right-panel" aria-label="Propiedades del lienzo" data-testid="right-panel">
        <div className="rp-header">
          <div>
            <span className="rp-kicker">DOCUMENTO</span>
            <h2>Lienzo</h2>
          </div>
          <span className="rp-version-badge" title="Versión del esquema JSON">v{template.version}</span>
        </div>

        <div className="rp-section">
          <div className="rp-canvas-summary">
            <div>
              <span className="prop-mini-label">Ancho</span>
              <strong>{template.canvas.width} px</strong>
            </div>
            <div>
              <span className="prop-mini-label">Alto</span>
              <strong>{template.canvas.height} px</strong>
            </div>
            <div>
              <span className="prop-mini-label">Capas</span>
              <strong>{template.capas.length}</strong>
            </div>
          </div>
        </div>

        <div className="rp-section">
          <FillEditor
            label="Fondo del lienzo"
            value={template.canvas.background.fill}
            historyPrefix="canvas-bg"
            onChange={(nuevoFill, opts) => setCanvasBackground(nuevoFill, opts)}
          />
        </div>

        <div className="rp-section rp-hint-box">
          <Icon name="cursor" size={15} />
          <p>Selecciona cualquier capa en el lienzo o en la pestaña Capas para editar sus propiedades.</p>
        </div>
      </aside>
    );
  }

  const bloqueada = Boolean(selectedLayer.bloqueada);
  const id = selectedLayer.id;
  const tipo = selectedLayer.tipo;

  function cambiarComun(cambios, historyKey) {
    updateObject(id, cambios, { historyKey });
  }

  function cambiarSubtipo(parcial, historyKey) {
    updateObject(id, { [tipo]: { ...selectedLayer[tipo], ...parcial } }, { historyKey });
  }

  const medidaTexto = tipo === 'texto' ? medirCajaTexto(selectedLayer.texto) : null;
  const puntosLinea = tipo === 'linea' ? (selectedLayer.linea.points || [0, 0, 200, 0]) : null;
  const longitudLinea = puntosLinea
    ? Math.max(1, Math.round(Math.hypot(puntosLinea[2] - puntosLinea[0], puntosLinea[3] - puntosLinea[1])))
    : 0;
  const placeholders = tipo === 'texto' ? extraerPlaceholdersTexto(selectedLayer.texto.texto) : [];

  function cambiarLongitudLinea(nuevaLongitud) {
    const [x1, y1, x2, y2] = puntosLinea;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angulo = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
    const nx2 = Math.round(x1 + Math.cos(angulo) * nuevaLongitud);
    const ny2 = Math.round(y1 + Math.sin(angulo) * nuevaLongitud);
    cambiarSubtipo({ points: [x1, y1, nx2, ny2] }, `layer:${id}:line-len`);
  }

  function cambiarAnchoImagen(nuevoAncho) {
    if (keepImageRatio) {
      const ratio = imageRatioRef.current || (selectedLayer.imagen.width / Math.max(1, selectedLayer.imagen.height)) || 1;
      const nuevoAlto = Math.max(1, Math.round(nuevoAncho / ratio));
      cambiarSubtipo({ width: nuevoAncho, height: nuevoAlto }, `layer:${id}:img-w`);
    } else {
      imageRatioRef.current = nuevoAncho / Math.max(1, selectedLayer.imagen.height);
      cambiarSubtipo({ width: nuevoAncho }, `layer:${id}:img-w`);
    }
  }

  function cambiarAltoImagen(nuevoAlto) {
    if (keepImageRatio) {
      const ratio = imageRatioRef.current || (selectedLayer.imagen.width / Math.max(1, selectedLayer.imagen.height)) || 1;
      const nuevoAncho = Math.max(1, Math.round(nuevoAlto * ratio));
      cambiarSubtipo({ width: nuevoAncho, height: nuevoAlto }, `layer:${id}:img-h`);
    } else {
      imageRatioRef.current = selectedLayer.imagen.width / Math.max(1, nuevoAlto);
      cambiarSubtipo({ height: nuevoAlto }, `layer:${id}:img-h`);
    }
  }

  return (
    <aside className="right-panel" aria-label="Propiedades de capa" data-testid="right-panel">
      <div className="rp-header">
        <div>
          <span className="rp-kicker">{ETIQUETA_TIPO[tipo] || tipo}</span>
          <h2>Propiedades</h2>
        </div>
        <button type="button" className="rp-link-btn" onClick={clearSelection} title="Editar el fondo del lienzo">
          Lienzo
        </button>
      </div>

      {bloqueada && (
        <div className="rp-locked-banner" role="status">
          <Icon name="lock" size={14} />
          <span>Capa bloqueada en el lienzo. Desbloquéala para editarla.</span>
        </div>
      )}

      {/* Identidad y estado */}
      <div className="rp-section">
        <label className="prop-sub-label" htmlFor="prop-layer-name">Nombre de la capa</label>
        <div className="rp-name-row">
          <input
            id="prop-layer-name"
            type="text"
            className="rp-text-input"
            aria-label="Nombre de la capa"
            value={selectedLayer.nombre}
            disabled={bloqueada}
            onChange={(event) => cambiarComun({ nombre: event.target.value }, `layer:${id}:nombre`)}
            onBlur={() => {
              if (!selectedLayer.nombre.trim()) {
                cambiarComun({ nombre: ETIQUETA_TIPO[tipo] || 'Capa' }, `layer:${id}:nombre`);
              }
            }}
          />
          <button
            type="button"
            className={`rp-state-btn ${!selectedLayer.visible ? 'is-off' : ''}`}
            aria-label={selectedLayer.visible ? 'Capa visible (clic para ocultar)' : 'Capa oculta (clic para mostrar)'}
            aria-pressed={selectedLayer.visible}
            title={selectedLayer.visible ? 'Visible' : 'Oculta'}
            onClick={() => toggleLayerVisible(id)}
          >
            <Icon name={selectedLayer.visible ? 'eye' : 'eyeOff'} size={15} />
          </button>
          <button
            type="button"
            className={`rp-state-btn ${bloqueada ? 'is-locked' : ''}`}
            aria-label={bloqueada ? 'Capa bloqueada (clic para desbloquear)' : 'Bloquear capa'}
            aria-pressed={bloqueada}
            title={bloqueada ? 'Bloqueada' : 'Desbloqueada'}
            onClick={() => toggleLayerLocked(id)}
          >
            <Icon name={bloqueada ? 'lock' : 'unlock'} size={15} />
          </button>
        </div>
      </div>

      {/* Geometría común */}
      <div className="rp-section">
        <span className="prop-sub-label">Geometría y apariencia</span>
        <div className="prop-grid-2">
          <div>
            <span className="prop-mini-label">Posición X</span>
            <NumericInput
              value={selectedLayer.x}
              step={1}
              decimals={0}
              suffix="px"
              ariaLabel="Posición X"
              disabled={bloqueada}
              onChange={(x) => cambiarComun({ x }, `layer:${id}:x`)}
            />
          </div>
          <div>
            <span className="prop-mini-label">Posición Y</span>
            <NumericInput
              value={selectedLayer.y}
              step={1}
              decimals={0}
              suffix="px"
              ariaLabel="Posición Y"
              disabled={bloqueada}
              onChange={(y) => cambiarComun({ y }, `layer:${id}:y`)}
            />
          </div>
        </div>

        {tipo === 'rect' && (
          <div className="prop-grid-2 prop-mt">
            <div>
              <span className="prop-mini-label">Ancho (W)</span>
              <NumericInput
                value={selectedLayer.rect.width}
                min={1}
                max={10000}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Ancho"
                disabled={bloqueada}
                onChange={(width) => cambiarSubtipo({ width }, `layer:${id}:w`)}
              />
            </div>
            <div>
              <span className="prop-mini-label">Alto (H)</span>
              <NumericInput
                value={selectedLayer.rect.height}
                min={1}
                max={10000}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Alto"
                disabled={bloqueada}
                onChange={(height) => cambiarSubtipo({ height }, `layer:${id}:h`)}
              />
            </div>
          </div>
        )}

        {tipo === 'circulo' && (
          <div className="prop-grid-2 prop-mt">
            <div>
              <span className="prop-mini-label">Radio</span>
              <NumericInput
                value={selectedLayer.circulo.radius}
                min={1}
                max={5000}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Radio del círculo"
                disabled={bloqueada}
                onChange={(radius) => cambiarSubtipo({ radius }, `layer:${id}:radius`)}
              />
            </div>
            <div>
              <span className="prop-mini-label">Diámetro</span>
              <div className="rp-readonly-chip">{selectedLayer.circulo.radius * 2} × {selectedLayer.circulo.radius * 2} px</div>
            </div>
          </div>
        )}

        {tipo === 'linea' && (
          <div className="prop-mt">
            <span className="prop-mini-label">Longitud</span>
            <NumericInput
              value={longitudLinea}
              min={1}
              max={10000}
              step={5}
              decimals={0}
              suffix="px"
              ariaLabel="Longitud de línea"
              disabled={bloqueada}
              onChange={cambiarLongitudLinea}
            />
          </div>
        )}

        {tipo === 'texto' && medidaTexto && (
          <div className="prop-grid-2 prop-mt">
            <div>
              <span className="prop-mini-label">Ancho (W)</span>
              <NumericInput
                value={medidaTexto.width}
                min={8}
                max={10000}
                step={4}
                decimals={0}
                suffix="px"
                ariaLabel="Ancho del texto"
                disabled={bloqueada}
                onChange={(nuevoAncho) => {
                  const escala = nuevoAncho / Math.max(1, medidaTexto.width);
                  const nuevoFontSize = clamp(Math.round(selectedLayer.texto.fontSize * escala), 8, 600);
                  cambiarSubtipo({ fontSize: nuevoFontSize }, `layer:${id}:text-w`);
                }}
              />
            </div>
            <div>
              <span className="prop-mini-label">Alto (H)</span>
              <NumericInput
                value={medidaTexto.height}
                min={8}
                max={10000}
                step={4}
                decimals={0}
                suffix="px"
                ariaLabel="Alto del texto"
                disabled={bloqueada}
                onChange={(nuevoAlto) => {
                  const escala = nuevoAlto / Math.max(1, medidaTexto.height);
                  const nuevoFontSize = clamp(Math.round(selectedLayer.texto.fontSize * escala), 8, 600);
                  cambiarSubtipo({ fontSize: nuevoFontSize }, `layer:${id}:text-h`);
                }}
              />
            </div>
          </div>
        )}

        {tipo === 'imagen' && (
          <div className="prop-image-size-row prop-mt">
            <div>
              <span className="prop-mini-label">Ancho (W)</span>
              <NumericInput
                value={selectedLayer.imagen.width}
                min={1}
                max={10000}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Ancho de imagen"
                disabled={bloqueada}
                onChange={cambiarAnchoImagen}
              />
            </div>
            <button
              type="button"
              className={`ratio-lock-btn ${keepImageRatio ? 'is-active' : ''}`}
              aria-label="Bloquear proporción de imagen"
              aria-pressed={keepImageRatio}
              disabled={bloqueada}
              title={keepImageRatio ? 'Proporción bloqueada' : 'Proporción libre'}
              onClick={() => {
                const next = !keepImageRatio;
                if (next) {
                  imageRatioRef.current = selectedLayer.imagen.width / Math.max(1, selectedLayer.imagen.height);
                }
                setKeepImageRatio(next);
              }}
            >
              <Icon name={keepImageRatio ? 'lock' : 'unlock'} size={14} />
            </button>
            <div>
              <span className="prop-mini-label">Alto (H)</span>
              <NumericInput
                value={selectedLayer.imagen.height}
                min={1}
                max={10000}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Alto de imagen"
                disabled={bloqueada}
                onChange={cambiarAltoImagen}
              />
            </div>
          </div>
        )}

        <div className="prop-grid-2 prop-mt">
          <div>
            <span className="prop-mini-label">Rotación</span>
            <NumericInput
              value={selectedLayer.rotation}
              min={-360}
              max={360}
              step={1}
              decimals={0}
              suffix="°"
              ariaLabel="Rotación"
              disabled={bloqueada}
              onChange={(rotation) => cambiarComun({ rotation }, `layer:${id}:rotation`)}
            />
          </div>
          <div>
            <span className="prop-mini-label">Opacidad (0–1)</span>
            <NumericInput
              value={selectedLayer.opacity}
              min={0}
              max={1}
              step={0.1}
              decimals={1}
              ariaLabel="Opacidad"
              disabled={bloqueada}
              onChange={(opacity) => cambiarComun({ opacity: redondear(clamp(opacity, 0, 1), 1) }, `layer:${id}:opacity`)}
            />
          </div>
        </div>

        <div className="opacity-slider-row">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            aria-label="Deslizador de transparencia"
            disabled={bloqueada}
            value={selectedLayer.opacity}
            onPointerDown={() => beginHistoryBatch()}
            onPointerUp={() => endHistoryBatch()}
            onPointerCancel={() => endHistoryBatch()}
            onChange={(event) => cambiarComun(
              { opacity: redondear(clamp(Number(event.target.value), 0, 1), 1) },
              `layer:${id}:opacity-slider`,
            )}
          />
          <span>{Math.round(selectedLayer.opacity * 100)}%</span>
        </div>
      </div>

      {/* Específicas: RECT */}
      {tipo === 'rect' && (
        <>
          <div className="rp-section">
            <span className="prop-sub-label">Esquinas</span>
            <NumericInput
              value={selectedLayer.rect.cornerRadius}
              min={0}
              max={2000}
              step={1}
              decimals={0}
              suffix="px"
              ariaLabel="Radio de esquina"
              disabled={bloqueada}
              onChange={(cornerRadius) => cambiarSubtipo({ cornerRadius }, `layer:${id}:radius`)}
            />
          </div>

          <div className="rp-section">
            <FillEditor
              label="Relleno"
              value={selectedLayer.rect.fill}
              disabled={bloqueada}
              historyPrefix={`layer-${id}-fill`}
              onChange={(fill, opts) => cambiarSubtipo({ fill }, opts?.historyKey || `layer:${id}:fill`)}
            />
          </div>

          <div className="rp-section">
            <span className="prop-sub-label">Borde (Stroke)</span>
            <div className="stroke-row">
              <HexColorControl
                value={normalizarStroke(selectedLayer.rect.stroke).color}
                ariaLabel="Color de borde"
                disabled={bloqueada}
                onChange={(color) => cambiarSubtipo(
                  { stroke: { ...normalizarStroke(selectedLayer.rect.stroke), color } },
                  `layer:${id}:stroke-color`,
                )}
              />
              <NumericInput
                value={normalizarStroke(selectedLayer.rect.stroke).width}
                min={0}
                max={200}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Ancho de borde"
                disabled={bloqueada}
                onChange={(width) => cambiarSubtipo(
                  { stroke: { ...normalizarStroke(selectedLayer.rect.stroke), width } },
                  `layer:${id}:stroke-width`,
                )}
              />
            </div>
          </div>
        </>
      )}

      {/* Específicas: CÍRCULO */}
      {tipo === 'circulo' && (
        <>
          <div className="rp-section">
            <FillEditor
              label="Relleno"
              value={selectedLayer.circulo.fill}
              disabled={bloqueada}
              historyPrefix={`layer-${id}-fill`}
              onChange={(fill, opts) => cambiarSubtipo({ fill }, opts?.historyKey || `layer:${id}:fill`)}
            />
          </div>

          <div className="rp-section">
            <span className="prop-sub-label">Borde (Stroke)</span>
            <div className="stroke-row">
              <HexColorControl
                value={normalizarStroke(selectedLayer.circulo.stroke).color}
                ariaLabel="Color de borde"
                disabled={bloqueada}
                onChange={(color) => cambiarSubtipo(
                  { stroke: { ...normalizarStroke(selectedLayer.circulo.stroke), color } },
                  `layer:${id}:stroke-color`,
                )}
              />
              <NumericInput
                value={normalizarStroke(selectedLayer.circulo.stroke).width}
                min={0}
                max={200}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Ancho de borde"
                disabled={bloqueada}
                onChange={(width) => cambiarSubtipo(
                  { stroke: { ...normalizarStroke(selectedLayer.circulo.stroke), width } },
                  `layer:${id}:stroke-width`,
                )}
              />
            </div>
          </div>
        </>
      )}

      {/* Específicas: LÍNEA */}
      {tipo === 'linea' && (
        <>
          <div className="rp-section">
            <span className="prop-sub-label">Trazo (Stroke)</span>
            <div className="stroke-row">
              <HexColorControl
                value={normalizarStroke(selectedLayer.linea.stroke, '#1f2b23', selectedLayer.linea.strokeWidth).color}
                ariaLabel="Color de línea"
                disabled={bloqueada}
                onChange={(color) => {
                  const strokeActual = normalizarStroke(selectedLayer.linea.stroke, '#1f2b23', selectedLayer.linea.strokeWidth);
                  cambiarSubtipo({ stroke: { ...strokeActual, color } }, `layer:${id}:line-color`);
                }}
              />
              <NumericInput
                value={selectedLayer.linea.strokeWidth}
                min={1}
                max={200}
                step={1}
                decimals={0}
                suffix="px"
                ariaLabel="Grosor de línea"
                disabled={bloqueada}
                onChange={(width) => {
                  const strokeActual = normalizarStroke(selectedLayer.linea.stroke, '#1f2b23', width);
                  cambiarSubtipo(
                    { stroke: { ...strokeActual, width }, strokeWidth: width },
                    `layer:${id}:line-width`,
                  );
                }}
              />
            </div>
          </div>

          <div className="rp-section">
            <span className="prop-sub-label">Puntos locales (X1, Y1 → X2, Y2)</span>
            <div className="prop-grid-2">
              <div>
                <span className="prop-mini-label">X1</span>
                <NumericInput
                  value={puntosLinea[0]}
                  step={1}
                  decimals={0}
                  ariaLabel="Punto X1"
                  disabled={bloqueada}
                  onChange={(v) => cambiarSubtipo({ points: [v, puntosLinea[1], puntosLinea[2], puntosLinea[3]] }, `layer:${id}:p0`)}
                />
              </div>
              <div>
                <span className="prop-mini-label">Y1</span>
                <NumericInput
                  value={puntosLinea[1]}
                  step={1}
                  decimals={0}
                  ariaLabel="Punto Y1"
                  disabled={bloqueada}
                  onChange={(v) => cambiarSubtipo({ points: [puntosLinea[0], v, puntosLinea[2], puntosLinea[3]] }, `layer:${id}:p1`)}
                />
              </div>
              <div>
                <span className="prop-mini-label">X2</span>
                <NumericInput
                  value={puntosLinea[2]}
                  step={1}
                  decimals={0}
                  ariaLabel="Punto X2"
                  disabled={bloqueada}
                  onChange={(v) => cambiarSubtipo({ points: [puntosLinea[0], puntosLinea[1], v, puntosLinea[3]] }, `layer:${id}:p2`)}
                />
              </div>
              <div>
                <span className="prop-mini-label">Y2</span>
                <NumericInput
                  value={puntosLinea[3]}
                  step={1}
                  decimals={0}
                  ariaLabel="Punto Y2"
                  disabled={bloqueada}
                  onChange={(v) => cambiarSubtipo({ points: [puntosLinea[0], puntosLinea[1], puntosLinea[2], v] }, `layer:${id}:p3`)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Específicas: TEXTO */}
      {tipo === 'texto' && (
        <>
          <div className="rp-section">
            <label className="prop-sub-label" htmlFor="prop-text-content">Contenido</label>
            <textarea
              id="prop-text-content"
              className="rp-textarea"
              rows={3}
              aria-label="Contenido del texto"
              disabled={bloqueada}
              value={selectedLayer.texto.texto}
              onChange={(event) => cambiarSubtipo({ texto: event.target.value }, `layer:${id}:texto`)}
            />
            {placeholders.length > 0 && (
              <div className="placeholders-preview" data-testid="detected-placeholders">
                <div className="placeholders-Rich">{renderTextoConPlaceholders(selectedLayer.texto.texto)}</div>
                <div className="placeholders-tags">
                  <span>Campos dinámicos:</span>
                  {placeholders.map((campo) => (
                    <code key={campo}>{`{{${campo}}}`}</code>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rp-section">
            <span className="prop-sub-label">Tipografía</span>
            <select
              className="rp-select"
              aria-label="Seleccionar fuente usada"
              disabled={bloqueada}
              value={fuentesDisponibles.includes(selectedLayer.texto.fontFamily) ? selectedLayer.texto.fontFamily : '__custom__'}
              onChange={(event) => {
                if (event.target.value !== '__custom__') {
                  cambiarSubtipo({ fontFamily: event.target.value }, `layer:${id}:font`);
                }
              }}
            >
              {fuentesDisponibles.map((fuente) => (
                <option key={fuente} value={fuente}>{fuente}</option>
              ))}
              {!fuentesDisponibles.includes(selectedLayer.texto.fontFamily) && (
                <option value="__custom__">Personalizada: {selectedLayer.texto.fontFamily}</option>
              )}
            </select>

            <input
              type="text"
              className="rp-text-input prop-mt-sm"
              aria-label="Nombre de fuente libre"
              placeholder="Escribe otra familia (ej. Merriweather)"
              disabled={bloqueada}
              value={selectedLayer.texto.fontFamily}
              onChange={(event) => cambiarSubtipo({ fontFamily: event.target.value }, `layer:${id}:font-free`)}
              onBlur={() => {
                if (!selectedLayer.texto.fontFamily.trim()) {
                  cambiarSubtipo({ fontFamily: 'Inter' }, `layer:${id}:font-free`);
                }
              }}
            />

            <div className="prop-grid-2 prop-mt">
              <div>
                <span className="prop-mini-label">Tamaño</span>
                <NumericInput
                  value={selectedLayer.texto.fontSize}
                  min={8}
                  max={600}
                  step={1}
                  decimals={0}
                  suffix="px"
                  ariaLabel="Tamaño de fuente"
                  disabled={bloqueada}
                  onChange={(fontSize) => cambiarSubtipo({ fontSize }, `layer:${id}:font-size`)}
                />
              </div>
              <div>
                <span className="prop-mini-label">Estilo y alineación</span>
                <div className="text-style-bar">
                  <button
                    type="button"
                    className={`style-toggle-btn ${selectedLayer.texto.fontStyle === 'bold' ? 'is-active' : ''}`}
                    aria-label="Negrita"
                    aria-pressed={selectedLayer.texto.fontStyle === 'bold'}
                    disabled={bloqueada}
                    title="Negrita"
                    onClick={() => cambiarSubtipo(
                      { fontStyle: selectedLayer.texto.fontStyle === 'bold' ? 'normal' : 'bold' },
                      `layer:${id}:bold`,
                    )}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className={`style-toggle-btn ${selectedLayer.texto.align === 'left' ? 'is-active' : ''}`}
                    aria-label="Alinear a la izquierda"
                    aria-pressed={selectedLayer.texto.align === 'left'}
                    disabled={bloqueada}
                    onClick={() => cambiarSubtipo({ align: 'left' }, `layer:${id}:align`)}
                  >
                    <Icon name="alignLeft" size={14} />
                  </button>
                  <button
                    type="button"
                    className={`style-toggle-btn ${selectedLayer.texto.align === 'center' ? 'is-active' : ''}`}
                    aria-label="Centrar texto"
                    aria-pressed={selectedLayer.texto.align === 'center'}
                    disabled={bloqueada}
                    onClick={() => cambiarSubtipo({ align: 'center' }, `layer:${id}:align`)}
                  >
                    <Icon name="alignCenter" size={14} />
                  </button>
                  <button
                    type="button"
                    className={`style-toggle-btn ${selectedLayer.texto.align === 'right' ? 'is-active' : ''}`}
                    aria-label="Alinear a la derecha"
                    aria-pressed={selectedLayer.texto.align === 'right'}
                    disabled={bloqueada}
                    onClick={() => cambiarSubtipo({ align: 'right' }, `layer:${id}:align`)}
                  >
                    <Icon name="alignRight" size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="prop-grid-2 prop-mt">
              <div>
                <span className="prop-mini-label">Espaciado</span>
                <NumericInput
                  value={selectedLayer.texto.letterSpacing}
                  min={-20}
                  max={100}
                  step={0.5}
                  decimals={1}
                  suffix="px"
                  ariaLabel="Espaciado de letras"
                  disabled={bloqueada}
                  onChange={(letterSpacing) => cambiarSubtipo({ letterSpacing }, `layer:${id}:tracking`)}
                />
              </div>
              <div>
                <span className="prop-mini-label">Interlineado</span>
                <NumericInput
                  value={selectedLayer.texto.lineHeight}
                  min={0.5}
                  max={5}
                  step={0.1}
                  decimals={1}
                  ariaLabel="Interlineado"
                  disabled={bloqueada}
                  onChange={(lineHeight) => cambiarSubtipo({ lineHeight }, `layer:${id}:leading`)}
                />
              </div>
            </div>
          </div>

          <div className="rp-section">
            <FillEditor
              label="Relleno de texto"
              value={selectedLayer.texto.fill}
              disabled={bloqueada}
              historyPrefix={`layer-${id}-fill`}
              onChange={(fill, opts) => cambiarSubtipo({ fill }, opts?.historyKey || `layer:${id}:fill`)}
            />
          </div>
        </>
      )}

      {/* Específicas: IMAGEN */}
      {tipo === 'imagen' && (
        <div className="rp-section">
          <span className="prop-sub-label">Origen y recorte</span>
          <div className="rp-image-actions">
            <button
              type="button"
              className="rp-btn"
              disabled={bloqueada}
              onClick={() => onReplaceImageFile(id)}
            >
              <Icon name="image" size={14} /> Reemplazar archivo
            </button>
            <button
              type="button"
              className="rp-btn"
              disabled={bloqueada}
              onClick={() => onReplaceImageUrl(id)}
            >
              <Icon name="link" size={14} /> Desde URL
            </button>
            <button
              type="button"
              className="rp-btn rp-btn-accent"
              disabled={bloqueada}
              onClick={() => onOpenCrop(id)}
            >
              <Icon name="crop" size={14} /> Recortar imagen
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
