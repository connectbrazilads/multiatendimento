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

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getKnowledge();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
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
      toast.info('Erro ao salvar');
    }
  }

  async function handleDelete(id) {
    toast.confirm('Excluir este conhecimento?', async () => {
      try {
        await deleteKnowledge(id);
        load();
        toast.success('Conhecimento excluido');
      } catch (e) {
        toast.error('Erro ao excluir');
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
                <span style={{ ...s.statusDot, background: item.active ? '#48bb78' : 'var(--text-dim)' }} />
                {item.active ? 'Ativo' : 'Inativo'}
              </div>
              <h3 style={s.cardTitle}>{item.question}</h3>
              <p style={s.cardAnswer}>{item.answer}</p>
              {item.tags ? (
                <div style={s.tags}>
                  {item.tags.split(',').map((tag) => (
                    <span key={tag} style={s.tag}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              ) : null}
              <div style={s.cardActions}>
                <ActionButton variant="secondary" style={s.actionBtn} onClick={() => openEdit(item)}>
                  Editar
                </ActionButton>
                <ActionButton variant="danger" style={s.actionBtn} onClick={() => handleDelete(item.id)}>
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
              <ActionButton variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit">Salvar conhecimento</ActionButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

const s = {
  page: {
    padding: '2.5rem',
    background: 'var(--bg-base)',
    flex: 1,
    overflowY: 'auto',
    color: 'var(--text-main)',
    minHeight: '100%',
  },
  loading: { textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
  card: { display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '100%' },
  cardStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.72rem',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  cardTitle: { margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)' },
  cardAnswer: {
    color: 'var(--text-muted)',
    fontSize: '0.92rem',
    lineHeight: '1.65',
    flex: 1,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tag: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '0.68rem',
    fontWeight: 700,
    border: '1px solid var(--accent-border)',
  },
  cardActions: { display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' },
  actionBtn: { minWidth: '6rem' },
  modalBody: { padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: {
    fontSize: '0.78rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.5rem' },
};
