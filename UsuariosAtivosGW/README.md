# UsuariosAtivosGW

Atualiza usuários ativos e suas unidades organizacionais a partir do Firebase.

## Implantação

1. Envie este diretório ao Apps Script e habilite `AdminDirectory`.
2. Execute `start`, conceda autorizações e preencha as propriedades pendentes.
3. Execute `start` outra vez para validar a configuração. Gatilhos devem ser criados manualmente.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `SITUACAO_ATIVA` | Sim | Código seguro definido pelo instalador | Situação considerada ativa |
| `NOME_DOMINIO`, `SUSPENDED_OU_PATH` | Sim | Nenhum | Domínio e raiz da UO de suspensão |
| `FIREBASE_DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Sim | Nenhum | Integração Firebase; valores sensíveis |
| `UOS_GENERICAS` | Não | Nenhum | Lista CSV de UOs com tratamento especial |
