import { ChevronDown } from 'lucide-react';

export default function AuthSpecSection({
  id,
  title,
  eyebrow,
  icon: Icon,
  badges = [],
  summary,
  expanded,
  onToggle,
  children,
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/78 dark:shadow-[0_28px_90px_rgba(2,6,23,0.45)]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-6 p-6 text-left sm:p-8"
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
      >
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
              <Icon size={20} />
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h2>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {summary}
          </p>

          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges}
            </div>
          ) : null}
        </div>

        <span className="mt-1 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-transform dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          <ChevronDown className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} size={20} />
        </span>
      </button>

      {expanded ? (
        <div id={`${id}-content`} className="border-t border-slate-200/80 px-6 pb-6 pt-6 sm:px-8 sm:pb-8 dark:border-slate-800">
          {children}
        </div>
      ) : null}
    </section>
  );
}
