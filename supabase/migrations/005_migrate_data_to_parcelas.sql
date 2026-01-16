-- =============================================
-- Migration: Migrar dados de tblcontas para novo schema (VERSÃO 3 - FINAL)
-- =============================================
-- CORREÇÃO: Usa ROW_NUMBER() para garantir números de parcela únicos

-- 0. Limpar dados anteriores
TRUNCATE TABLE parcelas, contas CASCADE;

-- 1. Inserir CONTAS (agrupadas por ID_Conta)
INSERT INTO contas (
    id_conta,
    user_id,
    fornecedor_id,
    tipo_despesa_id,
    descricao,
    valor_total,
    total_parcelas,
    data_emissao,
    observacoes,
    status
)
SELECT DISTINCT ON (t."ID_Conta")
    t."ID_Conta" as id_conta,
    'SEU_USER_ID_AQUI'::uuid as user_id, -- SUBSTITUIR pelo seu user_id
    f.id as fornecedor_id,
    td.id as tipo_despesa_id,
    COALESCE(t."DESCRICAO_DA_CONTA", 'Conta ' || t."ID_Conta") as descricao,
    (
        SELECT SUM(
            CASE 
                WHEN t2."VALOR_FINAL" ~ '^[0-9,.]+$' THEN 
                    REPLACE(REPLACE(t2."VALOR_FINAL", '.', ''), ',', '.')::numeric
                ELSE 0
            END
        )
        FROM tblcontas t2 WHERE t2."ID_Conta" = t."ID_Conta"
    ) as valor_total,
    COALESCE(
        t."TOTAL_PARCELAS"::integer,
        (SELECT COUNT(*) FROM tblcontas t2 WHERE t2."ID_Conta" = t."ID_Conta")::integer
    ) as total_parcelas,
    CASE 
        WHEN t."data" ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(t."data", 'DD/MM/YYYY')
        WHEN t."data" ~ '^\d{4}-\d{2}-\d{2}$' THEN t."data"::date
        ELSE CURRENT_DATE
    END as data_emissao,
    NULL as observacoes,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM tblcontas t2 
            WHERE t2."ID_Conta" = t."ID_Conta" 
            AND (t2."PAGO?" IS NULL OR t2."PAGO?" = '' OR UPPER(t2."PAGO?") NOT IN ('SIM', 'PAGO'))
        ) THEN 'quitada'
        ELSE 'ativa'
    END as status
FROM tblcontas t
LEFT JOIN fornecedores f ON LOWER(TRIM(f.nome)) = LOWER(TRIM(t."FORNECEDOR"))
LEFT JOIN tipos_despesa td ON LOWER(TRIM(td.nome)) = LOWER(TRIM(t."TIPO_DE_DESPESA"))
WHERE t."ID_Conta" IS NOT NULL
ORDER BY t."ID_Conta", t."data" ASC;

-- 2. Inserir PARCELAS usando ROW_NUMBER() para numerar sequencialmente
INSERT INTO parcelas (
    conta_id,
    numero_parcela,
    valor_original,
    valor_juros,
    valor_final,
    data_vencimento,
    data_pagamento,
    status,
    tipo_pagamento
)
SELECT 
    parcelas_data.conta_id,
    parcelas_data.numero_parcela,
    parcelas_data.valor_original,
    parcelas_data.valor_juros,
    parcelas_data.valor_final,
    parcelas_data.data_vencimento,
    parcelas_data.data_pagamento,
    parcelas_data.status,
    parcelas_data.tipo_pagamento
FROM (
    SELECT 
        c.id as conta_id,
        -- Usa ROW_NUMBER ordenado pela data de vencimento para numerar parcelas
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY 
            CASE 
                WHEN t."DATA_VENCIMENTO" ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(t."DATA_VENCIMENTO", 'DD/MM/YYYY')
                WHEN t."DATA_VENCIMENTO" ~ '^\d{4}-\d{2}-\d{2}$' THEN t."DATA_VENCIMENTO"::date
                ELSE CURRENT_DATE
            END ASC
        )::integer as numero_parcela,
        CASE 
            WHEN t."VALOR_ORIGINAL" ~ '^[0-9,.]+$' THEN 
                REPLACE(REPLACE(t."VALOR_ORIGINAL", '.', ''), ',', '.')::numeric
            ELSE 0
        END as valor_original,
        CASE 
            WHEN t."ADICIONAL_ DE_JUROS" ~ '^[0-9,.]+$' THEN 
                REPLACE(REPLACE(t."ADICIONAL_ DE_JUROS", '.', ''), ',', '.')::numeric
            ELSE 0
        END as valor_juros,
        CASE 
            WHEN t."VALOR_FINAL" ~ '^[0-9,.]+$' THEN 
                REPLACE(REPLACE(t."VALOR_FINAL", '.', ''), ',', '.')::numeric
            ELSE 0
        END as valor_final,
        CASE 
            WHEN t."DATA_VENCIMENTO" ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(t."DATA_VENCIMENTO", 'DD/MM/YYYY')
            WHEN t."DATA_VENCIMENTO" ~ '^\d{4}-\d{2}-\d{2}$' THEN t."DATA_VENCIMENTO"::date
            ELSE CURRENT_DATE
        END as data_vencimento,
        CASE 
            WHEN UPPER(t."PAGO?") IN ('SIM', 'PAGO') AND t."DATA_PAGAMENTO" ~ '^\d{2}/\d{2}/\d{4}$' THEN 
                TO_DATE(t."DATA_PAGAMENTO", 'DD/MM/YYYY')
            WHEN UPPER(t."PAGO?") IN ('SIM', 'PAGO') AND t."DATA_PAGAMENTO" ~ '^\d{4}-\d{2}-\d{2}$' THEN 
                t."DATA_PAGAMENTO"::date
            ELSE NULL
        END as data_pagamento,
        CASE 
            WHEN UPPER(t."PAGO?") IN ('SIM', 'PAGO') THEN 'pago'
            WHEN UPPER(t."STATUS_DA_CONTA") LIKE '%ATRASAD%' THEN 'atrasado'
            WHEN UPPER(t."STATUS_DA_CONTA") LIKE '%CANCEL%' THEN 'cancelado'
            ELSE 'pendente'
        END as status,
        CASE 
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%PIX%' THEN 'pix'
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%DINHEIRO%' THEN 'dinheiro'
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%CREDITO%' OR UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%CRÉDITO%' THEN 'cartao_credito'
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%DEBITO%' OR UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%DÉBITO%' THEN 'cartao_debito'
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%TRANSFER%' THEN 'transferencia'
            WHEN UPPER(t."TIPO_DE_PAGAMENTO") LIKE '%BOLETO%' THEN 'boleto'
            ELSE NULL
        END as tipo_pagamento
    FROM tblcontas t
    JOIN contas c ON c.id_conta = t."ID_Conta"
    WHERE t."ID_Conta" IS NOT NULL
) as parcelas_data;

-- 3. Verificar migração
SELECT 'Contas migradas: ' || COUNT(*) as info FROM contas
UNION ALL
SELECT 'Parcelas migradas: ' || COUNT(*) as info FROM parcelas
UNION ALL
SELECT 'Linhas originais: ' || COUNT(*) as info FROM tblcontas WHERE "ID_Conta" IS NOT NULL;

-- 4. Validação detalhada
SELECT 
    c.descricao,
    c.total_parcelas as "Esperado",
    COUNT(p.id) as "Importado",
    CASE WHEN c.total_parcelas = COUNT(p.id) THEN '✅' ELSE '⚠️' END as ok
FROM contas c
LEFT JOIN parcelas p ON p.conta_id = c.id
GROUP BY c.id, c.descricao, c.total_parcelas
ORDER BY c.descricao
LIMIT 20;
