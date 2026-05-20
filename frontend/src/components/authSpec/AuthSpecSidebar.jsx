import AuthSpecBadge from './AuthSpecBadge';

export default function AuthSpecSidebar({ sections, activeSection, theme, onThemeToggle }) {
  return (
    <aside className="hidden w-[290px] shrink-0 lg:block">
      <div className="sticky top-6 space-y-6 rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/78 dark:shadow-[0_28px_80px_rgba(2,6,23,0.5)]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Discovery Artifact
          </div>

          <div className="space-y-3">
            <h1 className="font-[var(--font-display)] text-3xl tracking-tight text-slate-950 dark:text-white">
              Auth Experience Spec
            </h1>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              Documento funcional para autenticação da plataforma de compras online, com foco em clientes e fornecedores.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AuthSpecBadge variant="success">Em revisão</AuthSpecBadge>
            <AuthSpecBadge variant="danger">Alta criticidade</AuthSpecBadge>
          </div>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={[
                  'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all',
                  isActive
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
                    : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-white',
                ].join(' ')}
              >
                <span>{section.label}</span>
                <span className="text-xs uppercase tracking-[0.18em]">
                  {section.code}
                </span>
              </a>
            );
          })}
        </nav>

        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Exibição
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                Tema adaptável para apresentação ao cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={onThemeToggle}
              className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
