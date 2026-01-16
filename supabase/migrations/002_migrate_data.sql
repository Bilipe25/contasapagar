-- Migration: Migrar dados da tblcontas para o schema normalizado
-- Descrição: Extrai fornecedores e tipos únicos, converte dados e popula novas tabelas

-- IMPORTANTE: Esta migration assume que existe um user_id padrão para associar os dados
-- Você precisará substituir 'YOUR_USER_ID_HERE' pelo UUID real do usuário

DO $$
DECLARE
    default_user_id UUID := 'YOUR_USER_ID_HERE'; -- SUBSTITUIR PELO UUID REAL
BEGIN
    -- 1. Extrair e inserir fornecedores únicos
    INSERT INTO fornecedores (user_id, nome)
    SELECT DISTINCT 
        default_user_id,
        TRIM("FORNECEDOR")
    FROM tblcontas
    WHERE "FORNECEDOR" IS NOT NULL 
        AND TRIM("FORNECEDOR") != ''
    ON CONFLICT (user_id, nome) DO NOTHING;

    -- 2. Extrair e inserir tipos de despesa únicos
    INSERT INTO tipos_despesa (user_id, nome)
    SELECT DISTINCT 
        default_user_id,
        TRIM("TIPO_DE_DESPESA")
    FROM tblcontas
    WHERE "TIPO_DE_DESPESA" IS NOT NULL 
        AND TRIM("TIPO_DE_DESPESA") != ''
    ON CONFLICT (user_id, nome) DO NOTHING;

    -- 3. Migrar contas
    INSERT INTO contas (
        user_id,
        fornecedor_id,
        tipo_despesa_id,
        descricao,
        valor_original,
        valor_juros,
        valor_final,
        data_emissao,
        data_vencimento,
        data_pagamento,
        parcela_atual,
        total_parcelas,
        status,
        tipo_pagamento,
        observacoes
    )
    SELECT 
        default_user_id,
        f.id,
        t.id,
        COALESCE(TRIM(old."DESCRICAO_DA_CONTA"), 'Sem descrição'),
        -- Converter valores de texto para decimal
        CASE 
            WHEN old."VALOR_ORIGINAL" ~ '^[0-9]+\.?[0-9]*$' 
            THEN CAST(old."VALOR_ORIGINAL" AS DECIMAL(10,2))
            ELSE 0
        END,
        CASE 
            WHEN old."ADICIONAL_ DE_JUROS" ~ '^[0-9]+\.?[0-9]*$' 
            THEN CAST(old."ADICIONAL_ DE_JUROS" AS DECIMAL(10,2))
            ELSE 0
        END,
        CASE 
            WHEN old."VALOR_FINAL" ~ '^[0-9]+\.?[0-9]*$' 
            THEN CAST(old."VALOR_FINAL" AS DECIMAL(10,2))
            ELSE 0
        END,
        -- Converter datas (assumindo formato DD/MM/YYYY ou YYYY-MM-DD)
        CASE 
            WHEN old."data" ~ '^\d{4}-\d{2}-\d{2}$' 
            THEN CAST(old."data" AS DATE)
            WHEN old."data" ~ '^\d{2}/\d{2}/\d{4}$'
            THEN TO_DATE(old."data", 'DD/MM/YYYY')
            ELSE CURRENT_DATE
        END,
        CASE 
            WHEN old."DATA_VENCIMENTO" ~ '^\d{4}-\d{2}-\d{2}$' 
            THEN CAST(old."DATA_VENCIMENTO" AS DATE)
            WHEN old."DATA_VENCIMENTO" ~ '^\d{2}/\d{2}/\d{4}$'
            THEN TO_DATE(old."DATA_VENCIMENTO", 'DD/MM/YYYY')
            ELSE CURRENT_DATE
        END,
        CASE 
            WHEN old."DATA_PAGAMENTO" IS NOT NULL AND old."DATA_PAGAMENTO" != '' THEN
                CASE 
                    WHEN old."DATA_PAGAMENTO" ~ '^\d{4}-\d{2}-\d{2}$' 
                    THEN CAST(old."DATA_PAGAMENTO" AS DATE)
                    WHEN old."DATA_PAGAMENTO" ~ '^\d{2}/\d{2}/\d{4}$'
                    THEN TO_DATE(old."DATA_PAGAMENTO", 'DD/MM/YYYY')
                    ELSE NULL
                END
            ELSE NULL
        END,
        -- Parcelas
        CASE 
            WHEN old."PARCELAS" ~ '^[0-9]+$' 
            THEN CAST(old."PARCELAS" AS INTEGER)
            ELSE 1
        END,
        COALESCE(old."TOTAL_PARCELAS", 1),
        -- Status
        CASE 
            WHEN UPPER(TRIM(old."PAGO?")) IN ('SIM', 'S', 'TRUE', '1') THEN 'pago'::status_conta
            WHEN old."STATUS_DA_CONTA" IS NOT NULL THEN
                CASE LOWER(TRIM(old."STATUS_DA_CONTA"))
                    WHEN 'pago' THEN 'pago'::status_conta
                    WHEN 'atrasado' THEN 'atrasado'::status_conta
                    WHEN 'cancelado' THEN 'cancelado'::status_conta
                    ELSE 'pendente'::status_conta
                END
            ELSE 'pendente'::status_conta
        END,
        -- Tipo de pagamento
        CASE 
            WHEN old."TIPO_DE_PAGAMENTO" IS NOT NULL THEN
                CASE LOWER(TRIM(old."TIPO_DE_PAGAMENTO"))
                    WHEN 'dinheiro' THEN 'dinheiro'::tipo_pagamento
                    WHEN 'pix' THEN 'pix'::tipo_pagamento
                    WHEN 'cartão de crédito' THEN 'cartao_credito'::tipo_pagamento
                    WHEN 'cartao de credito' THEN 'cartao_credito'::tipo_pagamento
                    WHEN 'cartão de débito' THEN 'cartao_debito'::tipo_pagamento
                    WHEN 'cartao de debito' THEN 'cartao_debito'::tipo_pagamento
                    WHEN 'transferência' THEN 'transferencia'::tipo_pagamento
                    WHEN 'transferencia' THEN 'transferencia'::tipo_pagamento
                    ELSE NULL
                END
            ELSE NULL
        END,
        NULL -- observacoes
    FROM tblcontas old
    LEFT JOIN fornecedores f ON f.nome = TRIM(old."FORNECEDOR") AND f.user_id = default_user_id
    LEFT JOIN tipos_despesa t ON t.nome = TRIM(old."TIPO_DE_DESPESA") AND t.user_id = default_user_id;

    RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- 4. Opcional: Renomear tabela antiga (comentar se quiser manter)
-- ALTER TABLE tblcontas RENAME TO tblcontas_backup;

-- 5. Verificar migração
SELECT 
    'Fornecedores' as tabela, 
    COUNT(*) as total 
FROM fornecedores
UNION ALL
SELECT 
    'Tipos de Despesa', 
    COUNT(*) 
FROM tipos_despesa
UNION ALL
SELECT 
    'Contas', 
    COUNT(*) 
FROM contas;
