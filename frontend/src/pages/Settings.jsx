import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import {
  getSettings,
  saveSettings,
  updateProfile,
  getMe,
  getQuickResponses,
  createQuickResponse,
  deleteQuickResponse,
  getBusinessHours,
  saveBusinessHours,
  getTags,
  createTag,
  deleteTag,
  uploadLogo,
  getMediaUrl,
} from '../services/api';
import Users from './Users';
import Teams from './Teams';

const TABS = ['Robo IA', 'Atendimento', 'Atendentes', 'Equipes', 'Empresa', 'Respostas rapidas', 'Etiquetas', 'Minha conta'];
const DAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export default function Settings() {
  const isMobile = window.innerWidth <= 768;
  const isAdmin = localStorage.getItem('role') === 'admin' || localStorage.getItem('role') === 'superadmin';
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    botEnabled: false,
    botName: '',
    geminiKey: '',
    webhookUrl: '',
    systemPrompt: '',
    transferKeyword: 'atendente',
    outOfOfficeMessage: '',
    ratingEnabled: false,
    ratingMessage: '',
    notificationPhone: '',
    companyName: '',
    companyFantasyName: '',
    companyCnpj: '',
    companyIE: '',
    companyAddress: '',
    companyBairro: '',
    companyCep: '',
    companyPhone: '',
    companyCity: '',
    companyState: '',
    serpApiKey: '',
  });
  const [tenant, setTenant] = useState(null);
  const [hours, setHours] = useState([]);
  const [saving, setSaving] = useState(false);
  const [, setSaved] = useState(false);
  const [, setSaveError] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', password: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [quickResponses, setQuickResponses] = useState([]);
  const [newQuick, setNewQuick] = useState({ shortcut: '', message: '' });
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ name: '', color: '#D4AF37' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await getSettings();
      setForm((current) => ({ ...current, ...data }));
    } catch {
      // sem configuracoes ainda
    }

    try {
      const { data } = await getMe();
      setProfile({ name: data.name, email: data.email, password: '' });
      setTenant(data.tenant);
    } catch {
      // erro ao carregar perfil
    }

    try {
      const { data } = await getQuickResponses();
      setQuickResponses(data);
    } catch {
      // erro ao carregar respostas rapidas
    }

    try {
      const { data } = await getTags();
      setTags(data);
    } catch {
      // erro ao carregar etiquetas
    }

    try {
      const { data } = await getBusinessHours();
      if (data && data.length > 0) {
        setHours(data);
      } else {
        setHours([0, 1, 2, 3, 4, 5, 6].map((day) => ({ dayOfWeek: day, start: '08:00', end: '18:00', active: true })));
      }
    } catch {
      // erro ao carregar horarios
    }
  }

  async function handleSave(e) {
    if (e?.preventDefault) e.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      await saveSettings(form);
      if (tab === 1) {
        await saveBusinessHours({ hours });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('Configuracoes salvas');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Backend indisponivel';
      setSaveError(`Erro ao salvar: ${message}`);
      toast.error(`Erro ao salvar: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      toast.info('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddQuick(e) {
    e.preventDefault();
    try {
      const { data } = await createQuickResponse(newQuick);
      setQuickResponses([...quickResponses, data]);
      setNewQuick({ shortcut: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar');
    }
  }

  async function handleDeleteQuick(id) {
    toast.confirm('Deseja excluir esta resposta rapida?', async () => {
      try {
        await deleteQuickResponse(id);
        setQuickResponses(quickResponses.filter((item) => item.id !== id));
        toast.success('Resposta excluida');
      } catch {
        toast.error('Erro ao excluir');
      }
    });
  }

  async function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.name) return;
    try {
      const { data } = await createTag(newTag);
      setTags([...tags, data]);
      setNewTag({ name: '', color: '#D4AF37' });
    } catch {
      toast.info('Erro ao adicionar etiqueta');
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const { data } = await uploadLogo(file);
      setTenant({ ...tenant, logoUrl: data.url });
      toast.success('Logo atualizada com sucesso');
    } catch {
      toast.error('Erro ao subir logo');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTag(id) {
    toast.confirm('Excluir esta etiqueta?', async () => {
      try {
        await deleteTag(id);
        setTags(tags.filter((item) => item.id !== id));
        toast.success('Etiqueta excluida');
      } catch {
        toast.error('Erro ao excluir');
      }
    });
  }

  return (
    <div className="settings-container" style={s.container}>
      <div className="settings-header" style={s.header}>
        <p style={s.kicker}>Preferencias</p>
        <h2 className="settings-title" style={s.title}>Configuracoes</h2>
        <div className="settings-subtitle" style={s.subtitle}>Gerencie o robo, as operacoes do atendimento e os dados da empresa.</div>
      </div>

      <div
        style={{
          ...s.tabs,
          overflowX: isMobile ? 'auto' : 'visible',
          whiteSpace: isMobile ? 'nowrap' : 'normal',
          paddingBottom: isMobile ? '10px' : '0',
        }}
      >
        {TABS.map((item, index) => (
          <button key={item} style={{ ...s.tab, ...(tab === index ? s.tabActive : {}) }} onClick={() => setTab(index)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div style={s.sections}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Configuracoes gerais</h2>
            <form onSubmit={handleSave} style={s.form}>
              {isAdmin && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>URL da API (Evolution)</label>
                    <input
                      style={s.input}
                      value={form.evolutionUrl}
                      onChange={(e) => setForm({ ...form, evolutionUrl: e.target.value })}
                      placeholder="https://api.sua-instancia.com"
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Chave global da API (Evolution)</label>
                    <input
                      style={s.input}
                      type="password"
                      value={form.evolutionKey}
                      onChange={(e) => setForm({ ...form, evolutionKey: e.target.value })}
                      placeholder="42-caracteres..."
                    />
                  </div>
                </>
              )}

              <div style={s.field}>
                <label style={s.label}>Habilitar robo de IA</label>
                <div style={s.toggleCard}>
                  <div style={s.toggleInfo}>
                    <span style={{ ...s.toggleStatus, color: form.botEnabled ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {form.botEnabled ? 'Robo ativo' : 'Robo desligado'}
                    </span>
                    <p style={s.toggleHint}>O robo respondera automaticamente tickets sem atendente.</p>
                  </div>
                  <input
                    type="checkbox"
                    style={s.switch}
                    checked={form.botEnabled}
                    onChange={(e) => setForm({ ...form, botEnabled: e.target.checked })}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Nome do robo</label>
                <input
                  style={s.input}
                  value={form.botName}
                  onChange={(e) => setForm({ ...form, botName: e.target.value })}
                  placeholder="Ex: LCD Bot"
                />
                <p style={s.hint}>Este nome aparece para a equipe no chat interno.</p>
              </div>

              <div style={s.field}>
                <label style={s.label}>Chave Gemini (IA)</label>
                <input
                  style={s.input}
                  type="password"
                  value={form.geminiKey}
                  onChange={(e) => setForm({ ...form, geminiKey: e.target.value })}
                  placeholder="AIza..."
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Chave SerpAPI (Prospecção de Leads)</label>
                <input
                  style={s.input}
                  type="password"
                  value={form.serpApiKey}
                  onChange={(e) => setForm({ ...form, serpApiKey: e.target.value })}
                  placeholder="Cole aqui sua chave do serpapi.com"
                />
                <p style={s.hint}>Cadastre-se grátis em serpapi.com — 250 buscas/mês gratuitas.</p>
              </div>

              <div style={s.field}>
                <label style={s.label}>URL do webhook externo</label>
                <input
                  style={s.input}
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                  placeholder="https://seu-crm.com/api/webhook"
                />
                <p style={s.hint}>Disparado quando um atendimento e encerrado.</p>
              </div>

              <button style={s.saveBtn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alteracoes'}</button>
            </form>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>Comportamento da IA</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Instrucoes do sistema (system prompt)</label>
                <textarea
                  style={{ ...s.input, minHeight: '120px', resize: 'vertical' }}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="Ex: Voce e um atendente cordial da clinica X. Seu objetivo e agendar consultas..."
                />
                <p style={s.hint}>Defina personalidade e contexto para o robo.</p>
              </div>

              <div style={s.field}>
                <label style={s.label}>Palavra-chave de transferencia</label>
                <input
                  style={s.input}
                  value={form.transferKeyword}
                  onChange={(e) => setForm({ ...form, transferKeyword: e.target.value })}
                  placeholder="Ex: atendente"
                />
                <p style={s.hint}>Quando o cliente digitar isso, a IA para de responder e envia para "Aguardando".</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={s.sections}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Horario de atendimento</h2>
            <div style={s.form}>
              {hours.map((hour, index) => (
                <div
                  key={hour.dayOfWeek}
                  style={{
                    ...s.hourRow,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                  }}
                >
                  <div style={{ width: '100px', fontWeight: 800, marginBottom: isMobile ? '8px' : '0' }}>
                    {DAYS[hour.dayOfWeek]}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                    <input
                      type="checkbox"
                      checked={hour.active}
                      onChange={(e) => {
                        const next = [...hours];
                        next[index].active = e.target.checked;
                        setHours(next);
                      }}
                    />
                    <input
                      type="time"
                      style={s.hourInput}
                      value={hour.start}
                      disabled={!hour.active}
                      onChange={(e) => {
                        const next = [...hours];
                        next[index].start = e.target.value;
                        setHours(next);
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ate</span>
                    <input
                      type="time"
                      style={s.hourInput}
                      value={hour.end}
                      disabled={!hour.active}
                      onChange={(e) => {
                        const next = [...hours];
                        next[index].end = e.target.value;
                        setHours(next);
                      }}
                    />
                  </div>
                </div>
              ))}
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar horarios'}</button>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>Mensagem de ausencia</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Texto automatico</label>
                <textarea
                  style={{ ...s.input, minHeight: '120px' }}
                  value={form.outOfOfficeMessage}
                  onChange={(e) => setForm({ ...form, outOfOfficeMessage: e.target.value })}
                  placeholder="Ola! No momento nossa equipe esta descansando. Deixe sua duvida que responderemos em breve..."
                />
                <p style={s.hint}>Enviada automaticamente fora do horario comercial.</p>
              </div>

              <div style={s.field}>
                <label style={s.label}>WhatsApp para alertas do sistema</label>
                <input
                  style={s.input}
                  value={form.notificationPhone}
                  onChange={(e) => setForm({ ...form, notificationPhone: e.target.value })}
                  placeholder="5511999999999"
                />
                <p style={s.hint}>Voce recebera avisos tecnicos neste numero.</p>
              </div>

              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar configuracoes de ausencia'}
              </button>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>Pesquisa de satisfacao (CSAT)</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Habilitar avaliacao ao encerrar</label>
                <div style={s.toggleCard}>
                  <div style={s.toggleInfo}>
                    <span style={{ ...s.toggleStatus, color: form.ratingEnabled ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {form.ratingEnabled ? 'Ativa' : 'Desativada'}
                    </span>
                    <p style={s.toggleHint}>O cliente recebera uma pergunta de 1 a 5 apos o encerramento.</p>
                  </div>
                  <input
                    type="checkbox"
                    style={s.switch}
                    checked={form.ratingEnabled}
                    onChange={(e) => setForm({ ...form, ratingEnabled: e.target.checked })}
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Mensagem de avaliacao</label>
                <textarea
                  style={{ ...s.input, minHeight: '80px' }}
                  value={form.ratingMessage}
                  onChange={(e) => setForm({ ...form, ratingMessage: e.target.value })}
                  placeholder="Como voce avalia nosso atendimento de 1 a 5?"
                />
                <p style={s.hint}>Use numeros de 1 a 5 para que o sistema identifique a nota.</p>
              </div>

              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar configuracoes CSAT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 2 && <Users />}
      {tab === 3 && <Teams />}

      {tab === 4 && (
        <div style={s.sections}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Dados da empresa</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Razao social / nome da empresa</label>
                <input
                  style={s.input}
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Sua Empresa LTDA"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>CNPJ / CPF</label>
                  <input
                    style={s.input}
                    value={form.companyCnpj}
                    onChange={(e) => setForm({ ...form, companyCnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Inscricao estadual</label>
                  <input
                    style={s.input}
                    value={form.companyIE}
                    onChange={(e) => setForm({ ...form, companyIE: e.target.value })}
                    placeholder="Isento"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ ...s.field, flex: 2 }}>
                  <label style={s.label}>Endereco (rua e numero)</label>
                  <input
                    style={s.input}
                    value={form.companyAddress}
                    onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                    placeholder="Ex: Av. Brasil, 123"
                  />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Bairro</label>
                  <input
                    style={s.input}
                    value={form.companyBairro}
                    onChange={(e) => setForm({ ...form, companyBairro: e.target.value })}
                    placeholder="Ex: Centro"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>CEP</label>
                  <input
                    style={s.input}
                    value={form.companyCep}
                    onChange={(e) => setForm({ ...form, companyCep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Telefone de contato</label>
                  <input
                    style={s.input}
                    value={form.companyPhone}
                    onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ ...s.field, flex: 2 }}>
                  <label style={s.label}>Cidade</label>
                  <input
                    style={s.input}
                    value={form.companyCity}
                    onChange={(e) => setForm({ ...form, companyCity: e.target.value })}
                    placeholder="Ex: Porto Alegre"
                  />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Estado (UF)</label>
                  <input
                    style={s.input}
                    value={form.companyState}
                    onChange={(e) => setForm({ ...form, companyState: e.target.value })}
                    placeholder="Ex: RS"
                  />
                </div>
              </div>

              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar dados da empresa'}
              </button>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>Logotipo</h2>
            <div style={{ ...s.form, alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <div style={s.logoPreview}>
                {tenant?.logoUrl ? (
                  <img src={getMediaUrl(tenant.logoUrl)} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 700 }}>Sem logo</span>
                )}
              </div>

              <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              <label htmlFor="logo-upload" style={{ ...s.saveBtn, cursor: 'pointer', textAlign: 'center', width: '100%', display: 'block' }}>
                {saving ? 'Enviando...' : 'Importar nova logo'}
              </label>
              <p style={s.hint}>Tamanho recomendado: 300x300 px (PNG ou JPG)</p>
            </div>
          </div>
        </div>
      )}

      {tab === 5 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={s.sectionHeading}>Respostas rapidas</h3>
            <p style={s.hint}>Use "/" no chat para acessar mensagens pre-definidas.</p>
          </div>

          <div style={{ ...s.quickAddBox, flexDirection: isMobile ? 'column' : 'row' }}>
            <input style={s.input} value={newQuick.shortcut} onChange={(e) => setNewQuick({ ...newQuick, shortcut: e.target.value })} placeholder="/atalho" />
            <input
              style={{ ...s.input, flex: 2 }}
              value={newQuick.message}
              onChange={(e) => setNewQuick({ ...newQuick, message: e.target.value })}
              placeholder="Mensagem automatica..."
            />
            <button type="button" onClick={handleAddQuick} style={s.saveBtn}>Adicionar</button>
          </div>

          <div style={s.quickList}>
            {quickResponses.map((item) => (
              <div key={item.id} style={s.quickItem}>
                <div>
                  <strong style={{ color: 'var(--accent)' }}>{item.shortcut}</strong>
                  <div style={s.quickMessage}>{item.message}</div>
                </div>
                <button type="button" onClick={() => handleDeleteQuick(item.id)} style={s.delBtn}>Excluir</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 6 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={s.sectionHeading}>Gestao de etiquetas</h3>
            <p style={s.hint}>Defina as etiquetas oficiais que serao usadas para organizar seus contatos.</p>
          </div>

          <form onSubmit={handleAddTag} style={{ ...s.quickAddBox, flexDirection: isMobile ? 'column' : 'row' }}>
            <input
              style={s.input}
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              placeholder="Nome da etiqueta (ex: Financeiro)"
            />
            <input
              type="color"
              style={{ ...s.input, width: isMobile ? '100%' : '60px', padding: '2px' }}
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
            />
            <button type="submit" style={s.saveBtn}>Adicionar</button>
          </form>

          <div style={s.quickList}>
            {tags.map((item) => (
              <div key={item.id} style={s.quickItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                  <strong style={{ color: item.color }}>{item.name}</strong>
                </div>
                <button type="button" onClick={() => handleDeleteTag(item.id)} style={s.delBtn}>Excluir</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 7 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={s.sectionHeading}>Minha conta</h3>
          </div>

          <div style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Seu nome</label>
              <input style={s.input} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>

            <div style={s.field}>
              <label style={s.label}>E-mail</label>
              <input style={s.input} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Nova senha (opcional)</label>
              <input
                style={s.input}
                type="password"
                value={profile.password}
                onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                placeholder="******"
              />
            </div>

            <div style={s.saveRow}>
              {profileSaved && <span style={s.savedMsg}>Perfil atualizado</span>}
              <button style={s.saveBtn} type="button" onClick={handleProfileSave} disabled={saving}>Salvar perfil</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const s = {
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-main)' },
  header: { marginBottom: '3rem' },
  kicker: {
    margin: '0 0 0.45rem',
    color: 'var(--accent)',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' },
  subtitle: { fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 },
  tabs: { display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2.5rem' },
  tab: {
    padding: '0.8rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    fontWeight: 700,
  },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  sections: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' },
  card: { background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)' },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
    marginBottom: '2rem',
    color: 'var(--accent)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1rem',
  },
  sectionHeading: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-main)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  toggleCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    background: 'var(--bg-base)',
    padding: '1.25rem',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  toggleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  toggleStatus: { fontWeight: 800, fontSize: '0.88rem' },
  toggleHint: { fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 },
  switch: { width: '40px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' },
  label: { fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.9rem',
  },
  hint: { fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.5 },
  saveBtn: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
    padding: '0.9rem 1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 800,
    marginTop: '1rem',
  },
  saveRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '2rem' },
  savedMsg: { color: '#2fb171', fontSize: '0.9rem', fontWeight: 700 },
  quickAddBox: {
    display: 'flex',
    gap: '1rem',
    background: 'var(--bg-base)',
    padding: '1.5rem',
    borderRadius: '16px',
    marginBottom: '2rem',
    border: '1px solid var(--border-color)',
  },
  quickList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  quickItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    background: 'var(--bg-panel)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  quickMessage: { fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 },
  delBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    borderRadius: '10px',
    padding: '0.55rem 0.85rem',
    fontWeight: 700,
  },
  hourRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 0', borderBottom: '1px solid var(--border-color)' },
  hourInput: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.45rem 0.65rem',
    color: 'var(--text-main)',
    outline: 'none',
    colorScheme: 'dark',
  },
  logoPreview: {
    width: '160px',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    borderRadius: '16px',
    border: '1px dashed var(--border-color)',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
};
