# Documentação — SEDOM

Documentação técnica do projeto, complementar ao [README](../README.md) da raiz (que cobre instalação, deploy e operação). Aqui o foco é **como o sistema é construído por dentro**.

- [Arquitetura](./arquitetura.md) — stack, estrutura de pastas, como as peças se conectam
- [Modelo de dados](./modelo-de-dados.md) — tabelas, relações, e as decisões por trás delas
- [Fluxos principais](./fluxos.md) — ciclo de vida do pedido, PIN de entrega, despacho e otimização de rota
- [Integrações externas](./integracoes-externas.md) — ViaCEP, AwesomeAPI, OpenRouteService, e-mail, storage — o que cada uma faz e o que acontece se estiver fora do ar

## Como manter isto atualizado

Estes documentos descrevem decisões e comportamento, não detalhes que mudam a cada PR (nomes de variável, número de linha). Ao mudar algo que afeta um fluxo inteiro, um relacionamento de dado, ou a resposta do sistema quando uma integração externa falha, vale revisar o documento correspondente — o resto tende a ficar correto por mais tempo sem manutenção.
