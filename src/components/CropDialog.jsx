import React, { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import NumericInput from './NumericInput.jsx';
import { cargarImagen } from '../canvas/image-loader.js';
import { clamp } from '../template/schema.js';

// DECISION: materializar el recorte básico como dataURL sobre { src, width, height } para no añadir campos fuera del esquema v2.
export default function CropDialog({ layer, onApply, onClose }) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });

  useEffect(() => {
    let activo = true;
    cargarImagen(layer.imagen.src)
      .then((res) => {
        if (activo) setLoaded(res);
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo preparar la imagen para recortar.');
      });
    return () => { activo = false; };
  }, [layer.imagen.src]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function actualizarRecorte(parcial) {
    setCrop((actual) => {
      const w = clamp(Math.round(parcial.w ?? actual.w), 5, 100);
      const h = clamp(Math.round(parcial.h ?? actual.h), 5, 100);
      const x = clamp(Math.round(parcial.x ?? actual.x), 0, 100 - w);
      const y = clamp(Math.round(parcial.y ?? actual.y), 0, 100 - h);
      return { x, y, w, h };
    });
  }

  function aplicarPreset(ratio) {
    if (!loaded?.image) return;
    const natW = loaded.image.naturalWidth || layer.imagen.width || 1;
    const natH = loaded.image.naturalHeight || layer.imagen.height || 1;
    if (!ratio) {
      setCrop({ x: 10, y: 10, w: 80, h: 80 });
      return;
    }
    const actualRatio = natW / natH;
    if (actualRatio > ratio) {
      const w = clamp(Math.round((ratio / actualRatio) * 100), 10, 100);
      setCrop({ x: Math.round((100 - w) / 2), y: 0, w, h: 100 });
    } else {
      const h = clamp(Math.round((actualRatio / ratio) * 100), 10, 100);
      setCrop({ x: 0, y: Math.round((100 - h) / 2), w: 100, h });
    }
  }

  function confirmarRecorte() {
    if (!loaded?.image) return;
    const img = loaded.image;
    const natW = img.naturalWidth || layer.imagen.width || 1;
    const natH = img.naturalHeight || layer.imagen.height || 1;
    const sx = Math.round((crop.x / 100) * natW);
    const sy = Math.round((crop.y / 100) * natH);
    const sw = Math.max(1, Math.round((crop.w / 100) * natW));
    const sh = Math.max(1, Math.round((crop.h / 100) * natH));

    try {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = canvas.toDataURL('image/png');
      const nextWidth = Math.max(1, Math.round(layer.imagen.width * (crop.w / 100)));
      const nextHeight = Math.max(1, Math.round(layer.imagen.height * (crop.h / 100)));
      onApply({ src: dataUrl, width: nextWidth, height: nextHeight });
      onClose();
    } catch {
      setError('Esta imagen proviene de un servidor externo sin permisos CORS y no puede recortarse en el navegador.');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
        <div className="dialog-heading">
          <div>
            <span className="dialog-kicker">IMAGEN</span>
            <h2 id="crop-dialog-title">Recortar imagen</h2>
            <p>Ajusta el área visible que quieres conservar.</p>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="crop-presets" role="group" aria-label="Proporciones rápidas de recorte">
          <button type="button" className="chip-btn" onClick={() => aplicarPreset(null)}>Centrado 80%</button>
          <button type="button" className="chip-btn" onClick={() => aplicarPreset(1)}>1 : 1</button>
          <button type="button" className="chip-btn" onClick={() => aplicarPreset(4 / 3)}>4 : 3</button>
          <button type="button" className="chip-btn" onClick={() => aplicarPreset(16 / 9)}>16 : 9</button>
        </div>

        <div className="crop-stage-wrap">
          <div className="crop-preview-box">
            <img src={layer.imagen.src} alt={layer.nombre} draggable={false} />
            <div
              className="crop-selection-box"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`,
              }}
            />
          </div>
        </div>

        <div className="crop-inputs-grid">
          <div>
            <span className="prop-mini-label">Origen X</span>
            <NumericInput value={crop.x} min={0} max={95} step={5} suffix="%" ariaLabel="Recorte X en porcentaje"
              onChange={(x) => actualizarRecorte({ x })} />
          </div>
          <div>
            <span className="prop-mini-label">Origen Y</span>
            <NumericInput value={crop.y} min={0} max={95} step={5} suffix="%" ariaLabel="Recorte Y en porcentaje"
              onChange={(y) => actualizarRecorte({ y })} />
          </div>
          <div>
            <span className="prop-mini-label">Ancho</span>
            <NumericInput value={crop.w} min={5} max={100} step={5} suffix="%" ariaLabel="Ancho de recorte en porcentaje"
              onChange={(w) => actualizarRecorte({ w })} />
          </div>
          <div>
            <span className="prop-mini-label">Alto</span>
            <NumericInput value={crop.h} min={5} max={100} step={5} suffix="%" ariaLabel="Alto de recorte en porcentaje"
              onChange={(h) => actualizarRecorte({ h })} />
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="button-primary" onClick={confirmarRecorte} disabled={!loaded}>
            Aplicar recorte <Icon name="check" size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
