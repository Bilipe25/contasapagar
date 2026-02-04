-- Migration: Criar tabela de plano de contas
-- Descrição: Tabela hierárquica para estruturar despesas e receitas

CREATE TABLE IF NOT EXISTS plano_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 7),
    tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA', 'APLICACAO', 'OUTROS_CUSTOS')),
    modo TEXT NOT NULL CHECK (modo IN ('SINTETICA', 'ANALITICA')),
    conta_superior_id UUID REFERENCES plano_contas(id) ON DELETE RESTRICT,
    conta_banco BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, codigo)
);

-- Índices para performance
CREATE INDEX idx_plano_contas_user_id ON plano_contas(user_id);
CREATE INDEX idx_plano_contas_codigo ON plano_contas(codigo);
CREATE INDEX idx_plano_contas_conta_superior ON plano_contas(conta_superior_id);

-- Trigger para updated_at
CREATE TRIGGER update_plano_contas_updated_at
    BEFORE UPDATE ON plano_contas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio plano de contas"
    ON plano_contas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir em seu próprio plano de contas"
    ON plano_contas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio plano de contas"
    ON plano_contas FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seu próprio plano de contas"
    ON plano_contas FOR DELETE
    USING (auth.uid() = user_id);
