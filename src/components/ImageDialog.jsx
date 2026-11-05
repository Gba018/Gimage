import React, { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';

export default function ImageDialog({ onClose, onAdd }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function escape(event) { if (event.key === 'Escape' && !loading) onClose(); }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose, loading]);

  async function submit(event) {
    event.preventDefault();
    let finalUrl;
    try {
      finalUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(finalUrl.protocol)) throw new Error();
    } catch {
      setError('Escribe una dirección de imagen válida que empiece por http:// o https://.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(finalUrl.href);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo cargar la imagen.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (!loading && event.target === event.currentTarget) onClose(); }}>
      <section className="dialog image-dialog" role="dialog" aria-modal="true" aria-labelledby="image-dialog-title">
        <div className="dialog-heading">
          <div><span className="dialog-kicker">AÑADIR UNA IMAGEN</span><h2 id="image-dialog-title">Desde una URL</h2><p>Pega el enlace directo a la imagen que quieres usar.</p></div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar" disabled={loading}><Icon name="close" size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="image-url">URL de la imagen</label>
          <input id="image-url" className="text-input" type="url" placeholder="https://ejemplo.com/imagen.jpg" value={url} onChange={(event) => setUrl(event.target.value)} required autoFocus />
          <p className="field-hint">La dirección debe apuntar directamente a un archivo de imagen público.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="button-secondary" onClick={onClose} disabled={loading}>Cancelar</button><button type="submit" className="button-primary" disabled={loading}>{loading ? 'Cargando…' : 'Añadir imagen'} <Icon name="arrowUpRight" size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}
