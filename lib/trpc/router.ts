import { router } from './init'
import { dashboardRouter } from './routers/dashboard'
import { contasRouter } from './routers/contas'
import { fornecedoresRouter } from './routers/fornecedores'
import { tiposDespesaRouter } from './routers/tipos-despesa'
import { parcelasRouter } from './routers/parcelas'
import { empresasRouter } from './routers/empresas'
import { bancosRouter } from './routers/bancos'
import { planoContasRouter } from './routers/plano-contas'

export const appRouter = router({
    contas: contasRouter,
    fornecedores: fornecedoresRouter,
    tiposDespesa: tiposDespesaRouter,
    dashboard: dashboardRouter,
    empresas: empresasRouter,
    bancos: bancosRouter,
    parcelas: parcelasRouter,
    planoContas: planoContasRouter,
})

export type AppRouter = typeof appRouter
