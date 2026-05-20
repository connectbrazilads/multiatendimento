const badgeVariants = {
  neutral: 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300',
};

export default function AuthSpecBadge({ children, variant = 'neutral' }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
        badgeVariants[variant] || badgeVariants.neutral,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
