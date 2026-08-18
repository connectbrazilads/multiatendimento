import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getContacts, createContact, createTicket, importContacts } from '../services/api';
import { Edit2, MessageSquare, Plus, Search, BookUser, Upload, Printer } from 'lucide-react';
import ContactProfileModal from '../components/ContactProfileModal';
import { toast } from '../utils/toast';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';
import SurfaceCard from '../components/ui/SurfaceCard';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';
import InstanceSelectionModal from '../components/InstanceSelectionModal';

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
      sector: '',
    },
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [pendingChatContact, setPendingChatContact] = useState(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { instances } = useOutletContext() || { instances: [] };

  useEffect(() => {
    if (!search) {
      loadContacts();
      return;
    }
    const timer = setTimeout(() => {
      loadContacts();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  async function loadContacts() {
    try {
      const response = await getContacts(search, { withoutDocument: true });
      setContacts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newContact.name || !newContact.phone) return toast.error('Preencha nome e telefone do cliente');
    if (creating) return;
    setCreating(true);
    try {
      await createContact({
        ...newContact,
        cpfCnpj: newContact.document,
      });
      setShowAddModal(false);
      setNewContact({
        name: '',
        phone: '',
        fantasyName: '',
        email: '',
        document: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        equipment: { manufacturer: '', model: '', serialNumber: '', type: '', sector: '' },
      });
      loadContacts();
      toast.success('Cliente cadastrado com sucesso');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally {
      setCreating(false);
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
      toast.success(res.data.message);
      loadContacts();
    } catch (err) {
      toast.error('Erro na importação da planilha: ' + (err.response?.data?.error || err.message));
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
      setPendingChatContact(contact);
    }
  }

  async function confirmStartChat(instanceId) {
    if (!pendingChatContact || !instanceId) return;
    setOpeningChat(true);
    try {
      const { data: ticket } = await createTicket(pendingChatContact.id, instanceId);
      setPendingChatContact(null);
      navigate(`/inbox?ticketId=${ticket.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar conversa');
    } finally {
      setOpeningChat(false);
    }
  }

  function parseTags(tagsStr) {
    try {
      if (!tagsStr) return [];
      const parsed = JSON.parse(tagsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const contactCards = useMemo(
    () =>
      contacts.map((contact) => {
        const initials = (contact.name || '?')
          .split(' ')
          .map((word) => word[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const hue = (contact.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
        const hasActiveTicket = contact.tickets?.some((ticket) => ticket.status === 'open');
        const hasPendingTicket = contact.tickets?.some((ticket) => ticket.status === 'pending');
        const statusColor = hasActiveTicket ? '#48bb78' : hasPendingTicket ? '#D4AF37' : 'var(--text-dim)';
        const statusLabel = hasActiveTicket ? 'Em atendimento' : hasPendingTicket ? 'Aguardando' : '';

        return (
          <SurfaceCard key={contact.id} style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.avatar, background: `hsl(${hue}, 45%, 35%)` }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.cardName}>{contact.name || 'Sem nome'}</div>
                {contact.fantasyName ? <div style={s.cardFantasy}>{contact.fantasyName}</div> : null}
                <div style={s.cardPhone}>{contact.phone || 'Sem número'}</div>
              </div>
              <button onClick={() => openProfileModal(contact)} style={s.editBtn} title="Editar cliente" aria-label="Editar cliente">
                <Edit2 size={16} />
              </button>
            </div>

            {statusLabel || contact.email ? (
              <div style={s.cardMeta}>
                {statusLabel ? (
                  <span style={{ ...s.statusPill, color: statusColor, borderColor: statusColor }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                    {statusLabel}
                  </span>
                ) : null}
                {contact.email ? <span style={s.emailText}>{contact.email}</span> : null}
              </div>
            ) : null}

            <div style={s.cardTags}>
              {parseTags(contact.tags).map((tag, index) => (
                <span key={index} style={s.tag}>
                  {tag}
                </span>
              ))}
            </div>

            <button style={s.chatBtn} onClick={() => startChat(contact)}>
              <MessageSquare size={16} /> Abrir conversa
            </button>
          </SurfaceCard>
        );
      }),
    [contacts]
  );

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Relacionamento"
        title="Clientes WhatsApp"
        subtitle={
          contacts.length > 0
            ? `Gerencie apenas contatos do WhatsApp sem CNPJ/CPF (${contacts.length} clientes).`
            : 'Gerencie apenas contatos do WhatsApp sem CNPJ/CPF. Clientes com documento ficam na aba CRM.'
        }
        actions={
          <div style={s.actionsRow}>
            <div style={s.searchWrap}>
              <Search size={18} style={s.searchIcon} />
              <input style={s.search} placeholder="Pesquisar contatos..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <ActionButton variant="secondary" style={s.importBtn} disabled={loading} onClick={() => document.getElementById('importExcel').click()}>
              <Upload size={18} /> Importar
            </ActionButton>
            <input type="file" id="importExcel" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />

            <ActionButton onClick={() => setShowAddModal(true)}>
              <Plus size={20} /> Novo cliente
            </ActionButton>
          </div>
        }
      />

      {loading ? (
        <div style={s.loading}>Carregando clientes...</div>
      ) : (
        <div style={s.grid}>
          {Array.isArray(contacts) && contacts.length > 0 ? (
            contactCards
          ) : (
            <EmptyState
              icon={<BookUser size={22} />}
              title={search ? `Nenhum cliente encontrado para "${search}"` : 'Nenhum cliente encontrado'}
              description={
                search
                  ? 'Tente pesquisar por outro nome, telefone ou e-mail, ou cadastre este cliente agora.'
                  : 'Cadastre um novo cliente ou importe uma planilha para começar.'
              }
              action={
                <ActionButton onClick={() => setShowAddModal(true)}>
                  <Plus size={18} /> Novo cliente
                </ActionButton>
              }
              style={{ gridColumn: '1 / -1' }}
            />
          )}
        </div>
      )}

      {showAddModal ? (
        <ModalShell kicker="Novo cadastro" title="Cadastrar cliente" onClose={() => setShowAddModal(false)} maxWidth="48rem">
          <div style={s.modalBody}>
            <div style={s.modalScrollArea}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Nome completo</label>
                  <input style={s.input} value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Ex: João da Silva" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Nome fantasia / departamento</label>
                  <input style={s.input} value={newContact.fantasyName} onChange={(e) => setNewContact({ ...newContact, fantasyName: e.target.value })} placeholder="Ex: Financeiro" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>WhatsApp (com DDD)</label>
                  <input style={s.input} value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Ex: 5551999999999" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>E-mail</label>
                  <input style={s.input} value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="exemplo@email.com" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>CPF / CNPJ</label>
                  <input style={s.input} value={newContact.document} onChange={(e) => setNewContact({ ...newContact, document: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Endereço</label>
                  <input style={s.input} value={newContact.address} onChange={(e) => setNewContact({ ...newContact, address: e.target.value })} placeholder="Rua, Número, Bairro" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Cidade</label>
                  <input style={s.input} value={newContact.city} onChange={(e) => setNewContact({ ...newContact, city: e.target.value })} placeholder="Ex: Porto Alegre" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Estado (UF)</label>
                  <input style={s.input} value={newContact.state} onChange={(e) => setNewContact({ ...newContact, state: e.target.value })} placeholder="Ex: RS" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>CEP</label>
                  <input style={s.input} value={newContact.zipCode} onChange={(e) => setNewContact({ ...newContact, zipCode: e.target.value })} placeholder="00000-000" />
                </div>
              </div>
              <div style={s.sectionDivider}>
                <h3 style={s.sectionTitle}>
                  <Printer size={20} /> Equipamento principal (opcional)
                </h3>
                <div style={s.formGrid}>
                  <div style={s.field}>
                    <label style={s.label}>Marca</label>
                    <input
                      style={s.input}
                      value={newContact.equipment.manufacturer}
                      onChange={(e) => setNewContact({ ...newContact, equipment: { ...newContact.equipment, manufacturer: e.target.value } })}
                      placeholder="Ex: Xerox"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Modelo</label>
                    <input
                      style={s.input}
                      value={newContact.equipment.model}
                      onChange={(e) => setNewContact({ ...newContact, equipment: { ...newContact.equipment, model: e.target.value } })}
                      placeholder="Ex: WorkCentre 7845"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Número de série</label>
                    <input
                      style={s.input}
                      value={newContact.equipment.serialNumber}
                      onChange={(e) => setNewContact({ ...newContact, equipment: { ...newContact.equipment, serialNumber: e.target.value } })}
                      placeholder="Ex: ABC123456"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Tipo de impressora</label>
                    <input
                      style={s.input}
                      value={newContact.equipment.type}
                      onChange={(e) => setNewContact({ ...newContact, equipment: { ...newContact.equipment, type: e.target.value } })}
                      placeholder="Ex: Multifuncional monocromática"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Setor / localização</label>
                    <input
                      style={s.input}
                      value={newContact.equipment.sector}
                      onChange={(e) => setNewContact({ ...newContact, equipment: { ...newContact.equipment, sector: e.target.value } })}
                      placeholder="Ex: Recepção"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={s.modalFooter}>
              <ActionButton variant="secondary" style={s.modalFooterBtn} onClick={() => setShowAddModal(false)}>
                Fechar
              </ActionButton>
              <ActionButton style={s.modalFooterBtn} loading={creating} onClick={handleCreate}>
                Cadastrar cliente
              </ActionButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {showProfileModal && selectedContact ? (
        <ContactProfileModal contact={selectedContact} onClose={() => setShowProfileModal(false)} onUpdated={loadContacts} />
      ) : null}

      {pendingChatContact ? (
        <InstanceSelectionModal
          instances={instances}
          title="Abrir nova conversa"
          description={`Escolha por qual instância a conversa com ${pendingChatContact.name || pendingChatContact.phone || 'este contato'} será aberta.`}
          loading={openingChat}
          onClose={() => setPendingChatContact(null)}
          onConfirm={confirmStartChat}
        />
      ) : null}
    </div>
  );
}

const s = {
  container: { padding: 'var(--space-10)', background: 'var(--bg-base)', height: '100%', overflowY: 'auto', flex: 1, color: 'var(--text-main)' },
  actionsRow: { display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' },
  loading: { textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' },
  searchWrap: { position: 'relative' },
  search: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    padding: 'var(--space-3) var(--space-4) var(--space-3) var(--space-10)',
    borderRadius: '12px',
    color: 'var(--text-main)',
    width: '280px',
    outline: 'none',
    fontSize: 'var(--text-sm)',
  },
  searchIcon: { position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' },
  importBtn: { whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-5)' },
  card: {
    padding: 'var(--space-5)',
    borderLeft: '3px solid var(--border-color)',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: 'var(--text-xs)',
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  cardName: { fontSize: 'var(--text-md)', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardFantasy: {
    color: 'var(--accent)',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '1px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardPhone: { color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' },
  editBtn: { background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 'var(--space-1)', flexShrink: 0 },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' },
  statusPill: {
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: '20px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'transparent',
    flexShrink: 0,
  },
  emailText: { fontSize: 'var(--text-xs)', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 120px' },
  cardTags: { display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '20px' },
  tag: { fontSize: 'var(--text-xs)', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 7px', borderRadius: '5px', fontWeight: 800, border: '1px solid var(--accent-border)' },
  chatBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
  },
  modalBody: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
  modalScrollArea: { padding: '0 var(--space-8)', overflowY: 'auto', flex: 1, minHeight: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' },
  field: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  label: { fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 'var(--space-3) var(--space-4)', color: 'var(--text-main)', outline: 'none', fontSize: 'var(--text-md)' },
  sectionDivider: { marginTop: 'var(--space-8)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' },
  sectionTitle: { margin: '0 0 var(--space-6) 0', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  modalFooter: {
    display: 'flex',
    gap: 'var(--space-3)',
    padding: 'var(--space-4) var(--space-8) var(--space-8)',
    borderTop: '1px solid var(--border-color)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  modalFooterBtn: { flex: '1 1 240px' },
};
