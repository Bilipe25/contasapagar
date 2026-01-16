-- Migration: Criar schema normalizado para controle de contas a pagar
-- Descrição: Cria tabelas normalizadas (fornecedores, tipos_despesa, contas) e migra dados da tblcontas

-- 1. Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, nome)
);

-- 2. Criar tabela de tipos de despesa
CREATE TABLE IF NOT EXISTS tipos_despesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#6366f1',
    icone TEXT DEFAULT 'receipt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, nome)
);

-- 3. Criar enum para status
CREATE TYPE status_conta AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- 4. Criar enum para tipo de pagamento
CREATE TYPE tipo_pagamento AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia');

-- 5. Criar tabela de contas
CREATE TABLE IF NOT EXISTS contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    tipo_despesa_id UUID REFERENCES tipos_despesa(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    valor_original DECIMAL(10, 2) NOT NULL,
    valor_juros DECIMAL(10, 2) DEFAULT 0,
    valor_final DECIMAL(10, 2) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    parcela_atual INTEGER DEFAULT 1,
    total_parcelas INTEGER DEFAULT 1,
    status status_conta DEFAULT 'pendente',
    tipo_pagamento tipo_pagamento,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (valor_original >= 0),
    CHECK (valor_juros >= 0),
    CHECK (valor_final >= 0),
    CHECK (parcela_atual > 0),
    CHECK (total_parcelas > 0),
    CHECK (parcela_atual <= total_parcelas)
);

-- 6. Criar índices para performance
CREATE INDEX idx_contas_user_id ON contas(user_id);
CREATE INDEX idx_contas_fornecedor_id ON contas(fornecedor_id);
CREATE INDEX idx_contas_tipo_despesa_id ON contas(tipo_despesa_id);
CREATE INDEX idx_contas_data_vencimento ON contas(data_vencimento);
CREATE INDEX idx_contas_status ON contas(status);
CREATE INDEX idx_contas_user_status ON contas(user_id, status);
CREATE INDEX idx_contas_user_vencimento ON contas(user_id, data_vencimento);

-- 7. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar triggers para updated_at
CREATE TRIGGER update_fornecedores_updated_at
    BEFORE UPDATE ON fornecedores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tipos_despesa_updated_at
    BEFORE UPDATE ON tipos_despesa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_updated_at
    BEFORE UPDATE ON contas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Criar função para atualizar status automaticamente (atrasado)
CREATE OR REPLACE FUNCTION update_status_atrasado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.status = 'atrasado';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_status_atrasado
    BEFORE INSERT OR UPDATE ON contas
    FOR EACH ROW
    EXECUTE FUNCTION update_status_atrasado();

-- 10. Comentários nas tabelas
COMMENT ON TABLE fornecedores IS 'Fornecedores/credores das contas a pagar';
COMMENT ON TABLE tipos_despesa IS 'Categorias/tipos de despesas';
COMMENT ON TABLE contas IS 'Contas a pagar com informações completas';
