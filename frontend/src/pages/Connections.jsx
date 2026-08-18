import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Plus, QrCode, RotateCcw, Smartphone, Trash2, Wifi, WifiOff } from 'lucide-react';
import { toast } from '../utils/toast';
import { getInstances, createInstance, deleteInstance, getInstanceQrCode, repairInstance } from '../services/api';
import { SOCKET_URL } from '../services/socket';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';

export default function Connections() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'new' | 'qrcode'
  const [selectedInst, setSelectedInst] = useState(null);
  const [name, setName] = useState('');
  const [qrcode, setQrcode] = useState(null);
  const [qrError, setQrError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairingId, setRepairingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
    const token = localStorage.getItem('token');
    const s = io(SOCKET_URL, { auth: { token } });

    s.on('connection_update', () => {
      load();
    });

    return () => s.disconnect();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getInstances();
      setInstances(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao carregar as conexoes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await createInstance(name);
      setModal('qrcode');
      setSelectedInst(data);
      loadQr(data.id);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar conexao';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function loadQr(id) {
    setQrcode(null);
    setQrError(false);
    try {
      const { data } = await getInstanceQrCode(id);
      setQrcode(data.qrcode);
    } catch (err) {
      setQrError(true);
      toast.error(err.response?.data?.error || 'Nao foi possivel gerar o QR Code. Tente novamente.');
    }
  }

  async function handleDelete(inst) {
    if (deletingId) return;
    const label = inst.instanceName.split('_').pop().toUpperCase();
    toast.confirm(`Excluir a conexao "${label}"? O numero sera desconectado e nao podera ser desfeito.`, async () => {
      setDeletingId(inst.id);
      try {
        await deleteInstance(inst.id);
        load();
      } catch (err) {
        toast.error(err.response?.data?.error || `Erro ao excluir a conexao "${label}".`);
      } finally {
        setDeletingId(null);
      }
    });
  }

  async function handleRepair(inst) {
    const label = inst.instanceName.split('_').pop().toUpperCase();
    toast.confirm(`Recriar a sessao da conexao "${label}"? Use quando o QR Code travar ou a Evolution ficar presa.`, async () => {
      setRepairingId(inst.id);
      setQrcode(null);
      try {
        const { data } = await repairInstance(inst.id);
        setSelectedInst(data.instance || inst);
        setModal('qrcode');
        setQrcode(data.qrcode || null);
        load();
        if (!data.qrcode) {
          toast.info('Sessao recriada. Buscando QR Code novamente...');
          loadQr(inst.id);
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erro ao recriar sessao');
      } finally {
        setRepairingId(null);
      }
    });
  }

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Canais"
        title="Conexões WhatsApp"
        subtitle="Gerencie números, setores e o estado de cada canal em um único lugar."
        actions={<ActionButton onClick={() => { setName(''); setModal('new'); }}><Plus size={18} /> Nova conexão</ActionButton>}
        compact
      />

      {loading ? (
        <div style={s.empty}>Sincronizando instancias...</div>
      ) : (
        <div style={s.grid}>
          {instances.map(inst => {
            const isConnected = inst.status === 'connected';
            const label = inst.instanceName.split('_').pop().toUpperCase();

            return (
              <div key={inst.id} className="glass-panel" style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ ...s.statusIcon, color: isConnected ? 'var(--success)' : 'var(--danger)' }}>
                    {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
                  </div>
                  <div style={s.cardInfo}>
                    <h3 style={s.cardTitle} title={label}>{label}</h3>
                    <span style={{ ...s.cardStatus, color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                    {inst.phone && (
                      <div style={s.cardPhone}>
                        +{inst.phone}
                      </div>
                    )}
                  </div>
                  <button
                    style={{ ...s.deleteBtn, ...(deletingId === inst.id ? s.deleteBtnBusy : {}) }}
                    onClick={() => handleDelete(inst)}
                    disabled={deletingId === inst.id}
                    title={deletingId === inst.id ? 'Excluindo...' : 'Excluir conexao'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={s.cardMeta}>
                  <span style={{ ...s.statusPill, color: isConnected ? 'var(--success)' : 'var(--warning)' }}>
                    <span style={{ ...s.statusDot, background: isConnected ? 'var(--success)' : 'var(--warning)' }} />
                    {isConnected ? 'Sessao ativa' : 'Aguardando pareamento'}
                  </span>
                </div>

                <div style={s.cardBody}>
                  {isConnected ? (
                    <div style={s.connectedBox}>
                      <Smartphone size={16} />
                      Pronto para uso
                    </div>
                  ) : (
                    <div style={s.disconnectedActions}>
                      <button style={s.qrBtn} onClick={() => { setSelectedInst(inst); setModal('qrcode'); loadQr(inst.id); }}>
                        <QrCode size={16} /> Gerar QR Code
                      </button>
                      <button style={s.repairBtn} disabled={repairingId === inst.id} onClick={() => handleRepair(inst)}>
                        <RotateCcw size={16} /> {repairingId === inst.id ? 'Recriando...' : 'Recriar sessao'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {instances.length === 0 && (
            <div style={s.emptyCard}>
              <div style={s.emptyTitle}>Nenhuma conexao ativa</div>
              <div style={s.emptyText}>Adicione seu primeiro numero para iniciar a operacao no WhatsApp.</div>
            </div>
          )}
        </div>
      )}

      {modal === 'new' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Nova Conexao</h3>
              <button style={s.closeBtn} onClick={() => setModal(null)}>Fechar</button>
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome da conexao</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Financeiro" />
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Criando...' : 'Criar conexao'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'qrcode' && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Escanear QR Code</h3>
              <button style={s.closeBtn} onClick={() => { setModal(null); load(); }}>Fechar</button>
            </div>
            <div style={s.qrContent}>
              <p style={s.qrText}>
                Abra o WhatsApp no celular e escaneie o codigo abaixo para conectar a instancia{' '}
                <strong>{selectedInst?.instanceName.split('_').pop()}</strong>.
              </p>
              <div style={s.qrBox}>
                {qrcode ? (
                  <img src={qrcode} alt="QR Code" style={s.qrImg} />
                ) : qrError ? (
                  <div style={s.qrErrorState}>
                    <span>Nao foi possivel gerar o QR Code.</span>
                    <button type="button" style={s.qrRetryBtn} onClick={() => loadQr(selectedInst.id)}>
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <div style={s.qrLoading}>Gerando codigo...</div>
                )}
              </div>
              <button style={s.doneBtn} onClick={() => { setModal(null); load(); }}>Ja escaneei</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: 'var(--space-10)', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' },
  card: {
    padding: '1.4rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)' },
  statusIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: {
    margin: 0,
    fontSize: 'var(--text-md)',
    fontWeight: 800,
    color: 'var(--text-main)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cardStatus: { fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' },
  cardPhone: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', fontWeight: 600 },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  deleteBtnBusy: { opacity: 0.5, cursor: 'not-allowed' },
  cardMeta: { display: 'flex' },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%' },
  cardBody: { marginTop: 'var(--space-1)' },
  disconnectedActions: { display: 'grid', gap: '0.65rem' },
  qrBtn: {
    width: '100%',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-border)',
    padding: '0.85rem',
    borderRadius: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  repairBtn: {
    width: '100%',
    background: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    padding: 'var(--space-3)',
    borderRadius: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  connectedBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'var(--success)',
    background: 'rgba(46, 204, 113, 0.08)',
    border: '1px solid rgba(46, 204, 113, 0.2)',
    padding: '0.85rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: 800
  },
  empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' },
  emptyCard: {
    gridColumn: '1 / -1',
    padding: 'var(--space-12)',
    borderRadius: '24px',
    border: '1px dashed var(--border-color)',
    background: 'var(--bg-panel)',
    textAlign: 'center'
  },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 'var(--space-2)' },
  emptyText: { color: 'var(--text-muted)', fontSize: '0.95rem' },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)'
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-lg)'
  },
  modalHeader: {
    padding: '1.5rem 1.75rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },
  modalTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    borderRadius: '10px',
    padding: '0.55rem 0.8rem'
  },
  form: { padding: '1.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.55rem' },
  label: { fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.9rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem'
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1.75rem' },
  cancelBtn: {
    padding: '0.75rem 1.1rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: 700
  },
  saveBtn: {
    padding: '0.75rem 1.1rem',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    cursor: 'pointer',
    fontWeight: 800
  },
  qrContent: { padding: '1.75rem', textAlign: 'center' },
  qrText: { fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', lineHeight: 'var(--leading-normal)' },
  qrBox: { background: '#fff', padding: 'var(--space-4)', borderRadius: '16px', display: 'inline-block', marginBottom: 'var(--space-6)' },
  qrImg: { width: '220px', height: '220px', display: 'block' },
  qrLoading: {
    width: '220px',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    fontWeight: 700
  },
  qrErrorState: {
    width: '220px',
    height: '220px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    color: 'var(--danger)',
    fontWeight: 700,
    fontSize: 'var(--text-sm)',
    textAlign: 'center',
    padding: 'var(--space-4)',
    boxSizing: 'border-box'
  },
  qrRetryBtn: {
    background: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid var(--danger-border)',
    borderRadius: '10px',
    padding: '0.55rem 0.9rem',
    fontWeight: 800,
    fontSize: 'var(--text-xs)',
    cursor: 'pointer'
  },
  doneBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: 'none',
    padding: '0.9rem',
    borderRadius: '12px',
    fontWeight: 800,
    cursor: 'pointer'
  },
};
