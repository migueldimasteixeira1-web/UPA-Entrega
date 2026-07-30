import { useRef } from 'react';

const EMPTY = ' ';

// `value` é sempre uma string de tamanho fixo (`length`), preenchida com
// EMPTY nas posições vazias — nunca encurtada. Um array normal + join('')
// perderia a posição de uma caixa limpa no meio (join descarta strings
// vazias, deslocando os dígitos seguintes); o placeholder de espaço evita
// isso e mantém cada dígito na sua posição real.
export default function PinInput({ length = 6, value, onChange, autoFocus }) {
  const inputsRef = useRef([]);
  const digits = value.padEnd(length, EMPTY).slice(0, length).split('');

  const focusInput = (index) => {
    inputsRef.current[index]?.focus();
  };

  const mergeFrom = (index, chars) => {
    const next = digits.slice();
    let cursor = index;
    for (const char of chars) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }
    onChange(next.join(''));
    return cursor;
  };

  const handleChange = (index, e) => {
    const chars = e.target.value.replace(/\D/g, '').split('');
    if (chars.length === 0) {
      const next = digits.slice();
      next[index] = EMPTY;
      onChange(next.join(''));
      return;
    }

    const cursor = mergeFrom(index, chars);
    focusInput(Math.min(cursor, length - 1));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.slice();
      if (next[index] !== EMPTY) {
        next[index] = EMPTY;
        onChange(next.join(''));
      } else if (index > 0) {
        next[index - 1] = EMPTY;
        onChange(next.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (index, e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    const cursor = mergeFrom(index, pasted.split(''));
    focusInput(Math.min(cursor, length - 1));
  };

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          value={digit === EMPTY ? '' : digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          data-autofocus={autoFocus && index === 0 ? '' : undefined}
          aria-label={`Dígito ${index + 1} do PIN`}
          className="w-11 h-12 rounded-xl border border-slate-200 outline-none focus:border-upa-500 focus:ring-2 focus:ring-upa-100 font-mono text-xl text-center"
        />
      ))}
    </div>
  );
}
