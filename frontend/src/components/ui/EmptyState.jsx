import React from 'react';

export default function EmptyState({ icon, title, description, style }) {
  return (
    <div style={{ ...s.wrap, ...style }}>
      {icon ? <div style={s.icon}>{icon}</div> : null}
      {title ? <div style={s.title}>{title}</div> : null}
      {description ? <div style={s.description}>{description}</div> : null}
    </div>
  );
}

const s = {
  wrap: {
    background: 'var(--bg-panel)',
    border: '1px dashed var(--border-color)',
    borderRadius: '22px',
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
  },
  title: {
    marginTop: '0.9rem',
    marginBottom: '0.45rem',
    color: 'var(--text-main)',
    fontWeight: 800,
    fontSize: '1.05rem',
  },
  description: {
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
};
