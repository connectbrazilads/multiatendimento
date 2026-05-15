import React from 'react';

export default function PageHeader({ kicker, title, subtitle, actions, compact = false }) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: compact ? 'center' : 'flex-start',
        gap: '1.5rem',
        marginBottom: compact ? '2rem' : '2.5rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 24rem' }}>
        {kicker ? <p style={s.kicker}>{kicker}</p> : null}
        <h1 style={s.title}>{title}</h1>
        {subtitle ? <p style={s.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={s.actions}>{actions}</div> : null}
    </header>
  );
}

const s = {
  kicker: {
    margin: '0 0 0.4rem',
    color: 'var(--accent)',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    color: 'var(--text-main)',
    fontSize: '1.85rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    margin: '0.5rem 0 0',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: '44rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
};
