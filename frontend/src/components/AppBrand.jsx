const LOGOS = {
  upa: '/logos/upa-logo.png',
  caboFrio: '/logos/cabo-frio-logo.png',
};

/**
 * Logo oficial UPA 24h — uso principal em todo o sistema.
 */
export function UpaLogo({ className = 'h-10 w-auto', alt = 'UPA 24h — Unidade de Pronto Atendimento' }) {
  return (
    <img
      src={LOGOS.upa}
      alt={alt}
      className={`object-contain ${className}`}
      decoding="async"
    />
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
        <UpaLogo className="h-14 sm:h-16 w-auto max-w-[260px] mx-auto" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-upa-900">UPA Entrega</h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
            {subtitle || 'Sistema interno de entregas de medicamentos a domicílio'}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'public') {
    return (
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-xl px-3 py-2 shrink-0 shadow-sm">
          <UpaLogo className="h-10 w-auto max-w-[140px]" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">UPA Entrega</h1>
          <p className="text-blue-100 text-sm">{subtitle || 'Acompanhamento informativo'}</p>
        </div>
      </div>
    );
  }

  // header (painel interno)
  return (
    <div className="flex items-center gap-3 min-w-0">
      <UpaLogo className="h-9 w-auto max-w-[130px] sm:max-w-[150px] shrink-0 object-left" />
      <div className="min-w-0 hidden sm:block">
        <h1 className="font-bold text-upa-900 text-base sm:text-lg leading-tight truncate">UPA Entrega</h1>
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
