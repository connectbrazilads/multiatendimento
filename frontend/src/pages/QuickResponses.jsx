import React, { useEffect, useState } from 'react';
import { getQuickResponses, createQuickResponse, deleteQuickResponse } from '../services/api';
import { MessageSquare, Plus, Trash2, Search, Zap } from 'lucide-react';

export default function QuickResponses() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ shortcut: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getQuickResponses();
      setResponses(data);
    } catch (e) {
      console.error('Erro ao carregar respostas rápidas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createQuickResponse(form);
      setForm({ shortcut: '', message: '' });
      setModal(false);
      load();
    } catch (e) {
      alert('Erro ao salvar modelo');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este modelo?')) return;
    try {
      await deleteQuickResponse(id);
      load();
    } catch (e) {
      alert('Erro ao excluir');
    }
  }

  const filtered = responses.filter(r => 
    r.shortcut.toLowerCase().includes(search.toLowerCase()) || 
    r.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>⚡ Modelos de Mensagem</h1>
          <p style={s.subtitle}>Crie atalhos para responder seus clientes com agilidade</p>
        </div>
        <button style={s.addBtn} onClick={() => setModal(true)}>
          <Plus size={20} /> Novo Modelo
        </button>
      </header>

      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <Search size={18} color="#717171" />
          <input 
            style={s.searchInput} 
            placeholder="Buscar modelo..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={s.grid}>
        {loading ? (
          <div style={s.empty}>Carregando modelos...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>Nenhum modelo encontrado.</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.shortcut}>/{r.shortcut}</div>
                <button style={s.delBtn} onClick={() => handleDelete(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={s.cardBody}>
                {r.message}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>✨ Novo Modelo de Mensagem</h3>
              <button style={s.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Atalho (Ex: faturas)</label>
                <div style={s.inputWrapper}>
                  <span style={s.prefix}>/</span>
                  <input 
                    style={s.inputWithPrefix} 
                    value={form.shortcut} 
                    onChange={e => setForm({ ...form, shortcut: e.target.value.replace(/\s/g, '') })} 
                    required 
                    placeholder="digite o atalho..." 
                  />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Mensagem Completa</label>
                <textarea 
                  style={s.textarea} 
                  rows={6}
                  value={form.message} 
                  onChange={e => setForm({ ...form, message: e.target.value })} 
                  required 
                  placeholder="Escreva a resposta completa aqui..." 
                />
                <p style={s.hint}>Dica: No chat, digite / para listar seus modelos.</p>
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Modelo'}
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
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: '#0F0F0F', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.95rem', color: '#717171', marginTop: '0.4rem' },
  addBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' },
  
  searchRow: { marginBottom: '2rem' },
  searchBox: { background: '#1A1A1B', borderRadius: '12px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #2A2A2A', maxWidth: '400px' },
  searchInput: { background: 'none', border: 'none', padding: '0.8rem 0', color: '#fff', outline: 'none', flex: 1, fontSize: '0.9rem' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
  card: { background: '#131314', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '1.5rem', transition: 'transform 0.2s, border-color 0.2s', ':hover': { borderColor: '#D4AF37' } },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  shortcut: { background: 'rgba(212,175,55,0.1)', color: '#D4AF37', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 },
  delBtn: { background: 'none', border: 'none', color: '#717171', cursor: 'pointer', ':hover': { color: '#ff4444' } },
  cardBody: { fontSize: '0.9rem', color: '#aaa', lineHeight: '1.5', whiteSpace: 'pre-wrap' },

  empty: { padding: '5rem', textAlign: 'center', color: '#717171' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1A1A1B', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '1px solid #333' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#717171', fontSize: '1.2rem', cursor: 'pointer' },
  form: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.75rem', fontWeight: 800, color: '#717171', textTransform: 'uppercase' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  prefix: { position: 'absolute', left: '1rem', color: '#D4AF37', fontWeight: 800 },
  inputWithPrefix: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '0.85rem 1rem 0.85rem 2rem', color: '#fff', outline: 'none', width: '100%' },
  textarea: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '1rem', color: '#fff', outline: 'none', resize: 'none', fontFamily: 'inherit' },
  hint: { fontSize: '0.75rem', color: '#555', margin: 0 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#717171', cursor: 'pointer' },
  saveBtn: { padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#D4AF37', color: '#000', cursor: 'pointer', fontWeight: 800 },
};
