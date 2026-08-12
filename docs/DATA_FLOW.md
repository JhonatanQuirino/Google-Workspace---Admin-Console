Copyright (c) 2026 Jhonatan Quirino

# Data Flow

Este documento descreve os fluxos de dados principais do GW Admin Hub.

## Fonte de verdade

O projeto usa o **Firebase Realtime Database** como fonte de verdade para os dados HCM dos colaboradores.

## Fluxos Principais

### 1. Provisionamento de usuários

1. `criacaoUsuarioGW` lê colaboradores do Firebase
2. Lê usuários existentes do Google Workspace via `AdminDirectory.Users.list`
3. Filtra colaboradores elegíveis (`situacao = '1'`)
4. Gera e-mails únicos e senhas
5. Cria usuários no Google Workspace com `AdminDirectory.Users.insert`
6. Registra CPF em `customSchemas.Informacoes_HCM`

### 2. Sincronização de dados de recuperação

1. `DadosRecuperacaoGW` lê todos os usuários do Google Workspace
2. Lê todos os colaboradores do Firebase
3. Compara dados de recuperação (`recoveryEmail` e `recoveryPhone`)
4. Atualiza usuários no Google Workspace quando há divergências

### 3. Gerenciamento de usuários ativos

1. `UsuariosAtivosGW` lê colaboradores do Firebase
2. Filtra colaboradores com situação ativa (`situacao = '1')`
3. Busca correspondência no Google Workspace por CPF ou e-mail
4. Atualiza OU e reativa usuários suspensos para a UO correta

### 4. Gerenciamento de suspensos e desligados

1. `UsuariosSuspensosGW` lê colaboradores do Firebase
2. Identifica colaboradores desligados (`situacao = '7')` e afastados
3. Atualiza usuários no Google Workspace para OUs de suspensão
4. Remove ou gerencia licenças com `AdminLicenseManager`

### 5. Boas-vindas e notificações

1. `BoasVindasGW` busca usuários criados recentemente no Google Workspace
2. Filtra usuários elegíveis para boas-vindas
3. Envia e-mails de boas-vindas via `GmailApp` ou `Gmail` avançado
4. Gera relatórios de envio

### 6. Aniversários e tempo de empresa

1. `AniversariantesGW` busca todos os usuários do Google Workspace
2. Compara datas de nascimento e admissão com a data atual
3. Envia e-mails de aniversário e de tempo de empresa

## Componentes de Integração

- Firebase Realtime Database
- Google Workspace Admin Directory API
- Gmail API
- Admin License Manager API
- Google Calendar API (quando aplicável)

## Observação

Os módulos não se comunicam diretamente entre si. A integração é baseada no estado dos dados do Google Workspace e do Firebase.
