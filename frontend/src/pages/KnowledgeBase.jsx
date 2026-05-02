import React, { useEffect, useState } from 'react';
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge } from '../services/api';

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    } catch (e) { alert('Erro ao salvar'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este conhecimento?')) return;
    try {
      await deleteKnowledge(id);
      load();
    } catch (e) { alert('Erro ao excluir'); }
  }

  const openEdit = (item) => {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, tags: item.tags || '' });
    setShowModal(true);
  };

  return (
    <div style={s.page}>
      <header style={{ ...s.header, gap: '2rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={s.title}>Base de Conhecimento IA</h1>
          <p style={s.subtitle}>Ensine sua IA a responder com precisão sobre seu negócio</p>
        </div>
        <button 
          style={{ ...s.addBtn, flexShrink: 0 }} 
          onClick={() => { setEditing(null); setForm({ question: '', answer: '', tags: '' }); setShowModal(true); }}
        >
          + Novo Conhecimento
        </button>
      </header>

      {loading ? (
        <div style={s.loading}>Carregando...</div>
      ) : (
        <div style={s.grid}>
          {data.map(item => (
            <div key={item.id} style={s.card}>
              <div style={s.cardStatus}>
                <span style={{ ...s.statusDot, background: item.active ? '#48bb78' : '#717171' }} />
                {item.active ? 'Ativo' : 'Inativo'}
              </div>
              <h3 style={s.cardTitle}>{item.question}</h3>
              <p style={s.cardAnswer}>{item.answer}</p>
              {item.tags && <div style={s.tags}>{item.tags.split(',').map(t => <span key={t} style={s.tag}>{t.trim()}</span>)}</div>}
              <div style={s.cardActions}>
                <button style={s.editBtn} onClick={() => openEdit(item)}>Editar</button>
                <button style={s.delBtn} onClick={() => handleDelete(item.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {data.length === 0 && <div style={s.empty}>Nenhum conhecimento cadastrado ainda.</div>}
        </div>
      )}

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editing ? 'Editar Conhecimento' : 'Novo Conhecimento'}</h3>
              <button onClick={() => setShowModal(false)} style={s.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSave} style={s.modalBody}>
              <label style={s.label}>Pergunta / Tópico</label>
              <input 
                style={s.input} 
                value={form.question} 
                onChange={e => setForm({...form, question: e.target.value})} 
                placeholder="Ex: Como funciona a política de reembolso?"
                required
              />
              
              <label style={s.label}>Resposta Detalhada</label>
              <textarea 
                style={{ ...s.input, minHeight: 150 }} 
                value={form.answer} 
                onChange={e => setForm({...form, answer: e.target.value})} 
                placeholder="Escreva a resposta que a IA deve fornecer..."
                required
              />

              <label style={s.label}>Tags (opcional, separadas por vírgula)</label>
              <input 
                style={s.input} 
                value={form.tags} 
                onChange={e => setForm({...form, tags: e.target.value})} 
                placeholder="reembolso, regras, financeiro"
              />

              <button type="submit" style={s.saveBtn}>Salvar Conhecimento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: '2.5rem', background: '#0F0F0F', flex: 1, overflowY: 'auto', color: '#fff', minHeight: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.03em' },
  subtitle: { color: '#717171', margin: '0.5rem 0 0', fontSize: '0.95rem' },
  addBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' },
  
  loading: { textAlign: 'center', padding: '3rem', color: '#717171' },
  empty: { gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: '#333', fontSize: '1.2rem', fontWeight: 700 },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
  card: { background: '#1A1A1B', borderRadius: '16px', padding: '1.75rem', border: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', transition: 'border-color 0.3s' },
  cardStatus: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#717171', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: 800 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 },
  cardAnswer: { color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5', flex: 1, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' },
  tag: { background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 },
  
  cardActions: { display: 'flex', gap: '1rem', borderTop: '1px solid #2A2A2A', paddingTop: '1rem' },
  editBtn: { background: 'none', border: 'none', color: '#D4AF37', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
  delBtn: { background: 'none', border: 'none', color: '#e53e3e', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },

  overlay: { 
    position: 'fixed', 
    top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.85)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 10000, 
    backdropFilter: 'blur(8px)',
    padding: '20px'
  },
  modal: { 
    background: '#1A1A1B', 
    borderRadius: '24px', 
    width: '100%', 
    maxWidth: '500px', 
    border: '1px solid #333', 
    animation: 'slideUp 0.3s', 
    overflow: 'hidden', 
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  modalHeader: { 
    padding: '2rem', 
    borderBottom: '1px solid #333', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    background: '#1A1A1B', 
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box'
  },
  modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', textAlign: 'center' },
  closeBtn: { position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#717171', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  modalBody: { padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', boxSizing: 'border-box' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' },
  input: { width: '100%', background: '#0F0F0F', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none', fontSize: '0.9rem', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  saveBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '1.1rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', marginTop: '1rem', fontSize: '0.95rem' }
};
