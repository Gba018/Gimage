import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import NumericInput from './NumericInput.jsx';
import { useTemplateStore } from '../state/template-store.js';
import {
  clamp,
  colorEnOffset,
  colorSolidoDeFill,
  esFillDegradado,
  esHexValido,
  fillACss,
  normalizarHex,
  normalizarStops,
  redondear,
} from '../template/schema.js';

export function HexColorControl({ value, onChange, ariaLabel = 'Color', disabled = false }) {
  const colorLimpio = normalizarHex(value, '#000000');
  const [texto, setTexto] = useState(colorLimpio);
  const [foco, setFoco] = useState(false);

  useEffect(() => {
    if (!foco) setTexto(colorLimpio);
  }, [colorLimpio, foco]);

  function cambiarTexto(event) {
    const crudo = event.target.value;
    setTexto(crudo);
    if (esHexValido(crudo)) {
      const hex = normalizarHex(crudo, colorLimpio);
      if (hex !== colorLimpio) onChange(hex);
    }
  }

  function confirmar() {
    setFoco(false);
    if (esHexValido(texto)) {
      const hex = normalizarHex(texto, colorLimpio);
      setTexto(hex);
      if (hex !== colorLimpio) onChange(hex);
    } else {
      setTexto(colorLimpio);
    }
  }

  return (
    <div className={`hex-control ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="color"
        aria-label={`Selector de ${ariaLabel}`}
        value={colorLimpio}
        disabled={disabled}
        onChange={(event) => {
          const hex = normalizarHex(event.target.value, colorLimpio);
          setTexto(hex);
          onChange(hex);
        }}
      />
      <input
        type="text"
        aria-label={`${ariaLabel} hexadecimal`}
        value={texto}
        disabled={disabled}
        maxLength={7}
        spellCheck={false}
        onFocus={() => setFoco(true)}
        onBlur={confirmar}
        onChange={cambiarTexto}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setTexto(colorLimpio);
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function descripcionSentido(angle) {
  const norm = ((Math.round(angle) % 360) + 360) % 360;
  if (norm === 0) return '0° → derecha';
  if (norm === 90) return '90° ↓ abajo';
  if (norm === 180) return '180° ← izquierda';
  if (norm === 270) return '270° ↑ arriba';
  return `${Math.round(angle)}°`;
}

function construirDegradado(tipo, base, overrides = {}) {
  const stops = normalizarStops(overrides.stops ?? base?.stops);
  if (tipo === 'radial') {
    const centerX = redondear(clamp(overrides.centerX ?? base?.centerX ?? 0.5, 0, 1), 4);
    const centerY = redondear(clamp(overrides.centerY ?? base?.centerY ?? 0.5, 0, 1), 4);
    return { type: 'radial', centerX, centerY, stops };
  }
  const rawAngle = overrides.angle ?? base?.angle ?? 0;
  const angle = clamp(Math.round(Number(rawAngle) || 0), 0, 360);
  return { type: 'linear', angle, stops };
}

export default function FillEditor({
  value,
  onChange,
  label = 'Relleno',
  disabled = false,
  historyPrefix = 'fill',
}) {
  const beginHistoryBatch = useTemplateStore((state) => state.beginHistoryBatch);
  const endHistoryBatch = useTemplateStore((state) => state.endHistoryBatch);

  const esDegradado = esFillDegradado(value);
  const ultimoDegradadoRef = useRef(esDegradado ? value : null);
  const ultimoSolidoRef = useRef(!esDegradado ? colorSolidoDeFill(value, '#ff8800') : '#ff8800');
  const barRef = useRef(null);
  const dragCleanRef = useRef(null);
  const suppressTrackClickRef = useRef(false);

  const [activeStop, setActiveStop] = useState(0);
  const [draggingIndex, setDraggingIndex] = useState(null);

  useEffect(() => {
    if (esFillDegradado(value)) {
      ultimoDegradadoRef.current = value;
      setActiveStop((prev) => clamp(prev, 0, Math.max(0, (value.stops?.length || 2) - 1)));
    } else {
      ultimoSolidoRef.current = colorSolidoDeFill(value, '#ff8800');
    }
  }, [value]);

  useEffect(() => () => {
    dragCleanRef.current?.();
  }, []);

  const stops = esDegradado ? normalizarStops(value.stops) : [];
  const barCss = esDegradado
    ? `linear-gradient(90deg, ${stops.map((s) => `${s.color} ${redondear(s.offset * 100, 1)}%`).join(', ')})`
    : '';

  function activarModoSolido() {
    if (disabled || !esDegradado) return;
    const hex = stops[0]?.color || ultimoSolidoRef.current || '#ff8800';
    onChange(hex, { historyKey: `${historyPrefix}:mode` });
  }

  function activarModoDegradado() {
    if (disabled || esDegradado) return;
    if (ultimoDegradadoRef.current) {
      onChange(construirDegradado(ultimoDegradadoRef.current.type, ultimoDegradadoRef.current), {
        historyKey: `${historyPrefix}:mode`,
      });
      return;
    }
    const inicio = colorSolidoDeFill(value, '#ff8800');
    const fin = inicio.toLowerCase() === '#ffdd00' ? '#ff8800' : '#ffdd00';
    onChange(
      {
        type: 'linear',
        angle: 0,
        stops: [
          { offset: 0, color: inicio },
          { offset: 1, color: fin },
        ],
      },
      { historyKey: `${historyPrefix}:mode` },
    );
  }

  function cambiarTipoDegradado(nuevoTipo) {
    if (disabled || !esDegradado || value.type === nuevoTipo) return;
    onChange(construirDegradado(nuevoTipo, value), { historyKey: `${historyPrefix}:grad-type` });
  }

  function cambiarAngulo(nuevoAngulo, historyKey = `${historyPrefix}:angle`) {
    if (disabled || !esDegradado) return;
    onChange(construirDegradado('linear', value, { angle: nuevoAngulo }), { historyKey });
  }

  function cambiarCentro(eje, porcentaje, historyKey = `${historyPrefix}:center-${eje}`) {
    if (disabled || !esDegradado) return;
    const fraccion = redondear(clamp(Number(porcentaje) / 100, 0, 1), 4);
    onChange(
      construirDegradado('radial', value, {
        centerX: eje === 'x' ? fraccion : value.centerX,
        centerY: eje === 'y' ? fraccion : value.centerY,
      }),
      { historyKey },
    );
  }

  function agregarStopEnBarra(event) {
    if (disabled || !esDegradado || stops.length >= 8) return;
    if (suppressTrackClickRef.current) {
      suppressTrackClickRef.current = false;
      return;
    }
    const bar = barRef.current;
    if (!bar || event.target !== bar) return;
    const rect = bar.getBoundingClientRect();
    if (!rect.width) return;
    const offset = redondear(clamp((event.clientX - rect.left) / rect.width, 0, 1), 2);
    const color = colorEnOffset(stops, offset);
    const nuevoStop = { offset, color };
    const nuevosStops = [...stops, nuevoStop].sort((a, b) => a.offset - b.offset);
    const nuevoIndice = nuevosStops.indexOf(nuevoStop);
    setActiveStop(nuevoIndice >= 0 ? nuevoIndice : 0);
    onChange(construirDegradado(value.type, value, { stops: nuevosStops }), {
      historyKey: `${historyPrefix}:add-stop-${Date.now()}`,
    });
  }

  function borrarStop(index) {
    if (disabled || !esDegradado || stops.length <= 2) return;
    const nuevosStops = stops.filter((_, idx) => idx !== index);
    setActiveStop((prev) => clamp(prev >= index ? prev - 1 : prev, 0, nuevosStops.length - 1));
    onChange(construirDegradado(value.type, value, { stops: nuevosStops }), {
      historyKey: `${historyPrefix}:del-stop-${Date.now()}`,
    });
  }

  function iniciarArrastreStop(index, event) {
    if (disabled || !esDegradado || event.button !== 0) return;
    event.stopPropagation();
    setActiveStop(index);

    const bar = barRef.current;
    if (!bar) return;

    const baseFill = value;
    const stopInicial = stops[index];
    const otrosStops = stops.filter((_, idx) => idx !== index);
    let movio = false;

    dragCleanRef.current?.();
    beginHistoryBatch();
    setDraggingIndex(index);

    function mover(moveEvent) {
      const rect = bar.getBoundingClientRect();
      if (!rect.width) return;
      movio = true;
      const nuevoOffset = redondear(clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1), 2);
      const stopMovido = { offset: nuevoOffset, color: stopInicial.color };
      const ordenados = [...otrosStops, stopMovido].sort((a, b) => a.offset - b.offset);
      const posActual = ordenados.indexOf(stopMovido);
      setActiveStop(posActual);
      setDraggingIndex(posActual);
      onChange(construirDegradado(baseFill.type, baseFill, { stops: ordenados }), {
        historyKey: `${historyPrefix}:drag-stop`,
      });
    }

    function soltar() {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      dragCleanRef.current = null;
      setDraggingIndex(null);
      if (movio) {
        suppressTrackClickRef.current = true;
        window.setTimeout(() => { suppressTrackClickRef.current = false; }, 0);
      }
      endHistoryBatch();
    }

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    dragCleanRef.current = soltar;
  }

  function cambiarColorStop(index, nuevoColor) {
    if (disabled || !esDegradado) return;
    const nuevosStops = stops.map((stop, idx) => (idx === index ? { ...stop, color: nuevoColor } : stop));
    onChange(construirDegradado(value.type, value, { stops: nuevosStops }), {
      historyKey: `${historyPrefix}:stop-color-${index}`,
    });
  }

  function cambiarOffsetStop(index, porcentaje) {
    if (disabled || !esDegradado) return;
    const nuevoOffset = redondear(clamp(Number(porcentaje) / 100, 0, 1), 2);
    const actualizado = { offset: nuevoOffset, color: stops[index].color };
    const otros = stops.filter((_, idx) => idx !== index);
    const ordenados = [...otros, actualizado].sort((a, b) => a.offset - b.offset);
    setActiveStop(ordenados.indexOf(actualizado));
    onChange(construirDegradado(value.type, value, { stops: ordenados }), {
      historyKey: `${historyPrefix}:stop-offset-${index}`,
    });
  }

  return (
    <div className="fill-editor" data-testid={`fill-editor-${historyPrefix}`}>
      <div className="fill-editor-header">
        <span className="prop-sub-label">{label}</span>
        <div className="segmented-toggle" role="group" aria-label={`Modo de ${label}`}>
          <button
            type="button"
            className={!esDegradado ? 'is-active' : ''}
            aria-pressed={!esDegradado}
            disabled={disabled}
            onClick={activarModoSolido}
          >
            Sólido
          </button>
          <button
            type="button"
            className={esDegradado ? 'is-active' : ''}
            aria-pressed={esDegradado}
            disabled={disabled}
            onClick={activarModoDegradado}
          >
            Degradado
          </button>
        </div>
      </div>

      {!esDegradado ? (
        <div className="fill-solid-row">
          <span className="fill-swatch-preview" style={{ background: fillACss(value) }} aria-hidden="true" />
          <HexColorControl
            value={colorSolidoDeFill(value, '#000000')}
            ariaLabel={label}
            disabled={disabled}
            onChange={(hex) => onChange(hex, { historyKey: `${historyPrefix}:solid` })}
          />
        </div>
      ) : (
        <div className="fill-gradient-panel">
          <div className="fill-gradient-top">
            <div className="segmented-toggle segmented-full" role="group" aria-label="Tipo de degradado">
              <button
                type="button"
                className={value.type === 'linear' ? 'is-active' : ''}
                aria-pressed={value.type === 'linear'}
                disabled={disabled}
                onClick={() => cambiarTipoDegradado('linear')}
              >
                Lineal
              </button>
              <button
                type="button"
                className={value.type === 'radial' ? 'is-active' : ''}
                aria-pressed={value.type === 'radial'}
                disabled={disabled}
                onClick={() => cambiarTipoDegradado('radial')}
              >
                Radial
              </button>
            </div>
            <span
              className="fill-live-chip"
              style={{ background: fillACss(value) }}
              title="Vista previa del relleno"
              aria-label="Vista previa del degradado"
            />
          </div>

          {value.type === 'linear' ? (
            <div className="gradient-linear-controls">
              <div className="gradient-angle-head">
                <span className="prop-mini-label">Ángulo</span>
                <span className="angle-direction-pill" data-testid="angle-direction-preview">
                  <i className="angle-arrow" style={{ transform: `rotate(${value.angle || 0}deg)` }} aria-hidden="true">→</i>
                  <span>{descripcionSentido(value.angle || 0)}</span>
                </span>
              </div>
              <div className="gradient-angle-row">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  aria-label="Ángulo del degradado"
                  disabled={disabled}
                  value={value.angle ?? 0}
                  onPointerDown={() => beginHistoryBatch()}
                  onPointerUp={() => endHistoryBatch()}
                  onPointerCancel={() => endHistoryBatch()}
                  onChange={(event) => cambiarAngulo(Number(event.target.value), `${historyPrefix}:angle-slider`)}
                />
                <NumericInput
                  value={value.angle ?? 0}
                  min={0}
                  max={360}
                  step={5}
                  decimals={0}
                  suffix="°"
                  ariaLabel="Ángulo en grados"
                  disabled={disabled}
                  onChange={(val) => cambiarAngulo(val, `${historyPrefix}:angle-num`)}
                />
              </div>
              <div className="angle-presets" role="group" aria-label="Ángulos rápidos">
                {[
                  { deg: 0, text: '0° →' },
                  { deg: 90, text: '90° ↓' },
                  { deg: 180, text: '180° ←' },
                  { deg: 270, text: '270° ↑' },
                ].map((preset) => (
                  <button
                    key={preset.deg}
                    type="button"
                    disabled={disabled}
                    className={Math.round(value.angle || 0) === preset.deg ? 'is-active' : ''}
                    onClick={() => cambiarAngulo(preset.deg, `${historyPrefix}:angle-preset-${preset.deg}`)}
                  >
                    {preset.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="gradient-radial-controls">
              <div className="prop-grid-2">
                <div>
                  <span className="prop-mini-label">Centro X</span>
                  <NumericInput
                    value={Math.round((value.centerX ?? 0.5) * 100)}
                    min={0}
                    max={100}
                    step={5}
                    decimals={0}
                    suffix="%"
                    ariaLabel="Centro radial X en porcentaje"
                    disabled={disabled}
                    onChange={(pct) => cambiarCentro('x', pct)}
                  />
                </div>
                <div>
                  <span className="prop-mini-label">Centro Y</span>
                  <NumericInput
                    value={Math.round((value.centerY ?? 0.5) * 100)}
                    min={0}
                    max={100}
                    step={5}
                    decimals={0}
                    suffix="%"
                    ariaLabel="Centro radial Y en porcentaje"
                    disabled={disabled}
                    onChange={(pct) => cambiarCentro('y', pct)}
                  />
                </div>
              </div>
              <div className="radial-sliders">
                <label className="radial-slider-row">
                  <span>X</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    aria-label="Deslizador centro X"
                    disabled={disabled}
                    value={Math.round((value.centerX ?? 0.5) * 100)}
                    onPointerDown={() => beginHistoryBatch()}
                    onPointerUp={() => endHistoryBatch()}
                    onPointerCancel={() => endHistoryBatch()}
                    onChange={(event) => cambiarCentro('x', Number(event.target.value), `${historyPrefix}:cx-slider`)}
                  />
                </label>
                <label className="radial-slider-row">
                  <span>Y</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    aria-label="Deslizador centro Y"
                    disabled={disabled}
                    value={Math.round((value.centerY ?? 0.5) * 100)}
                    onPointerDown={() => beginHistoryBatch()}
                    onPointerUp={() => endHistoryBatch()}
                    onPointerCancel={() => endHistoryBatch()}
                    onChange={(event) => cambiarCentro('y', Number(event.target.value), `${historyPrefix}:cy-slider`)}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="stops-section">
            <div className="stops-header">
              <span className="prop-mini-label">Paradas ({stops.length}/8)</span>
              <small>{stops.length < 8 ? 'Clic añade · 2× clic borra' : 'Máximo 8 paradas'}</small>
            </div>

            <div
              ref={barRef}
              className={`gradient-stop-bar ${stops.length >= 8 ? 'is-full' : ''}`}
              style={{ background: barCss }}
              onClick={agregarStopEnBarra}
              data-testid="gradient-stop-bar"
              title={stops.length < 8 ? 'Haz clic para agregar una parada de color' : 'Máximo 8 paradas'}
            >
              {stops.map((stop, index) => {
                const pct = Math.round(stop.offset * 100);
                const activo = activeStop === index;
                const arrastrando = draggingIndex === index;
                return (
                  <button
                    key={`stop-${index}`}
                    type="button"
                    data-testid={`gradient-stop-handle-${index}`}
                    className={`stop-handle ${activo ? 'is-active' : ''} ${arrastrando ? 'is-dragging' : ''}`}
                    style={{ left: `${stop.offset * 100}%`, '--stop-color': stop.color }}
                    disabled={disabled}
                    title={`Parada ${index + 1}: ${pct}% (doble clic para borrar)`}
                    aria-label={`Parada ${index + 1} al ${pct}%`}
                    onPointerDown={(event) => iniciarArrastreStop(index, event)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveStop(index);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      borrarStop(index);
                    }}
                  >
                    <span className="stop-tooltip" aria-hidden="true">{pct}%</span>
                  </button>
                );
              })}
            </div>

            <div className="stops-list" role="list" aria-label="Lista de paradas del degradado">
              {stops.map((stop, index) => {
                const pct = Math.round(stop.offset * 100);
                return (
                  <div
                    key={`row-${index}`}
                    role="listitem"
                    className={`stop-row ${activeStop === index ? 'is-active' : ''}`}
                    onClick={() => setActiveStop(index)}
                  >
                    <HexColorControl
                      value={stop.color}
                      ariaLabel={`Color parada ${index + 1}`}
                      disabled={disabled}
                      onChange={(hex) => cambiarColorStop(index, hex)}
                    />
                    <div className="stop-pct-wrap" title={`Posición de la parada: ${pct}%`}>
                      <NumericInput
                        value={pct}
                        min={0}
                        max={100}
                        step={5}
                        decimals={0}
                        suffix="%"
                        ariaLabel={`Posición parada ${index + 1} en porcentaje`}
                        disabled={disabled}
                        onChange={(val) => cambiarOffsetStop(index, val)}
                      />
                    </div>
                    <button
                      type="button"
                      className="stop-delete-btn"
                      aria-label={`Eliminar parada ${index + 1}`}
                      title={stops.length <= 2 ? 'Mínimo 2 paradas requeridas' : `Eliminar parada (${pct}%)`}
                      disabled={disabled || stops.length <= 2}
                      onClick={(event) => {
                        event.stopPropagation();
                        borrarStop(index);
                      }}
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
