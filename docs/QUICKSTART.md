# Guia rápido

Este guia rápido mostra como iniciar o GW Admin Hub em minutos.

## Pré-requisitos

- Conta de administrador do Google Workspace
- Projeto Firebase Realtime Database com dados do HCM
- Credenciais de serviço do Firebase
- `clasp` instalado

## Passos rápidos

1. Clone o repositório:

```bash
git clone <repository-url>
cd <repository-folder>
```

2. Instale o `clasp`:

```bash
npm install -g @google/clasp
```

3. Para cada módulo que pretende usar, crie um projeto Apps Script vazio e atualize localmente o `scriptId` do respectivo `.clasp.json`. Não faça commit desse identificador.

4. Configure cada módulo no Editor do Apps Script:

- Abra o projeto em `AniversariantesGW`, `BoasVindasGW`, `criacaoUsuarioGW`, `DadosRecuperacaoGW`, `UsuariosAtivosGW` e `UsuariosSuspensosGW`
- Execute a função `start` e conceda as autorizações solicitadas; ela cria propriedades ausentes sem sobrescrever valores existentes

5. Defina as propriedades de script comuns:

```text
EMAIL_ADMIN
EMAIL_COMUNICACAO
CEP_EMAIL
INTEGRATION
NOME_DOMINIO
```

6. Adicione as propriedades Firebase nos módulos que usam Firebase:

```text
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_PROJECT_ID
FIREBASE_DATABASE_URL
```

7. Configure também as propriedades específicas do fluxo indicadas no log: situações, UOs, identidade visual e URLs. Execute `start` novamente para validar. Veja a [tabela completa](SETUP.md#propriedades-do-script).

8. Confirme os `appsscript.json` de cada módulo e habilite os serviços avançados necessários:

- `AdminDirectory` para todos os módulos que acessam usuários
- `Gmail` para envio de e-mail
- `AdminLicenseManager` para o módulo `UsuariosSuspensosGW`

9. Envie o módulo e execute um teste manual:

```bash
cd BoasVindasGW
clasp push
clasp run testarServicoBoasVindas
```

10. Configure gatilhos de tempo no Apps Script para cada módulo conforme a necessidade de produção.

## Observações

- Este repositório não possui `package.json` no nível raiz.
- Cada módulo é implantado independentemente como um projeto Apps Script.
- Não armazene credenciais sensíveis em arquivos de código.
- Não execute `clasp pull` antes de um `push` sem confirmar qual versão deve prevalecer; esse comando pode substituir alterações locais.
