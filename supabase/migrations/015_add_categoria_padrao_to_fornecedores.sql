-- Migration: Adicionar categoria padrão para fornecedores
-- Descrição: Adiciona coluna tipo_despesa_id (referência à tabela tipos_despesa) na tabela fornecedores

-- 1. Adicionar coluna tipo_despesa_id
ALTER TABLE fornecedores
ADD COLUMN IF NOT EXISTS tipo_despesa_id UUID REFERENCES tipos_despesa(id) ON DELETE SET NULL;

-- 2. Index para performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo_despesa_id ON fornecedores(tipo_despesa_id);

-- 3. Comentário
COMMENT ON COLUMN fornecedores.tipo_despesa_id IS 'Categoria de despesa padrão associada a este fornecedor';
