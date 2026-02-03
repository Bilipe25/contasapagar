import { router } from './init'
import { dashboardRouter } from './routers/dashboard'
import { contasRouter } from './routers/contas'
import { fornecedoresRouter } from './routers/fornecedores'
import { tiposDespesaRouter } from './routers/tipos-despesa'
import { parcelasRouter } from './routers/parcelas'
import { empresasRouter } from './routers/empresas'

export const appRouter = router({
    dashboard: dashboardRouter,
    contas: contasRouter,
    fornecedores: fornecedoresRouter,
    tiposDespesa: tiposDespesaRouter,
    parcelas: parcelasRouter,
    empresas: empresasRouter,
})

export type AppRouter = typeof appRouter

