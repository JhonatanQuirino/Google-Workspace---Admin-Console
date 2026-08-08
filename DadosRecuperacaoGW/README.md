# DadosRecuperacaoGW

Sincroniza dados de recuperação e estados de usuários entre Firebase e Google Workspace.

## Implantação

1. Envie este diretório ao Apps Script e habilite `AdminDirectory`.
2. Execute `start`, conceda autorizações e preencha todas as propriedades pendentes.
3. Configure o mapa JSON de situação/UO e as listas CSV de domínio e UOs necessárias.
4. Execute `start` novamente e só então crie gatilhos manualmente.

O instalador preserva propriedades existentes, não registra segredos e não cria gatilhos.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `SITUACOES_ATIVAS`, `SITUACOES_AFASTAMENTO`, `SITUACOES_SUSPENSAO`, `SITUACAO_DESLIGAMENTO` | Sim | Valores seguros definidos pelo instalador | Classificação de situações |
| `NOME_DOMINIO`, `EMAIL_ADMIN`, `CEP_EMAIL`, `NOME_ORGANIZACAO`, `NOME_REMETENTE` | Sim | Nenhum | Domínio, e-mails e identidade |
| `SUSPENDED_OU_PATH`, `SITUACAO_OU_DEFAULT`, `SITUACAO_OU_MAP` | Sim | Nenhum | Estrutura de UOs; mapa em JSON |
| `FIREBASE_DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Sim | Nenhum | Integração Firebase; valores sensíveis |
| `UOS_GENERICAS`, `IGNORED_OUS`, `RECOVERY_IGNORED_DOMAINS`, `WELCOME_VIDEO_ID` | Não | Nenhum | Filtros e recursos opcionais |
| `INTEGRATION`, `EMAIL_DIVERGENCE`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BACKUP_PATH` | Não | Nenhum | Notificações e backup opcional; token é sensível |
