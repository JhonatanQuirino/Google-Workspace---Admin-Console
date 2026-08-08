# Guia de Configuração e Implantação

Este documento descreve como preparar e implantar os módulos do GW Admin Hub.

## Pré-requisitos

- Conta de administrador do Google Workspace
- Projeto Firebase Realtime Database
- Credenciais de serviço do Firebase
- `clasp` instalado
- Acesso ao editor do Apps Script

## Estrutura do repositório

Cada pasta representa um projeto Apps Script independente:

```
AniversariantesGW/
BoasVindasGW/
criacaoUsuarioGW/
DadosRecuperacaoGW/
IntegracaoERPGW/
UsuariosAtivosGW/
UsuariosSuspensosGW/
```

## Antes de começar

Cada pasta é um projeto Apps Script independente. Implante e configure um módulo por vez; as propriedades configuradas em um módulo não são compartilhadas automaticamente com os demais.

Todo módulo possui um `start.gs`. Depois de enviar os arquivos ao Apps Script, execute a função pública `start()` para criar propriedades ausentes, aplicar apenas padrões seguros e listar configurações pendentes. A execução é idempotente: ela preserva valores existentes e não cria gatilhos.

## Configurar o `clasp`

Cada `.clasp.json` contém o placeholder `<YOUR_APPS_SCRIPT_PROJECT_ID>`. Antes de executar `clasp push`, substitua-o localmente pelo ID do projeto Apps Script criado para o módulo. Não publique nem faça commit desse identificador.

Instale o `clasp`:

```bash
npm install -g @google/clasp
```

Autentique-se no Google:

```bash
clasp login
```

## Configurar propriedades do script

No editor Apps Script, abra **Configurações do projeto → Propriedades do script** e crie as propriedades necessárias para aquele módulo. Os nomes devem ser digitados exatamente como na tabela abaixo.

### Propriedades do Script

Configure apenas as propriedades usadas pelo módulo que será implantado. Não use valores reais em arquivos versionados.

| Propriedade | Descrição | Obrigatória quando usada |
| --- | --- | --- |
| `NOME_DOMINIO` | Domínio principal do Google Workspace | Sim |
| `NOME_ORGANIZACAO` | Nome exibido da organização | Para e-mails |
| `NOME_REMETENTE` | Nome exibido do remetente | Para e-mails |
| `NOME_ASSINATURA` | Nome da assinatura dos e-mails | Para e-mails |
| `TITULO_ASSINATURA` | Título completo da assinatura, sem concatenação no template | Para e-mails |
| `EMAIL_ADMIN`, `EMAIL_COMUNICACAO`, `CEP_EMAIL`, `EMAIL_GP` | Destinatários e remetentes administrativos | Conforme módulo |
| `INTEGRATION`, `EMAIL_DIVERGENCE`, `EMAIL_SUPORTE` | E-mails de integração, divergência e suporte | Conforme módulo |
| `URL_PORTAL_ONBOARDING`, `ORGANIZATION_LOGO_URL` | URL do portal e imagem institucional | Boas-vindas |
| `BIRTHDAY_IMAGE_URL`, `COMPANY_ANNIVERSARY_IMAGE_URL` | Imagens dos e-mails comemorativos | Aniversariantes |
| `WELCOME_VIDEO_ID` | ID do arquivo de vídeo de boas-vindas no Drive | Se houver anexo |
| `UOS_GENERICAS`, `IGNORED_OUS` | Caminhos de UO separados por vírgula | Conforme módulo |
| `SUSPENDED_OU_PATH`, `REQUIRED_SUSPENSION_OUS` | Raiz e caminhos de UOs de suspensão, em CSV quando aplicável | Suspensão |
| `SITUACAO_ATIVA`, `SITUACOES_ATIVAS`, `SITUACOES_AFASTAMENTO`, `SITUACOES_SUSPENSAO`, `SITUACOES_REMOVER_LICENCAS` | Códigos de situação separados por vírgula, quando aplicável | Módulos HCM |
| `SITUACAO_DESLIGAMENTO`, `SITUACAO_OU_DEFAULT`, `SITUACAO_OU_MAP` | Código de desligamento, nome padrão e mapa JSON de código de situação para nome de UO | Suspensão |
| `FIREBASE_DATABASE_URL` | URL do Firebase Realtime Database | Módulos Firebase |
| `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Credenciais da conta de serviço Firebase | Módulos Firebase |
| `INBOUND_JWT_SECRET`, `INBOUND_JWT_ISSUER`, `INBOUND_JWT_AUDIENCE` | Autenticação JWT do endpoint ERP | Integração ERP |
| `ERP_FIELD_MAPPING`, `ERP_SOURCE_URL`, `ERP_SOURCE_HEADERS`, `ERP_RESPONSE_RECORDS_PATH` | Mapeamento e coleta REST opcional de ERP | Integração ERP |
| `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BACKUP_PATH` | Configuração da integração opcional de backup no GitHub | Backup |

> Não armazene segredos em arquivos de código.

### Formatos esperados

- Propriedades de e-mail e URL recebem um único valor.
- Propriedades terminadas em `OUS`, `DOMAINS` ou `SITUACOES` usam valores separados por vírgula, sem necessidade de espaços.
- `SITUACAO_OU_MAP` usa um objeto JSON. As chaves são códigos de situação como texto e os valores são os nomes das UOs relativas a `SUSPENDED_OU_PATH`.
- `TITULO_ASSINATURA` deve conter a frase completa a ser exibida; o template não acrescenta o nome da organização.

Não inclua valores reais de propriedades em documentação, arquivos de exemplo ou commits.

### Propriedades por módulo

| Módulo | Configure antes da primeira execução |
| --- | --- |
| `AniversariantesGW` | `NOME_DOMINIO`, e-mails administrativos/comunicação, identidade da organização e URLs de imagens, se usadas |
| `BoasVindasGW` | `NOME_DOMINIO`, e-mails, identidade da organização, `URL_PORTAL_ONBOARDING`, `ORGANIZATION_LOGO_URL`, `UOS_GENERICAS` e `WELCOME_VIDEO_ID`, se usado |
| `criacaoUsuarioGW` | `NOME_DOMINIO`, `SITUACAO_ATIVA`, e-mails necessários e credenciais Firebase |
| `DadosRecuperacaoGW` | Credenciais e URL Firebase, domínio, listas de UOs/domínios, situações e configurações de e-mail/GitHub usadas pelo fluxo |
| `IntegracaoERPGW` | `INBOUND_JWT_SECRET`, credenciais Firebase e, se houver coleta agendada, URL, cabeçalhos e mapeamento do ERP |
| `UsuariosAtivosGW` | `NOME_DOMINIO`, `SITUACAO_ATIVA` e `SUSPENDED_OU_PATH` |
| `UsuariosSuspensosGW` | Domínio, situações, UOs de suspensão, `SITUACAO_DESLIGAMENTO` e o mapa `SITUACAO_OU_MAP` |

## Configurar o Firebase

1. Crie uma conta de serviço no projeto do Firebase.
2. Gere a chave JSON.
3. Adicione o valor de `private_key` em `FIREBASE_PRIVATE_KEY`.
4. Adicione `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PROJECT_ID`.

## Implantar um módulo

1. Crie um projeto Apps Script vazio para o módulo.
2. Preencha o `scriptId` local no `.clasp.json` correspondente.
3. Revise os escopos no `appsscript.json`.
4. Envie o código:

```bash
cd criacaoUsuarioGW
clasp push
```

5. Execute `start` pelo editor Apps Script e conceda as autorizações solicitadas.
6. Preencha as propriedades indicadas como pendentes e execute `start` novamente.
7. Ative os serviços avançados necessários antes de usar o fluxo do módulo.

Use `clasp pull` somente quando a versão do editor Apps Script for a fonte de verdade; ele pode sobrescrever arquivos locais.

## Escopos necessários

Alguns módulos requerem estes escopos no `appsscript.json`:

- `https://www.googleapis.com/auth/admin.directory.user`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/admin.directory.orgunit`
- `https://www.googleapis.com/auth/apps.licensing`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/script.send_mail`
- `https://mail.google.com/`
- `https://www.googleapis.com/auth/calendar`

## Serviços avançados

Ative no Apps Script:

- `AdminDirectory`
- `Gmail`
- `AdminLicenseManager`

## Inicialização por módulo

### `AniversariantesGW`

- Verifique domínio, e-mail de comunicação e identidade visual.
- Configure um gatilho diário.

### `BoasVindasGW`

- Verifique Gmail, Admin Directory, portal, logo, UOs genéricas e vídeo opcional.
- Execute manualmente ou via gatilho.

### `criacaoUsuarioGW`

- Confirme credenciais do Firebase.
- Execute `executarCriacaoAutomatica()`.

### `DadosRecuperacaoGW`

- Confirme os dados de recuperação.
- Execute `sincronizarDadosRecuperacao()`.

### `IntegracaoERPGW`

- Configure o JWT de entrada e as credenciais Firebase.
- Implante como Web App para receber `doPost(e)` ou crie um gatilho para `sincronizarERP()`.

### `UsuariosAtivosGW`

- Revise `SITUACAO_ATIVA` e o caminho configurado para UO de suspensão.
- Execute a sincronização de usuários ativos.

### `UsuariosSuspensosGW`

- Revise as listas de situações, `SITUACAO_DESLIGAMENTO`, `SUSPENDED_OU_PATH` e `SITUACAO_OU_MAP`.
- Execute a sincronização de suspensão.

## Testes

Este projeto não possui `package.json` no nível raiz. Crie um se precisar de ferramentas locais.

Exemplo:

```bash
npm init -y
npm install @google/clasp --save-dev
```

Para rodar testes:

```bash
cd BoasVindasGW
clasp run testarServicoBoasVindas
```
