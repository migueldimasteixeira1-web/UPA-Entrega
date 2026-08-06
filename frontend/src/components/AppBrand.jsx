import { Truck } from 'lucide-react';

const LOGOS = {
  caboFrio: '/logos/cabo-frio-logo.png',
};

/**
 * Marca do SEDOM — badge com ícone, sem depender de arquivo de imagem.
 * Reaproveita o mesmo padrão de "ícone em badge colorido" já usado em
 * Medications.jsx/DeliveryRoutes.jsx etc. Fácil de trocar por um logo de
 * verdade depois — é um único componente pequeno.
 */
export function SedomMark({ className = 'h-10 w-10', iconClassName = 'w-[55%] h-[55%]' }) {
  return (
    <div
      role="img"
      aria-label="SEDOM"
      className={`inline-flex items-center justify-center rounded-xl bg-upa-800 text-white shrink-0 ${className}`}
    >
      <Truck className={iconClassName} />
    </div>
  );
}

/**
 * Logo Prefeitura de Cabo Frio — uso secundário (institucional).
 * A arte já inclui fundo escuro; exibir sobre fundos claros, sem container extra.
 */
export function CaboFrioLogo({ className = 'h-8 w-auto', alt = 'Prefeitura de Cabo Frio' }) {
  return (
    <img
      src={LOGOS.caboFrio}
      alt={alt}
      className={`object-contain rounded-md ${className}`}
      decoding="async"
    />
  );
}

export function MunicipalityBrand({ className = '', logoClassName = 'h-8 w-auto max-w-[160px]' }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
        Município de Cabo Frio
      </p>
      <CaboFrioLogo className={logoClassName} />
    </div>
  );
}

/**
 * Cabeçalho de marca reutilizável.
 * variant: header | login | public
 */
export default function AppBrand({ variant = 'header', showMunicipality = false, subtitle }) {
  if (variant === 'login') {
    return (
      <div className="text-center space-y-4">
        <SedomMark className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-upa-900">SEDOM</h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
            {subtitle || 'Sistema interno de entregas de medicamentos a domicílio'}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'public') {
    return (
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
        <div className="bg-white rounded-xl p-2 shrink-0 shadow-sm">
          <SedomMark className="h-9 w-9 sm:h-10 sm:w-10" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-base sm:text-lg text-white">SEDOM</h1>
          <p className="text-blue-100 text-xs sm:text-sm">{subtitle || 'Acompanhamento informativo'}</p>
        </div>
      </div>
    );
  }

  // header (painel interno)
  return (
    <div className="flex items-center gap-3 min-w-0">
      <SedomMark className="h-9 w-9 shrink-0" />
      <div className="min-w-0 hidden min-[400px]:block">
        <h1 className="font-bold text-upa-900 text-base sm:text-lg leading-tight truncate">SEDOM</h1>
        <p className="text-xs text-slate-500 hidden sm:block truncate">
          {subtitle || 'Gestão de entregas de medicamentos'}
        </p>
      </div>
      {showMunicipality && (
        <div className="hidden xl:flex items-center ml-1 pl-3 border-l border-slate-200 shrink-0">
          <CaboFrioLogo className="h-8 w-auto max-w-[110px]" />
        </div>
      )}
    </div>
  );
}

export { LOGOS };
