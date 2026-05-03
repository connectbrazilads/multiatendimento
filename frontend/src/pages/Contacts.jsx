import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContacts, createContact, createTicket, updateContact } from '../services/api';
import { Edit2, MessageSquare, Plus, Search, BookUser, Upload } from 'lucide-react';
import axios from 'axios';
import ContactProfileModal from '../components/ContactProfileModal';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
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

  function openProfileModal(contact) {
    setSelectedContact(contact);
    setShowProfileModal(true);
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await axios.post('/api/contacts/import', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true 
      });
      alert(res.data.message);
      loadContacts();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao importar planilha');
    } finally {
      setLoading(false);
      e.target.value = null; // reset input
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
    container: { padding: '24px', color: 'var(--text-main)', height: '100%', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexShrink: 0 },
    title: { fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(45deg, var(--text-main), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '12px' },
    addBtn: { background: 'var(--accent)', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center', gap: '8px' },
    searchWrap: { position: 'relative' },
    search: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', padding: '12px 20px 12px 40px', borderRadius: '12px', color: 'var(--text-main)', width: '300px', outline: 'none' },
    searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
    card: { padding: '24px', transition: 'transform 0.2s', cursor: 'default' },
    cardName: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' },
    cardPhone: { color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' },
    cardTags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px', minHeight: '24px' },
    tag: { fontSize: '0.7rem', background: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 },
    chatBtn: { width: '100%', background: 'transparent', border: '1px solid var(--accent-border)', color: 'var(--accent)', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'var(--bg-panel)', padding: '32px', borderRadius: '24px', width: '400px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' },
    modalTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)' },
    input: { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-main)', marginBottom: '16px', outline: 'none' },
    saveBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 800, cursor: 'pointer' },
    cancelBtn: { width: '100%', padding: '10px', marginTop: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}><BookUser size={32} /> Agenda de Contatos</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie seus clientes e inicie novas conversas.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={s.searchWrap}>
            <Search size={18} style={s.searchIcon} />
            <input 
              style={s.search} 
              placeholder="Pesquisar contatos..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button style={s.addBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> Novo Contato
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5 }}>Carregando agenda...</div>
      ) : (
        <div style={s.grid}>
          {Array.isArray(contacts) && contacts.map(c => (
            <div className="glass-panel" key={c.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.cardName}>{c.name || 'Sem nome'}</div>
                  <div style={s.cardPhone}>{c.phone || 'Sem número'}</div>
                </div>
                <button 
                  onClick={() => openProfileModal(c)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0 0 10px' }}
                  title="Perfil do Contato"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              <div style={s.cardTags}>
                {parseTags(c.tags).map((t, idx) => <span key={idx} style={s.tag}>{t}</span>)}
              </div>
              <button style={s.chatBtn} onClick={() => startChat(c)}>
                <MessageSquare size={16} /> Abrir Conversa
              </button>
            </div>
          ))}
          {contacts.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum contato encontrado.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <h2 style={s.modalTitle}>Novo Contato</h2>
            <label style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>NOME DO CLIENTE</label>
            <input 
              style={s.input} 
              placeholder="Ex: João da Silva" 
              value={newContact.name} 
              onChange={e => setNewContact({...newContact, name: e.target.value})}
            />
            <label style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>NÚMERO DO WHATSAPP</label>
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

      {showProfileModal && selectedContact && (
        <ContactProfileModal 
          contact={selectedContact} 
          onClose={() => setShowProfileModal(false)}
          onUpdated={loadContacts}
        />
      )}
    </div>
  );
}
