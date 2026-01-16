-- =============================================
-- Script: COPIAR todos os dados de um usuário para outro
-- =============================================
-- INSTRUÇÕES:
-- 1. Substitua 'OLD_USER_UUID' pelo UUID do usuário de origem
-- 2. Substitua 'NEW_USER_UUID' pelo UUID do usuário de destino
-- 3. Execute no Supabase SQL Editor
-- 
-- Este script COPIA os dados, o usuário de origem mantém todos os seus dados!
-- =============================================

-- Definir os UUIDs dos usuários
DO $$
DECLARE
    old_user_id UUID := 'OLD_USER_UUID';  -- <-- SUBSTITUA AQUI
    new_user_id UUID := 'NEW_USER_UUID';  -- <-- SUBSTITUA AQUI
    
    -- Contadores para log
    fornecedores_copied INTEGER := 0;
    tipos_despesa_copied INTEGER := 0;
    contas_copied INTEGER := 0;
    parcelas_copied INTEGER := 0;
    
    -- Variáveis para mapeamento
    old_fornecedor_id UUID;
    new_fornecedor_id UUID;
    old_tipo_despesa_id UUID;
    new_tipo_despesa_id UUID;
    old_conta_id UUID;
    new_conta_id UUID;
    
    fornecedor_rec RECORD;
    tipo_rec RECORD;
    conta_rec RECORD;
    parcela_rec RECORD;
BEGIN
    -- Validar que os usuários existem
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = old_user_id) THEN
        RAISE EXCEPTION 'Usuário de origem não encontrado: %', old_user_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_user_id) THEN
        RAISE EXCEPTION 'Usuário de destino não encontrado: %', new_user_id;
    END IF;
    
    IF old_user_id = new_user_id THEN
        RAISE EXCEPTION 'Os usuários de origem e destino devem ser diferentes!';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Iniciando CÓPIA de dados';
    RAISE NOTICE 'De: %', old_user_id;
    RAISE NOTICE 'Para: %', new_user_id;
    RAISE NOTICE '===========================================';

    -- =============================================
    -- Criar tabela temporária para mapeamento de IDs
    -- =============================================
    CREATE TEMP TABLE id_mapping (
        entity_type TEXT,
        old_id UUID,
        new_id UUID
    );

    -- =============================================
    -- 1. Copiar FORNECEDORES
    -- =============================================
    FOR fornecedor_rec IN 
        SELECT * FROM fornecedores WHERE user_id = old_user_id
    LOOP
        -- Verificar se já existe com mesmo nome no destino
        SELECT id INTO new_fornecedor_id 
        FROM fornecedores 
        WHERE user_id = new_user_id AND nome = fornecedor_rec.nome;
        
        IF new_fornecedor_id IS NULL THEN
            -- Inserir novo fornecedor
            INSERT INTO fornecedores (user_id, nome, created_at, updated_at)
            VALUES (new_user_id, fornecedor_rec.nome, NOW(), NOW())
            RETURNING id INTO new_fornecedor_id;
            
            fornecedores_copied := fornecedores_copied + 1;
        END IF;
        
        -- Salvar mapeamento
        INSERT INTO id_mapping VALUES ('fornecedor', fornecedor_rec.id, new_fornecedor_id);
    END LOOP;
    
    RAISE NOTICE 'Fornecedores copiados: %', fornecedores_copied;

    -- =============================================
    -- 2. Copiar TIPOS_DESPESA
    -- =============================================
    FOR tipo_rec IN 
        SELECT * FROM tipos_despesa WHERE user_id = old_user_id
    LOOP
        -- Verificar se já existe com mesmo nome no destino
        SELECT id INTO new_tipo_despesa_id 
        FROM tipos_despesa 
        WHERE user_id = new_user_id AND nome = tipo_rec.nome;
        
        IF new_tipo_despesa_id IS NULL THEN
            -- Inserir novo tipo
            INSERT INTO tipos_despesa (user_id, nome, cor, icone, created_at, updated_at)
            VALUES (new_user_id, tipo_rec.nome, tipo_rec.cor, tipo_rec.icone, NOW(), NOW())
            RETURNING id INTO new_tipo_despesa_id;
            
            tipos_despesa_copied := tipos_despesa_copied + 1;
        END IF;
        
        -- Salvar mapeamento
        INSERT INTO id_mapping VALUES ('tipo_despesa', tipo_rec.id, new_tipo_despesa_id);
    END LOOP;
    
    RAISE NOTICE 'Tipos de despesa copiados: %', tipos_despesa_copied;

    -- =============================================
    -- 3. Copiar CONTAS
    -- =============================================
    FOR conta_rec IN 
        SELECT * FROM contas WHERE user_id = old_user_id
    LOOP
        -- Buscar novo fornecedor_id mapeado
        SELECT new_id INTO new_fornecedor_id 
        FROM id_mapping 
        WHERE entity_type = 'fornecedor' AND old_id = conta_rec.fornecedor_id;
        
        -- Buscar novo tipo_despesa_id mapeado
        SELECT new_id INTO new_tipo_despesa_id 
        FROM id_mapping 
        WHERE entity_type = 'tipo_despesa' AND old_id = conta_rec.tipo_despesa_id;
        
        -- Inserir nova conta
        INSERT INTO contas (
            user_id, 
            fornecedor_id, 
            tipo_despesa_id, 
            descricao, 
            valor_total, 
            total_parcelas, 
            data_emissao, 
            observacoes, 
            status, 
            created_at, 
            updated_at
        )
        VALUES (
            new_user_id,
            new_fornecedor_id,
            new_tipo_despesa_id,
            conta_rec.descricao,
            conta_rec.valor_total,
            conta_rec.total_parcelas,
            conta_rec.data_emissao,
            conta_rec.observacoes,
            conta_rec.status,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_conta_id;
        
        -- Salvar mapeamento
        INSERT INTO id_mapping VALUES ('conta', conta_rec.id, new_conta_id);
        contas_copied := contas_copied + 1;
    END LOOP;
    
    RAISE NOTICE 'Contas copiadas: %', contas_copied;

    -- =============================================
    -- 4. Copiar PARCELAS
    -- =============================================
    FOR parcela_rec IN 
        SELECT p.* 
        FROM parcelas p
        JOIN contas c ON p.conta_id = c.id
        WHERE c.user_id = old_user_id
    LOOP
        -- Buscar nova conta_id mapeada
        SELECT new_id INTO new_conta_id 
        FROM id_mapping 
        WHERE entity_type = 'conta' AND old_id = parcela_rec.conta_id;
        
        IF new_conta_id IS NOT NULL THEN
            -- Inserir nova parcela
            INSERT INTO parcelas (
                conta_id,
                numero_parcela,
                valor_original,
                valor_juros,
                valor_final,
                data_vencimento,
                data_pagamento,
                status,
                tipo_pagamento,
                observacoes,
                created_at,
                updated_at
            )
            VALUES (
                new_conta_id,
                parcela_rec.numero_parcela,
                parcela_rec.valor_original,
                parcela_rec.valor_juros,
                parcela_rec.valor_final,
                parcela_rec.data_vencimento,
                parcela_rec.data_pagamento,
                parcela_rec.status,
                parcela_rec.tipo_pagamento,
                parcela_rec.observacoes,
                NOW(),
                NOW()
            );
            
            parcelas_copied := parcelas_copied + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Parcelas copiadas: %', parcelas_copied;

    -- Limpar tabela temporária
    DROP TABLE id_mapping;

    -- =============================================
    -- RESUMO FINAL
    -- =============================================
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Cópia concluída com sucesso!';
    RAISE NOTICE 'Fornecedores copiados: %', fornecedores_copied;
    RAISE NOTICE 'Tipos de despesa copiados: %', tipos_despesa_copied;
    RAISE NOTICE 'Contas copiadas: %', contas_copied;
    RAISE NOTICE 'Parcelas copiadas: %', parcelas_copied;
    RAISE NOTICE '';
    RAISE NOTICE 'Os dados do usuário de origem foram MANTIDOS!';
    RAISE NOTICE '===========================================';
    
END $$;

-- =============================================
-- VERIFICAÇÃO (opcional, execute separadamente)
-- =============================================
-- Substitua os UUIDs e execute para verificar

-- SELECT 'Origem - Fornecedores' as tabela, COUNT(*) as quantidade FROM fornecedores WHERE user_id = 'OLD_USER_UUID'
-- UNION ALL
-- SELECT 'Destino - Fornecedores', COUNT(*) FROM fornecedores WHERE user_id = 'NEW_USER_UUID'
-- UNION ALL
-- SELECT 'Origem - Contas', COUNT(*) FROM contas WHERE user_id = 'OLD_USER_UUID'
-- UNION ALL
-- SELECT 'Destino - Contas', COUNT(*) FROM contas WHERE user_id = 'NEW_USER_UUID';
