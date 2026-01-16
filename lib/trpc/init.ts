import { createClient } from '@/lib/supabase/server'
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

export const createTRPCContext = async () => {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    return {
        supabase,
        user,
    }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Middleware para rotas autenticadas
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return next({
        ctx: {
            user: ctx.user,
        },
    })
})

export const protectedProcedure = t.procedure.use(isAuthed)
