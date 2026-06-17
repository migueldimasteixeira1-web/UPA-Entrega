# UPA Entrega

Sistema interno para gestão de entregas de medicamentos a domicílio da UPA.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, JWT + bcrypt
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query
- **Infra:** Docker Compose

## Subir com Docker (recomendado)

```bash
docker compose up --build
```

| Serviço   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173        |
| Backend   | http://localhost:3001        |
| PostgreSQL| localhost:5432               |

## Credenciais iniciais (seed)

| Perfil     | E-mail              | Senha        |
|------------|---------------------|--------------|
| Admin      | admin@upa.local     | Admin@123    |
| Operador   | operador@upa.local  | Operador@123 |

## Desenvolvimento local (sem Docker)

### Banco de dados

```bash
docker compose up db -d
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Funcionalidades do MVP

- Login seguro com JWT
- Painel kanban/lista com filtros
- Cadastro de pedidos em etapas
- Fluxo de status controlado com histórico auditável
- Confirmação manual de pagamento do frete
- Registro manual de dados do Uber Flash (PIN e rastreio)
- Mensagens prontas para copiar (WhatsApp manual)
- Controle de estoque com alerta de mínimo
- Gestão de usuários (admin)
- Página pública do paciente (`/acompanhar/:token`) — somente leitura

## Fluxo operacional

Todo o controle é feito pelo funcionário logado da UPA. O paciente apenas consulta o link público, se recebido.

1. Funcionário cria pedido
2. Copia mensagem de pagamento e envia manualmente (WhatsApp)
3. Confirma pagamento no sistema
4. Solicita a entrega no Uber Flash (fora do sistema)
5. Registra PIN e rastreio no pedido
6. Copia mensagens prontas para o paciente
7. Paciente pode consultar status pelo link público (opcional)
8. Funcionário acompanha externamente e marca como entregue quando confirmado

## Regra de estoque

- **Pedido criado / frete pago:** estoque não é baixado (apenas verificada disponibilidade)
- **Aguardando retirada:** estoque é baixado e `stockReserved = true`
- **Cancelado após baixa:** estoque é devolvido
- **Entregue:** baixa mantida

## Fluxo de status

```
Pedido criado → Aguardando pagamento → Frete pago → Entrega solicitada / aguardando retirada → Em rota → Entregue
                                                                              ↘ Cancelado
```

## Estrutura

```
├── backend/          API Express + Prisma
├── frontend/         React + Vite
├── docker-compose.yml
└── README.md
```

## Produção

Para deploy em VM Linux, ajuste as variáveis de ambiente:

- `JWT_SECRET` — secret forte e único
- `DATABASE_URL` — conexão PostgreSQL
- `FRONTEND_URL` — URL do frontend para CORS
- `VITE_API_URL` — URL da API no build do frontend

## O que não está no MVP (preparado para evolução)

- Pix automático
- Integração Uber/99
- WhatsApp automatizado
- Relatórios avançados
- Permissões granulares
