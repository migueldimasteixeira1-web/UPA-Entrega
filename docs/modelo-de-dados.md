# Modelo de dados

Fonte de verdade: `backend/prisma/schema.prisma`. Este documento explica o *porquê* das decisões, não repete campo por campo — pra isso, leia o schema direto.

## Diagrama de relações

```
Patient ──< Address ──< Order >── Route
   │                      │  │
   │                      │  └──< OrderItem >── Medication
   │                      │
   │                      └──< OrderHistory
   │                      └──< EmailNotification
   │
User ──< Order (createdBy, deliveredBy) ──< Route (courier, createdBy)
```

## Por que `Order` duplica campos de `Patient`/`Address`

`Order` tem `patientName`, `patientPhone`, `patientCpf`, `street`, `number`, `neighborhood`... — os mesmos dados que já existem em `Patient`/`Address`, referenciados por `patientId`/`addressId`. Isso é proposital, não normalização incompleta: é um **snapshot**. Se o paciente edita o telefone ou o endereço depois, pedidos antigos continuam mostrando os dados de quando a entrega foi combinada, não o dado atual. O mesmo raciocínio vale para `latitude`/`longitude` (issue #73): o pedido guarda a coordenada de quando foi criado, não a coordenada atual do endereço.

Ao criar um pedido, esses campos são copiados uma vez (`resolveAddress`/`resolvePatient` em `orders.routes.js`) e nunca mais sincronizados automaticamente.

## `Order.deliveryPinHash` — nunca o PIN em texto puro

O PIN de 6 dígitos que confirma a entrega existe em texto puro só de passagem, dentro da própria função que cria o pedido (`generateDeliveryPin()` em `createOrder`) — usado ali mesmo pra gerar o hash (bcrypt) gravado no banco e pro e-mail de confirmação, e descartado da memória logo em seguida. Não existe rota, log ou campo que devolva o PIN depois disso — só `bcrypt.compare()` na hora de confirmar entrega. Motivo: um hash vazado é inofensivo (força bruta de 6 dígitos, mas exige acesso ao banco); o PIN em texto vazado permite qualquer um confirmar uma entrega falsa.

## `Order.routeId` / `routeSequence` — por que são nullable e vivem no pedido, não só na rota

Um pedido nasce sem rota (`routeId: null`). Só ganha uma quando é despachado em lote (`POST /api/delivery-routes` — ver [fluxos.md](./fluxos.md)). `routeSequence` é a posição do pedido dentro daquela rota (0, 1, 2...) — é o que o app do entregador usa pra numerar as paradas. Fica no pedido (não só numa tabela de junção) porque a relação é 1-pra-N simples (uma rota tem vários pedidos, um pedido pertence a no máximo uma rota) e a maioria das consultas já parte do pedido.

## `Address.latitude/longitude` vs. `Order.latitude/longitude`

Os dois existem e não são a mesma coisa:

- `Address.latitude/longitude` — geocodificado quando o endereço é criado/editado (fonte "atual" pra aquele cadastro).
- `Order.latitude/longitude` — copiado do endereço **no momento da criação do pedido** (snapshot, mesmo raciocínio do resto dos campos duplicados).

A otimização de rota (issue #73) usa a coordenada do **pedido**, não do endereço — importante se um dia alguém for debugar "por que essa rota não ficou otimizada direito" e for procurar no lugar errado.

## `DailyCounter` — por que existe uma tabela só pra contador

`orderNumber` (`UPA-AAAAMMDD-NNN`) e `routeNumber` (`ROTA-AAAAMMDD-NNN`) precisam ser sequenciais por dia. A tentação óbvia — `COUNT(*)` da tabela + 1 — tem uma corrida real: duas criações simultâneas podem ler a mesma contagem e gerar o mesmo número. `DailyCounter` resolve com um único `UPSERT` atômico (`INSERT ... ON CONFLICT ... DO UPDATE`) por escopo (`order`/`route`) e dia, sem `SELECT` prévio.

## `EmailNotification` — por que e-mail é uma tabela, não um envio direto

Toda notificação por e-mail (confirmação de pedido com PIN, mudança de status) primeiro vira uma linha `PENDING` nesta tabela, dentro da mesma transação que gerou o evento (ex.: criar o pedido). Um worker separado (`lib/email/worker.js`, roda em intervalo configurável) processa as linhas pendentes/falhadas com retentativa. Isso existe pra que **criar um pedido nunca espere (nem falhe) por causa do provedor de e-mail estar lento ou fora do ar** — a criação do pedido é síncrona e rápida; o envio de fato é assíncrono e tolerante a falha.

## `OrderHistory` — auditoria, não só changelog de status

Guarda toda transição de status, mas também eventos que não são transição (ex.: nota adicionada, reenvio de e-mail). `userId` é nullable porque alguns eventos são do sistema (ex.: falha automática de envio), não de uma ação humana.

## Enums e o que eles fixam

- `OrderStatus`: `PEDIDO_RECEBIDO → EM_SEPARACAO → SEPARADO → AGUARDANDO_SAIDA → EM_ROTA → ENTREGUE`, com `CANCELADO` acessível da maioria dos estados. As transições válidas ficam em `VALID_TRANSITIONS` (`lib/constants.js`), não soltas pelo código — um novo status ou uma nova regra de transição se define num lugar só.
- `RouteStatus`: só `EM_ANDAMENTO`/`FINALIZADA` — uma rota fecha sozinha quando o último pedido dela sai de `EM_ROTA`.
- `UserRole`: `ADMIN`/`OPERADOR`/`ENTREGADOR` — ver [arquitetura.md](./arquitetura.md#autenticação-e-papéis).
