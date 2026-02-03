import { z } from 'zod'
import { router, protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'

export const empresasRouter = router({
    // Listar todas as empresas do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('empresas')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('razao_social', { ascending: true })

        if (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Erro ao buscar empresas',
                cause: error,
            })
        }
        return data || []
    }),

    // Buscar empresa por ID
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('empresas')
                .select('*')
                .eq('id', input)
                .eq('user_id', ctx.user.id)
                .single()

            if (error) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Empresa não encontrada',
                })
            }
            return data
        }),

    // Criar empresa
    create: protectedProcedure
        .input(
            z.object({
                razao_social: z.string().min(1, 'Razão social é obrigatória'),
                nome_fantasia: z.string().optional(),
                cnpj: z.string().optional(),
                inscricao_estadual: z.string().optional(),
                endereco: z.string().optional(),
                telefone: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                observacoes: z.string().optional(),
                banco_padrao_id: z.string().uuid().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('empresas')
                .insert({
                    ...input,
                    email: input.email || null,
                    user_id: ctx.user.id,
                })
                .select()
                .single()

            if (error) {
                // Verificar erro de CNPJ duplicado
                if (error.code === '23505' && error.message.includes('cnpj')) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Já existe uma empresa com este CNPJ',
                    })
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar empresa',
                    cause: error,
                })
            }
            return data
        }),

    // Atualizar empresa
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                razao_social: z.string().min(1, 'Razão social é obrigatória'),
                nome_fantasia: z.string().optional().nullable(),
                cnpj: z.string().optional().nullable(),
                inscricao_estadual: z.string().optional().nullable(),
                endereco: z.string().optional().nullable(),
                telefone: z.string().optional().nullable(),
                email: z.string().email().optional().or(z.literal('')).nullable(),
                observacoes: z.string().optional().nullable(),
                ativa: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const { data, error } = await ctx.supabase
                .from('empresas')
                .update({
                    ...updateData,
                    email: updateData.email || null,
                })
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) {
                if (error.code === '23505' && error.message.includes('cnpj')) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Já existe uma empresa com este CNPJ',
                    })
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao atualizar empresa',
                    cause: error,
                })
            }
            return data
        }),

    // Excluir empresa
    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('empresas')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao excluir empresa',
                    cause: error,
                })
            }
            return { success: true }
        }),
})
