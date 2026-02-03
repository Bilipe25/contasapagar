import { z } from 'zod'
import { router, protectedProcedure } from '../init'

export const fornecedoresRouter = router({
    // Listar todos os fornecedores do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('fornecedores')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('nome', { ascending: true })

        if (error) throw error
        return data || []
    }),

    // Buscar fornecedor por ID
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .select('*')
                .eq('id', input)
                .eq('user_id', ctx.user.id)
                .single()

            if (error) throw error
            return data
        }),

    // Criar fornecedor
    create: protectedProcedure
        .input(
            z.object({
                nome: z.string().min(1, 'Nome é obrigatório'),
                cnpj_cpf: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                telefone: z.string().optional(),
                observacoes: z.string().optional(),
                // Campos de endereço
                logradouro: z.string().optional(),
                numero: z.string().optional(),
                complemento: z.string().optional(),
                bairro: z.string().optional(),
                cidade: z.string().optional(),
                uf: z.string().optional(),
                cep: z.string().optional(),
                // Campos adicionais
                inscricao_estadual: z.string().optional(),
                situacao_cadastral: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .insert({
                    ...input,
                    email: input.email || null,
                    user_id: ctx.user.id,
                })
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Atualizar fornecedor
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                nome: z.string().min(1, 'Nome é obrigatório'),
                cnpj_cpf: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                telefone: z.string().optional(),
                observacoes: z.string().optional(),
                // Campos de endereço
                logradouro: z.string().optional(),
                numero: z.string().optional(),
                complemento: z.string().optional(),
                bairro: z.string().optional(),
                cidade: z.string().optional(),
                uf: z.string().optional(),
                cep: z.string().optional(),
                // Campos adicionais
                inscricao_estadual: z.string().optional(),
                situacao_cadastral: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .update({
                    ...updateData,
                    email: updateData.email || null,
                })
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Excluir fornecedor
    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('fornecedores')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) throw error
            return { success: true }
        }),

    // Estatísticas de contas por fornecedor
    stats: protectedProcedure.query(async ({ ctx }) => {
        const { data: parcelas, error } = await ctx.supabase
            .from('parcelas')
            .select(`
                id,
                valor_final,
                status,
                data_vencimento,
                contas!inner(
                    fornecedor_id,
                    user_id
                )
            `)
            .eq('contas.user_id', ctx.user.id)

        if (error) throw error



        // Agrupar por fornecedor com breakdown por status
        const statsByFornecedor = (parcelas || []).reduce((acc, parcela) => {
            const item = parcela as unknown as { contas: { fornecedor_id: string | null }[] | { fornecedor_id: string | null } | null };
            const conta = Array.isArray(item.contas) ? item.contas[0] : item.contas;
            const fornecedorId = conta?.fornecedor_id || 'sem_fornecedor'

            if (!acc[fornecedorId]) {
                acc[fornecedorId] = {
                    totalContas: 0,
                    valorTotal: 0,
                    aVencer: { quantidade: 0, valor: 0 },
                    vencidas: { quantidade: 0, valor: 0 },
                    quitadas: { quantidade: 0, valor: 0 },
                }
            }

            // Ignorar parcelas canceladas
            if (parcela.status === 'cancelado') return acc

            acc[fornecedorId].totalContas += 1
            acc[fornecedorId].valorTotal += parcela.valor_final || 0

            const valor = parcela.valor_final || 0
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)
            const dataVencimento = new Date(parcela.data_vencimento)
            dataVencimento.setHours(0, 0, 0, 0)

            if (parcela.status === 'pago') {
                acc[fornecedorId].quitadas.quantidade += 1
                acc[fornecedorId].quitadas.valor += valor
            } else if (parcela.status === 'atrasado' || (parcela.status === 'pendente' && dataVencimento < hoje)) {
                // Vencida: explicitamente atrasada ou pendente com data passada
                acc[fornecedorId].vencidas.quantidade += 1
                acc[fornecedorId].vencidas.valor += valor
            } else if (parcela.status === 'pendente') {
                // A Vencer: pendente e data futura/hoje
                acc[fornecedorId].aVencer.quantidade += 1
                acc[fornecedorId].aVencer.valor += valor
            }

            return acc
        }, {} as Record<string, {
            totalContas: number
            valorTotal: number
            aVencer: { quantidade: number; valor: number }
            vencidas: { quantidade: number; valor: number }
            quitadas: { quantidade: number; valor: number }
        }>)

        return statsByFornecedor
    }),
})
