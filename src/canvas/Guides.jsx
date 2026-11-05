import React from 'react';
import { Line } from 'react-konva';
import { useTemplateStore } from '../state/template-store.js';

function calcularMarcas(size, offset, zoom) {
  if (!size || !zoom) return [];
  const objetivo = 78 / zoom;
  const potencia = 10 ** Math.floor(Math.log10(objetivo));
  const mayor = [1, 2, 5, 10].map((valor) => valor * potencia).find((valor) => valor >= objetivo);
  const menor = mayor / 5;
  const inicio = Math.ceil((-offset / zoom) / menor);
  const fin = Math.floor(((size - offset) / zoom) / menor);
  const marcas = [];
  for (let i = inicio; i <= fin; i += 1) {
    const valor = Math.round(i * menor * 1000) / 1000;
    marcas.push({ valor, posicion: offset + valor * zoom, principal: i % 5 === 0 });
  }
  return marcas;
}

export function Ruler({ orientation, size, offset, zoom, onStartGuide }) {
  const horizontal = orientation === 'horizontal';
  const marcas = calcularMarcas(size, offset, zoom);
  return (
    <div className={`ruler ruler-${orientation}`} onPointerDown={(event) => onStartGuide(orientation, event)}
      title={horizontal ? 'Arrastra hacia el lienzo para crear una guía horizontal' : 'Arrastra hacia el lienzo para crear una guía vertical'}
      aria-label={horizontal ? 'Regla superior: arrastra para crear una guía horizontal' : 'Regla izquierda: arrastra para crear una guía vertical'}>
      <svg width="100%" height="100%" aria-hidden="true">
        {marcas.map(({ valor, posicion, principal }) => horizontal ? (
          <g key={valor}><line x1={posicion} y1={principal ? 15 : 20} x2={posicion} y2="25" /><text x={posicion + 4} y="11">{principal ? valor : ''}</text></g>
        ) : (
          <g key={valor}><line x1={principal ? 15 : 20} y1={posicion} x2="25" y2={posicion} />{principal && <text transform={`translate(11 ${posicion - 4}) rotate(-90)`}>{valor}</text>}</g>
        ))}
      </svg>
    </div>
  );
}

export function ManualGuides({ canvas, zoom, draftGuide }) {
  const guides = useTemplateStore((state) => state.guides);
  const updateGuide = useTemplateStore((state) => state.updateGuide);
  const removeGuide = useTemplateStore((state) => state.removeGuide);

  function guideLine(guide, draft = false) {
    const vertical = guide.orientation === 'vertical';
    const posicion = guide.position;
    return <Line key={guide.id || 'draft'}
      x={vertical ? posicion : 0} y={vertical ? 0 : posicion}
      points={vertical ? [0, 0, 0, canvas.height] : [0, 0, canvas.width, 0]}
      stroke="#4e9eb2" strokeWidth={1 / zoom} dash={[5 / zoom, 4 / zoom]}
      hitStrokeWidth={12 / zoom} listening={!draft} draggable={!draft}
      onMouseDown={(event) => { event.cancelBubble = true; }}
      onMouseEnter={(event) => { event.target.getStage().container().style.cursor = vertical ? 'col-resize' : 'row-resize'; }}
      onMouseLeave={(event) => { event.target.getStage().container().style.cursor = ''; }}
      onDragMove={(event) => { if (vertical) event.target.y(0); else event.target.x(0); }}
      onDragEnd={(event) => {
        const posicionNueva = vertical ? event.target.x() : event.target.y();
        const limite = vertical ? canvas.width : canvas.height;
        if (posicionNueva < 0 || posicionNueva > limite) removeGuide(guide.id);
        else updateGuide(guide.id, posicionNueva);
      }} />;
  }

  return <>
    {guides.map((guide) => guideLine(guide))}
    {draftGuide && guideLine({ ...draftGuide, id: 'draft' }, true)}
  </>;
}

export function SmartGuides({ canvas, zoom, smartGuides }) {
  return <>
    {smartGuides.map((guide) => <Line key={`smart-${guide.orientation}`}
      points={guide.orientation === 'vertical' ? [guide.position, 0, guide.position, canvas.height] : [0, guide.position, canvas.width, guide.position]}
      stroke="#e971ad" strokeWidth={1.25 / zoom} dash={[5 / zoom, 4 / zoom]} listening={false} />)}
  </>;
}
