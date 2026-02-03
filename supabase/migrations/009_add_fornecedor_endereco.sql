-- =============================================
-- Migration: Adicionar campos de endereço em Fornecedores
-- Descrição: Adiciona campos para endereço completo, IE e status
-- =============================================

-- Adicionar campos de endereço
ALTER TABLE fornecedores
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT;

-- Criar índice para busca por CEP
CREATE INDEX IF NOT EXISTS idx_fornecedores_cep ON fornecedores(cep);

-- Comentários nas colunas
COMMENT ON COLUMN fornecedores.logradouro IS 'Rua, avenida, etc.';
COMMENT ON COLUMN fornecedores.numero IS 'Número do endereço';
COMMENT ON COLUMN fornecedores.complemento IS 'Complemento (sala, bloco, etc.)';
COMMENT ON COLUMN fornecedores.bairro IS 'Bairro';
COMMENT ON COLUMN fornecedores.cidade IS 'Município';
COMMENT ON COLUMN fornecedores.uf IS 'Estado (sigla)';
COMMENT ON COLUMN fornecedores.cep IS 'CEP';
COMMENT ON COLUMN fornecedores.inscricao_estadual IS 'Inscrição Estadual';
COMMENT ON COLUMN fornecedores.situacao_cadastral IS 'Situação cadastral na Receita Federal';
