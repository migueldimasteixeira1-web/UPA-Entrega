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
      className={`object-contain object-left ${className}`}
      decoding="async"
    />
  );
}

/**
 * Logo Prefeitura de Cabo Frio — uso secundário (institucional).
 * Fundo escuro na arte; usar sobre fundo escuro ou container escuro.
 */
export function CaboFrioLogo({ className = 'h-8 w-auto', alt = 'Prefeitura de Cabo Frio' }) {
  return (
    <img
      src={LOGOS.caboFrio}
      alt={alt}
      className={`object-contain ${className}`}
      decoding="async"
    />
  );
}

/**
 * Cabeçalho de marca reutilizável.
 * variant: header | login-hero | login-compact | public
 */
export default function AppBrand({ variant = 'header', showMunicipality = false, subtitle }) {
  if (variant === 'login-hero') {
    return (
      <div className="space-y-8">
        <UpaLogo className="h-16 sm:h-20 w-auto max-w-[280px]" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">UPA Entrega</h1>
          <p className="text-lg text-blue-100 leading-relaxed max-w-md">
            Sistema interno para organização, registro e controle de entregas de medicamentos a domicílio.
          </p>
        </div>
        {showMunicipality && (
          <div className="pt-6 border-t border-white/20">
            <p className="text-xs text-blue-200/80 mb-3 uppercase tracking-wide">Município de Cabo Frio</p>
            <div className="inline-block rounded-xl bg-black/40 p-3">
              <CaboFrioLogo className="h-10 w-auto max-w-[200px]" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'login-compact') {
    return (
      <div className="flex items-center gap-3">
        <UpaLogo className="h-11 w-auto max-w-[140px]" />
        <div>
          <h1 className="text-xl font-bold text-upa-900">UPA Entrega</h1>
          <p className="text-sm text-slate-500">{subtitle || 'Acesso restrito à equipe'}</p>
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
      <UpaLogo className="h-9 w-auto max-w-[130px] sm:max-w-[150px] shrink-0" />
      <div className="min-w-0 hidden sm:block">
        <h1 className="font-bold text-upa-900 text-base sm:text-lg leading-tight truncate">UPA Entrega</h1>
        <p className="text-xs text-slate-500 hidden sm:block truncate">
          {subtitle || 'Gestão de entregas de medicamentos'}
        </p>
      </div>
      {showMunicipality && (
        <div className="hidden xl:flex items-center ml-2 pl-3 border-l border-slate-200">
          <div className="rounded-lg bg-slate-900 px-2 py-1">
            <CaboFrioLogo className="h-7 w-auto max-w-[120px]" />
          </div>
        </div>
      )}
    </div>
  );
}

export { LOGOS };
