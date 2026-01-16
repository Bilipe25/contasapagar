import { z } from 'zod'
import { router, protectedProcedure } from '../init'

export const tiposDespesaRouter = router({
    // Listar todos os tipos de despesa do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('tipos_despesa')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('nome', { ascending: true })

        if (error) throw error
        return data || []
    }),

    // Criar tipo de despesa
    create: protectedProcedure
        .input(
            z.object({
                nome: z.string().min(1),
                cor: z.string().optional(),
                icone: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('tipos_despesa')
                .insert({
                    ...input,
                    user_id: ctx.user.id,
                })
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Atualizar tipo de despesa
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                nome: z.string().min(1).optional(),
                cor: z.string().optional(),
                icone: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const { data, error } = await ctx.supabase
                .from('tipos_despesa')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Excluir tipo de despesa
    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('tipos_despesa')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) throw error
            return { success: true }
        }),
})
