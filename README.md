# API Help Desk

API de backend para um sistema de atendimento (help desk) desenvolvida com Node.js, TypeScript, Express e Prisma.

## Descrição

Esta aplicação oferece um backend completo para gerenciamento de usuários, autenticação JWT, upload de avatar, serviços, tickets e perfil de técnicos. O projeto integra PostgreSQL via Prisma e possui validação de dados com Zod, armazenamento de arquivos com Multer e testes com Vitest.

## Principais recursos

- Cadastro de usuários
- Login e geração de token JWT
- Proteção de rotas com autenticação e autorização por função
- Perfil do usuário com atualização de dados e senha
- Upload, atualização e remoção de avatar
- Gestão de serviços (admin)
- Criação e consulta de tickets por cliente, técnico e admin
- Adição e remoção de serviços adicionais em tickets (por técnico)
- Gestão de usuários admin e técnicos
- Tratamento de erros centralizado
- Testes automatizados com Vitest

## Tecnologias

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- JWT
- Multer
- Zod
- Vitest

> As rotas específicas de cada recurso estão implementadas em `src/routes`.

## Instalação

1. Clone o repositório:

```bash
git clone <https://github.com/JuanCMafra/HelpDesk-API>
cd "Help Desk/API"
```

2. Instale as dependências:

```bash
npm install
```

3. Copie o arquivo de exemplo e preencha as variáveis de ambiente:

```bash
copy .env-example .env
```

4. Configure o `DATABASE_URL` no `.env` com a conexão PostgreSQL.

5. Rode as migrations:

```bash
npx prisma migrate deploy
```

6. Execute a seed do banco de dados:

```bash
npx prisma db seed
```

7. Inicie a aplicação em modo de desenvolvimento:

```bash
npm run dev
```

## Variáveis de ambiente

O projeto exige as seguintes variáveis no `.env`:

- `DATABASE_URL` - URL de conexão com o banco PostgreSQL
- `JWT_SECRET` - segredo para geração de tokens JWT
- `PORT` - porta do servidor (opcional, padrão `3333`)
- `ADMIN_EMAIL` - email do administrador para a seed
- `ADMIN_PASSWORD` - senha do administrador para a seed
- `CORS` - origem permitida para requisições cross-origin (por exemplo, `http://localhost:5173`)

## Scripts úteis

- `npm run dev` - inicia o servidor em modo desenvolvimento com `tsx` e reload
- `npm run test` - executa os testes com Vitest
- `npm run test:dev` - executa os testes em modo watch
- `npm run build` - empacota o servidor em JavaScript em `build`
- `npm start` - executa o servidor compilado em `build`

## Estrutura de rotas

### Autenticação

- `POST /users`
  - Cria um novo usuário
  - Body: `{ "name": string, "email": string, "password": string }`

- `POST /sessions`
  - Autentica usuário e retorna token JWT
  - Body: `{ "email": string, "password": string }`
  - Resposta: `{ "token": string, "user": {...} }`

### Perfil (`/profile`)

Todas as rotas de perfil exigem header `Authorization: Bearer <token>`.

- `GET /profile`
  - Obtém dados do usuário autenticado

- `PATCH /profile`
  - Atualiza `name` e/ou `email`
  - Body opcional: `{ "name": string, "email": string }`

- `PATCH /profile/password`
  - Atualiza senha
  - Body: `{ "currentPassword": string, "newPassword": string }`

- `POST /profile/avatar`
  - Faz upload do avatar do usuário
  - Form-data: campo `file`
  - Aceita `image/jpeg`, `image/jpg`, `image/png`
  - Tamanho máximo: 3 MB

- `PATCH /profile/avatar`
  - Remove o avatar atual do usuário

### Serviços (`/services`)

Todas exigem token válido.

- `POST /services`
  - Cria um serviço (admin)
  - Body: `{ "title": string, "price": number }`

- `GET /services/admin`
  - Lista todos os serviços (admin)

- `GET /services/customer`
  - Lista apenas serviços ativos (customer)

- `GET /services/:id`
  - Retorna um serviço por ID (admin)

- `PATCH /services/update/:id`
  - Atualiza título e/ou preço do serviço (admin)
  - Body: `{ "title"?: string, "price"?: number }`

- `PATCH /services/status/:id`
  - Ativa/desativa serviço (admin)

### Tickets (`/tickets`)

Todas exigem token válido.

- `POST /tickets`
  - Cria um ticket para cliente
  - Body: `{ "title": string, "description"?: string, "service": string }`

- `GET /tickets/customer`
  - Lista tickets do cliente autenticado

- `GET /tickets/customer/:id`
  - Mostra detalhe de um ticket do cliente

- `GET /tickets/technician`
  - Lista tickets do técnico autenticado

- `GET /tickets/technician/:id`
  - Mostra detalhe de ticket do técnico

- `PATCH /tickets/:id/status`
  - Atualiza status do ticket (technician ou admin)
  - Body: `{ "status": "open" | "in_progress" | "close" }`

- `POST /tickets/:id`
  - Adiciona serviço adicional a um ticket (technician)
  - Body: `{ "title": string, "price": number }`

- `DELETE /tickets/:id`
  - Remove serviço adicional do ticket (technician)

- `GET /tickets/admin`
  - Lista todos os tickets (admin)

- `GET /tickets/admin/:id`
  - Mostra ticket por ID (admin)

### Admin (`/admin`)

Todas as rotas admin exigem token válido e função `admin`.

- `GET /admin/customer`
  - Lista clientes

- `GET /admin/customer/:id`
  - Mostra cliente por ID

- `PATCH /admin/customer/:id`
  - Atualiza cliente

- `DELETE /admin/customer/:id`
  - Exclui cliente e avatar associado

- `GET /admin/technician`
  - Lista técnicos

- `GET /admin/technician/:id`
  - Mostra técnico por ID

- `POST /admin/technician`
  - Cria técnico
  - Body: `{ "name": string, "email": string, "password": string, "availability": string[] }`

- `PATCH /admin/technician/:id`
  - Atualiza técnico e disponibilidade

- `PATCH /admin/technician/delete/:id`
  - Alterna o status ativo/inativo do técnico

## Upload de avatar

- O arquivo enviado via `POST /profile/avatar` é armazenado em `tmp/uploads`
- A URL pública para download é `http://<host>:<port>/profile/avatar/<nome-do-arquivo>`
- Formato aceito: `image/jpeg`, `image/jpg`, `image/png`
- Limite de tamanho: 3 MB

## Seed do banco de dados

A seed popula o banco com dados iniciais e utiliza `upsert` para evitar duplicações.

### Dados criados na seed

- Conta de administrador com `ADMIN_EMAIL` e `ADMIN_PASSWORD`
- 3 técnicos com email e senha padrão
- Vários serviços base disponíveis

### Instruções para executar a seed

```bash
npx prisma db seed
```

## Observações importantes

- O CORS está configurado para aceitar requisições de `http://localhost:5173` por padrão, quando não está definida.
- A porta padrão é `3333` quando `PORT` não está definida.
- Para produção, ajuste `DATABASE_URL`, `JWT_SECRET` e `CORS` conforme necessário.

## Autor

Juan Mafra - FullStack Developer
