# GW Admin Hub

> Plataforma de automação para administração do Google Workspace, construída com Google Apps Script. O projeto é composto por módulos independentes que rodam como projetos Apps Script separados.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-produção-brightgreen.svg)]()

## 📌 Sobre o projeto

O **GW Admin Hub** automatiza tarefas de administração do Google Workspace, usando dados disponíveis no Firebase Realtime Database como fonte de verdade.

O projeto é organizado em módulos separados, cada um responsável por um domínio distinto do ciclo de vida do usuário.

## 🏛️ Arquitetura

A arquitetura é modular e descentralizada. Cada pasta do repositório representa um projeto Apps Script autônomo, implantado independentemente.

A interação entre os módulos é indireta e baseada em estado. Um módulo altera o estado do usuário no Google Workspace e outro módulo reage a essa mudança.

## 🚀 Início rápido

### Pré-requisitos
- Conta de administrador do Google Workspace
- Projeto Firebase Realtime Database
- Credenciais de serviço do Firebase
- `clasp` instalado

### Instalação

Veja [docs/SETUP.md](docs/SETUP.md) para instruções completas.

```bash
git clone <repository-url>
cd <repository-folder>

npm install -g @google/clasp
```

> Atenção: este repositório não possui `package.json` no nível raiz. O gerenciamento de cada módulo é feito separadamente.

### Configuração

Cada módulo utiliza propriedades de script no Editor do Apps Script.

Propriedades comuns:

```text
EMAIL_ADMIN
EMAIL_COMUNICACAO
CEP_EMAIL
INTEGRATION
NOME_DOMINIO
```

Consulte [docs/SETUP.md](docs/SETUP.md#propriedades-do-script) para a tabela completa de propriedades organizacionais, UOs, situações, Firebase, imagens e integrações. As propriedades devem ser definidas no projeto Apps Script de cada módulo e nunca versionadas.

Propriedades Firebase (quando aplicável):

```text
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_PROJECT_ID
```

## 📚 Documentação

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitetura do sistema e fluxo de dados
- **[docs/MODULES.md](docs/MODULES.md)** - Documentação dos módulos
- **[docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)** - APIs e integrações externas
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Guia de desenvolvimento
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solução de problemas
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Como contribuir
- **[SECURITY.md](SECURITY.md)** - Política de segurança

## 🏗️ Módulos em resumo

| Módulo | Propósito | Acionamento | Dependências |
|--------|-----------|-------------|--------------|
| `AniversariantesGW` | E-mails de aniversário e tempo de empresa | Agendado diariamente | Admin Directory, Gmail |
| `BoasVindasGW` | E-mails de boas-vindas para novos usuários | Verificação agendada de novas contas | Admin Directory, Gmail |
| `criacaoUsuarioGW` | Provisionamento de usuários a partir do HCM | Agendado | Firebase, Admin Directory |
| `DadosRecuperacaoGW` | Sincronização de dados de recuperação | Agendado | Firebase, Admin Directory |
| `IntegracaoERPGW` | Recebimento e normalização de dados de ERP para Firebase | Web App ou agendado | Firebase, UrlFetchApp |
| `UsuariosAtivosGW` | Gestão de usuários ativos e OUs | Agendado | Admin Directory, Schemas customizados |
| `UsuariosSuspensosGW` | Suspensão e desligamento de usuários | Agendado | Admin Directory, License Manager |

## 🔐 Segurança

- Credenciais armazenadas nas propriedades do Apps Script
- Dados sensíveis mascarados nos logs
- Acesso restrito a administradores do Google Workspace
- Verifique [SECURITY.md](SECURITY.md) para detalhes

## 🧪 Testes

Alguns módulos incluem funções de teste executáveis via `clasp` ou editor do Apps Script.

```bash
cd BoasVindasGW
clasp run testarServicoBoasVindas
```

## 📈 Monitoramento

O projeto usa logging estruturado e auditoria para acompanhar operações e erros.

## 🤝 Contribuição

Contribuições são bem-vindas. Veja [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes.

## 📋 Licença

Este projeto está licenciado sob MIT. Veja `LICENSE`.

## 📝 Observações finais

Este repositório deve ser usado como referência para automação do Google Workspace com Apps Script. Atualize a documentação sempre que fizer mudanças no código.
