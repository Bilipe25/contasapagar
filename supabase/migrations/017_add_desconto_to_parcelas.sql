-- =============================================
-- Migration: Add desconto field to parcelas
-- =============================================

-- Add valor_desconto column to parcelas table
ALTER TABLE parcelas 
ADD COLUMN valor_desconto numeric NOT NULL DEFAULT 0 CHECK (valor_desconto >= 0);

-- Add comment for documentation
COMMENT ON COLUMN parcelas.valor_desconto IS 'Discount amount applied at payment time';

-- Note: valor_final calculation should be: valor_original + valor_juros - valor_desconto
-- This is handled in the application layer (TRPC mutations)
