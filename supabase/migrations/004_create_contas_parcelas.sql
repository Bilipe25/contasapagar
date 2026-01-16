-- =============================================
-- Migration: Reestruturação para Contas e Parcelas (CORRIGIDO)
-- =============================================

-- 1. Lógica segura de Backup e Limpeza
DO $$
BEGIN
    -- Se contas_backup JÁ existe, assumimos que 'contas' atual é uma tentativa falha ou nova tabela
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contas_backup') THEN
        DROP TABLE IF EXISTS contas CASCADE;
    ELSE
        -- Se contas_backup NÃO existe, renomeamos a atual 'contas' para backup
        ALTER TABLE IF EXISTS contas RENAME TO contas_backup;
    END IF;
END $$;

-- 2. Remover índices antigos que podem causar conflito de nome
-- (Estes índices pertencem agora à tabela contas_backup, se existir)
DROP INDEX IF EXISTS idx_contas_user_id;
DROP INDEX IF EXISTS idx_contas_fornecedor_id;
DROP INDEX IF EXISTS idx_contas_tipo_despesa_id;
DROP INDEX IF EXISTS idx_contas_status;
DROP INDEX IF EXISTS idx_contas_id_conta;

-- 3. Criar nova tabela CONTAS (agrupamento/contrato)
CREATE TABLE contas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta bigint, -- Código legado da conta original
    user_id uuid NOT NULL REFERENCES auth.users(id),
    fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
    tipo_despesa_id uuid REFERENCES tipos_despesa(id) ON DELETE SET NULL,
    descricao text NOT NULL,
    valor_total numeric NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    total_parcelas integer NOT NULL DEFAULT 1 CHECK (total_parcelas > 0),
    data_emissao date NOT NULL DEFAULT CURRENT_DATE,
    observacoes text,
    status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'quitada', 'cancelada')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Criar tabela PARCELAS
DROP TABLE IF EXISTS parcelas CASCADE; -- Garantir que não existe
CREATE TABLE parcelas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id uuid NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    numero_parcela integer NOT NULL CHECK (numero_parcela > 0),
    valor_original numeric NOT NULL DEFAULT 0 CHECK (valor_original >= 0),
    valor_juros numeric NOT NULL DEFAULT 0 CHECK (valor_juros >= 0),
    valor_final numeric NOT NULL DEFAULT 0 CHECK (valor_final >= 0),
    data_vencimento date NOT NULL,
    data_pagamento date,
    status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    tipo_pagamento text CHECK (tipo_pagamento IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto')),
    observacoes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Garantir unicidade de parcela por conta
    UNIQUE(conta_id, numero_parcela)
);

-- 5. Criar índices para performance
CREATE INDEX idx_contas_user_id ON contas(user_id);
CREATE INDEX idx_contas_fornecedor_id ON contas(fornecedor_id);
CREATE INDEX idx_contas_tipo_despesa_id ON contas(tipo_despesa_id);
CREATE INDEX idx_contas_status ON contas(status);
CREATE INDEX idx_contas_id_conta ON contas(id_conta);

CREATE INDEX idx_parcelas_conta_id ON parcelas(conta_id);
CREATE INDEX idx_parcelas_data_vencimento ON parcelas(data_vencimento);
CREATE INDEX idx_parcelas_status ON parcelas(status);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contas_updated_at ON contas;
CREATE TRIGGER update_contas_updated_at
    BEFORE UPDATE ON contas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;
CREATE TRIGGER update_parcelas_updated_at
    BEFORE UPDATE ON parcelas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Trigger para atualizar status da conta baseado nas parcelas
CREATE OR REPLACE FUNCTION update_conta_status()
RETURNS TRIGGER AS $$
DECLARE
    total_parcelas integer;
    parcelas_pagas integer;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pago')
    INTO total_parcelas, parcelas_pagas
    FROM parcelas
    WHERE conta_id = COALESCE(NEW.conta_id, OLD.conta_id);
    
    -- Atualizar status da conta
    IF parcelas_pagas = total_parcelas AND total_parcelas > 0 THEN
        UPDATE contas SET status = 'quitada' WHERE id = COALESCE(NEW.conta_id, OLD.conta_id);
    ELSE
        UPDATE contas SET status = 'ativa' WHERE id = COALESCE(NEW.conta_id, OLD.conta_id);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_conta_status ON parcelas;
CREATE TRIGGER trigger_update_conta_status
    AFTER INSERT OR UPDATE OR DELETE ON parcelas
    FOR EACH ROW
    EXECUTE FUNCTION update_conta_status();

-- 8. RLS (Row Level Security)
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

-- Políticas para CONTAS
DROP POLICY IF EXISTS "Users can view own contas" ON contas;
CREATE POLICY "Users can view own contas" ON contas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contas" ON contas;
CREATE POLICY "Users can insert own contas" ON contas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contas" ON contas;
CREATE POLICY "Users can update own contas" ON contas FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contas" ON contas;
CREATE POLICY "Users can delete own contas" ON contas FOR DELETE USING (auth.uid() = user_id);

-- Políticas para PARCELAS
DROP POLICY IF EXISTS "Users can view parcelas of own contas" ON parcelas;
CREATE POLICY "Users can view parcelas of own contas" ON parcelas FOR SELECT USING (EXISTS (SELECT 1 FROM contas WHERE contas.id = parcelas.conta_id AND contas.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert parcelas in own contas" ON parcelas;
CREATE POLICY "Users can insert parcelas in own contas" ON parcelas FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM contas WHERE contas.id = parcelas.conta_id AND contas.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update parcelas of own contas" ON parcelas;
CREATE POLICY "Users can update parcelas of own contas" ON parcelas FOR UPDATE USING (EXISTS (SELECT 1 FROM contas WHERE contas.id = parcelas.conta_id AND contas.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete parcelas of own contas" ON parcelas;
CREATE POLICY "Users can delete parcelas of own contas" ON parcelas FOR DELETE USING (EXISTS (SELECT 1 FROM contas WHERE contas.id = parcelas.conta_id AND contas.user_id = auth.uid()));
