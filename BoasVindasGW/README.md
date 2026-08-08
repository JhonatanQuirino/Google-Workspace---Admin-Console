# BoasVindasGW

Envia boas-vindas para contas novas no Google Workspace.

## Implantação

1. Envie este diretório para um projeto Apps Script e habilite `AdminDirectory` e `Gmail`.
2. Execute `start`, autorize o projeto e configure as propriedades pendentes.
3. Execute `start` novamente e confirme `Status: OK` no log.
4. Crie manualmente o gatilho de verificação conforme a operação desejar.

O instalador preserva valores existentes e não cria gatilhos.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `NOME_DOMINIO`, `EMAIL_ADMIN`, `CEP_EMAIL`, `EMAIL_GP` | Sim | Nenhum | Domínio e e-mails operacionais |
| `NOME_ORGANIZACAO`, `NOME_REMETENTE`, `NOME_ASSINATURA`, `TITULO_ASSINATURA` | Sim | Nenhum | Identidade do e-mail |
| `URL_PORTAL_ONBOARDING` | Sim | Nenhum | Link exibido no e-mail |
| `EMAIL_SUPORTE`, `ORGANIZATION_LOGO_URL`, `WELCOME_VIDEO_ID`, `UOS_GENERICAS` | Não | Nenhum | Recursos e filtros opcionais |
