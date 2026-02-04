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

    // Sugerir próximo código disponível
    getNextCode: protectedProcedure
        .input(z.object({ parentId: z.string().uuid().optional().nullable() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id

            if (!input.parentId) {
                // Nível Raiz (1)
                // Buscar maior código de nível 1
                const { data: roots } = await ctx.supabase
                    .from('plano_contas')
                    .select('codigo')
                    .is('conta_superior_id', null)
                    .eq('user_id', userId)

                if (!roots || roots.length === 0) return '1'

                // Tentar converter para número e achar o max
                const codes = roots.map(r => parseInt(r.codigo)).filter(n => !isNaN(n))
                if (codes.length === 0) return '1'

                const max = Math.max(...codes)
                return (max + 1).toString()
            } else {
                // Subnível
                // 1. Pegar código do pai
                const { data: parent } = await ctx.supabase
                    .from('plano_contas')
                    .select('codigo, nivel')
                    .eq('id', input.parentId)
                    .eq('user_id', userId)
                    .single()

                if (!parent) return '' // Pai não encontrado?

                // 2. Pegar filhos do pai
                const { data: children } = await ctx.supabase
                    .from('plano_contas')
                    .select('codigo')
                    .eq('conta_superior_id', input.parentId)
                    .eq('user_id', userId)

                const parentCode = parent.codigo
                const parentLevel = parent.nivel

                // Determinar sufixo:
                // Se pai é "1", filhos padrão "1.01", "1.02" (2 dígitos)
                // Se pai é "1.01", filhos padrão "1.01.001" (3 dígitos)
                // Se pai é "1.01.001", filhos padrão "1.01.001.001" (3 dígitos)

                const padding = parentLevel === 1 ? 2 : 3

                if (!children || children.length === 0) {
                    // Primeiro filho
                    return `${parentCode}.${'1'.padStart(padding, '0')}`
                }

                // Achar maior sufixo
                let maxSuffix = 0
                children.forEach(child => {
                    // Esperado: parentCode + "." + sufixo
                    if (child.codigo.startsWith(parentCode + '.')) {
                        const suffixStr = child.codigo.substring(parentCode.length + 1)
                        if (/^\d+$/.test(suffixStr)) {
                            const val = parseInt(suffixStr)
                            if (val > maxSuffix) maxSuffix = val
                        }
                    }
                })

                return `${parentCode}.${(maxSuffix + 1).toString().padStart(padding, '0')}`
            }
        })
})
