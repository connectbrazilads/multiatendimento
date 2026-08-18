import React, { useEffect, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { getQuickResponses, createQuickResponse, deleteQuickResponse } from '../services/api';
import { MessageSquare, Plus, Trash2, Search, Zap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';

export default function QuickResponses() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ shortcut: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getQuickResponses();
      setResponses(data);
    } catch (e) {
      console.error('Erro ao carregar modelos de mensagem:', e);
      toast.error(e.response?.data?.error || 'Nao foi possivel carregar os modelos de mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createQuickResponse(form);
      setForm({ shortcut: '', message: '' });
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Nao foi possivel salvar o modelo. Verifique os campos e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id, shortcut) {
    if (deletingId) return;
    toast.confirm(`Excluir o modelo "/${shortcut}"? Essa acao nao pode ser desfeita.`, async () => {
      setDeletingId(id);
      try {
        await deleteQuickResponse(id);
        load();
      } catch (e) {
        toast.error(e.response?.data?.error || 'Nao foi possivel excluir o modelo. Tente novamente.');
      } finally {
        setDeletingId(null);
      }
    });
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return responses;
    return responses.filter(
      (item) =>
        item.shortcut.toLowerCase().includes(term) ||
        item.message.toLowerCase().includes(term)
    );
  }, [responses, search]);

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Agilidade operacional"
        title="Modelos de mensagem"
        subtitle="Crie atalhos para responder clientes com consistência e velocidade."
        actions={<ActionButton onClick={() => setModal(true)}><Plus size={18} /> Novo modelo</ActionButton>}
        compact
      />

      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <Search size={18} style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Buscar modelo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={s.grid}>
        {loading ? (
          <div style={s.empty}>Carregando modelos...</div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyCard}>
            <Zap size={20} />
            <div style={s.emptyTitle}>Nenhum modelo encontrado</div>
            <div style={s.emptyText}>Crie um novo atalho ou ajuste a busca para encontrar um modelo existente.</div>
          </div>
        ) : (
          filtered.map((item) => (
            <article key={item.id} style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.shortcut} title={`/${item.shortcut}`}>/{item.shortcut}</div>
                <button
                  style={{ ...s.delBtn, opacity: deletingId === item.id ? 0.5 : 1, cursor: deletingId === item.id ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleDelete(item.id, item.shortcut)}
                  disabled={deletingId === item.id}
                  title="Excluir modelo"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={s.cardBody}>{item.message}</div>

              <div style={s.cardFooter}>
                <span style={s.metaBadge}>
                  <MessageSquare size={14} />
                  Atalho rapido
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <p style={s.modalKicker}>Novo modelo</p>
                <h3 style={s.modalTitle}>Cadastrar modelo de mensagem</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(false)}>
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Atalho</label>
                <div style={s.inputWrapper}>
                  <span style={s.prefix}>/</span>
                  <input
                    style={s.inputWithPrefix}
                    value={form.shortcut}
                    onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/\s/g, '') })}
                    required
                    placeholder="faturas"
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Mensagem completa</label>
                <textarea
                  style={s.textarea}
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Escreva o modelo completo aqui..."
                />
                <p style={s.hint}>No chat, digite "/" para listar os modelos disponiveis.</p>
              </div>

              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: 'var(--space-10)', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2.5rem',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: '0 0 0.4rem',
    color: 'var(--accent)',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 800,
    margin: 0,
    color: 'var(--text-main)',
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-display)',
  },
  subtitle: { fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 },
  addBtn: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
    padding: '0.85rem 1.2rem',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchRow: { marginBottom: 'var(--space-8)' },
  searchBox: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '0 var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid var(--border-color)',
    maxWidth: '420px',
  },
  searchIcon: { color: 'var(--text-dim)' },
  searchInput: {
    background: 'none',
    border: 'none',
    padding: '0.9rem 0',
    color: 'var(--text-main)',
    outline: 'none',
    flex: 1,
    fontSize: 'var(--text-sm)',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    minWidth: 0,
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', minWidth: 0 },
  shortcut: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    border: '1px solid var(--accent-border)',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  delBtn: {
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    borderRadius: '12px',
    flexShrink: 0,
  },
  cardBody: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-main)',
    lineHeight: 'var(--leading-relaxed)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    flex: 1,
  },
  cardFooter: { borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem' },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  empty: { padding: '5rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' },
  emptyCard: {
    gridColumn: '1 / -1',
    background: 'var(--bg-panel)',
    border: '1px dashed var(--border-color)',
    borderRadius: '22px',
    padding: 'var(--space-12)',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyTitle: { marginTop: '0.9rem', marginBottom: '0.45rem', color: 'var(--text-main)', fontWeight: 800, fontSize: 'var(--text-lg)' },
  emptyText: { fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
    padding: '1.5rem',
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: '34rem',
    border: '1px solid var(--border-color)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
  },
  modalHeader: {
    padding: 'var(--space-6) var(--space-8)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  modalKicker: {
    margin: '0 0 0.35rem',
    color: 'var(--accent)',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  modalTitle: { margin: 0, fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)' },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  form: { padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: '1.4rem' },
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: {
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: 'var(--space-4)', color: 'var(--accent)', fontWeight: 800 },
  inputWithPrefix: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '0.9rem 1rem 0.9rem 2rem',
    color: 'var(--text-main)',
    outline: 'none',
    width: '100%',
    fontSize: 'var(--text-sm)',
  },
  textarea: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    color: 'var(--text-main)',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-relaxed)',
  },
  hint: { fontSize: 'var(--text-xs)', color: 'var(--text-dim)', margin: 0, lineHeight: 'var(--leading-normal)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: 'var(--space-2)' },
  cancelBtn: {
    padding: '0.85rem 1.2rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveBtn: {
    padding: '0.85rem 1.2rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    cursor: 'pointer',
    fontWeight: 800,
  },
};
