import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContacts, createContact, createTicket } from '../services/api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, [search]);

  async function loadContacts() {
    try {
      const response = await getContacts(search);
      setContacts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newContact.name || !newContact.phone) return alert('Preencha nome e telefone');
    try {
      await createContact(newContact);
      setShowAddModal(false);
      setNewContact({ name: '', phone: '' });
      loadContacts();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar contato');
    }
  }

  async function startChat(contact) {
    if (!contact) return;
    if (contact.tickets && contact.tickets.length > 0 && contact.tickets[0].status !== 'resolved') {
      navigate(`/inbox?ticketId=${contact.tickets[0].id}`);
    } else {
      try {
        const { data: ticket } = await createTicket(contact.id);
        navigate(`/inbox?ticketId=${ticket.id}`);
      } catch (err) {
        alert('Erro ao iniciar conversa');
      }
    }
  }

  const parseTags = (tagsStr) => {
    try {
      if (!tagsStr) return [];
      const parsed = JSON.parse(tagsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const s = {
    container: { padding: '24px', color: '#fff', height: '100%', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexShrink: 0 },
    title: { fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(45deg, #FFF, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    addBtn: { background: 'linear-gradient(45deg, #D4AF37, #F2D06B)', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', color: '#000' },
    search: { background: '#1A1A1A', border: '1px solid #333', padding: '12px 20px', borderRadius: '12px', color: '#fff', width: '300px', outline: 'none' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
    card: { background: '#1A1A1A', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s, border 0.2s', cursor: 'default' },
    cardName: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    cardPhone: { color: '#717171', fontSize: '0.9rem', marginBottom: '16px' },
    cardTags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px', minHeight: '24px' },
    tag: { fontSize: '0.7rem', background: 'rgba(212,175,55,0.1)', color: '#D4AF37', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 },
    chatBtn: { width: '100%', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1A1A1A', padding: '32px', borderRadius: '24px', width: '400px', border: '1px solid #333' },
    modalTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px' },
    input: { width: '100%', background: '#252525', border: '1px solid #333', borderRadius: '12px', padding: '14px', color: '#fff', marginBottom: '16px', outline: 'none' },
    saveBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#D4AF37', color: '#000', fontWeight: 800, cursor: 'pointer' },
    cancelBtn: { width: '100%', padding: '10px', marginTop: '8px', background: 'transparent', border: 'none', color: '#717171', cursor: 'pointer' }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>📔 Agenda de Contatos</h1>
          <p style={{ color: '#717171' }}>Gerencie seus clientes e inicie novas conversas.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <input 
            style={s.search} 
            placeholder="Pesquisar contatos..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
          <button style={s.addBtn} onClick={() => setShowAddModal(true)}>+ Novo Contato</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5 }}>Carregando agenda...</div>
      ) : (
        <div style={s.grid}>
          {Array.isArray(contacts) && contacts.map(c => (
            <div key={c.id} style={s.card}>
              <div style={s.cardName}>{c.name || 'Sem nome'}</div>
              <div style={s.cardPhone}>{c.phone || 'Sem número'}</div>
              <div style={s.cardTags}>
                {parseTags(c.tags).map((t, idx) => <span key={idx} style={s.tag}>{t}</span>)}
              </div>
              <button style={s.chatBtn} onClick={() => startChat(c)}>💬 Abrir Conversa</button>
            </div>
          ))}
          {contacts.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#555' }}>
              Nenhum contato encontrado.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Novo Contato</h2>
            <label style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700 }}>NOME DO CLIENTE</label>
            <input 
              style={s.input} 
              placeholder="Ex: João da Silva" 
              value={newContact.name} 
              onChange={e => setNewContact({...newContact, name: e.target.value})}
            />
            <label style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700 }}>NÚMERO DO WHATSAPP</label>
            <input 
              style={s.input} 
              placeholder="Ex: 5551999999999" 
              value={newContact.phone} 
              onChange={e => setNewContact({...newContact, phone: e.target.value})}
            />
            <button style={s.saveBtn} onClick={handleCreate}>Salvar Contato</button>
            <button style={s.cancelBtn} onClick={() => setShowAddModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
