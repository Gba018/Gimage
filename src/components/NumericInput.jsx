import React, { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import { clamp, redondear } from '../template/schema.js';

function normalizarNumero(valor, { min = -Infinity, max = Infinity, decimals = 0 }) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return null;
  const redondeado = decimals === 0 ? Math.round(num) : redondear(num, decimals);
  return clamp(redondeado, min, max);
}

function formatearNumero(valor, decimals = 0) {
  if (!Number.isFinite(Number(valor))) return '0';
  return String(decimals === 0 ? Math.round(Number(valor)) : redondear(Number(valor), decimals));
}

export default function NumericInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 0,
  suffix = '',
  ariaLabel,
  disabled = false,
  className = '',
}) {
  const [draft, setDraft] = useState(() => formatearNumero(value, decimals));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatearNumero(value, decimals));
    }
  }, [value, decimals, focused]);

  function aplicarPaso(direccion, conShift = false) {
    if (disabled) return;
    const base = Number.isFinite(Number(value)) ? Number(value) : 0;
    const factorShift = conShift && decimals === 0 ? 10 : 1;
    const siguiente = normalizarNumero(base + direccion * step * factorShift, { min, max, decimals });
    if (siguiente === null) return;
    setDraft(formatearNumero(siguiente, decimals));
    if (siguiente !== value) onChange(siguiente);
  }

  function handleChange(event) {
    const raw = event.target.value.replace(',', '.');
    setDraft(event.target.value);
    const limpio = raw.trim();
    if (!limpio || limpio === '-' || limpio === '.' || limpio === '-.' || limpio.endsWith('.')) {
      return;
    }
    const validado = normalizarNumero(limpio, { min, max, decimals });
    if (validado !== null && validado !== value) {
      onChange(validado);
    }
  }

  function confirmar() {
    const raw = String(draft).replace(',', '.').trim();
    const validado = normalizarNumero(raw, { min, max, decimals });
    if (validado === null) {
      setDraft(formatearNumero(value, decimals));
      return;
    }
    setDraft(formatearNumero(validado, decimals));
    if (validado !== value) onChange(validado);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      aplicarPaso(1, event.shiftKey);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      aplicarPaso(-1, event.shiftKey);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      confirmar();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(formatearNumero(value, decimals));
      event.currentTarget.blur();
    }
  }

  return (
    <div className={`num-field ${disabled ? 'is-disabled' : ''} ${className}`}>
      <input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        aria-label={ariaLabel}
        value={draft}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          confirmar();
        }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {suffix && <span className="num-suffix" aria-hidden="true">{suffix}</span>}
      <div className="num-stepper" aria-hidden={disabled}>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || Number(value) >= max}
          aria-label="Subir valor"
          title={ariaLabel ? `Incrementar ${ariaLabel}` : 'Incrementar valor'}
          onClick={() => aplicarPaso(1)}
        >
          <Icon name="chevronUp" size={11} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || Number(value) <= min}
          aria-label="Bajar valor"
          title={ariaLabel ? `Decrementar ${ariaLabel}` : 'Decrementar valor'}
          onClick={() => aplicarPaso(-1)}
        >
          <Icon name="chevronDown" size={11} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
