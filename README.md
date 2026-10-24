# KURIO — Marketplace de NFTs (Desafio Frontend)

Implementação completa do **KURIO NFT Marketplace** utilizando **Bun**, **React 19**, **TypeScript**, **TanStack Router**, **TanStack Query**, **Axios**, **Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`)**, **Tailwind CSS**, **shadcn/ui (Radix UI)**, **MSW (Mock Service Worker)**, **Playwright** e **Lighthouse**.

---

## 1. Requisitos e Setup (Bun)

O projeto utiliza **Bun** ( podendo se utilizar Node ) como gerenciador de pacotes e runtime de scripts.

```bash
# 1. Instalar dependências
bun install

# 2. Iniciar servidor de desenvolvimento (com MSW e Socket.IO simulados ativos)
bun run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## 2. Variáveis de Ambiente

A aplicação funciona imediatamente a partir de um checkout limpo sem necessidade de `.env` obrigatório. Caso deseje customizar:

```env
# Ativa/desativa a camada de mocks MSW no browser (padrão: true)
VITE_ENABLE_MSW=true
```

---

## 3. Credenciais Fictícias e Cupons de Teste

### Contas de Colecionador Pré-Cadastradas

| Perfil | E-mail | Senha | Carteira Principal |
| --- | --- | --- | --- |
| **Colecionador 1 (Alex Rivera)** | `colecionador@kurio.art` | `Kurio@2026` | `0x71C95911E9a5D330f4D621842EC243EE1343292e` (Ethereum / Coinbase Wallet) |
| **Colecionador 2 (Nova Sato)** | `artista@kurio.art` | `Kurio@2026` | `0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5` (Ethereum / MetaMask) |

*(Também existe botões de preenchimento rápido no modal/tela de Login para alternar rapidamente entre os dois usuários).*

### Códigos Promocionais (Cupons)

| Código | Comportamento |
| --- | --- |
| `KURIO10` | **Válido** — aplica 10% de desconto sobre o subtotal em ETH |
| `GENESIS05` | **Válido** — aplica `0.50 ETH` de desconto fixo |
| `EXPIRADO20` | **Expirado** — retorna erro HTTP `422 COUPON_EXPIRED` |
| Qualquer outro (ex: `INVALIDO`) | **Inválido** — retorna erro HTTP `422 COUPON_INVALID` |

---

## 4. Seleção e Reset de Cenários MSW e Socket.IO

No canto inferior esquerdo da interface há o botão **`MSW: default`** que abre o **Painel Simulador MSW & Socket.IO**, permitindo alternar cenários determinísticos e disparar eventos em tempo real sem tocar no código:

- **Cenários de Rede e API**:
  - `default`: Operação normal com latência baixa.
  - `empty`: Catálogo retorna lista vazia (`0` itens).
  - `slow`: Latência de `1400ms` para inspecionar os **Skeletons com Shimmer Effect**.
  - `out-of-order`: Requisições ímpares demoram mais que requisições pares subsequentes (exercita cancelamento via `AbortSignal` do TanStack Query).
  - `network-error`: Falha de conexão na camada de rede.
  - `http-500`: Resposta HTTP `500` para validar feedback de erro e rollback de atualização otimista nos favoritos.
  - `session-expired`: Resposta HTTP `401 SESSION_EXPIRED` para validar retomada de sessão preservando a rota e o contexto do checkout.
  - `conflict-register`: Força conflito HTTP `409` no cadastro.
  - `coupon-invalid` / `coupon-expired`: Força erro de cupom na cotação.
  - `price-changed` / `edition-exhausted`: Dispara mudança de preço ou esgotamento de edição via Socket.IO antes de confirmar a compra, exigindo nova confirmação da cotação.
  - `order-timeout`: Simula timeout HTTP `504` **após** criar o pedido no servidor; reenviar recupera o mesmo pedido via `Idempotency-Key` sem duplicar a compra.
  - `payment-rejected`: Pedido transiciona via Socket.IO (`order.updated`) para `rejected`, preservando os itens no carrinho.
  - `payment-confirmed`: Pedido transiciona via Socket.IO (`order.updated`) para `confirmed` e exibe o recibo imutável.
- **Ações Rápidas no Painel**:
  - **Socket: Preço NFT**: Dispara evento `nft.updated` pelo servidor Socket.IO simulado.
  - **Expirar Sessão**: Expira o token atual no banco MSW.
  - **Reconectar Socket**: Desconecta e reconecta o cliente `socket.io-client`, disparando reconciliação automática com a API REST.
  - **Resetar Dados**: Restaura integralmente o banco de dados simulado (`localStorage`) e volta para o cenário `default`.

Também é possível ativar qualquer cenário via URL: `/?__scenario=slow`.

---

## 5. Comandos Disponíveis (Bun)

```bash
# Desenvolvimento com MSW e Socket.IO
bun run dev

# Verificação de tipos TypeScript
bun run typecheck

# Lint do código
bun run lint

# Build de produção otimizado
bun run build

# Preview do build de produção (porta 4173)
bun run preview

# Executar testes E2E Playwright (Desktop + Mobile Chromium)
bun run test:e2e

# Executar auditoria Lighthouse (3 execuções por página e perfil + mediana)
bun run audit:lighthouse
```

Para detalhes completos dos contratos REST, eventos Socket.IO, política de cache, precisão decimal em ETH e decisões arquiteturais, consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

