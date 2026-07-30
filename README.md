# UPA Entrega

Sistema interno para gestão da **logística de entrega domiciliar de medicamentos** da UPA. O sistema não interfere no atendimento médico, na emissão de receitas nem na dispensação/estoque de medicamentos — esses processos continuam nos sistemas oficiais da unidade. Aqui é controlado apenas o ciclo da entrega: do registro do pedido até a confirmação do recebimento pelo paciente, por um entregador da própria UPA, sem custo para o paciente.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, JWT + bcrypt
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query
- **Infra:** Docker Compose + Nginx (gateway)

## Estrutura

```text
├── backend/                 # API Express + Prisma
├── frontend/                # React + Vite
├── deploy/nginx.conf        # Gateway: / → frontend, /api → backend
├── compose.yaml             # Produção / VM
├── compose.dev.yaml         # Desenvolvimento com hot-reload
├── .env.vm.example          # Modelo de variáveis para VM
├── iniciar-local.sh         # Dev local (DB no Docker + Node no host)
└── scripts/iniciar-vm.sh    # Sobe produção com validação de .env
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
| App      | `http://IP-OU-DNS` (porta `UPA_PORT`, padrão 80) |
| Health   | `http://IP-OU-DNS/api/health` |

A API e o frontend ficam na **mesma origem** via Nginx (`/api` → backend). Isso funciona no celular e em qualquer dispositivo da rede sem CORS especial.

Variáveis principais (`.env`):

| Variável | Função |
|----------|--------|
| `PUBLIC_APP_URL` | URL pública (CORS + links de acompanhamento/WhatsApp) |
| `CORS_ORIGINS` | Origens extras (vírgula), se necessário |
| `JWT_SECRET` | Secret forte (≥ 32 caracteres) |
| `POSTGRES_PASSWORD` | Senha do banco (≥ 12 caracteres) |
| `SEED_DEMO_DATA` | `true` só na 1ª subida / homologação |

## Desenvolvimento local (sem Docker full)

```bash
chmod +x iniciar-local.sh
./iniciar-local.sh
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001/api/health  

O Vite faz proxy de `/api` para o backend. No celular use `http://IP-DO-PC:5173`.

### Só o banco + processos manuais

```bash
docker compose -f compose.dev.yaml up -d db
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
