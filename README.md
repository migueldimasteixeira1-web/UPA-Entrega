# UPA Entrega

Sistema interno para gestão da **logística de entrega domiciliar de medicamentos** da UPA. O sistema não interfere no atendimento médico, na emissão de receitas nem na dispensação/estoque de medicamentos — esses processos continuam nos sistemas oficiais da unidade. Aqui é controlado apenas o ciclo da entrega: do registro do pedido até a confirmação do recebimento pelo paciente, por um entregador da própria UPA, sem custo para o paciente.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, JWT + bcrypt
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query
- **Infra:** Docker Compose + Nginx (gateway com TLS, serve o frontend e faz proxy da API)

## Estrutura

```text
├── backend/                        # API Express + Prisma
├── frontend/                       # React + Vite; a imagem de produção (Dockerfile) é o próprio gateway Nginx
├── deploy/generate-self-signed-cert.sh  # Gera certificado TLS autoassinado (deploy/certs/)
├── deploy/backup-db.sh             # Backup do Postgres (pg_dump + rotação)
├── deploy/restore-db.sh            # Restaura o Postgres a partir de um backup
├── compose.yaml                    # Produção / VM
├── compose.dev.yaml                # Desenvolvimento com hot-reload
├── .env.vm.example                 # Modelo de variáveis para VM
├── iniciar-local.sh                # Dev local (DB no Docker + Node no host)
└── scripts/iniciar-vm.sh           # Sobe produção com validação de .env + certificado
```

## Produção (VM) — recomendado

```bash
cp .env.vm.example .env
# Edite .env: PUBLIC_APP_URL, CORS_ORIGINS, senhas e JWT_SECRET
chmod +x scripts/iniciar-vm.sh
./scripts/iniciar-vm.sh
```

Ou: `make vm`

| Serviço  | URL                         |
|----------|-----------------------------|
| App      | `https://IP-OU-DNS` (porta `UPA_HTTPS_PORT`, padrão 443; porta 80 redireciona) |
| Health   | `https://IP-OU-DNS/api/health` |

A API e o frontend ficam na **mesma origem**, atrás de um único Nginx que serve os arquivos estáticos e faz proxy de `/api` para o backend. Isso funciona no celular e em qualquer dispositivo da rede sem CORS especial.

**TLS:** por padrão o script gera um certificado **autoassinado** (`deploy/generate-self-signed-cert.sh`, CN tirado de `PUBLIC_APP_URL`) — o navegador vai alertar que não é confiável, mas o tráfego continua criptografado; é suficiente para uso interno na rede da UPA. Para expor com um domínio público, substitua `deploy/certs/fullchain.pem` e `deploy/certs/privkey.pem` por um certificado real (ex.: Let's Encrypt) e reinicie o serviço `gateway`.

Variáveis principais (`.env`):

| Variável | Função |
|----------|--------|
| `PUBLIC_APP_URL` | URL pública, **https://** (CORS + links de acompanhamento/WhatsApp + CN do certificado) |
| `CORS_ORIGINS` | Origens extras (vírgula), se necessário |
| `UPA_PORT` / `UPA_HTTPS_PORT` | Portas publicadas do gateway (padrão 80/443) |
| `JWT_SECRET` | Secret forte (≥ 32 caracteres) |
| `POSTGRES_PASSWORD` | Senha do banco (≥ 12 caracteres) |
| `SEED_DEMO_DATA` | `true` só na 1ª subida / homologação |

## Backup do banco

O volume `postgres_data` sozinho não é backup — perder o volume (disco corrompido, `docker compose down -v` sem querer, VM recriada) apaga tudo, incluindo dado de paciente (CPF, endereço, telefone), sem nenhuma cópia de segurança.

```bash
./deploy/backup-db.sh
# ou: make backup
```

Gera `backups/upa_entrega-AAAAMMDD-HHMMSS.sql.gz` (fora do volume do container) e apaga automaticamente dumps com mais de 14 dias (`RETENTION_DAYS` no `.env` para mudar). `backups/` é ignorado pelo git — nunca comitar (tem dado de paciente).

**Agendar (cron na VM):**

```bash
crontab -e
# Backup diário às 3h, log em /var/log/upa-backup.log:
0 3 * * * cd /caminho/do/projeto && ./deploy/backup-db.sh >> /var/log/upa-backup.log 2>&1
```

**Restaurar:**

```bash
./deploy/restore-db.sh backups/upa_entrega-AAAAMMDD-HHMMSS.sql.gz
# ou: make restore FILE=backups/upa_entrega-AAAAMMDD-HHMMSS.sql.gz
```

Pede confirmação explícita antes de sobrescrever o banco atual. O dump é gerado com `--clean --if-exists`, então o mesmo arquivo restaura tanto num banco vazio (recuperação de desastre) quanto por cima de um banco já existente.

### Backup do storage (receitas, fotos de comprovação)

Mesmo raciocínio do banco: o volume `minio_data` sozinho não é backup. Anexos (receita médica, foto de comprovação de entrega — issues #38/#39) vivem ali, fora do Postgres.

```bash
./deploy/backup-storage.sh
# ou: make backup-storage
```

Gera `backups/upa_entrega-storage-AAAAMMDD-HHMMSS.tar.gz`, mesma retenção/rotação do backup do banco. Restaurar:

```bash
./deploy/restore-storage.sh backups/upa_entrega-storage-AAAAMMDD-HHMMSS.tar.gz
# ou: make restore-storage FILE=backups/upa_entrega-storage-AAAAMMDD-HHMMSS.tar.gz
```

## Desenvolvimento local (sem Docker full)

```bash
chmod +x iniciar-local.sh
./iniciar-local.sh
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001/api/health  

O Vite faz proxy de `/api` para o backend. No celular use `http://IP-DO-PC:5173`.

### Só o banco/storage + processos manuais

```bash
docker compose -f compose.dev.yaml up -d db minio
cd backend && cp .env.example .env && npm ci && npm run db:migrate:dev && npm run db:seed && npm run dev
cd frontend && npm ci && npm run dev
```

### Stack completa em Docker (hot-reload)

```bash
docker compose -f compose.dev.yaml up --build
# ou: make dev-up
```

## Credenciais iniciais (seed)

| Perfil      | E-mail                | Senha           |
|-------------|------------------------|-----------------|
| Admin       | admin@upa.local        | Admin@123       |
| Operador    | operador@upa.local     | Operador@123    |
| Entregador  | entregador@upa.local   | Entregador@123  |

## Papéis de usuário

- **Administrador**: acesso total, inclusive gestão de usuários.
- **Operador**: cria e acompanha pedidos, monta rotas, gerencia o catálogo de medicamentos.
- **Entregador**: acesso restrito à tela "Minhas entregas" — vê só os pedidos da rota atribuída a ele e confirma a entrega por PIN.

## Funcionalidades

- Login seguro com JWT e controle de papéis (Admin / Operador / Entregador)
- Cadastro de paciente por **CPF**, com preenchimento automático em pedidos futuros e **múltiplos endereços** por paciente
- Endereço com consulta automática de CEP (ViaCEP)
- Registro de pedido em etapas (paciente → endereço → medicamentos → revisão)
- PIN de confirmação de entrega gerado automaticamente na criação do pedido
- Fluxo de status com histórico auditável
- Impressão de etiqueta de identificação do pedido
- Montagem de rotas e tela "Minhas entregas"
- Mensagens prontas para copiar/compartilhar (WhatsApp manual)
- Página pública do paciente (`/acompanhar/:token`)
- Catálogo de medicamentos e gestão de usuários (admin)

## Fluxo de status

```
Pedido recebido → Em separação → Separado → Aguardando saída → Em rota → Entregue
                                                                        ↘ Cancelado
```

`Em rota` só é atingido ao vincular o pedido a uma rota; `Entregue` só é atingido confirmando o PIN de entrega.

## Fora de escopo (preparado para evolução)

- App mobile nativo para o entregador
- Envio automático de WhatsApp
- Controle de estoque/disponibilidade de medicamento
- Relatórios avançados e permissões granulares
