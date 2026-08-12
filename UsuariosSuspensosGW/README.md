Copyright (c) 2026 Jhonatan Quirino

# UsuariosSuspensosGW

Suspende usuários e gerencia licenças conforme situações recebidas do Firebase.

## Implantação

1. Envie este diretório ao Apps Script e habilite `AdminDirectory` e `AdminLicenseManager`.
2. Execute `start`, autorize o projeto e preencha as propriedades pendentes.
3. Configure `SITUACAO_OU_MAP` como JSON e as listas de UO em CSV.
4. Execute `start` novamente e crie gatilhos manualmente somente após o status `OK`.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `SITUACOES_AFASTAMENTO`, `SITUACOES_SUSPENSAO`, `SITUACOES_REMOVER_LICENCAS`, `SITUACAO_DESLIGAMENTO` | Sim | Valores seguros definidos pelo instalador | Regras de situação |
| `NOME_DOMINIO`, `SUSPENDED_OU_PATH`, `SITUACAO_OU_DEFAULT`, `SITUACAO_OU_MAP`, `REQUIRED_SUSPENSION_OUS` | Sim | Nenhum | Estrutura organizacional; mapa em JSON e lista em CSV |
| `FIREBASE_DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Sim | Nenhum | Integração Firebase; valores sensíveis |
| `UOS_GENERICAS` | Não | Nenhum | Lista CSV de UOs com tratamento especial |
