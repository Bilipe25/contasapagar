-- =============================================
-- Migration: Adicionar tabela de Empresas
-- Descrição: Cria tabela empresas com CNPJ, razão social e campos adicionais
-- =============================================

-- 1. Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT,
    inscricao_estadual TEXT,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- CNPJ único por usuário (quando preenchido)
    UNIQUE NULLS NOT DISTINCT (user_id, cnpj)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_razao_social ON empresas(razao_social);

-- 3. Trigger para updated_at
DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
    BEFORE UPDATE ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view own empresas" ON empresas;
CREATE POLICY "Users can view own empresas" ON empresas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own empresas" ON empresas;
CREATE POLICY "Users can insert own empresas" ON empresas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own empresas" ON empresas;
CREATE POLICY "Users can update own empresas" ON empresas FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own empresas" ON empresas;
CREATE POLICY "Users can delete own empresas" ON empresas FOR DELETE USING (auth.uid() = user_id);

-- 5. Adicionar coluna empresa_id na tabela contas
ALTER TABLE contas 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Índice para busca por empresa
CREATE INDEX IF NOT EXISTS idx_contas_empresa_id ON contas(empresa_id);

-- 6. Comentários para documentação
COMMENT ON TABLE empresas IS 'Empresas cadastradas para associar às contas a pagar';
COMMENT ON COLUMN empresas.razao_social IS 'Razão social da empresa (obrigatório)';
COMMENT ON COLUMN empresas.nome_fantasia IS 'Nome fantasia (opcional)';
COMMENT ON COLUMN empresas.cnpj IS 'CNPJ da empresa (formato: 00.000.000/0000-00)';
COMMENT ON COLUMN empresas.inscricao_estadual IS 'Inscrição estadual da empresa';
COMMENT ON COLUMN empresas.ativa IS 'Se a empresa está ativa no sistema';
COMMENT ON COLUMN contas.empresa_id IS 'Empresa associada à conta (opcional)';
