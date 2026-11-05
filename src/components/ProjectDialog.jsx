import React, { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';

const formatos = [
  { id: 'post', label: 'Publicación', sub: '1080 × 1080 px', width: 1080, height: 1080, shape: 'square' },
  { id: 'story', label: 'Historia', sub: '1080 × 1920 px', width: 1080, height: 1920, shape: 'portrait' },
  { id: 'banner', label: 'Banner', sub: '1200 × 628 px', width: 1200, height: 628, shape: 'landscape' },
  { id: 'custom', label: 'Personalizado', sub: 'Tú eliges el tamaño', shape: 'custom' },
];

export default function ProjectDialog({ onClose }) {
  const createProject = useTemplateStore((state) => state.newProject);
  const objects = useTemplateStore((state) => state.template.capas);
  const [name, setName] = useState('Proyecto sin título');
  const [format, setFormat] = useState('post');
  const [width, setWidth] = useState('1080');
  const [height, setHeight] = useState('1080');
  const [background, setBackground] = useState('#ffffff');
  const [error, setError] = useState('');

  useEffect(() => {
    function escape(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    const preset = formatos.find((item) => item.id === format);
    const finalWidth = format === 'custom' ? Number(width) : preset.width;
    const finalHeight = format === 'custom' ? Number(height) : preset.height;
    // DECISION: limitar medidas personalizadas a 1–10000 px para evitar dimensiones inválidas o impracticables.
    if (!Number.isInteger(finalWidth) || !Number.isInteger(finalHeight) || finalWidth < 1 || finalHeight < 1 || finalWidth > 10000 || finalHeight > 10000) {
      setError('Introduce medidas enteras entre 1 y 10 000 píxeles.');
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(background)) {
      setError('Introduce un color hexadecimal válido, por ejemplo #ffffff.');
      return;
    }
    createProject({ name, width: finalWidth, height: finalHeight, background: background.toLowerCase() });
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <div className="dialog-heading">
          <div><span className="dialog-kicker">UN NUEVO COMIENZO</span><h2 id="project-dialog-title">Crea tu lienzo</h2><p>Elige el formato y empieza con una idea en blanco.</p></div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="project-title">Nombre del proyecto</label>
          <input id="project-title" className="text-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <div className="field-label format-label">Formato del lienzo <span>Selecciona uno</span></div>
          <div className="format-grid">
            {formatos.map((item) => (
              <button key={item.id} type="button" className={`format-card ${format === item.id ? 'is-active' : ''}`} onClick={() => { setFormat(item.id); setError(''); }} aria-pressed={format === item.id}>
                <span className="format-shape-wrap"><span className={`format-shape format-${item.shape}`}>{item.shape === 'custom' && <Icon name="plus" size={15} />}</span></span>
                <span className="format-copy"><strong>{item.label}</strong><small>{item.sub}</small></span>
                {format === item.id && <span className="format-check"><Icon name="check" size={12} strokeWidth={2.6} /></span>}
              </button>
            ))}
          </div>
          {format === 'custom' && (
            <div className="custom-fields">
              <label className="field-label">Ancho <span>px</span><input aria-label="Ancho personalizado en píxeles" className="text-input" type="number" min="1" max="10000" step="1" value={width} onChange={(event) => setWidth(event.target.value)} required /></label>
              <span className="custom-times">×</span>
              <label className="field-label">Alto <span>px</span><input aria-label="Alto personalizado en píxeles" className="text-input" type="number" min="1" max="10000" step="1" value={height} onChange={(event) => setHeight(event.target.value)} required /></label>
            </div>
          )}
          <div className="color-setting">
            <div><strong>Color de fondo</strong><small>Un color sólido para tu lienzo.</small></div>
            <div className="color-input-wrap">
              <input type="color" aria-label="Seleccionar color de fondo" value={/^#[0-9a-f]{6}$/i.test(background) ? background : '#ffffff'} onChange={(event) => setBackground(event.target.value)} />
              <input type="text" aria-label="Color de fondo hexadecimal" value={background} onChange={(event) => setBackground(event.target.value)} maxLength="7" spellCheck="false" />
            </div>
          </div>
          {objects.length > 0 && <p className="dialog-warning"><Icon name="info" size={16} /> El nuevo proyecto reemplazará el diseño actual, que no se guarda todavía.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Crear lienzo <Icon name="arrowUpRight" size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}
