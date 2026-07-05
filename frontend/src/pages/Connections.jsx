import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Plus, QrCode, Smartphone, Trash2, Wifi, WifiOff } from 'lucide-react';
import { toast } from '../utils/toast';
import { getInstances, createInstance, deleteInstance, getInstanceQrCode } from '../services/api';
import { SOCKET_URL } from '../services/socket';

export default function Connections() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'new' | 'qrcode'
  const [selectedInst, setSelectedInst] = useState(null);
  const [name, setName] = useState('');
  const [qrcode, setQrcode] = useState(null);
  const [saving, setSaving] = useState(false);

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
      toast.info('Erro ao carregar conexoes');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
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
    try {
      const { data } = await getInstanceQrCode(id);
      setQrcode(data.qrcode);
    } catch {
      toast.info('Erro ao gerar QR Code');
    }
  }

  async function handleDelete(id) {
    toast.confirm('Excluir esta conexao? O numero sera desconectado.', async () => {
      try {
        await deleteInstance(id);
        load();
      } catch {
        toast.info('Erro ao excluir');
      }
    });
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Conexoes WhatsApp</h1>
          <p style={s.subtitle}>Gerencie numeros, setores e status de conexao em um unico lugar.</p>
        </div>
        <button style={s.addBtn} onClick={() => { setName(''); setModal('new'); }}>
          <Plus size={18} /> Nova Conexao
        </button>
      </header>

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
                    <h3 style={s.cardTitle}>{label}</h3>
                    <span style={{ ...s.cardStatus, color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                    {inst.phone && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                        +{inst.phone}
                      </div>
                    )}
                  </div>
                  <button style={s.deleteBtn} onClick={() => handleDelete(inst.id)} title="Excluir conexao">
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
                    <button style={s.qrBtn} onClick={() => { setSelectedInst(inst); setModal('qrcode'); loadQr(inst.id); }}>
                      <QrCode size={16} /> Gerar QR Code
                    </button>
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
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '2.5rem',
    flexWrap: 'wrap'
  },
  title: { fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' },
  subtitle: { fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.4rem' },
  addBtn: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: 'none',
    padding: '0.8rem 1.25rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: 'var(--shadow-sm)'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
  card: {
    padding: '1.4rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: '1rem' },
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
  cardTitle: { margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' },
  cardStatus: { fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' },
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
  cardMeta: { display: 'flex' },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%' },
  cardBody: { marginTop: '0.25rem' },
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
    padding: '3rem',
    borderRadius: '24px',
    border: '1px dashed var(--border-color)',
    background: 'var(--bg-panel)',
    textAlign: 'center'
  },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' },
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
  label: { fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' },
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
  qrText: { fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.55' },
  qrBox: { background: '#fff', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem' },
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
