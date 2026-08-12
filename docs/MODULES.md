Copyright (c) 2026 Jhonatan Quirino

# Referência de Módulos

Este arquivo descreve o propósito e as responsabilidades de cada módulo no GW Admin Hub.

## Visão geral

O repositório contém seis módulos principais do Google Apps Script. Cada módulo é autocontido e trata de uma área específica da administração do Google Workspace.

## Módulos

### 1. AniversariantesGW

**Propósito**
- Detectar aniversários e aniversários de empresa dos colaboradores.
- Enviar e-mails de notificação quando as datas coincidirem.

**Responsabilidades principais**
- Lê todos os usuários do Google Workspace.
- Compara datas de nascimento e de admissão com a data atual.
- Envia notificações por e-mail usando templates HTML.

**Arquivos importantes**
- `main.js` - Lógica principal.
- `Constantes.js` - Configuração de propriedades do módulo.
- `Diretorio.js` - Helper do Admin Directory.
- `Email_Aniversario.html` - Template de e-mail.
- `Email_TempoEmpresa.html` - Template de e-mail.

**Dependências externas**
- Google Workspace Admin Directory API
- Gmail API

**Observações**
- O agendamento deve ser configurado por meio de gatilho cronológico no Apps Script.

### 2. BoasVindasGW

**Propósito**
- Automatizar comunicações de onboarding para novos usuários.
- Enviar e-mails de boas-vindas e gerar relatórios.

**Responsabilidades principais**
- Identifica usuários criados recentemente.
- Filtra usuários elegíveis para envio de boas-vindas.
- Oferece modo de teste sem envio de e-mails reais.
- Registra ações em logs estruturados.

**Arquivos importantes**
- `main.js` - Pontos de entrada e orquestração.
- `Teste_BoasVindas.js` - Suite de testes.
- `TestRunner.js` - Suporte para execução de testes.
- `Email_BoasVindas.html` - Template de e-mail.
- `Email_RelatorioBoasVindas.html` - Template de relatório.

**Dependências externas**
- Google Workspace Admin Directory API
- Gmail API

**Observações**
- Testes podem ser executados no editor do Apps Script ou via `clasp run`.

### 3. criacaoUsuarioGW

**Propósito**
- Criar usuários no Google Workspace com base em dados do HCM.
- Consumir dados de colaboradores do Firebase Realtime Database.

**Responsabilidades principais**
- Carregar usuários existentes no diretório.
- Buscar colaboradores no Firebase.
- Filtrar colaboradores elegíveis.
- Criar usuários no Google Workspace.
- Gerar senhas seguras.
- Armazenar CPF e outros campos customizados.

**Arquivos importantes**
- `main.js` - Fluxo de criação automatizado.
- `Integracao_Firebase.js` - Integração com Firebase.
- `Servico_Token_Firebase.js` - Gestão de token do Firebase.
- `Util_CPF.js` - Validação de CPF.
- `Util_CriacaoUsuarios.js` - Helpers de criação de usuário.
- `Util_Senha.js` - Geração de senhas.
- `constantes.js` - Configuração do módulo.
- `Email_CriacaoUsuario.html` - Template de e-mail.

**Dependências externas**
- Firebase Realtime Database
- Google Workspace Admin Directory API

### 4. DadosRecuperacaoGW

**Propósito**
- Sincronizar dados de recuperação entre Google Workspace e HCM.

**Responsabilidades principais**
- Buscar dados de recuperação no Firebase.
- Comparar com usuários do Google Workspace.
- Atualizar campos como e-mail e telefone de recuperação.
- Sincronizar unidades organizacionais, quando aplicável.

**Arquivos importantes**
- `main.js` - Fluxo de sincronização.
- `Integracao_Firebase.js` - Conexão com Firebase.
- `Constantes.js` - Configuração do módulo.

**Dependências externas**
- Firebase Realtime Database
- Google Workspace Admin Directory API

### 5. UsuariosAtivosGW

**Propósito**
- Gerenciar usuários ativos e mover colaboradores para unidades organizacionais corretas.

**Responsabilidades principais**
- Verificar colaboradores com situação ativa.
- Reativar usuários suspensos.
- Atualizar OUs e atributos de usuário.

**Arquivos importantes**
- `Main.js` - Fluxo principal de ativação.
- `Atualizacoes.js` - Atualizações de usuário.
- `Constantes.js` - Configuração do módulo.
- `Diretorio.js` - Helper do diretório.

**Dependências externas**
- Google Workspace Admin Directory API

### 6. UsuariosSuspensosGW

**Propósito**
- Gerenciar suspensão e desligamento de usuários.

**Responsabilidades principais**
- Suspender colaboradores com situação desligado ou afastado.
- Mover usuários para OUs de suspensão ou desligamento.
- Gerenciar licenças quando aplicável.

**Arquivos importantes**
- `Main.js` - Orquestração principal.
- `Suspensao.js` - Lógica de suspensão.
- `Suspenso_Afastado.js` - Tratamento de afastados.
- `Util_Senha.js` - Utilitários relacionados.
- `Integracao_Firebase.js` - Integração com Firebase, quando usada.

**Dependências externas**
- Google Workspace Admin Directory API
- Admin License Manager API

## Como usar esta documentação

- Use este arquivo para entender a responsabilidade de cada módulo
- Consulte `SETUP.md` e `DEVELOPMENT.md` para colocar o projeto em funcionamento
- Atualize a documentação sempre que fizer alterações no código
