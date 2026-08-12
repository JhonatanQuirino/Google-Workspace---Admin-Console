Copyright (c) 2026 Jhonatan Quirino

# Política de Segurança

## Relato de vulnerabilidades

⚠️ **NÃO reporte vulnerabilidades de segurança por issues públicas no GitHub.**

Envie relatórios para: **[jhqsouza@gmail.com](mailto:jhqsouza@gmail.com)**

Inclua as seguintes informações:
- Tipo de vulnerabilidade
- Localização e contexto no código
- Impacto potencial
- Passos para reproduzir (quando aplicável)

Nossa equipe de segurança responderá em até 48 horas.

## Considerações de segurança

### Gerenciamento de credenciais

Este projeto manipula credenciais sensíveis (chaves do Firebase, tokens OAuth etc.). **Nunca**:

- ❌ Comite credenciais no controle de versão
- ❌ Compartilhe credenciais por e-mail ou chat
- ❌ Armazene credenciais em texto puro no código
- ❌ Registre dados sensíveis em produção

**Sempre**:
- ✅ Utilize Properties Service do Apps Script para credenciais
- ✅ Use variáveis de ambiente em testes locais
- ✅ Faça rotação periódica de credenciais
- ✅ Masque dados sensíveis em logs (CPF, e-mails, tokens)

### Escopos OAuth

O projeto utiliza os seguintes escopos OAuth. Solicite apenas os escopos mínimos necessários.

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
    "https://www.googleapis.com/auth/admin.directory.orgunit",
    "https://www.googleapis.com/auth/apps.licensing",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

Verifique se o projeto habilita somente os escopos necessários.

### Proteção de dados sensíveis

#### Dados processados
- CPF
- E-mail profissional
- E-mail pessoal de recuperação
- Telefone de recuperação
- Credenciais do Firebase
- Tokens de API

#### Boas práticas
- Use `PropertiesService` para armazenar valores sensíveis
- Não armazene chaves em arquivos de configuração versionados
- Reduza ao mínimo a exposição de dados em logs
- Reforce controles de acesso no projeto Apps Script

### Segurança do Firebase

- Configure regras do Realtime Database para limitar acesso
- Garanta que apenas a conta de serviço correta possa ler os dados
- Não expor a chave privada do Firebase em arquivos públicos

### Procedimentos de resposta

- Informe imediatamente a equipe de segurança em caso de incidente
- Não divulgue detalhes sensíveis publicamente
- Revogue e regenere credenciais comprometidas

## Contato

Para dúvidas de segurança, utilize: **[jhqsouza@gmail.com](mailto:jhqsouza@gmail.com)**
