import { z } from 'zod'
import { router, protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

// Schema para validação
const planoContasSchema = z.object({
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    conta_superior_id: z.string().uuid().optional().nullable(),
    nivel: z.number().min(1).max(7),
    tipo: z.enum(['RECEITA', 'DESPESA', 'APLICACAO', 'OUTROS_CUSTOS']),
    modo: z.enum(['SINTETICA', 'ANALITICA']),
    conta_banco: z.boolean().default(false),
    banco_id: z.string().uuid().optional().nullable(),
    ativo: z.boolean().default(true),
    codigo: z.string().min(1, 'Código é obrigatório').regex(/^[0-9.]+$/, 'O código deve conter apenas números e pontos (ex: 1.01)'),
})

export const planoContasRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('plano_contas')
            .select('*')
            .order('codigo', { ascending: true })

        if (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Erro ao buscar plano de contas: ' + error.message,
            })
        }

        return data
    }),

    create: protectedProcedure
        .input(planoContasSchema)
        .mutation(async ({ ctx, input }) => {
            // Validar unicidade do código para o usuário
            const { data: existing } = await ctx.supabase
                .from('plano_contas')
                .select('id')
                .eq('codigo', input.codigo)
                .eq('user_id', ctx.user.id)
                .single()

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Já existe uma conta com este código.',
                })
            }

            const { data, error } = await ctx.supabase
                .from('plano_contas')
                .insert({
                    user_id: ctx.user.id,
                    ...input,
                })
                .select()
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar conta: ' + error.message,
                })
            }

            return data
        }),

    update: protectedProcedure
        .input(planoContasSchema.extend({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            // Verificar se código duplicado (se mudou)
            const { data: existing } = await ctx.supabase
                .from('plano_contas')
                .select('id')
                .eq('codigo', data.codigo)
                .eq('user_id', ctx.user.id)
                .neq('id', id)
                .single()

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Já existe outra conta com este código.',
                })
            }

            // Prevenir dependência cíclica direta (pai ser ele mesmo)
            if (data.conta_superior_id === id) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Uma conta não pode ser superior a ela mesma.',
                })
            }

            const { error } = await ctx.supabase
                .from('plano_contas')
                .update(data)
                .eq('id', id)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao atualizar conta: ' + error.message,
                })
            }

            return { success: true }
        }),

    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            // Verificar se tem filhos
            const { data: children } = await ctx.supabase
                .from('plano_contas')
                .select('id')
                .eq('conta_superior_id', input)
                .limit(1)

            if (children && children.length > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Não é possível excluir uma conta que possui subcontas.',
                })
            }

            const { error } = await ctx.supabase
                .from('plano_contas')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao excluir conta: ' + error.message,
                })
            }

            return { success: true }
        }),

    // Helper para sugerir próximo código (opcional, pode ser complexo)
    getSuggestions: protectedProcedure
        .input(z.object({ parentId: z.string().uuid().optional() }))
        .query(async ({ ctx, input }) => {
            // Logica simplificada: retornar todos para o front calcular
            // ou implementar lógica robusta de sugestão aqui
            return []
        })
})
