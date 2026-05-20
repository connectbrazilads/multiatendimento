import React, { useState, useEffect } from 'react';
import api, { updateContact, deleteContact, getEquipments, updateEquipment, deleteEquipment } from '../services/api';
import { toast } from '../utils/toast';
import { Printer, FileText, User, Trash2, Edit3 } from 'lucide-react';
import ActionButton from './ui/ActionButton';
import ModalShell from './ui/ModalShell';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const EMPTY_EQUIPMENT = { manufacturer: '', model: '', serialNumber: '', sector: '', address: '', type: '' };

function mapEquipmentToForm(equipment) {
  return {
    manufacturer: equipment?.manufacturer || '',
    model: equipment?.model || '',
    serialNumber: equipment?.serialNumber || '',
    sector: equipment?.sector || '',
    address: equipment?.address || '',
    type: equipment?.type || '',
  };
}

export default function ContactProfileModal({ contact, onClose, onUpdated, initialTab = 'dados', initialEquipment = null }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: contact.name || '',
    fantasyName: contact.fantasyName || '',
    phone: contact.phone || '',
    cpfCnpj: contact.cpfCnpj || '',
    email: contact.email || '',
    address: contact.address || '',
    city: contact.city || '',
    state: contact.state || '',
    zipCode: contact.zipCode || '',
  });
  const [equipments, setEquipments] = useState([]);
  const [osHistory, setOsHistory] = useState([]);
  const [newEquip, setNewEquip] = useState(initialEquipment ? mapEquipmentToForm(initialEquipment) : { ...EMPTY_EQUIPMENT });
  const [editingEquipId, setEditingEquipId] = useState(null);

  useEffect(() => {
    if (activeTab === 'equipamentos') loadEquipments();
    if (activeTab === 'os') loadOsHistory();
  }, [activeTab, contact.id]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [contact.id, initialTab]);

  useEffect(() => {
    if (activeTab !== 'equipamentos') return;

    if (initialEquipment?.id) {
      setEditingEquipId(initialEquipment.id);
      setNewEquip(mapEquipmentToForm(initialEquipment));
      return;
    }

    setEditingEquipId(null);
    setNewEquip({ ...EMPTY_EQUIPMENT });
  }, [activeTab, contact.id, initialEquipment]);

  async function loadEquipments() {
    try {
      const res = await getEquipments(contact.id);
      setEquipments(res.data);
    } catch (e) {
      // noop
    }
  }

  async function loadOsHistory() {
    try {
      const res = await api.get('/os');
      setOsHistory(
        res.data.filter((os) => os.contactId === contact.id || os.equipment?.contactId === contact.id)
      );
    } catch (e) {
      // noop
    }
  }

  async function handleUpdateData() {
    try {
      await updateContact(contact.id, formData);
      onUpdated();
      toast.success('Dados salvos');
    } catch (err) {
      toast.error('Erro ao salvar');
    }
  }

  async function handleDeleteContact() {
    toast.confirm('Tem certeza? Isso excluira permanentemente este cliente e todo o seu historico.', async () => {
      try {
        await deleteContact(contact.id);
        onUpdated();
        onClose();
        toast.success('Cliente excluido');
      } catch (e) {
        toast.error('Erro ao excluir cliente');
      }
    });
  }

  async function handleAddOrUpdateEquip() {
    if (!newEquip.model) return toast.error('Modelo e obrigatorio');
    try {
      if (editingEquipId) {
        await updateEquipment(editingEquipId, newEquip);
        setEditingEquipId(null);
        toast.success('Equipamento atualizado');
      } else {
        await api.post(`/os/contacts/${contact.id}/equipments`, newEquip);
        toast.success('Equipamento adicionado');
      }
      setNewEquip({ ...EMPTY_EQUIPMENT });
      loadEquipments();
      onUpdated?.();
    } catch (e) {
      toast.error('Erro ao salvar equipamento');
    }
  }

  function startEditEquip(equipment) {
    setEditingEquipId(equipment.id);
    setNewEquip(mapEquipmentToForm(equipment));
  }

  async function handleDeleteEquip(id) {
    toast.confirm('Excluir este equipamento?', async () => {
      try {
        await deleteEquipment(id);
        loadEquipments();
        onUpdated?.();
        toast.success('Equipamento excluido');
      } catch (e) {
        toast.error('Erro ao excluir');
      }
    });
  }

  function statusBadge(status) {
    const colors = {
      PENDENTE: '#ff4d4f',
      EM_ATENDIMENTO: '#faad14',
      AGUARDANDO_RETORNO: '#ff9c6e',
      FINALIZADA: '#52c41a',
    };

    return {
      background: colors[status] || 'var(--text-dim)',
      color: '#fff',
      padding: '4px 8px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 800,
    };
  }

  return (
    <ModalShell kicker="Perfil do cliente" title={contact.name || 'Cliente'} onClose={onClose} maxWidth="52rem">
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(activeTab === 'dados' ? s.tabActive : {}) }} onClick={() => setActiveTab('dados')}>
          <User size={16} /> Dados
        </button>
        <button style={{ ...s.tab, ...(activeTab === 'equipamentos' ? s.tabActive : {}) }} onClick={() => setActiveTab('equipamentos')}>
          <Printer size={16} /> Equipamentos
        </button>
        <button style={{ ...s.tab, ...(activeTab === 'os' ? s.tabActive : {}) }} onClick={() => setActiveTab('os')}>
          <FileText size={16} /> Historico O.S.
        </button>
      </div>

      <div style={s.content}>
        {activeTab === 'dados' ? (
          <div>
            <div style={s.inputGroup}>
              <div>
                <label style={s.label}>Nome</label>
                <input style={s.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Nome fantasia / departamento</label>
                <input style={s.input} value={formData.fantasyName} onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })} />
              </div>
            </div>
            <div style={s.inputGroup}>
              <div>
                <label style={s.label}>Telefone</label>
                <input style={s.input} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>E-mail</label>
                <input style={s.input} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div style={s.inputGroup}>
              <div>
                <label style={s.label}>CNPJ / CPF</label>
                <input style={s.input} value={formData.cpfCnpj} onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={s.label}>Endereco (rua, numero, bairro)</label>
              <input style={s.input} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div style={{ ...s.inputGroup, marginTop: 16 }}>
              <div>
                <label style={s.label}>Cidade</label>
                <input style={s.input} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Estado (UF)</label>
                <input style={s.input} value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              </div>
            </div>
            <div style={s.actionsRow}>
              <ActionButton onClick={handleUpdateData}>Salvar dados</ActionButton>
            </div>

            <ActionButton variant="danger" style={s.deleteBtn} onClick={handleDeleteContact}>
              <Trash2 size={16} /> Excluir perfil do cliente
            </ActionButton>
          </div>
        ) : null}

        {activeTab === 'equipamentos' ? (
          <div>
            <div style={{ ...s.equipFormCard, borderColor: editingEquipId ? 'var(--accent-border)' : 'var(--border-color)' }}>
              <div style={s.equipFormTitle}>{editingEquipId ? 'Editando equipamento' : 'Novo equipamento'}</div>
              <div style={s.inputGroup}>
                <input style={s.input} placeholder="Marca (ex: Xerox)" value={newEquip.manufacturer} onChange={(e) => setNewEquip({ ...newEquip, manufacturer: e.target.value })} />
                <input style={s.input} placeholder="Modelo (ex: 7845)" value={newEquip.model} onChange={(e) => setNewEquip({ ...newEquip, model: e.target.value })} />
              </div>
              <div style={s.inputGroup}>
                <input style={s.input} placeholder="Numero de serie" value={newEquip.serialNumber} onChange={(e) => setNewEquip({ ...newEquip, serialNumber: e.target.value })} />
                <input style={s.input} placeholder="Setor (ex: Recepcao)" value={newEquip.sector} onChange={(e) => setNewEquip({ ...newEquip, sector: e.target.value })} />
              </div>
              <div style={s.inputGroup}>
                <input style={s.input} placeholder="Tipo (ex: Multifuncional)" value={newEquip.type} onChange={(e) => setNewEquip({ ...newEquip, type: e.target.value })} />
                <input style={s.input} placeholder="Endereco especifico (opcional)" value={newEquip.address} onChange={(e) => setNewEquip({ ...newEquip, address: e.target.value })} />
              </div>
              <div style={s.actionsRow}>
                <ActionButton onClick={handleAddOrUpdateEquip}>
                  {editingEquipId ? 'Salvar alteracoes' : 'Adicionar equipamento'}
                </ActionButton>
                {editingEquipId ? (
                  <ActionButton
                    variant="secondary"
                    onClick={() => {
                      setEditingEquipId(null);
                      setNewEquip({ ...EMPTY_EQUIPMENT });
                    }}
                  >
                    Cancelar
                  </ActionButton>
                ) : null}
              </div>
            </div>

            {equipments.map((equipment) => (
              <div key={equipment.id} style={s.equipCard}>
                <div style={s.equipActions}>
                  <button style={s.actionBtn('var(--accent)')} onClick={() => startEditEquip(equipment)} title="Editar">
                    <Edit3 size={16} />
                  </button>
                  <button style={s.actionBtn('#ff4d4f')} onClick={() => handleDeleteEquip(equipment.id)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={s.equipTitle}>
                  {equipment.model.toLowerCase().startsWith(equipment.manufacturer?.toLowerCase())
                    ? equipment.model
                    : equipment.manufacturer
                      ? `${equipment.manufacturer} ${equipment.model}`
                      : equipment.model}
                </div>
                <div style={s.equipType}>{equipment.type}</div>
                <div style={s.equipText}>Serie: {equipment.serialNumber || 'N/A'} | Setor: {equipment.sector || 'Geral'}</div>
                {equipment.address ? <div style={s.equipText}>Local: {equipment.address}</div> : null}
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === 'os' ? (
          <div>
            {osHistory.length === 0 ? <div style={s.emptyText}>Nenhuma O.S. registrada.</div> : null}
            {osHistory.map((os) => (
              <div key={os.id} style={s.osCard}>
                <div>
                  <div style={s.osTitle}>O.S. #{os.id.substring(os.id.length - 6).toUpperCase()}</div>
                  <div style={s.osMeta}>Data: {new Date(os.createdAt).toLocaleDateString()}</div>
                  <div style={s.osDefect}>Defeito: {os.defect}</div>
                </div>
                <div style={s.osRight}>
                  <span style={statusBadge(os.status)}>{os.status}</span>
                  <a
                    href={`${BACKEND_URL}/api/os/${os.id}/pdf?token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={s.osLink}
                  >
                    Ver PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

const s = {
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    padding: '0 1.8rem',
    gap: '0.5rem',
  },
  tab: {
    padding: '0.95rem 1rem',
    cursor: 'pointer',
    fontWeight: 700,
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
  content: { padding: '1.8rem', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' },
  inputGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  label: {
    fontSize: '0.78rem',
    color: 'var(--accent)',
    fontWeight: 800,
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-main)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  actionsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' },
  deleteBtn: { width: '100%', marginTop: '28px' },
  equipFormCard: {
    background: 'var(--bg-panel)',
    padding: '16px',
    borderRadius: '16px',
    border: '1px dashed var(--border-color)',
    marginBottom: '18px',
  },
  equipFormTitle: { color: 'var(--accent)', fontWeight: 800, marginBottom: '12px' },
  equipCard: {
    background: 'var(--bg-base)',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    marginBottom: '12px',
    position: 'relative',
  },
  equipTitle: { fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem', paddingRight: '60px' },
  equipType: { color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', marginTop: '0.3rem' },
  equipText: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' },
  equipActions: { position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' },
  actionBtn: (color) => ({
    background: 'transparent',
    border: 'none',
    color,
    cursor: 'pointer',
    padding: '4px',
  }),
  osCard: {
    background: 'var(--bg-base)',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  osTitle: { fontWeight: 800, color: 'var(--text-main)' },
  osMeta: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' },
  osDefect: { marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-main)' },
  osRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  osLink: { fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 },
  emptyText: { color: 'var(--text-muted)' },
};
