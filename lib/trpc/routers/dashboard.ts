import { z } from 'zod'
import { router, protectedProcedure } from '../init'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { TRPCError } from '@trpc/server'

export const dashboardRouter = router({
    // Estatísticas do mês atual
    stats: protectedProcedure
        .input(
            z.object({
                mes: z.string().optional(), // YYYY-MM
            })
        )
        .query(async ({ ctx, input }) => {
            try {
                const targetDate = input.mes ? new Date(input.mes + '-01') : new Date()
                const inicio = startOfMonth(targetDate).toISOString().split('T')[0]
                const fim = endOfMonth(targetDate).toISOString().split('T')[0]
                const hoje = new Date().toISOString().split('T')[0]

                // Buscar todas as parcelas do mês (join com contas para filtrar por user_id)
                const { data: todasParcelas, error } = await ctx.supabase
                    .from('parcelas')
                    .select(`
                        id,
                        valor_original,
                        valor_juros,
                        valor_desconto,
                        valor_final,
                        status,
                        data_vencimento,
                        data_pagamento,
                        contas!inner(user_id)
                    `)
                    .eq('contas.user_id', ctx.user.id)
                    .or(`and(data_vencimento.gte.${inicio},data_vencimento.lte.${fim}),and(data_pagamento.gte.${inicio},data_pagamento.lte.${fim})`)

                if (error) {
                    console.error('Dashboard stats error:', error)
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Erro ao buscar estatísticas',
                        cause: error,
                    })
                }

                const parcelas = todasParcelas || []

                // Calcular estatísticas a partir dos dados
                const totalAPagar = parcelas
                    .filter(p => p.status === 'pendente' && p.data_vencimento >= inicio && p.data_vencimento <= fim)
                    .reduce((sum, p) => sum + (p.valor_final || 0), 0)

                const totalVencidas = parcelas
                    .filter(p => p.status === 'pendente' && p.data_vencimento < hoje)
                    .length

                const parcelasPagas = parcelas.filter(p =>
                    p.status === 'pago' &&
                    p.data_pagamento &&
                    p.data_pagamento >= inicio &&
                    p.data_pagamento <= fim
                )
                const totalPago = parcelasPagas.reduce((sum, p) => sum + (p.valor_final || 0), 0)
                const quantidadePagas = parcelasPagas.length

                // Calcular totais de juros e descontos
                const totalJuros = parcelasPagas.reduce((sum, p) => sum + (p.valor_juros || 0), 0)
                const totalDescontos = parcelasPagas.reduce((sum, p) => sum + (p.valor_desconto || 0), 0)

                return {
                    totalAPagar,
                    totalVencidas,
                    totalPago,
                    quantidadePagas,
                    totalJuros,
                    totalDescontos,
                }
            } catch (error) {
                if (error instanceof TRPCError) throw error
                console.error('Dashboard stats unexpected error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro inesperado ao buscar estatísticas',
                })
            }
        }),

    // Vencimentos próximos (próximos 7 dias)
    vencimentosProximos: protectedProcedure.query(async ({ ctx }) => {
        try {
            const hoje = new Date().toISOString().split('T')[0]
            const proximos7Dias = new Date()
            proximos7Dias.setDate(proximos7Dias.getDate() + 7)
            const dataLimite = proximos7Dias.toISOString().split('T')[0]

            const { data, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    id,
                    numero_parcela,
                    valor_final,
                    data_vencimento,
                    status,
                    contas!inner(
                        id,
                        descricao,
                        user_id,
                        total_parcelas,
                        fornecedores(nome),
                        tipos_despesa(nome, cor)
                    )
                `)
                .eq('contas.user_id', ctx.user.id)
                .eq('status', 'pendente')
                .gte('data_vencimento', hoje)
                .lte('data_vencimento', dataLimite)
                .order('data_vencimento', { ascending: true })
                .limit(10)

            if (error) {
                console.error('Vencimentos próximos error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar vencimentos próximos',
                    cause: error,
                })
            }

            // Formatar dados para exibição
            return (data || []).map(p => {
                const contaData = p.contas as unknown as {
                    id: string;
                    descricao: string;
                    total_parcelas: number;
                    fornecedores: { nome: string } | null;
                    tipos_despesa: { nome: string; cor: string } | null;
                } | {
                    id: string;
                    descricao: string;
                    total_parcelas: number;
                    fornecedores: { nome: string } | null;
                    tipos_despesa: { nome: string; cor: string } | null;
                }[];

                const conta = Array.isArray(contaData) ? contaData[0] : contaData;

                return {
                    id: p.id, // ID da parcela
                    conta_id: conta.id, // ID da conta
                    parcela_id: p.id,
                    numero_parcela: p.numero_parcela,
                    descricao: `${conta.descricao} (${p.numero_parcela}/${conta.total_parcelas})`,
                    valor_final: p.valor_final,
                    data_vencimento: p.data_vencimento,
                    status: p.status,
                    fornecedores: conta.fornecedores,
                    tipos_despesa: conta.tipos_despesa,
                }
            })
        } catch (error) {
            if (error instanceof TRPCError) throw error
            console.error('Vencimentos próximos unexpected error:', error)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Erro inesperado ao buscar vencimentos',
            })
        }
    }),

    // Dados para gráfico mensal (últimos 6 meses) - OTIMIZADO
    graficoMensal: protectedProcedure.query(async ({ ctx }) => {
        try {
            const hoje = new Date()
            const seismesesAtras = subMonths(hoje, 5)
            const inicio = startOfMonth(seismesesAtras).toISOString().split('T')[0]
            const fim = endOfMonth(hoje).toISOString().split('T')[0]

            // Uma única query para buscar todas as parcelas dos últimos 6 meses
            const { data: todasParcelas, error } = await ctx.supabase
                .from('parcelas')
                .select(`
                    valor_final,
                    status,
                    data_vencimento,
                    contas!inner(user_id)
                `)
                .eq('contas.user_id', ctx.user.id)
                .gte('data_vencimento', inicio)
                .lte('data_vencimento', fim)

            if (error) {
                console.error('Gráfico mensal error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar dados do gráfico',
                    cause: error,
                })
            }

            const parcelas = todasParcelas || []

            // Agrupar por mês localmente
            const meses: { mes: string; previsto: number; pago: number }[] = []

            for (let i = 5; i >= 0; i--) {
                const mes = subMonths(hoje, i)
                const mesInicio = startOfMonth(mes).toISOString().split('T')[0]
                const mesFim = endOfMonth(mes).toISOString().split('T')[0]
                const mesAno = format(mes, 'yyyy-MM')

                const parcelasDoMes = parcelas.filter(p =>
                    p.data_vencimento >= mesInicio && p.data_vencimento <= mesFim
                )

                const previsto = parcelasDoMes.reduce((sum, p) => sum + (p.valor_final || 0), 0)
                const pago = parcelasDoMes
                    .filter(p => p.status === 'pago')
                    .reduce((sum, p) => sum + (p.valor_final || 0), 0)

                meses.push({ mes: mesAno, previsto, pago })
            }

            return meses
        } catch (error) {
            if (error instanceof TRPCError) throw error
            console.error('Gráfico mensal unexpected error:', error)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Erro inesperado ao buscar dados do gráfico',
            })
        }
    }),

    // Distribuição por tipo de despesa
    porTipoDespesa: protectedProcedure
        .input(
            z.object({
                mes: z.string().optional(), // YYYY-MM
            })
        )
        .query(async ({ ctx, input }) => {
            try {
                const targetDate = input.mes ? new Date(input.mes + '-01') : new Date()
                const inicio = startOfMonth(targetDate).toISOString().split('T')[0]
                const fim = endOfMonth(targetDate).toISOString().split('T')[0]

                const { data, error } = await ctx.supabase
                    .from('parcelas')
                    .select(`
                        valor_final,
                        data_vencimento,
                        contas!inner(
                            user_id,
                            tipos_despesa(nome, cor)
                        )
                    `)
                    .eq('contas.user_id', ctx.user.id)
                    .gte('data_vencimento', inicio)
                    .lte('data_vencimento', fim)

                if (error) {
                    console.error('Por tipo despesa error:', error)
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Erro ao buscar distribuição por categoria',
                        cause: error,
                    })
                }

                // Agrupar por tipo de despesa
                const agrupado = (data || []).reduce((acc, parcela) => {
                    const contaData = parcela.contas as unknown as {
                        tipos_despesa: { nome: string; cor: string } | null;
                    } | {
                        tipos_despesa: { nome: string; cor: string } | null;
                    }[];

                    const conta = Array.isArray(contaData) ? contaData[0] : contaData;
                    const tiposDespesa = conta?.tipos_despesa;

                    const tipo = tiposDespesa?.nome || 'Sem categoria'
                    const cor = tiposDespesa?.cor || '#6b7280'

                    if (!acc[tipo]) {
                        acc[tipo] = { nome: tipo, cor, total: 0 }
                    }
                    acc[tipo].total += parcela.valor_final || 0

                    return acc
                }, {} as Record<string, { nome: string; cor: string; total: number }>)

                return Object.values(agrupado).sort((a, b) => b.total - a.total)
            } catch (error) {
                if (error instanceof TRPCError) throw error
                console.error('Por tipo despesa unexpected error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro inesperado ao buscar distribuição',
                })
            }
        }),

    // Relatório anual - dados mensais de 12 meses
    relatorioAnual: protectedProcedure
        .input(
            z.object({
                ano: z.number().min(2020).max(2100),
            })
        )
        .query(async ({ ctx, input }) => {
            try {
                const { ano } = input
                const inicio = `${ano}-01-01`
                const fim = `${ano}-12-31`
                const hoje = new Date().toISOString().split('T')[0]

                // Buscar todas as parcelas do ano
                const { data: todasParcelas, error } = await ctx.supabase
                    .from('parcelas')
                    .select(`
                        valor_final,
                        status,
                        data_vencimento,
                        contas!inner(user_id)
                    `)
                    .eq('contas.user_id', ctx.user.id)
                    .gte('data_vencimento', inicio)
                    .lte('data_vencimento', fim)

                if (error) {
                    console.error('Relatório anual error:', error)
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Erro ao buscar dados do relatório anual',
                        cause: error,
                    })
                }

                const parcelas = todasParcelas || []

                // Agrupar por mês
                const meses = []
                for (let mes = 1; mes <= 12; mes++) {
                    const mesStr = mes.toString().padStart(2, '0')
                    const mesInicio = `${ano}-${mesStr}-01`
                    const ultimoDia = new Date(ano, mes, 0).getDate()
                    const mesFim = `${ano}-${mesStr}-${ultimoDia.toString().padStart(2, '0')}`

                    const parcelasDoMes = parcelas.filter(p =>
                        p.data_vencimento >= mesInicio && p.data_vencimento <= mesFim
                    )

                    const aVencer = parcelasDoMes
                        .filter(p => p.status === 'pendente' && p.data_vencimento >= hoje)
                        .reduce((sum, p) => sum + (p.valor_final || 0), 0)

                    const quitado = parcelasDoMes
                        .filter(p => p.status === 'pago')
                        .reduce((sum, p) => sum + (p.valor_final || 0), 0)

                    const vencido = parcelasDoMes
                        .filter(p => p.status === 'pendente' && p.data_vencimento < hoje)
                        .reduce((sum, p) => sum + (p.valor_final || 0), 0)

                    meses.push({
                        mes: `${ano}-${mesStr}`,
                        aVencer,
                        quitado,
                        vencido,
                        total: aVencer + quitado + vencido,
                    })
                }

                // Calcular totais
                const totais = {
                    aVencer: meses.reduce((sum, m) => sum + m.aVencer, 0),
                    quitado: meses.reduce((sum, m) => sum + m.quitado, 0),
                    vencido: meses.reduce((sum, m) => sum + m.vencido, 0),
                    total: meses.reduce((sum, m) => sum + m.total, 0),
                }

                return { meses, totais }
            } catch (error) {
                if (error instanceof TRPCError) throw error
                console.error('Relatório anual unexpected error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro inesperado ao buscar relatório anual',
                })
            }
        }),
})
