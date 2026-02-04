-- Migration: Adicionar empresa padrão para fornecedores
-- Descrição: Adiciona coluna empresa_id (referência à tabela empresas) na tabela fornecedores

-- 1. Adicionar coluna empresa_id
ALTER TABLE fornecedores
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- 2. Index para performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON fornecedores(empresa_id);

-- 3. Comentário
COMMENT ON COLUMN fornecedores.empresa_id IS 'Empresa padrão associada a este fornecedor (para preenchimento automático em contas)';
