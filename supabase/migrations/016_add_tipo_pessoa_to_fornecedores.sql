-- Migration: Add tipo_pessoa column to fornecedores table
-- This allows distinguishing between Pessoa Física (PF) and Pessoa Jurídica (PJ)

-- Add the tipo_pessoa column
ALTER TABLE fornecedores 
ADD COLUMN tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ'));

-- Migrate existing data based on CNPJ/CPF length
-- CNPJ has 14 digits, CPF has 11 digits
UPDATE fornecedores 
SET tipo_pessoa = CASE 
  WHEN LENGTH(REPLACE(REPLACE(REPLACE(cnpj_cpf, '.', ''), '/', ''), '-', '')) = 14 THEN 'PJ'
  WHEN LENGTH(REPLACE(REPLACE(REPLACE(cnpj_cpf, '.', ''), '/', ''), '-', '')) = 11 THEN 'PF'
  ELSE NULL
END
WHERE cnpj_cpf IS NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN fornecedores.tipo_pessoa IS 'Tipo de pessoa: PF (Pessoa Física) ou PJ (Pessoa Jurídica)';
