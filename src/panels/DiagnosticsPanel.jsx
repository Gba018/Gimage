import React, { useState } from 'react';
import { Icon } from '../components/Icons.jsx';

const ICONO_POR_TIPO = { 'imagen-vacia':'image','imagen-invalida':'image','imagen-sin-defecto':'image','mapeo-invalido':'link','sin-mapeo':'link','capa-fuera':'square' };

export default function DiagnosticsPanel({ diagnostico, generando = false }) {
  const [abierto, setAbierto] = useState(true);
  const { errores = [], advertencias = [], total = 0 } = diagnostico || {};
  const estado = errores.length ? 'Con errores' : advertencias.length ? 'Con advertencias' : 'Sin problemas detectados';
  return (
    <section className="diagnostics-panel" data-testid="diagnostics-panel" aria-label="Diagnóstico de la plantilla" style={{ position:'fixed', left:18, bottom:18, zIndex:60, width:340, maxWidth:'calc(100vw - 36px)', borderRadius:14, border:'1px solid rgba(255,255,255,.14)', background:'rgba(16,24,20,.94)', color:'#eaf3ee', boxShadow:'0 18px 40px rgba(0,0,0,.28)', backdropFilter:'blur(10px)', overflow:'hidden' }}>
      <header style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom: abierto ? '1px solid rgba(255,255,255,.10)' : 'none' }}>
        <span aria-hidden="true" style={{ width:9, height:9, borderRadius:999, background: errores.length ? '#ff6b6b' : advertencias.length ? '#ffc75a' : '#57d9a3', boxShadow:'0 0 0 4px rgba(255,255,255,.06)' }} />
        <div style={{ flex:1 }}>
          <strong style={{ display:'block', fontSize:13 }}>{estado}</strong>
          <small style={{ opacity:0.68 }}>{errores.length} error(es) · {advertencias.length} advertencia(s)</small>
        </div>
        <button type="button" onClick={() => setAbierto((valor) => !valor)} aria-expanded={abierto} aria-label={abierto ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'} style={{ border:0, background:'transparent', color:'inherit', cursor:'pointer', padding:6 }}>
          <Icon name={abierto ? 'chevron' : 'plus'} size={16} />
        </button>
      </header>
      {abierto && (
        <div style={{ maxHeight:240, overflowY:'auto', padding:'10px 14px 14px' }}>
          {total === 0 && <p style={{ margin:0, fontSize:13, opacity:0.78 }}>La plantilla está lista para previsualizar y generar imágenes.</p>}
          <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gap:8 }}>
            {errores.map((item, indice) => (
              <li key={`error-${item.tipo}-${indice}`} role="alert" style={{ display:'flex', gap:9, fontSize:12.5, lineHeight:1.35, padding:'9px 10px', borderRadius:10, background:'rgba(255,107,107,.12)', border:'1px solid rgba(255,107,107,.25)' }}>
                <Icon name={ICONO_POR_TIPO[item.tipo] || 'info'} size={15} />
                <span>{item.mensaje}</span>
              </li>
            ))}
            {advertencias.map((item, indice) => (
              <li key={`warning-${item.tipo}-${indice}`} style={{ display:'flex', gap:9, fontSize:12.5, lineHeight:1.35, padding:'9px 10px', borderRadius:10, background:'rgba(255,199,90,.10)', border:'1px solid rgba(255,199,90,.22)' }}>
                <Icon name={ICONO_POR_TIPO[item.tipo] || 'info'} size={15} />
                <span>{item.mensaje}</span>
              </li>
            ))}
          </ul>
          {generando && <p style={{ margin:'10px 0 0', fontSize:12, opacity:0.72 }}>El diagnóstico se congela mientras se genera el lote.</p>}
        </div>
      )}
    </section>
  );
}
