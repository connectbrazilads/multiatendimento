import React, { useEffect, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { toast } from '../utils/toast';
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';
import SurfaceCard from '../components/ui/SurfaceCard';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';

export default function KnowledgeBase() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getKnowledge();
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar a base de conhecimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateKnowledge(editing.id, form);
      } else {
        await createKnowledge(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ question: '', answer: '', tags: '' });
      load();
    } catch (e) {
      toast.error(editing ? 'Erro ao atualizar o conhecimento. Tente novamente.' : 'Erro ao cadastrar o conhecimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const label = item.question && item.question.length > 80 ? `${item.question.slice(0, 80)}...` : item.question;
    toast.confirm(`Excluir "${label}"? Essa acao nao pode ser desfeita.`, async () => {
      setDeletingId(item.id);
      try {
        await deleteKnowledge(item.id);
        load();
        toast.success('Conhecimento excluido');
      } catch (e) {
        toast.error('Erro ao excluir o conhecimento. Tente novamente.');
      } finally {
        setDeletingId(null);
      }
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ question: '', answer: '', tags: '' });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, tags: item.tags || '' });
    setShowModal(true);
  }

  return (
    <div style={s.page}>
      <PageHeader
        kicker="Treinamento da IA"
        title="Base de conhecimento"
        subtitle="Centralize perguntas, respostas e regras que ajudam a IA a responder com mais precisao."
        actions={
          <ActionButton onClick={openCreate}>
            <Plus size={18} />
            Novo conhecimento
          </ActionButton>
        }
      />

      {loading ? (
        <div style={s.loading}>Carregando...</div>
      ) : (
        <div style={s.grid}>
          {data.map((item) => (
            <SurfaceCard key={item.id} style={s.card}>
              <div style={s.cardStatus}>
                <span style={{ ...s.statusDot, background: item.active ? 'var(--success)' : 'var(--text-dim)' }} />
                {item.active ? 'Ativo' : 'Inativo'}
              </div>
              <h3 style={s.cardTitle} title={item.question}>{item.question}</h3>
              <p style={s.cardAnswer} title={item.answer}>{item.answer}</p>
              {item.tags ? (
                <div style={s.tags}>
                  {item.tags.split(',').map((tag) => (
                    <span key={tag} style={s.tag} title={tag.trim()}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              ) : null}
              <div style={s.cardActions}>
                <ActionButton
                  variant="secondary"
                  style={s.actionBtn}
                  disabled={deletingId === item.id}
                  onClick={() => openEdit(item)}
                >
                  Editar
                </ActionButton>
                <ActionButton
                  variant="danger"
                  style={s.actionBtn}
                  loading={deletingId === item.id}
                  onClick={() => handleDelete(item)}
                >
                  Excluir
                </ActionButton>
              </div>
            </SurfaceCard>
          ))}

          {data.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={22} />}
              title="Nenhum conhecimento cadastrado"
              description="Cadastre perguntas frequentes, processos e respostas padrao para orientar a IA."
              action={
                <ActionButton onClick={openCreate}>
                  <Plus size={18} />
                  Novo conhecimento
                </ActionButton>
              }
              style={{ gridColumn: '1 / -1' }}
            />
          ) : null}
        </div>
      )}

      {showModal ? (
        <ModalShell
          kicker={editing ? 'Editar conhecimento' : 'Novo conhecimento'}
          title={editing ? 'Atualizar base da IA' : 'Cadastrar base da IA'}
          onClose={() => setShowModal(false)}
          maxWidth="32rem"
        >
          <form onSubmit={handleSave} style={s.modalBody}>
            <label style={s.label}>Pergunta / topico</label>
            <input
              style={s.input}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Ex: Como funciona a politica de reembolso?"
              required
            />

            <label style={s.label}>Resposta detalhada</label>
            <textarea
              style={{ ...s.input, minHeight: 150, resize: 'vertical' }}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Escreva a resposta que a IA deve fornecer..."
              required
            />

            <label style={s.label}>Tags (opcional)</label>
            <input
              style={s.input}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="reembolso, regras, financeiro"
            />

            <div style={s.modalFooter}>
              <ActionButton variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" loading={saving}>Salvar conhecimento</ActionButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

const s = {
  page: {
    padding: 'var(--space-10)',
    background: 'var(--bg-base)',
    flex: 1,
    overflowY: 'auto',
    color: 'var(--text-main)',
    minHeight: '100%',
  },
  loading: { textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-6)' },
  card: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: '100%', minWidth: 0 },
  cardStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  cardTitle: {
    margin: 0,
    fontSize: 'var(--text-lg)',
    fontWeight: 800,
    color: 'var(--text-main)',
    overflowWrap: 'break-word',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardAnswer: {
    color: 'var(--text-muted)',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-relaxed)',
    flex: 1,
    margin: 0,
    overflowWrap: 'break-word',
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' },
  tag: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '2px var(--space-2)',
    borderRadius: '999px',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    border: '1px solid var(--accent-border)',
    maxWidth: '12rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardActions: {
    display: 'flex',
    gap: 'var(--space-3)',
    borderTop: '1px solid var(--border-color)',
    paddingTop: 'var(--space-4)',
  },
  actionBtn: { minWidth: '6rem' },
  modalBody: { padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  label: {
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: 'var(--text-md)',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 'var(--leading-relaxed)',
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: 'var(--space-2)' },
};
