# Arquitetura do Sistema

Este documento descreve a arquitetura geral, padrões de design e interações de componentes do GW Admin Hub.

## Sumário

1. [Arquitetura de alto nível](#arquitetura-de-alto-nivel)
2. [Arquitetura dos módulos](#arquitetura-dos-modulos)
3. [Fluxo de dados](#fluxo-de-dados)
4. [Interações de componentes](#interacoes-de-componentes)
5. [Padrões de design](#padroes-de-design)
6. [Escalabilidade e desempenho](#escalabilidade-e-desempenho)
7. [Tratamento de erros e resiliência](#tratamento-de-erros-e-resiliencia)

---

## Arquitetura de alto nível

### Visão geral do sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      Sistemas externos                     │
├─────────┬─────────────────────────────────────────┬─────────┤
│ Firebase│  Google Workspace Admin API  │ Gmail API│
└────┬────┴────────────────┬───────────────────────┴────┬─────┘
     │                     │                             │
     ▼                     ▼                             ▼
┌────────────────────────────────────────────────────────────┐
│              GW Admin Hub (Apps Script)                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         Camada de utilitários compartilhados        │  │
│  │  • Diretorio (helpers da Admin API)               │  │
│  │  • Integracao_Firebase (cliente Firebase)         │  │
│  │  • Util_CPF (validação de CPF)                    │  │
│  │  • Util_Senha (geração de senha)                  │  │
│  │  • Logger (logging estruturado)                   │  │
│  └────────────────────────────────────────────────────┘  │
│                          ▲                                 │
│                          │                                 │
│  ┌───────────────────────┼────────────────────────────┐   │
│  │        Camada de módulos                        │   │
│  ├───────────────────────┼────────────────────────────┤   │
│  │                       ▼                             │   │
│  │  1. AniversariantesGW (Aniversários)              │   │
│  │  2. BoasVindasGW (Onboarding)                     │   │
│  │  3. criacaoUsuarioGW (Provisionamento)            │   │
│  │  4. DadosRecuperacaoGW (Sincronização de dados)   │   │
│  │  5. UsuariosAtivosGW (Usuários ativos)            │   │
│  │  6. UsuariosSuspensosGW (Suspensão)               │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Pilha tecnológica

| Camada | Tecnologia | Versão |
|-------|-----------|---------|
| **Runtime** | Google Apps Script | V8 |
| **Fonte de dados** | Firebase Realtime Database | Latest |
| **API principal** | Google Workspace Admin | v1 |
| **Comunicação** | Gmail API | v1 |
| **Calendário** | Google Calendar API | Latest |
| **Logging** | Google Cloud Stackdriver | Integrado |
| **Configuração** | Propriedades do Apps Script | Integrado |

### Princípios arquiteturais

1. **Modularidade** - Cada módulo é independente e autocontido
2. **Separação de responsabilidades** - Utilitários separados da lógica de negócio
3. **Resiliência** - Lógica de retry e tratamento de erros generalizado
4. **Auditabilidade** - Todas as operações logadas no Stackdriver
5. **Segurança** - Credenciais no Properties Service, mascaramento de dados sensíveis
6. **Simplicidade** - Uso de serviços Google nativos para infraestrutura

---

## Arquitetura dos módulos

### Estrutura de módulo

Cada módulo segue esta estrutura:

```
ModuleNameGW/
├── appsscript.json          # Configuração do projeto
├── .clasp.json              # Configuração do CLASP (dev)
├── main.js                  # Entradas e lógica principal
├── Constantes.js            # Configuração específica do módulo
├── Diretorio.js             # Helpers da Admin API
├── Integracao_Firebase.js   # Integração com Firebase (quando necessário)
├── Util_*.js               # Utilitários e classes auxiliares
├── Email_*.html            # Templates de e-mail
├── Teste_*.js              # Suites de teste
└── [Outros arquivos do módulo]
```

### Dependências entre módulos

```
Todos os módulos
    ├── Constantes.js (configuração)
    ├── Diretorio.js (acesso Admin API)
    └── Util_*.js (utilitários)
         ├── Util_CPF.js
         ├── Util_Senha.js
         └── Logger.js (se presente)

Módulos que usam Firebase:
    ├── criacaoUsuarioGW
    ├── DadosRecuperacaoGW
    └── UsuariosAtivosGW
         └── Integracao_Firebase.js

Módulos de e-mail:
    ├── BoasVindasGW
    └── AniversariantesGW
         └── Email_*.html
```

---

## Fluxo de dados

### 1. Fluxo de provisionamento de usuários

```
Dados do HCM (Firebase)
    │
    ▼
criacaoUsuarioGW.executarCriacaoAutomatica()
    ├── Busca usuários existentes no GW
    ├── Carrega colaboradores do Firebase
    ├── Filtra usuários elegíveis (situação = 1)
    ├── Validação de CPF (Util_CPF)
    └── Criação de usuários no Google Workspace
         ├── Util_Senha.gerar() → senha
         ├── Admin Directory API → create user
         ├── Schema customizado → armazena CPF
         └── Notificação por e-mail (Gmail API)
```

### 2. Fluxo de sincronização de dados

```
Google Workspace (Usuários)
    ├── Busca todos os usuários
    └── Extrai dados (nome, e-mail, CPF)

HCM (Firebase)
    ├── Carrega colaboradores
    └── Extrai dados de recuperação

DadosRecuperacaoGW.sincronizarDadosRecuperacao()
    ├── Constroi mapa de CPF
    ├── Compara GW ↔ HCM
    └── Atualiza usuários do GW
         ├── Telefone de recuperação
         ├── E-mail de recuperação
         └── Campos customizados
```

### 3. Fluxo de ativação/suspensão

```
Mudanças no HCM (evento Firebase ou verificação agendada)
    │
    ├─→ UsuariosAtivosGW.ativarColaboradorSituacao1()
    │   └── Reativa usuários suspensos → Move para OU ativo
    │
    └─→ UsuariosSuspensosGW
        ├── Sincronizar Desligados (situacao=7)
        │   └── Move para OU de suspensão
        │
        └─→ Sincronizar Afastados (situacao=2)
            └── Gerencia licenças para afastamento
```

### 4. Fluxo de notificações de eventos

```
A cada dia em horário agendado
    │
    ├─→ AniversariantesGW.executarVerificacoesDeAniversario()
    │   ├── Obtém a data atual (dd-MM)
    │   ├── Confere aniversários
    │   ├── Confere tempo de empresa
    │   └── Envia e-mails (Gmail API)
    │
    └─→ BoasVindasGW.BoasVindasService.enviarAutomatico()
        ├── Obtém usuários criados na última semana
        ├── Exclui o último dia
        ├── Envia e-mail de boas-vindas (Gmail API)
        └── Registra no log de auditoria
```

---

## Interações de componentes

### Gerenciamento de configuração

```
┌──────────────────────────────────┐
│   Editor do Google Apps Script   │
│   Configurações do projeto       │
│        Propriedades              │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│   PropertiesService (criptografado)  │
├──────────────────────────────────┤
│ • FIREBASE_PRIVATE_KEY           │
│ • FIREBASE_CLIENT_EMAIL          │
│ • FIREBASE_PROJECT_ID            │
│ • NOME_DOMINIO                   │
│ • EMAIL_ADMIN                    │
│ • E-mails de integração          │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│   Constantes.js                  │
│ (lê do Properties Service)       │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│   Código do módulo               │
│ (usa as constantes)              │
└──────────────────────────────────┘
```

### Camada de acesso à API

```
Código do módulo
    │
    ├─→ Diretorio.js
    │   └─→ AdminDirectory API (com lógica de retry)
    │
    ├─→ Integracao_Firebase.js
    │   └─→ REST do Firebase (com JWT)
    │
    ├─→ Util_*.js
    │   └─→ Gmail API
    │
    └─→ Utilitários locais
        ├── Util_CPF
        └── Util_Senha
```
