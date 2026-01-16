# 📊 App de Controle de Contas a Pagar

Sistema completo de gerenciamento de contas a pagar pessoal, construído com Next.js 15, Supabase, TypeScript e stack moderna focada em produtividade e experiência premium.

## 🚀 Stack Tecnológica

### Framework & Core
- **Next.js 15** (App Router)
- **TypeScript**
- **React 19**

### Backend & Database
- **Supabase** (PostgreSQL + Auth)
- **tRPC** (Type-safe API)

### Estado & Cache
- **Zustand** (Estado global)
- **TanStack Query v5** (Server state)

### UI & Styling
- **shadcn/ui** (Componentes)
- **Tailwind CSS**
- **Framer Motion** (Animações)
- **Lucide React** (Ícones)

### Formulários & Validação
- **React Hook Form**
- **Zod** (Schema validation)

### Relatórios
- **pdfmake** (PDF)
- **xlsx** (Excel)
- **Recharts** (Gráficos)

## 📦 Instalação

```bash
# Clonar repositório
git clone <seu-repositorio>
cd projetocontrolecontasapagar

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Criar arquivo .env.local com:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Configuração do Banco de Dados

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e a chave anônima para o `.env.local`

### 2. Aplicar Migrations

As migrations estão em `supabase/migrations/`. Você pode aplicá-las de duas formas:

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard do seu projeto
2. Vá em **SQL Editor**
3. Execute os arquivos SQL na ordem:
   - `001_create_normalized_schema.sql` - Cria tabelas normalizadas
   - `002_migrate_data.sql` - Migra dados da `tblcontas` (IMPORTANTE: edite o `YOUR_USER_ID_HERE`)
   - `003_enable_rls.sql` - Habilita Row Level Security

#### Opção B: Via Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref your-project-ref

# Aplicar migrations
supabase db push
```

### 3. Obter User ID para Migração

Para migrar os dados da `tblcontas`, você precisa do UUID do usuário:

1. Crie uma conta no app (após rodar o projeto)
2. No Supabase Dashboard, vá em **Authentication** > **Users**
3. Copie o UUID do usuário
4. Edite `002_migrate_data.sql` e substitua `YOUR_USER_ID_HERE` pelo UUID
5. Execute a migration

## 🏃 Executar o Projeto

```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar produção
npm start
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
projetocontrolecontasapagar/
├── app/                          # Next.js App Router
│   ├── api/trpc/[trpc]/         # tRPC API routes
│   ├── (auth)/                  # Rotas de autenticação
│   ├── contas/                  # Página de contas
│   ├── relatorios/              # Página de relatórios
│   └── configuracoes/           # Página de configurações
├── components/                   # Componentes React
│   ├── ui/                      # shadcn/ui components
│   ├── contas/                  # Componentes de contas
│   └── dashboard/               # Componentes do dashboard
├── lib/                         # Bibliotecas e utilitários
│   ├── supabase/               # Clientes Supabase
│   ├── trpc/                   # Configuração tRPC
│   │   ├── routers/            # Routers tRPC
│   │   ├── init.ts             # Inicialização tRPC
│   │   ├── router.ts           # Router principal
│   │   └── client.tsx          # Cliente tRPC
│   ├── store/                  # Zustand stores
│   └── utils.ts                # Funções utilitárias
├── supabase/                    # Configuração Supabase
│   └── migrations/             # Migrations SQL
└── public/                      # Arquivos estáticos
```

## 🔐 Autenticação

O app usa Supabase Auth com suporte a:
- Email/Senha
- OAuth (Google, GitHub)
- Magic Links

## 🎯 Funcionalidades

### ✅ Implementadas

- ✅ Schema normalizado do banco de dados
- ✅ Migrations SQL com RLS
- ✅ Configuração tRPC com 4 routers:
  - `contas` - CRUD de contas
  - `fornecedores` - Gerenciamento de fornecedores
  - `tiposDespesa` - Gerenciamento de tipos de despesa
  - `dashboard` - Estatísticas e gráficos
- ✅ Supabase clients (browser e server)
- ✅ Store Zustand para estado global
- ✅ Funções utilitárias (formatação, datas, status)

### 🚧 Em Desenvolvimento

- Dashboard principal
- Listagem e CRUD de contas
- Filtros e busca
- Gráficos e relatórios
- Exportação PDF/Excel
- Autenticação
- PWA

## 📊 Schema do Banco de Dados

### Tabelas Principais

**fornecedores**
- `id` (UUID)
- `user_id` (UUID) - FK para auth.users
- `nome` (TEXT)
- `created_at`, `updated_at`

**tipos_despesa**
- `id` (UUID)
- `user_id` (UUID)
- `nome` (TEXT)
- `cor` (TEXT) - Para UI
- `icone` (TEXT) - Para UI
- `created_at`, `updated_at`

**contas**
- `id` (UUID)
- `user_id` (UUID)
- `fornecedor_id` (UUID) - FK
- `tipo_despesa_id` (UUID) - FK
- `descricao` (TEXT)
- `valor_original` (DECIMAL)
- `valor_juros` (DECIMAL)
- `valor_final` (DECIMAL)
- `data_emissao` (DATE)
- `data_vencimento` (DATE)
- `data_pagamento` (DATE)
- `parcela_atual` (INTEGER)
- `total_parcelas` (INTEGER)
- `status` (ENUM: pendente, pago, atrasado, cancelado)
- `tipo_pagamento` (ENUM: dinheiro, pix, cartao_credito, cartao_debito, transferencia)
- `observacoes` (TEXT)
- `created_at`, `updated_at`

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm start            # Executar produção
npm run lint         # Lint código
npm run type-check   # Verificar tipos TypeScript
```

## 📝 Próximos Passos

1. **Aplicar migrations no Supabase**
2. **Configurar autenticação**
3. **Criar componentes UI**
4. **Implementar dashboard**
5. **Adicionar gráficos e relatórios**

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões são bem-vindas!

## 📄 Licença

MIT
