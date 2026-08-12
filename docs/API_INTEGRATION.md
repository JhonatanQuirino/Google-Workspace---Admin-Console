Copyright (c) 2026 Jhonatan Quirino

# Guia de Integrações

Este documento descreve as APIs e integrações externas usadas pelo GW Admin Hub.

## APIs do Google Workspace

### Admin Directory API

Utilizada na maioria dos módulos para gerenciar usuários e unidades organizacionais.

Serviços habilitados:
- `AdminDirectory` (`admin`, `directory_v1`)
- `users.list`
- `users.get`
- `users.update`
- `users.insert`
- `orgUnits.get`
- `orgUnits.list`

Escopos necessários:
- `https://www.googleapis.com/auth/admin.directory.user`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/admin.directory.orgunit`

### Gmail API

Utilizada para envio de e-mails nos módulos de comunicação.

Serviços habilitados:
- `Gmail` (`gmail`, `v1`)
- `users.messages.send`

Escopos necessários:
- `https://www.googleapis.com/auth/gmail.send`
- `https://mail.google.com/`

### Admin License Manager API

Usada pelo módulo `UsuariosSuspensosGW` para gerenciar licenças.

Serviço habilitado:
- `AdminLicenseManager` (`licensing`, `v1`)

Escopo necessário:
- `https://www.googleapis.com/auth/apps.licensing`

### Google Calendar API

Utilizada em fluxos de suspensão e onboarding quando há operações de calendário.

Escopo necessário:
- `https://www.googleapis.com/auth/calendar`

### Drive e Sheets

Alguns relatórios e anexos podem usar APIs de Drive e Planilhas.

Escopos necessários:
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`

## Firebase Realtime Database

Vários módulos leem dados de colaboradores do Firebase.

### Padrão de integração

A integração é feita por um helper customizado em `Integracao_Firebase.js`, usando `UrlFetchApp.fetch()` e JWT de serviço.

Campos esperados:
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PROJECT_ID`

### Caminhos usados

- `/Colaboradores`
- `/Mapeamento_UO`
- `/Parque Tecnologico`
- `/tickets`
- `/chatbotFlow`
- `/setores`

## Integração com GitHub

O código inclui constantes para backup em GitHub, mas isso não está habilitado por padrão.

Valores referenciados:
- `GITHUB_CONSTANTS.OWNER`
- `GITHUB_CONSTANTS.REPO`
- `GITHUB_CONSTANTS.PATH`
- `GITHUB_CONSTANTS.COMMIT_MESSAGE`
- `GITHUB_CONSTANTS.TOKEN`

## Autenticação e autorização

### OAuth

O Apps Script gerencia a autorização dos escopos Google.

### Conta de serviço

O acesso ao Firebase usa conta de serviço, com os valores armazenados em propriedades.

### Limites de API

O código contém lógica de retry para lidar com erros de limite e falhas transitórias.

Condições comuns de retry:
- `500`, `502`, `503`, `504`
- `429`
- `quota exceeded`

## Lista de verificação

- [ ] Admin Directory API ativada
- [ ] Gmail API ativada
- [ ] License Manager API ativada
- [ ] Calendar API ativada
- [ ] Firebase configurado
- [ ] Propriedades do Apps Script definidas
- [ ] Gatilhos configurados

## Limitações

- Não há gateway de API central
- A integração depende do tempo de execução do Apps Script
- A integração com Firebase é REST customizado
