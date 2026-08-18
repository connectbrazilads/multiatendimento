const fs = require('fs');
const path = require('path');

const dir = 'frontend/src';

const replacements = [
  // Configurações
  { from: /'Configuracoes'/g, to: "'Configurações'" },
  { from: /"Configuracoes"/g, to: '"Configurações"' },
  { from: />Configuracoes</g, to: '>Configurações<' },
  { from: />Configuracoes /g, to: '>Configurações ' },
  
  // Usuários
  { from: /'Usuarios'/g, to: "'Usuários'" },
  { from: /"Usuarios"/g, to: '"Usuários"' },
  { from: />Usuarios</g, to: '>Usuários<' },
  { from: />Usuarios /g, to: '>Usuários ' },
  { from: /'Usuario'/g, to: "'Usuário'" },
  { from: /"Usuario"/g, to: '"Usuário"' },
  { from: />Usuario</g, to: '>Usuário<' },
  { from: />Usuario /g, to: '>Usuário ' },

  // Ações
  { from: />Acoes</g, to: '>Ações<' },
  { from: /"Acoes"/g, to: '"Ações"' },
  { from: /'Acoes'/g, to: "'Ações'" },

  // Conexões
  { from: /'Conexoes'/g, to: "'Conexões'" },
  { from: /"Conexoes"/g, to: '"Conexões"' },
  { from: />Conexoes</g, to: '>Conexões<' },

  // Robô
  { from: /robo /g, to: 'robô ' },
  { from: /robo\./g, to: 'robô.' },
  { from: /Robo /g, to: 'Robô ' },

  // Rápidas
  { from: /rapida/g, to: 'rápida' },
  { from: /rapidas/g, to: 'rápidas' },

  // Outros
  { from: /Opcoes/g, to: 'Opções' },
  { from: /Ausencia/g, to: 'Ausência' },
  { from: /Inscricao/g, to: 'Inscrição' },
  { from: /Endereco/g, to: 'Endereço' },
  { from: /Relatorio/g, to: 'Relatório' },
  { from: /Horario/g, to: 'Horário' },
  { from: />Ate /g, to: '>Até ' },
  { from: /'ate'/g, to: "'até'" },
  { from: />ate /g, to: '>até ' },
  { from: /instancia/g, to: 'instância' },
  { from: /Instancia/g, to: 'Instância' },
  
  // Confirmação / Exclusão
  { from: /Confirmacao/g, to: 'Confirmação' },
  { from: /Exclusao/g, to: 'Exclusão' },
  { from: /excluida/g, to: 'excluída' },
  { from: /excluido/g, to: 'excluído' },

  // Situação
  { from: /Situacao/g, to: 'Situação' },
  
  // Histórico
  { from: /Historico/g, to: 'Histórico' },

  // Mídia
  { from: /Midia/g, to: 'Mídia' },
  { from: /midias/g, to: 'mídias' },

  // Dúvida / Título
  { from: /Duvida/g, to: 'Dúvida' },
  { from: /duvida/g, to: 'dúvida' },
  { from: /Titulo/g, to: 'Título' },
  { from: /titulo/g, to: 'título' },

  // Padrão / Padrões
  { from: /Padrao/g, to: 'Padrão' },
  { from: /Padroes/g, to: 'Padrões' },
  
  // Atribuído
  { from: /atribuido/g, to: 'atribuído' },
  
  // Você
  { from: /Voce /g, to: 'Você ' },
  { from: />Voce /g, to: '>Você ' },
  { from: /voce /g, to: 'você ' },
  
  // Fórum
  { from: /Forum/g, to: 'Fórum' },
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;
      
      replacements.forEach(({from, to}) => {
        if (content.match(from)) {
          content = content.replace(from, to);
          changed = true;
        }
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(dir);
