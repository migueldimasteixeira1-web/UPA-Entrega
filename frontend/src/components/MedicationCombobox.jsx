import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { inputClassName } from './FormField';

function labelFor(medication) {
  return `${medication.name} (${medication.unit})`;
}

export default function MedicationCombobox({ medications, value, onChange, placeholder = 'Buscar medicamento...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);

  const selected = medications.find((m) => m.id === value) || null;

  // Mantém o texto exibido em sincronia com a seleção real sempre que o
  // dropdown está fechado — cobre tanto a escolha via clique/teclado quanto
  // um `value` vindo de fora (ex.: reset do formulário).
  useEffect(() => {
    if (!open) {
      setQuery(selected ? labelFor(selected) : '');
    }
  }, [selected, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const isEditingQuery = !selected || query !== labelFor(selected);
  const filtered =
    isEditingQuery && query.trim()
      ? medications.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()))
      : medications;

  function selectMedication(med) {
    onChange(med.id);
    setQuery(labelFor(med));
    setOpen(false);
  }

  function handleChange(e) {
    setQuery(e.target.value);
    setOpen(true);
    if (value) onChange('');
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const med = filtered[highlightedIndex];
      if (med) selectMedication(med);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName(false, 'pl-10')}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-400">Nenhum medicamento encontrado</li>
          ) : (
            filtered.map((med, index) => (
              <li key={med.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectMedication(med)}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    index === highlightedIndex ? 'bg-upa-50 text-upa-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {med.name} <span className="text-slate-400">({med.unit})</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
