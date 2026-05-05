import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContacts, createContact, createTicket, importContacts } from '../services/api';
import { Edit2, MessageSquare, Plus, Search, BookUser, Upload, X, Printer } from 'lucide-react';
import ContactProfileModal from '../components/ContactProfileModal';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ 
    name: '', 
    phone: '', 
    fantasyName: '', 
    email: '', 
    document: '', 
    address: '', 
    city: '', 
    state: '',
    zipCode: '',
    equipment: {
      manufacturer: '',
      model: '',
      serialNumber: '',
      type: '',
      sector: ''
    }
  });
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
    if (!newContact.name || !newContact.phone) return alert('Preencha pelo menos nome e telefone');
    try {
      await createContact({
        ...newContact,
        cpfCnpj: newContact.document // Mapeia document para cpfCnpj usado no backend
      });
      setShowAddModal(false);
      setNewContact({ 
        name: '', phone: '', fantasyName: '', email: '', 
        document: '', address: '', city: '', state: '', zipCode: '',
        equipment: { manufacturer: '', model: '', serialNumber: '', type: '', sector: '' }
      });
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
      const res = await importContacts(formData);
      alert(res.data.message);
      loadContacts();
    } catch (err) {
      alert('Erro na Importação: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      e.target.value = null;
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

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}><BookUser size={32} /> Clientes / CRM</h1>
          <p style={s.subtitle}>Gerencie sua base de clientes e equipamentos</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={s.searchWrap}>
            <Search size={18} style={s.searchIcon} />
            <input 
              style={s.search} 
              placeholder="Pesquisar contatos..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            style={s.importBtn} 
            onClick={() => document.getElementById('importExcel').click()}
          >
            <Upload size={18} /> Importar
          </button>
          <input type="file" id="importExcel" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />

          <button style={s.addBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> Novo Cliente
          </button>
        </div>
      </div>

      <div style={s.grid}>
        {Array.isArray(contacts) && contacts.map(c => (
          <div className="glass-panel" key={c.id} style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ minWidth: 0 }}>
                <div style={s.cardName}>{c.name || 'Sem nome'}</div>
                {c.fantasyName && <div style={s.cardFantasy}>{c.fantasyName}</div>}
                <div style={s.cardPhone}>{c.phone || 'Sem número'}</div>
              </div>
              <button onClick={() => openProfileModal(c)} style={s.editBtn}>
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
      </div>

      {showAddModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>🚀 Novo Cliente</h2>
              <button style={s.closeBtn} onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Nome Completo</label>
                  <input style={s.input} value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Ex: João da Silva" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Nome Fantasia / Depto</label>
                  <input style={s.input} value={newContact.fantasyName} onChange={e => setNewContact({...newContact, fantasyName: e.target.value})} placeholder="Ex: Financeiro" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>WhatsApp (com DDD)</label>
                  <input style={s.input} value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Ex: 5551999999999" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>E-mail</label>
                  <input style={s.input} value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="exemplo@email.com" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>CPF / CNPJ</label>
                  <input style={s.input} value={newContact.document} onChange={e => setNewContact({...newContact, document: e.target.value})} placeholder="00.000.000/0001-00" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Endereço</label>
                  <input style={s.input} value={newContact.address} onChange={e => setNewContact({...newContact, address: e.target.value})} placeholder="Rua, Número, Bairro" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cidade</label>
                  <input style={s.input} value={newContact.city} onChange={e => setNewContact({...newContact, city: e.target.value})} placeholder="Ex: Porto Alegre" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Estado (UF)</label>
                  <input style={s.input} value={newContact.state} onChange={e => setNewContact({...newContact, state: e.target.value})} placeholder="Ex: RS" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>CEP</label>
                  <input style={s.input} value={newContact.zipCode} onChange={e => setNewContact({...newContact, zipCode: e.target.value})} placeholder="00000-000" />
                </div>
              </div>

              <div style={{ marginTop: '2rem', borderTop: '1px solid #1A1A1B', paddingTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={20} /> Equipamento Principal (Opcional)
                </h3>
                <div style={s.formGrid}>
                  <div style={s.field}>
                    <label style={s.label}>Marca</label>
                    <input style={s.input} value={newContact.equipment.manufacturer} onChange={e => setNewContact({...newContact, equipment: {...newContact.equipment, manufacturer: e.target.value}})} placeholder="Ex: Xerox" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Modelo</label>
                    <input style={s.input} value={newContact.equipment.model} onChange={e => setNewContact({...newContact, equipment: {...newContact.equipment, model: e.target.value}})} placeholder="Ex: WorkCentre 7845" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Número de Série</label>
                    <input style={s.input} value={newContact.equipment.serialNumber} onChange={e => setNewContact({...newContact, equipment: {...newContact.equipment, serialNumber: e.target.value}})} placeholder="Ex: ABC123456" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Tipo de Impressora</label>
                    <input style={s.input} value={newContact.equipment.type} onChange={e => setNewContact({...newContact, equipment: {...newContact.equipment, type: e.target.value}})} placeholder="Ex: Multifuncional Monocromática" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Setor / Localização</label>
                    <input style={s.input} value={newContact.equipment.sector} onChange={e => setNewContact({...newContact, equipment: {...newContact.equipment, sector: e.target.value}})} placeholder="Ex: Recepção" />
                  </div>
                </div>
              </div>
              <button style={s.saveBtn} onClick={handleCreate}>Cadastrar Cliente</button>
            </div>
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

const s = {
  container: { padding: '2.5rem', background: 'var(--bg-base)', height: '100%', overflowY: 'auto', flex: 1, color: 'var(--text-main)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' },
  addBtn: { background: 'var(--accent)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', color: 'var(--text-inverse)', display: 'flex', alignItems: 'center', gap: '8px' },
  importBtn: { background: 'var(--accent-light)', border: '1px solid var(--accent-border)', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' },
  searchWrap: { position: 'relative' },
  search: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', color: 'var(--text-main)', width: '280px', outline: 'none', fontSize: '0.9rem' },
  searchIcon: { position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
  card: { padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '20px', transition: 'all 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  cardName: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardFantasy: { color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' },
  cardPhone: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' },
  editBtn: { background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' },
  cardTags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem', minHeight: '24px' },
  tag: { fontSize: '0.65rem', background: 'var(--accent-light)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid var(--accent-border)' },
  chatBtn: { width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.85rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'var(--bg-surface)', borderRadius: '32px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' },
  modalHeader: { padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '2rem' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1rem', color: 'var(--text-main)', outline: 'none', fontSize: '0.95rem' },
  saveBtn: { width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontWeight: 900, cursor: 'pointer', fontSize: '1rem' }
};
