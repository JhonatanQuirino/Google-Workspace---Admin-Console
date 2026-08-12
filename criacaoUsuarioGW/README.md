Copyright (c) 2026 Jhonatan Quirino

# criacaoUsuarioGW

Provisiona usuários do Google Workspace a partir de dados do Firebase.

## Implantação

1. Envie os arquivos ao Apps Script e habilite `AdminDirectory`.
2. Execute `start`, autorize o projeto e informe as propriedades pendentes, especialmente as credenciais Firebase.
3. Execute `start` novamente. Não rode os fluxos de criação até o status ser `OK`.

O instalador não expõe ou registra valores de credenciais e preserva qualquer propriedade já configurada.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `SITUACAO_ATIVA` | Sim | Código seguro definido pelo instalador | Situação que habilita a criação |
| `NOME_DOMINIO`, `EMAIL_ADMIN`, `CEP_EMAIL`, `GP_EMAIL`, `INTEGRATION`, `NOME_ORGANIZACAO` | Sim | Nenhum | Configuração organizacional e e-mails |
| `FIREBASE_DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Sim | Nenhum | Integração Firebase; valores sensíveis |
