-- Migration: Habilitar Row Level Security (RLS)
-- Descrição: Configura políticas de segurança para que usuários só vejam seus próprios dados

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para FORNECEDORES
CREATE POLICY "Users can view own fornecedores"
    ON fornecedores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fornecedores"
    ON fornecedores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fornecedores"
    ON fornecedores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fornecedores"
    ON fornecedores FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Políticas para TIPOS_DESPESA
CREATE POLICY "Users can view own tipos_despesa"
    ON tipos_despesa FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tipos_despesa"
    ON tipos_despesa FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tipos_despesa"
    ON tipos_despesa FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tipos_despesa"
    ON tipos_despesa FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Políticas para CONTAS
CREATE POLICY "Users can view own contas"
    ON contas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas"
    ON contas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas"
    ON contas FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas"
    ON contas FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Comentários
COMMENT ON POLICY "Users can view own fornecedores" ON fornecedores IS 'Usuários só podem ver seus próprios fornecedores';
COMMENT ON POLICY "Users can view own tipos_despesa" ON tipos_despesa IS 'Usuários só podem ver seus próprios tipos de despesa';
COMMENT ON POLICY "Users can view own contas" ON contas IS 'Usuários só podem ver suas próprias contas';
