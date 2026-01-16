-- Migration: Adicionar campos extras na tabela fornecedores
-- Descrição: Adiciona CNPJ/CPF, email, telefone e observações

-- Adicionar novos campos
ALTER TABLE fornecedores
ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Criar índice para busca por CNPJ/CPF
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj_cpf ON fornecedores(cnpj_cpf);

-- Comentários nas colunas
COMMENT ON COLUMN fornecedores.cnpj_cpf IS 'CNPJ ou CPF do fornecedor';
COMMENT ON COLUMN fornecedores.email IS 'Email de contato';
COMMENT ON COLUMN fornecedores.telefone IS 'Telefone de contato';
COMMENT ON COLUMN fornecedores.observacoes IS 'Observações e notas sobre o fornecedor';
