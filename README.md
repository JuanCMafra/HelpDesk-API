# API Help Desk

API de backend para um sistema de atendimento (help desk) desenvolvida com Node.js, TypeScript, Express e Prisma.

## Descrição

Esta aplicação expõe endpoints para gerenciamento de usuários, autenticação, serviços, tickets e perfil de técnicos. Possui upload de avatar, autenticação JWT e integração com banco de dados PostgreSQL via Prisma.

## Recursos

- Registro e login de usuários
- Autenticação JWT
- Rotas de perfil para obter dados do usuário autenticado
- Upload de avatar
- Gestão de serviços
- Gestão de tickets com relacionamentos entre usuários, técnicos e serviços
- Rotas administrativas para controle adicional
- Tratamento de erros centralizado
- Testes com Vitest

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

## Estrutura de rotas

- `POST /users` - criar usuário
- `POST /sessions` - login / geração de token
- `GET /profile` - dados do usuário autenticado
- `PATCH /profile/avatar` - enviar avatar do usuário
- `GET /admin` - rotas administrativas
- `GET /services` - gestão de serviços
- `GET /tickets` - gestão de tickets

> As rotas específicas de cada recurso estão implementadas em `src/routes`.

## Instalação

1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd "Help Desk/API"
```

2. Instale as dependências

```bash
npm install
```

3. Configure o banco de dados PostgreSQL

4. Copie o arquivo de ambiente e preencha as variáveis necessárias

```bash
cp .env.example .env
```

5. Execute as migrations do Prisma

```bash
npx prisma migrate deploy
```

6. Inicie a aplicação em modo de desenvolvimento

```bash
npm run dev
```

## Variáveis de ambiente

A aplicação espera as seguintes variáveis:

- `DATABASE_URL` - URL de conexão com o PostgreSQL
- `JWT_SECRET` - segredo para geração de tokens JWT
- `PORT` - porta do servidor (padrão `3333`)

## Scripts úteis

- `npm run dev` - iniciar servidor em modo de desenvolvimento
- `npm test` - executar testes
- `npm run test:dev` - executar testes em modo watch

## Banco de dados

O projeto usa Prisma como ORM. As migrations estão em `prisma/migrations`.

Para abrir o Prisma Studio:

```bash
npx prisma studio
```

## Observações

- O upload de avatares é servido em `src/profile/avatar` via `express.static`.
- Garantir que a pasta de uploads exista ou seja criada automaticamente pelo provedor de armazenamento configurado.
- Se necessário, ajuste o arquivo `prisma/schema.prisma` antes de rodar `prisma migrate`.

## Autor

Juan Mafra - FullStack Developer
