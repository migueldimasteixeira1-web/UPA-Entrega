import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 999 }) {
  const numericValue = Number(value) || min;

  const decrement = () => onChange(Math.max(min, numericValue - 1));
  const increment = () => onChange(Math.min(max, numericValue + 1));

  return (
    <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={decrement}
        disabled={numericValue <= min}
        className="inline-flex items-center justify-center min-h-11 min-w-11 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Diminuir quantidade"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={numericValue}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        className="w-12 text-center border-x border-slate-200 py-3 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={increment}
        disabled={numericValue >= max}
        className="inline-flex items-center justify-center min-h-11 min-w-11 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Aumentar quantidade"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
