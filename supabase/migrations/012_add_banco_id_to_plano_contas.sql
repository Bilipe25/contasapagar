-- Migration: Adicionar banco_id ao plano de contas
-- Descrição: Vincular contas financeiras a bancos cadastrados

ALTER TABLE plano_contas
ADD COLUMN banco_id UUID REFERENCES bancos(id) ON DELETE SET NULL;

CREATE INDEX idx_plano_contas_banco_id ON plano_contas(banco_id);
