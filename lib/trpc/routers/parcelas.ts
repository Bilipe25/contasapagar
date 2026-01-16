import { z } from 'zod'
import { protectedProcedure, router } from '../init'
import { TRPCError } from '@trpc/server'

export const parcelasRouter = router({
    // Listar parcelas de uma conta
    listByConta: protectedProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(user_id)
                `)
                .eq('conta_id', input)
                .eq('contas.user_id', ctx.user.id)
                .order('numero_parcela', { ascending: true })

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar parcelas',
                    cause: error,
                })
            }

            return data || []
        }),

    // Buscar parcela por ID
    getById: protectedProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(id, descricao, user_id, fornecedores(nome), tipos_despesa(nome, cor))
                `)
                .eq('id', input)
                .eq('contas.user_id', ctx.user.id)
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Parcela não encontrada',
                })
            }

            return data
        }),

    // Listar próximas parcelas a vencer (para dashboard)
    proximasVencer: protectedProcedure
        .input(
            z.object({
                dias: z.number().default(30),
                limite: z.number().default(10),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const dias = input?.dias || 30
            const limite = input?.limite || 10
            const hoje = new Date()
            const dataLimite = new Date()
            dataLimite.setDate(dataLimite.getDate() + dias)

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(
                        id,
                        descricao,
                        user_id,
                        fornecedores(nome),
                        tipos_despesa(nome, cor)
                    )
                `)
                .eq('contas.user_id', ctx.user.id)
                .eq('status', 'pendente')
                .gte('data_vencimento', hoje.toISOString().split('T')[0])
                .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
                .order('data_vencimento', { ascending: true })
                .limit(limite)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar próximas parcelas',
                    cause: error,
                })
            }

            return data || []
        }),

    // Listar parcelas vencidas
    vencidas: protectedProcedure
        .query(async ({ ctx }) => {
            const hoje = new Date().toISOString().split('T')[0]

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(
                        id,
                        descricao,
                        user_id,
                        fornecedores(nome),
                        tipos_despesa(nome, cor)
                    )
                `)
                .eq('contas.user_id', ctx.user.id)
                .eq('status', 'pendente')
                .lt('data_vencimento', hoje)
                .order('data_vencimento', { ascending: true })

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar parcelas vencidas',
                    cause: error,
                })
            }

            return data || []
        }),

    // Marcar parcela como paga
    marcarPago: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                data_pagamento: z.string(),
                tipo_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto']).optional(),
                valor_juros: z.number().optional(),
                valor_final: z.number().optional(), // Valor editado pelo usuário
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verificar se a parcela pertence ao usuário
            const { data: parcela, error: checkError } = await ctx.supabase
                .from('parcelas')
                .select('*, contas!inner(user_id)')
                .eq('id', input.id)
                .eq('contas.user_id', ctx.user.id)
                .single()

            if (checkError || !parcela) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Parcela não encontrada',
                })
            }

            type UpdatePagoPayload = {
                status: string;
                data_pagamento: string;
                tipo_pagamento?: string;
                valor_final?: number;
                valor_juros?: number;
            }

            const updateData: UpdatePagoPayload = {
                status: 'pago',
                data_pagamento: input.data_pagamento,
            }

            if (input.tipo_pagamento) {
                updateData.tipo_pagamento = input.tipo_pagamento
            }

            // Se o usuário editou o valor final
            if (input.valor_final !== undefined) {
                updateData.valor_final = input.valor_final
            } else if (input.valor_juros !== undefined) {
                updateData.valor_juros = input.valor_juros
                updateData.valor_final = parcela.valor_original + input.valor_juros
            }

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .update(updateData)
                .eq('id', input.id)
                .select()
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao marcar parcela como paga',
                    cause: error,
                })
            }

            return data
        }),

    // Atualizar parcela
    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                valor_original: z.number().optional(),
                valor_juros: z.number().optional(),
                data_vencimento: z.string().optional(),
                data_pagamento: z.string().optional().nullable(),
                status: z.enum(['pendente', 'pago', 'atrasado', 'cancelado']).optional(),
                tipo_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto']).optional().nullable(),
                observacoes: z.string().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            // Verificar permissão
            const { data: parcela, error: checkError } = await ctx.supabase
                .from('parcelas')
                .select('*, contas!inner(user_id)')
                .eq('id', id)
                .eq('contas.user_id', ctx.user.id)
                .single()

            if (checkError || !parcela) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Parcela não encontrada',
                })
            }

            // Recalcular valor_final se necessário
            type ParcelasUpdatePayload = typeof updateData & { valor_final?: number };
            const finalData: ParcelasUpdatePayload = { ...updateData }
            if (updateData.valor_original !== undefined || updateData.valor_juros !== undefined) {
                const valorOriginal = updateData.valor_original ?? parcela.valor_original
                const valorJuros = updateData.valor_juros ?? parcela.valor_juros
                finalData.valor_final = valorOriginal + valorJuros
            }

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .update(finalData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao atualizar parcela',
                    cause: error,
                })
            }

            return data
        }),

    // Deletar parcela
    delete: protectedProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            // Verificar permissão
            const { data: parcela, error: checkError } = await ctx.supabase
                .from('parcelas')
                .select('*, contas!inner(user_id, total_parcelas)')
                .eq('id', input)
                .eq('contas.user_id', ctx.user.id)
                .single()

            if (checkError || !parcela) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Parcela não encontrada',
                })
            }

            const { error } = await ctx.supabase
                .from('parcelas')
                .delete()
                .eq('id', input)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao deletar parcela',
                    cause: error,
                })
            }

            // Atualizar total_parcelas da conta
            await ctx.supabase
                .from('contas')
                .update({ total_parcelas: (parcela.contas as { total_parcelas: number }).total_parcelas - 1 })
                .eq('id', parcela.conta_id)

            return { success: true }
        }),

    // Adicionar parcela a uma conta existente
    create: protectedProcedure
        .input(
            z.object({
                conta_id: z.string(),
                numero_parcela: z.number(),
                valor_original: z.number(),
                valor_juros: z.number().default(0),
                data_vencimento: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verificar se a conta pertence ao usuário
            const { data: conta, error: checkError } = await ctx.supabase
                .from('contas')
                .select('*')
                .eq('id', input.conta_id)
                .eq('user_id', ctx.user.id)
                .single()

            if (checkError || !conta) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conta não encontrada',
                })
            }

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .insert({
                    conta_id: input.conta_id,
                    numero_parcela: input.numero_parcela,
                    valor_original: input.valor_original,
                    valor_juros: input.valor_juros,
                    valor_final: input.valor_original + input.valor_juros,
                    data_vencimento: input.data_vencimento,
                    status: 'pendente',
                })
                .select()
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar parcela',
                    cause: error,
                })
            }

            // Atualizar total_parcelas e valor_total da conta
            await ctx.supabase
                .from('contas')
                .update({
                    total_parcelas: conta.total_parcelas + 1,
                    valor_total: conta.valor_total + input.valor_original + input.valor_juros,
                })
                .eq('id', input.conta_id)

            return data
        }),
})
