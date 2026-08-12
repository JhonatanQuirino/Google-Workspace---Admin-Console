Copyright (c) 2026 Jhonatan Quirino

# Guia de Desenvolvimento

Este documento descreve como trabalhar no GW Admin Hub e testar alterações.

## Visão geral

O projeto é organizado por módulos, cada um como um projeto Google Apps Script independente.

## Desenvolvimento local

### Instalar o `clasp`

```bash
npm install -g @google/clasp
```

### Autenticar

```bash
clasp login
```

### Clonar e abrir um módulo

```bash
git clone <repository-url>
cd <repository-folder>
cd criacaoUsuarioGW
clasp pull
```

> Nota: este repositório não possui `package.json` no nível raiz. Cada módulo é tratado como um projeto Apps Script independente.

### Editar arquivos

Use seu editor preferido. Os arquivos JavaScript e HTML são texto simples.

## Convenções de código

- Use `const` por padrão e `let` quando precisar reatribuir.
- Evite `var`, exceto em código legado.
- Use `camelCase` para funções e variáveis.
- Use `PascalCase` para classes.
- Comente o motivo, não apenas o que o código faz.

### Documentação de funções

Use JSDoc:

```javascript
/**
 * Executa o fluxo de boas-vindas.
 * @param {boolean} testMode - Se true, simula sem enviar e-mails.
 * @returns {Object} Resumo da execução.
 */
function enviarBoasVindas(testMode) {
  // ...
}
```

### Tratamento de erros

Utilize `try/catch` ao chamar APIs externas e registre os erros.

### Logging

Use logs estruturados:

```javascript
console.info({
  event: 'USER_SYNC',
  execution_id: Utilities.getUuid(),
  user_email: user.primaryEmail,
  status: 'success'
});
```

## Testes

Alguns módulos incluem funções de teste. Execute com `clasp run`.

Exemplo:

```bash
cd BoasVindasGW
clasp run testarServicoBoasVindas
```

## Adicionar novos testes

- Crie arquivos `Teste_[ModuleName].js`.
- Use logs claros.
- Garanta que os testes sejam determinísticos.

## Depuração

### Apps Script Logger

- `console.log()` / `console.info()` / `console.error()`
- Veja os registros no editor do Apps Script ou no Stackdriver

### Validar escopos OAuth

Se houver erro de permissão, verifique `appsscript.json` e reautorize o projeto.

### Serviços avançados

Se `AdminDirectory`, `Gmail` ou `AdminLicenseManager` não estiverem definidos, ative o serviço no Apps Script.

## Adicionar um novo módulo

1. Crie uma pasta nova para o módulo.
2. Defina `appsscript.json` e `.clasp.json`.
3. Implemente a lógica principal em `main.js`.
4. Adicione `Constantes.js` e utilitários conforme necessário.
5. Documente o módulo em `docs/MODULES.md`.

## Controle de versão

### Estrutura de branch

- `feature/<nome>`
- `fix/<nome>`
- `docs/<nome>`
- `refactor/<nome>`
- `test/<nome>`
- `chore/<nome>`

### Commits

Use mensagens claras e descritivas.
