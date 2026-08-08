# AniversariantesGW

Envia mensagens de aniversário e tempo de empresa usando Admin Directory e Gmail.

## Implantação

1. Crie um projeto Apps Script, envie os arquivos deste diretório e habilite `AdminDirectory`.
2. Execute `start` e conceda as autorizações solicitadas.
3. Preencha no projeto as propriedades indicadas como pendentes.
4. Execute `start` novamente. O log deve terminar com `Status: OK`.
5. Crie manualmente o gatilho diário, se desejado.

`start` é idempotente: não sobrescreve propriedades existentes e não cria gatilhos.

## Propriedades

| Propriedade | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `NOME_DOMINIO`, `EMAIL_ADMIN`, `EMAIL_COMUNICACAO` | Sim | Nenhum | Domínio e e-mails do módulo |
| `NOME_ORGANIZACAO`, `NOME_REMETENTE`, `NOME_ASSINATURA`, `TITULO_ASSINATURA` | Sim | Nenhum | Identidade exibida nos e-mails |
| `EMAIL_SUPORTE`, `URL_PORTAL_ONBOARDING` | Não | Nenhum | Contato e URL institucionais |
| `BIRTHDAY_IMAGE_URL`, `COMPANY_ANNIVERSARY_IMAGE_URL` | Não | Nenhum | Imagens dos templates |
