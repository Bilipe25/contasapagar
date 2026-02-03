import { z } from 'zod'
import { router, protectedProcedure } from '../init'

export const bancosRouter = router({
    // Listar todos os bancos do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('bancos')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('nome', { ascending: true })

        if (error) throw error
        return data || []
    }),

    // Buscar banco por ID
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('bancos')
                .select('*')
                .eq('id', input)
                .eq('user_id', ctx.user.id)
                .single()

            if (error) throw error
            return data
        }),

    // Criar banco
    create: protectedProcedure
        .input(
            z.object({
                nome: z.string().min(1, 'Nome é obrigatório'),
                codigo: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('bancos')
                .insert({
                    ...input,
                    user_id: ctx.user.id,
                })
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Atualizar banco
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                nome: z.string().min(1, 'Nome é obrigatório'),
                codigo: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const { data, error } = await ctx.supabase
                .from('bancos')
                .update({
                    ...updateData,
                })
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Excluir banco
    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('bancos')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) throw error
        }),
})
