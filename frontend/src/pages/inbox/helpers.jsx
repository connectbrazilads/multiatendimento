import React from 'react';

export function Empty({ children }) {
  return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>{children}</div>;
}

export function fmt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
}

export function mergeMessagePages(current, incoming, prepend = false) {
  const items = prepend ? [...incoming, ...current] : [...current, ...incoming];
  const seen = new Set();
  const merged = [];

  for (const item of items) {
    const key = item._separator
      ? `sep:${item.ticketId}:${new Date(item.date).toISOString()}`
      : `${item._type || 'message'}:${item.id}`;

    if (seen.has(key)) continue;

    const previous = merged[merged.length - 1];
    if (item._separator && previous?._separator && previous.ticketId === item.ticketId) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export function statusLabel(status) {
  return { pending: 'Aguardando', open: 'Atendimento', resolved: 'Resolvido' }[status] || status;
}

export function statusColor(status) {
  return { pending: 'var(--warning)', open: 'var(--success)', resolved: 'var(--text-dim)' }[status] || 'var(--text-dim)';
}
