import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { TRPCError } from '@trpc/server'

export const contasRouter = router({
    // Listar todas as contas (agrupadas, sem parcelas)
    list: protectedProcedure
        .input(
            z.object({
                status: z.enum(['ativa', 'quitada', 'cancelada']).optional(),
                fornecedorId: z.string().optional(),
                tipoDespesaId: z.string().optional(),
                empresaId: z.string().optional(),
                bancoId: z.string().optional(),
                dataInicio: z.string().optional(),
                dataFim: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            let query = ctx.supabase
                .from('contas')
                .select(`
                    *,
                    fornecedores(id, nome),
                    tipos_despesa(id, nome, cor),
                    empresas(id, razao_social, nome_fantasia, cnpj),
                    bancos(id, nome),
                    ${(input?.dataInicio || input?.dataFim) ? 'parcelas!inner' : 'parcelas'}(id, numero_parcela, valor_final, status, data_vencimento, data_pagamento)
                `)
                .eq('user_id', ctx.user.id)
                .order('created_at', { ascending: false })

            if (input?.status) {
                query = query.eq('status', input.status)
            }
            if (input?.fornecedorId) {
                query = query.eq('fornecedor_id', input.fornecedorId)
            }
            if (input?.tipoDespesaId) {
                query = query.eq('tipo_despesa_id', input.tipoDespesaId)
            }
            if (input?.empresaId) {
                query = query.eq('empresa_id', input.empresaId)
            }
            if (input?.bancoId) {
                query = query.eq('banco_id', input.bancoId)
            }
            if (input?.dataInicio) {
                query = query.gte('parcelas.data_vencimento', input.dataInicio)
            }
            if (input?.dataFim) {
                query = query.lte('parcelas.data_vencimento', input.dataFim)
            }

            const { data, error } = await query

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar contas',
                    cause: error,
                })
            }

            // Calcular estatísticas para cada conta
            return data?.map(conta => {
                const parcelas = conta.parcelas || []
                const totalParcelas = parcelas.length

                // Define minimal Parcela interface for type safety inside this map
                interface ParcelaStats {
                    id: string;
                    status: string;
                    valor_final: number;
                    data_vencimento: string;
                    numero_parcela: number;
                    conta_id: string;
                    tipo_pagamento?: string | null;
                }

                const parcelasPagas = parcelas.filter((p: ParcelaStats) => p.status === 'pago').length
                const valorPago = parcelas
                    .filter((p: ParcelaStats) => p.status === 'pago')
                    .reduce((sum: number, p: ParcelaStats) => sum + (p.valor_final || 0), 0)
                const valorPendente = parcelas
                    .filter((p: ParcelaStats) => p.status !== 'pago' && p.status !== 'cancelado')
                    .reduce((sum: number, p: ParcelaStats) => sum + (p.valor_final || 0), 0)
                const proximaParcelaVencimento = parcelas
                    .filter((p: ParcelaStats) => p.status === 'pendente' || p.status === 'atrasado')
                    .sort((a: ParcelaStats, b: ParcelaStats) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())[0]

                // Status calculado dinamicamente
                let statusCalculado = 'ativa'
                if (totalParcelas > 0 && parcelasPagas === totalParcelas) {
                    statusCalculado = 'quitada'
                } else if (conta.status === 'cancelada') {
                    statusCalculado = 'cancelada'
                }

                // Calcular número da parcela atual (próxima pendente ou última paga + 1)
                const parcelaAtual = proximaParcelaVencimento?.numero_parcela || parcelasPagas + 1

                return {
                    ...conta,
                    status: statusCalculado, // Sobrescreve o status do banco
                    total_parcelas: totalParcelas, // Usa o total real de parcelas
                    parcela_atual: parcelaAtual, // Número da parcela atual
                    parcelas_pagas: parcelasPagas,
                    valor_pago: valorPago,
                    valor_pendente: valorPendente,
                    proxima_parcela: proximaParcelaVencimento,
                }
            }) || []
        }),

    // Buscar conta por ID com todas as parcelas
    getById: protectedProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('contas')
                .select(`
                    *,
                    fornecedores(id, nome),
                    tipos_despesa(id, nome, cor),
                    empresas(id, razao_social, cnpj),
                    bancos(id, nome),
                    parcelas(*)
                `)
                .eq('id', input)
                .eq('user_id', ctx.user.id)
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conta não encontrada',
                })
            }

            // Ordenar parcelas por número
            // Ordenar parcelas por número
            if (data.parcelas) {
                data.parcelas.sort((a: { numero_parcela: number }, b: { numero_parcela: number }) => a.numero_parcela - b.numero_parcela)
            }

            return data
        }),

    // Criar nova conta com parcelas
    create: protectedProcedure
        .input(
            z.object({
                descricao: z.string().min(1),
                fornecedor_id: z.string().optional().nullable(),
                tipo_despesa_id: z.string().optional().nullable(),
                empresa_id: z.string().optional().nullable(),
                data_emissao: z.string(),
                total_parcelas: z.number().min(1).default(1),
                valor_original: z.number().min(0),
                valor_juros: z.number().default(0),
                data_vencimento: z.string(), // Primeiro vencimento (fallback)
                intervalo_dias: z.number().default(30),
                observacoes: z.string().optional().nullable(),
                // Novo: array de parcelas personalizadas
                parcelas: z.array(z.object({
                    valor: z.number(),
                    data_vencimento: z.string(),
                })).optional(),
                banco_id: z.string().uuid().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Calcular valor total a partir das parcelas personalizadas ou usar o padrão
            const valorTotal = input.parcelas
                ? input.parcelas.reduce((acc, p) => acc + p.valor, 0)
                : input.valor_original * input.total_parcelas

            // 1. Criar a conta
            const { data: conta, error: contaError } = await ctx.supabase
                .from('contas')
                .insert({
                    user_id: ctx.user.id,
                    descricao: input.descricao,
                    fornecedor_id: input.fornecedor_id || null,
                    tipo_despesa_id: input.tipo_despesa_id || null,
                    empresa_id: input.empresa_id || null,
                    data_emissao: input.data_emissao,
                    total_parcelas: input.parcelas?.length || input.total_parcelas,
                    valor_total: valorTotal,
                    observacoes: input.observacoes,
                    status: 'ativa',
                    banco_id: input.banco_id || null,
                })
                .select()
                .single()

            if (contaError) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar conta',
                    cause: contaError,
                })
            }

            // 2. Gerar parcelas
            let parcelasParaInserir = []

            if (input.parcelas && input.parcelas.length > 0) {
                // Usar parcelas personalizadas
                parcelasParaInserir = input.parcelas.map((p, i) => ({
                    conta_id: conta.id,
                    numero_parcela: i + 1,
                    valor_original: p.valor,
                    valor_juros: 0,
                    valor_final: p.valor,
                    data_vencimento: p.data_vencimento,
                    status: 'pendente',
                }))
            } else {
                // Gerar parcelas automaticamente
                const primeiraData = new Date(input.data_vencimento + 'T12:00:00')
                const intervaloDias = input.intervalo_dias || 30

                for (let i = 0; i < input.total_parcelas; i++) {
                    const dataVencimento = new Date(primeiraData)
                    dataVencimento.setDate(dataVencimento.getDate() + (i * intervaloDias))

                    parcelasParaInserir.push({
                        conta_id: conta.id,
                        numero_parcela: i + 1,
                        valor_original: input.valor_original,
                        valor_juros: input.valor_juros,
                        valor_final: input.valor_original + input.valor_juros,
                        data_vencimento: dataVencimento.toISOString().split('T')[0],
                        status: 'pendente',
                    })
                }
            }

            const { error: parcelasError } = await ctx.supabase
                .from('parcelas')
                .insert(parcelasParaInserir)

            if (parcelasError) {
                // Rollback: deletar conta criada
                await ctx.supabase.from('contas').delete().eq('id', conta.id)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar parcelas',
                    cause: parcelasError,
                })
            }

            return conta
        }),

    // Marcar todas as parcelas pendentes da conta como pagas
    marcarComoPago: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                data_pagamento: z.string(),
                tipo_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto']).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verificar se a conta pertence ao usuário
            const { data: conta, error: checkError } = await ctx.supabase
                .from('contas')
                .select('id')
                .eq('id', input.id)
                .eq('user_id', ctx.user.id)
                .single()

            if (checkError || !conta) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conta não encontrada',
                })
            }

            // Atualizar parcelas pendentes
            type UpdateParcelaPayload = {
                status: string;
                data_pagamento: string;
                tipo_pagamento?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto';
            }

            const updateData: UpdateParcelaPayload = {
                status: 'pago',
                data_pagamento: input.data_pagamento,
            }

            if (input.tipo_pagamento) {
                updateData.tipo_pagamento = input.tipo_pagamento
            }

            const { error } = await ctx.supabase
                .from('parcelas')
                .update(updateData)
                .eq('conta_id', input.id)
                .eq('status', 'pendente')

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao marcar conta como paga',
                    cause: error,
                })
            }

            return { success: true }
        }),

    // Atualizar conta
    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                descricao: z.string().optional(),
                fornecedor_id: z.string().optional().nullable(),
                tipo_despesa_id: z.string().optional().nullable(),
                empresa_id: z.string().optional().nullable(),
                observacoes: z.string().optional().nullable(),
                status: z.enum(['ativa', 'quitada', 'cancelada']).optional(),
                banco_id: z.string().uuid().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            // Sanitize empty strings to null for UUID fields to avoid 22P02 error
            const sanitizedUpdateData = {
                ...updateData,
                ...(updateData.fornecedor_id !== undefined && { fornecedor_id: updateData.fornecedor_id || null }),
                ...(updateData.tipo_despesa_id !== undefined && { tipo_despesa_id: updateData.tipo_despesa_id || null }),
                ...(updateData.empresa_id !== undefined && { empresa_id: updateData.empresa_id || null }),
                ...(updateData.banco_id !== undefined && { banco_id: updateData.banco_id || null }),
            }

            const { data, error } = await ctx.supabase
                .from('contas')
                .update(sanitizedUpdateData)
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao atualizar conta',
                    cause: error,
                })
            }

            return data
        }),

    // Deletar conta (e suas parcelas via CASCADE)
    delete: protectedProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('contas')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao deletar conta',
                    cause: error,
                })
            }

            return { success: true }
        }),

    // Atualizar múltiplas contas (Bulk Update)
    bulkUpdate: protectedProcedure
        .input(
            z.object({
                ids: z.array(z.string()),
                data: z.object({
                    empresa_id: z.string().optional().nullable(),
                    banco_id: z.string().optional().nullable(),
                    tipo_despesa_id: z.string().optional().nullable(),
                    fornecedor_id: z.string().optional().nullable(),
                })
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { ids, data: updateData } = input

            // Sanitize
            const sanitizedData = {
                ...(updateData.empresa_id !== undefined && { empresa_id: updateData.empresa_id || null }),
                ...(updateData.banco_id !== undefined && { banco_id: updateData.banco_id || null }),
                ...(updateData.tipo_despesa_id !== undefined && { tipo_despesa_id: updateData.tipo_despesa_id || null }),
                ...(updateData.fornecedor_id !== undefined && { fornecedor_id: updateData.fornecedor_id || null }),
            }

            const { error } = await ctx.supabase
                .from('contas')
                .update(sanitizedData)
                .in('id', ids)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao atualizar contas em lote',
                    cause: error,
                })
            }

            return { success: true, count: ids.length }
        }),

    // Deletar múltiplas contas (Bulk Delete)
    bulkDelete: protectedProcedure
        .input(z.array(z.string()))
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('contas')
                .delete()
                .in('id', input)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao deletar contas em lote',
                    cause: error,
                })
            }

            return { success: true, count: input.length }
        }),
})
