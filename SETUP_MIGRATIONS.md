# 🚀 Guia Rápido: Aplicar Migrations no Supabase

## Passo 1: Obter seu User ID

Antes de aplicar a migration de dados, você precisa do UUID do seu usuário:

### Opção A: Criar usuário primeiro (Recomendado)

1. Execute o projeto localmente:
   ```bash
   npm run dev
   ```

2. Acesse http://localhost:3000 e crie uma conta

3. No Supabase Dashboard:
   - Vá em **Authentication** > **Users**
   - Copie o **UUID** do usuário que você criou

### Opção B: Usar SQL para criar usuário de teste

No Supabase SQL Editor, execute:
```sql
-- Criar usuário de teste
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), -- Este será seu USER_ID
    'authenticated',
    'authenticated',
    'seu-email@example.com',
    crypt('sua-senha-aqui', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) RETURNING id;
```

Copie o `id` retornado.

## Passo 2: Editar Migration de Dados

1. Abra o arquivo: `supabase/migrations/002_migrate_data.sql`

2. Na linha 9, substitua `'YOUR_USER_ID_HERE'` pelo UUID que você copiou:
   ```sql
   default_user_id UUID := 'cole-seu-uuid-aqui';
   ```

## Passo 3: Aplicar Migrations no Supabase

### Via Supabase Dashboard (Mais Fácil)

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)

2. Vá em **SQL Editor** (ícone de código no menu lateral)

3. Clique em **New Query**

4. Copie e cole o conteúdo de cada migration **NA ORDEM**:

   **a) Primeira: 001_create_normalized_schema.sql**
   - Copie todo o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run** (ou Ctrl+Enter)
   - Aguarde confirmação de sucesso ✅

   **b) Segunda: 002_migrate_data.sql**
   - **IMPORTANTE**: Certifique-se de ter editado o `YOUR_USER_ID_HERE`
   - Copie todo o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run**
   - Você verá uma mensagem: "Migração concluída com sucesso!"
   - Verá também uma tabela com a contagem de registros migrados

   **c) Terceira: 003_enable_rls.sql**
   - Copie todo o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run**
   - Aguarde confirmação de sucesso ✅

5. **Verificar**: No final, você deve ver uma tabela mostrando:
   ```
   Fornecedores    | X
   Tipos de Despesa| Y
   Contas          | Z
   ```

## Passo 4: Verificar Tabelas

No Supabase Dashboard, vá em **Table Editor**:

Você deve ver as novas tabelas:
- ✅ `fornecedores`
- ✅ `tipos_despesa`
- ✅ `contas`

E a tabela antiga:
- `tblcontas` (pode ser mantida como backup ou renomeada)

## Passo 5: Configurar Variáveis de Ambiente

1. No Supabase Dashboard, vá em **Settings** > **API**

2. Copie:
   - **Project URL** (algo como: `https://xxxxx.supabase.co`)
   - **anon public** key (chave longa começando com `eyJ...`)

3. Crie o arquivo `.env.local` na raiz do projeto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...sua-chave-aqui
   ```

## Passo 6: Testar o Projeto

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Executar em modo desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## ✅ Checklist de Verificação

- [ ] User ID obtido e copiado
- [ ] `002_migrate_data.sql` editado com o User ID correto
- [ ] Migration 001 aplicada com sucesso
- [ ] Migration 002 aplicada com sucesso (dados migrados)
- [ ] Migration 003 aplicada com sucesso (RLS habilitado)
- [ ] Tabelas visíveis no Table Editor
- [ ] Arquivo `.env.local` criado com credenciais
- [ ] Projeto rodando em http://localhost:3000

## 🆘 Problemas Comuns

### Erro: "column does not exist"
- **Causa**: Nomes de colunas em maiúsculas sem aspas duplas
- **Solução**: Já corrigido na migration atualizada

### Erro: "relation tblcontas does not exist"
- **Causa**: Tabela `tblcontas` não existe no banco
- **Solução**: Verifique se você importou os dados da planilha para o Supabase

### Erro: "duplicate key value violates unique constraint"
- **Causa**: Tentando executar a migration novamente
- **Solução**: Limpe as tabelas antes:
  ```sql
  TRUNCATE contas, fornecedores, tipos_despesa CASCADE;
  ```

### Nenhum dado foi migrado
- **Causa**: User ID incorreto ou não substituído
- **Solução**: Verifique se você substituiu `YOUR_USER_ID_HERE` pelo UUID real

## 📞 Próximos Passos

Após aplicar as migrations com sucesso:

1. ✅ Testar autenticação (login/registro)
2. ✅ Criar componentes UI (Dashboard, Listagem)
3. ✅ Implementar CRUD de contas
4. ✅ Adicionar gráficos e relatórios
