Copyright (c) 2026 Jhonatan Quirino

# Documentação do GW Admin Hub

Este diretório reúne os guias de configuração, uso e manutenção do projeto.

## 📚 Navegação Rápida

### Arquitetura e Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura do sistema e fluxo de dados
- **[MODULES.md](MODULES.md)** - Documentação dos módulos

### Como começar
- **[SETUP.md](SETUP.md)** - Guia de instalação e configuração
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Guia de desenvolvimento
- **[QUICKSTART.md](QUICKSTART.md)** - Guia rápido de inicialização

### Integrações
- **[API_INTEGRATION.md](API_INTEGRATION.md)** - APIs e serviços externos
- **[DATA_FLOW.md](DATA_FLOW.md)** - Fluxo de dados entre sistemas

### Suporte
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solução de problemas
- **[FAQ.md](FAQ.md)** - Perguntas frequentes

### Referência
- **[SECURITY.md](../SECURITY.md)** - Política de segurança
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Como contribuir
- **[CHANGELOG.md](../CHANGELOG.md)** - Histórico de versões

---

## 🚀 Guia rápido

### Visão geral

O GW Admin Hub automatiza a administração do Google Workspace com base em dados do HCM no Firebase.

### Passos rápidos

1. Clone o repositório:

```bash
git clone <repository-url>
cd <repository-folder>
```

2. Instale o `clasp`:

```bash
npm install -g @google/clasp
```

3. Configure as credenciais nos projetos do Apps Script.

4. Implante os módulos com `clasp push`.

5. Execute testes de validação.

Veja [SETUP.md](SETUP.md) para instruções completas.

---

## 📊 Fluxo de dados

```
HCM (Firebase) → Módulos de sincronização → Google Workspace
                       ↓
                    E-mails
```

---

## 🎯 Conceitos principais

Cada módulo é um projeto Apps Script autônomo que trata de um domínio específico do ciclo de vida do usuário.

| Módulo | Propósito | Agendamento |
|--------|-----------|-------------|
| `AniversariantesGW` | Aniversários e tempo de empresa | Diário |
| `BoasVindasGW` | Boas-vindas para novos usuários | Periódico |
| `criacaoUsuarioGW` | Provisionamento de usuários | Agendado |
| `DadosRecuperacaoGW` | Sincronização de dados de recuperação | Agendado |
| `UsuariosAtivosGW` | Gestão de usuários ativos | Agendado |
| `UsuariosSuspensosGW` | Suspensão e desligamento | Agendado |
