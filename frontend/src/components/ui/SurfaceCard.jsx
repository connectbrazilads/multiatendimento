import React from 'react';

export default function SurfaceCard({ children, style }) {
  return <section style={{ ...s.card, ...style }}>{children}</section>;
}

const s = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '1.5rem',
  },
};
