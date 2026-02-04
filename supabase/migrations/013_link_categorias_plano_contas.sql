-- Migration: Vincular Categorias e Contas ao Plano de Contas
-- Descrição: Adiciona colunas para vincular tipos_despesa e contas ao plano_contas

-- 1. Adicionar plano_conta_id em tipos_despesa
ALTER TABLE public.tipos_despesa
ADD COLUMN plano_conta_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL;

-- 2. Adicionar plano_conta_id em contas (para persistir o vínculo histórico)
ALTER TABLE public.contas
ADD COLUMN plano_conta_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tipos_despesa_plano_conta ON public.tipos_despesa(plano_conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_plano_conta ON public.contas(plano_conta_id);
