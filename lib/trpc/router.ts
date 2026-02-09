import { router } from './init'
import { contasRouter } from './routers/contas'
import { parcelasRouter } from './routers/parcelas'
import { fornecedoresRouter } from './routers/fornecedores'
import { tiposDespesaRouter } from './routers/tipos-despesa'
import { empresasRouter } from './routers/empresas'
import { bancosRouter } from './routers/bancos'
import { planoContasRouter } from './routers/plano-contas'
import { dashboardRouter } from './routers/dashboard'
import { reportsRouter } from './routers/reports'

export const appRouter = router({
    contas: contasRouter,
    fornecedores: fornecedoresRouter,
    tiposDespesa: tiposDespesaRouter,
    dashboard: dashboardRouter,
    empresas: empresasRouter,
    bancos: bancosRouter,
    parcelas: parcelasRouter,
    planoContas: planoContasRouter,
    reports: reportsRouter,
})

export type AppRouter = typeof appRouter
