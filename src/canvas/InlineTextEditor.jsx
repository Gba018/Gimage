import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { colorSolidoDeFill, medirTextoEnCaja } from '../template/schema.js';

export default function InlineTextEditor({
  layer,
  box,
  view,
  onCommit,
  onCancel,
}) {
  const textareaRef = useRef(null);
  const settledRef = useRef(false);
  const initialTextRef = useRef(layer.texto.texto);
  const [draft, setDraft] = useState(layer.texto.texto);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  useEffect(() => {
    initialTextRef.current = layer.texto.texto;
  }, [layer.id]);

  const medidaDraft = useMemo(
    () => medirTextoEnCaja({ ...layer.texto, texto: draft || ' ' }, box.width),
    [box.width, draft, layer.texto],
  );

  const scale = view.scale || 1;
  const left = view.x + layer.x * scale;
  const top = view.y + layer.y * scale;
  const widthPx = Math.max(24, box.width * scale);
  const rawHeight = box.overflow === 'recortar'
    ? box.height
    : Math.max(box.height, medidaDraft.height + 4);
  const heightPx = Math.max(24, rawHeight * scale);
  const textColor = colorSolidoDeFill(layer.texto.fill, '#111111');

  function confirmar(valor) {
    if (settledRef.current) return;
    settledRef.current = true;
    onCommit(valor);
  }

  function cancelar() {
    if (settledRef.current) return;
    settledRef.current = true;
    setDraft(initialTextRef.current);
    onCancel();
  }

  function onKeyDown(event) {
    // Evitar que atajos globales del lienzo intercepten la escritura inline
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelar();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      confirmar(draft);
    }
  }

  // DECISION: rotar el textarea inline con transformOrigin "0 0" y rotate(deg) para coincidir exactamente con el pivote del nodo Konva sin requerir modal.
  const style = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transformOrigin: '0 0',
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : 'none',
    fontFamily: `"${layer.texto.fontFamily}", system-ui, sans-serif`,
    fontSize: `${layer.texto.fontSize * scale}px`,
    fontWeight: layer.texto.fontStyle === 'bold' ? 700 : 400,
    fontStyle: 'normal',
    lineHeight: String(layer.texto.lineHeight),
    letterSpacing: `${(layer.texto.letterSpacing || 0) * scale}px`,
    textAlign: layer.texto.align || 'left',
    color: textColor,
  };

  return (
    <textarea
      ref={textareaRef}
      className="inline-canvas-textarea"
      data-testid="inline-text-editor"
      aria-label="Editor de texto en lienzo"
      value={draft}
      style={style}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => confirmar(draft)}
      onMouseDown={(event) => {
        // Permitir paneo con botón central sin cerrar ni bloquear el textarea
        if (event.button === 0) event.stopPropagation();
      }}
    />
  );
}
