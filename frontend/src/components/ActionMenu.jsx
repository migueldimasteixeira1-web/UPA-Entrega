import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { buttonClassName } from './Button';

const itemClassName =
  'w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';

// Dropdown de ações secundárias — mesmo mecanismo de fechar ao clicar fora
// usado no MedicationCombobox (issue #55), reaplicado aqui pra agrupar ações
// de baixa frequência (ex.: baixar comprovante, imprimir etiqueta) fora da
// linha de ação primária (issue #66).
export default function ActionMenu({ label = 'Mais ações', items }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName('secondary', 'md', 'flex-1 sm:flex-none')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
        {label}
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-10 mt-1 w-60 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                {item.label}
              </>
            );
            return (
              <li key={item.key} role="none">
                {item.to ? (
                  <Link
                    role="menuitem"
                    to={item.to}
                    target={item.target}
                    onClick={() => setOpen(false)}
                    className={itemClassName}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={itemClassName}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
