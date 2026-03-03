import { z } from 'zod'
import { router, protectedProcedure } from '../init'
import { TRPCError } from '@trpc/server'
import { PeriodType, DateFilterField, type ExportConfig } from '@/lib/reports/types'
import { startOfMonth, endOfMonth, addMonths, parseISO, format } from 'date-fns'
import { SupabaseClient } from '@supabase/supabase-js'

// Schema de validação para configuração de relatório
const reportConfigSchema = z.object({
    reportType: z.string(),
    period: z.object({
        type: z.nativeEnum(PeriodType),
        dateField: z.nativeEnum(DateFilterField).optional().default(DateFilterField.EMISSION_DATE),
        month: z.number().optional(),
        year: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
        quarterYear: z.number().optional(),
        fullYear: z.number().optional(),
    }),
    filters: z.object({
        usePageFilters: z.boolean().default(true),
        customFilters: z.any().optional(),
    }).optional(),
})

export const reportsRouter = router({
    // Query para Relatório Mensal Detalhado
    monthlyDetailed: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx

            // Determinar período
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas com parcelas e relacionamentos
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, fornecedores(id, nome, cnpj_cpf), tipos_despesa(id, nome, cor), empresas(id, nome_fantasia), bancos(id, nome), parcelas(*)`,
                dateField,
                startDate,
                endDate,
                { order: { column: 'created_at', ascending: false } }
            )

            if (error) {
                console.error('Error fetching monthly detailed report:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar dados do relatório',
                    cause: error,
                })
            }

            // Enriquecer dados (lógica compartilhada com contas.ts)
            const enrichedContas = (contas || []).map(enrichConta)

            // Calcular totalizações
            const totals = calculateTotals(enrichedContas)

            // Agrupar por status
            const byStatus = groupByStatus(enrichedContas)

            return {
                contas: enrichedContas,
                totals,
                byStatus,
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Consolidado por Fornecedor
    supplierConsolidated: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas agrupadas por fornecedor
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, fornecedores(id, nome, cnpj_cpf, telefone, email), tipos_despesa(id, nome), parcelas(*)`,
                dateField,
                startDate,
                endDate,
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar dados do relatório',
                })
            }

            // Agrupar e calcular por fornecedor
            const enrichedContas = (contas || []).map(enrichConta)
            const bySupplier = groupBySupplier(enrichedContas)

            return {
                suppliers: bySupplier,
                totals: calculateTotals(enrichedContas),
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Análise por Categoria
    categoryAnalysis: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, tipos_despesa(id, nome, cor, descricao), fornecedores(id, nome), parcelas(*)`,
                dateField,
                startDate,
                endDate,
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar dados do relatório',
                })
            }

            // Agrupar por categoria
            const enrichedContas = (contas || []).map(enrichConta)
            const byCategory = groupByCategory(enrichedContas)

            return {
                categories: byCategory,
                totals: calculateTotals(enrichedContas),
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Projeção de Fluxo de Caixa
    cashFlowProjection: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar parcelas futuras
            const { data: parcelas, error } = await supabase
                .from('parcelas')
                .select(`
          *,
          contas!inner(
            id,
            descricao,
            user_id,
            fornecedores(nome),
            tipos_despesa(nome, cor)
          )
        `)
                .eq('contas.user_id', user.id)
                .gte('data_vencimento', startDate.toISOString().split('T')[0])
                .lte('data_vencimento', endDate.toISOString().split('T')[0])
                .in('status', ['pendente', 'parcial'])
                .order('data_vencimento', { ascending: true })

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar projeção de fluxo de caixa',
                })
            }

            // Agrupar por mês
            const byMonth = groupParcelasByMonth(parcelas || [])

            return {
                projection: byMonth,
                totals: {
                    totalProjected: (parcelas || []).reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0),
                    count: parcelas?.length || 0,
                },
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Relatório de Vencidas
    overdueReport: protectedProcedure
        .input(z.object({
            asOfDate: z.date().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const asOfDate = input.asOfDate || new Date()

            const { data: parcelas, error } = await supabase
                .from('parcelas')
                .select(`
          *,
          contas!inner(
            id,
            descricao,
            user_id,
            fornecedores(nome, telefone),
            tipos_despesa(nome, cor),
            empresas(razao_social, nome_fantasia),
            bancos(nome)
          )
        `)
                .eq('contas.user_id', user.id)
                .lt('data_vencimento', format(asOfDate, 'yyyy-MM-dd'))
                .in('status', ['pendente', 'atrasado'])
                .order('data_vencimento', { ascending: true })

            if (error) {
                console.error('Overdue report query error:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar contas vencidas',
                })
            }

            // Calcular dias de atraso e valor pendente real
            const overdueWithDays = (parcelas || []).map((p: any) => {
                const vencimento = parseISO(p.data_vencimento)
                const daysOverdue = Math.floor((asOfDate.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
                // valor_pendente = valor_final menos o que já foi pago (valor_pago)
                const valorPago = p.valor_pago || 0
                const valorPendente = Math.max(0, (p.valor_final || 0) - valorPago)
                return {
                    ...p,
                    daysOverdue,
                    valor_pago: valorPago,
                    valor_pendente: valorPendente,
                }
            })

            // Agrupar por faixas de atraso
            const byRange = groupByOverdueRange(overdueWithDays)

            // Calcular totais detalhados
            const totalOriginal = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_original || 0), 0)
            const totalFinal = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0)
            const totalPago = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_pago || 0), 0)
            const totalPendente = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_pendente || 0), 0)
            const totalJuros = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_juros || 0), 0)
            const totalDesconto = overdueWithDays.reduce((sum: number, p: any) => sum + (p.valor_desconto || 0), 0)

            const asOfDateStr = format(asOfDate, 'yyyy-MM-dd')

            return {
                overdue: overdueWithDays,
                byRange,
                totals: {
                    total: totalPendente,
                    totalOriginal,
                    totalFinal,
                    totalPago,
                    totalPendente,
                    totalJuros,
                    totalDesconto,
                    count: overdueWithDays.length,
                },
                asOfDate: asOfDateStr,
                // Compatibilidade com geradores que esperam period
                period: {
                    startDate: asOfDateStr,
                    endDate: asOfDateStr,
                },
            }
        }),

    // Query para DRE Contábil
    accountingStatement: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas e plano de contas
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error: contasError } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, plano_contas(id, codigo, descricao, tipo, nivel, conta_superior_id), parcelas(*)`,
                dateField,
                startDate,
                endDate,
            )

            if (contasError) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar dados para DRE',
                })
            }

            // Buscar estrutura completa do plano de contas para hierarquia
            const { data: planoContas, error: planoError } = await supabase
                .from('plano_contas')
                .select('*')
                .eq('user_id', user.id)
                .order('codigo', { ascending: true })

            if (planoError) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar plano de contas',
                })
            }

            // Processar DRE
            // 1. Mapear contas por plano_conta_id
            const accountsByPlano = (contas || []).reduce((acc: any, conta: any) => {
                const planoId = conta.plano_conta_id
                if (planoId) {
                    if (!acc[planoId]) acc[planoId] = []
                    acc[planoId].push(conta)
                }
                return acc
            }, {})

            // 2. Construir árvore
            const dre = buildDreTree(planoContas || [], accountsByPlano)

            return {
                statement: dre,
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Razão Analítico
    analyticalLedger: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas e plano de contas
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, plano_contas(id, codigo, descricao), fornecedores(nome), parcelas(*)`,
                dateField,
                startDate,
                endDate,
                { order: { column: 'data_emissao', ascending: true } }
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar razão analítico',
                })
            }

            // Agrupar por conta contábil
            const grouped = (contas || []).reduce((acc: any, conta: any) => {
                const planoId = conta.plano_conta_id || 'sem-classificacao'
                if (!acc[planoId]) {
                    acc[planoId] = {
                        plano_conta: conta.plano_contas || { descricao: 'Sem Classificação', codigo: '000' },
                        items: [],
                        total: 0
                    }
                }
                acc[planoId].items.push(conta)
                acc[planoId].total += conta.valor_final || 0
                return acc
            }, {})

            // Converter para array e ordenar por código
            const ledger = Object.values(grouped).sort((a: any, b: any) =>
                (a.plano_conta.codigo || '').localeCompare(b.plano_conta.codigo || '')
            )

            return {
                ledger,
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Balancete
    trialBalance: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar histórico completo para saldo anterior
            // Left join com plano_contas para não falhar em contas sem classificação
            const { data: allHistory, error: historyError } = await supabase
                .from('contas')
                .select(`id, valor_total, data_emissao, plano_conta_id, plano_contas(codigo)`)
                .eq('user_id', user.id)
                .lte('data_emissao', endDate.toISOString().split('T')[0])

            if (historyError) {
                console.error('Trial balance error:', historyError)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao calcular balancete',
                })
            }

            // Buscar plano de contas completo
            const { data: planoContas } = await supabase
                .from('plano_contas')
                .select('*')
                .eq('user_id', user.id)
                .order('codigo', { ascending: true })

            // Calcular saldos
            const balances: Record<string, any> = {}
            const startStr = startDate.toISOString().split('T')[0]

            // Inicializar com plano de contas
            planoContas?.forEach(pc => {
                balances[pc.id] = {
                    account: pc,
                    previousBalance: 0,
                    debits: 0,
                    credits: 0,
                    finalBalance: 0
                }
            })

            allHistory?.forEach((conta: any) => {
                const pcId = conta.plano_conta_id
                if (!balances[pcId]) return // Conta excluída ou inválida?

                const isBefore = conta.data_emissao < startStr
                const value = conta.valor_total || 0

                // Simplificação: Contas a Pagar são DESPESAS (Débito)
                // Se tivesse tabela de crédito (estorno), entraria em credits
                if (isBefore) {
                    balances[pcId].previousBalance += value
                } else {
                    balances[pcId].debits += value
                }
            })

            // Calcular saldo final
            Object.values(balances).forEach((b: any) => {
                b.finalBalance = b.previousBalance + b.debits - b.credits
            })

            return {
                balances: Object.values(balances).sort((a: any, b: any) =>
                    a.account.codigo.localeCompare(b.account.codigo)
                ),
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Obrigações Fiscais
    taxObligations: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, fornecedores(id, nome, cnpj_cpf, email, telefone), tipos_despesa(id, nome), parcelas(*)`,
                dateField,
                startDate,
                endDate,
                { order: { column: 'data_emissao', ascending: true } }
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar obrigações fiscais',
                })
            }

            return {
                obligations: contas || [],
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Performance Financeira
    financialPerformance: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, tipos_despesa(nome), fornecedores(nome)`,
                dateField,
                startDate,
                endDate,
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar performance',
                })
            }

            // Calcular métricas
            const total = (contas || []).reduce((sum, c) => sum + (c.valor_final || 0), 0)
            const count = (contas || []).length
            const average = count > 0 ? total / count : 0

            // Top Categorias
            const byCategory = groupByCategory(contas || [])
            const topCategories = byCategory.slice(0, 5)

            // Top Fornecedores
            const bySupplier = groupBySupplier(contas || [])
            const topSuppliers = bySupplier.slice(0, 5)

            // Tendência (agrupado por semana ou dia, dependendo do período)
            // Simplificando: por dia
            const daily: Record<string, number> = {}
            contas?.forEach(c => {
                const day = c.data_emissao
                daily[day] = (daily[day] || 0) + (c.valor_final || 0)
            })
            const trend = Object.entries(daily)
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date))

            return {
                metrics: { total, count, average },
                topCategories,
                topSuppliers,
                trend,
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Juros e Descontos
    interestDiscount: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas/parcelas com juros ou descoontos > 0
            const { data: parcelas, error } = await supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(
                        id, descricao, fornecedores(nome), tipos_despesa(nome)
                    )
                 `)
                .eq('contas.user_id', user.id)
                .gte('data_pagamento', startDate.toISOString().split('T')[0])
                .lte('data_pagamento', endDate.toISOString().split('T')[0])
                .or('valor_juros.gt.0,valor_desconto.gt.0')
                .order('data_pagamento', { ascending: false })

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar juros e descontos',
                })
            }

            const totalInterest = (parcelas || []).reduce((sum, p) => sum + (p.valor_juros || 0), 0)
            const totalDiscount = (parcelas || []).reduce((sum, p) => sum + (p.valor_desconto || 0), 0)

            return {
                items: parcelas || [],
                totals: {
                    interest: totalInterest,
                    discount: totalDiscount,
                    net: totalDiscount - totalInterest
                },
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Consolidado Multi-Empresa
    consolidatedMultiCompany: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar contas
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `*, empresas(id, razao_social, nome_fantasia), parcelas(*)`,
                dateField,
                startDate,
                endDate,
            )

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar consolidado multi-empresa',
                })
            }

            // Agrupar por empresa
            const grouped = (contas || []).reduce((acc: any, conta: any) => {
                const empresaId = conta.empresa_id || 'sem-empresa'
                if (!acc[empresaId]) {
                    acc[empresaId] = {
                        empresa: conta.empresas || { nome_fantasia: 'Sem Empresa' },
                        accounts: [],
                        totalValue: 0,
                        totalPaid: 0,
                        totalPending: 0
                    }
                }
                const emp = acc[empresaId]
                emp.accounts.push(conta)
                emp.totalValue += conta.valor_final || 0

                const paid = conta.parcelas?.filter((p: any) => p.status === 'pago')
                    .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0) || 0
                emp.totalPaid += paid

                const pending = conta.parcelas?.filter((p: any) => p.status === 'pendente' || p.status === 'parcial')
                    .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0) || 0
                emp.totalPending += pending

                return acc
            }, {})

            return {
                companies: Object.values(grouped),
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Auditoria de Pagamentos
    paymentAudit: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // Buscar pagamentos realizados
            const { data: parcelas, error } = await supabase
                .from('parcelas')
                .select(`
                    *,
                    contas!inner(
                        id, descricao,
                        fornecedores(nome, cnpj_cpf),
                        bancos(nome),
                        empresas(nome_fantasia)
                    )
                 `)
                .eq('contas.user_id', user.id)
                .eq('status', 'pago')
                .gte('data_pagamento', startDate.toISOString().split('T')[0])
                .lte('data_pagamento', endDate.toISOString().split('T')[0])
                .order('data_pagamento', { ascending: false })

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar auditoria de pagamentos',
                })
            }

            return {
                auditLogs: parcelas || [],
                totals: {
                    count: parcelas?.length || 0,
                    value: (parcelas || []).reduce((sum, p) => sum + (p.valor_final || 0), 0)
                },
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),

    // Query para Demonstrativo por Caixa (Fluxo de Caixa Hierárquico)
    cashFlowStatement: protectedProcedure
        .input(reportConfigSchema)
        .query(async ({ ctx, input }) => {
            const { supabase, user } = ctx
            const { startDate, endDate } = getPeriodDates(input.period)

            // 1. Buscar plano de contas completo
            const { data: planoContas, error: planoError } = await supabase
                .from('plano_contas')
                .select('*')
                .eq('user_id', user.id)
                .order('codigo', { ascending: true })

            if (planoError) {
                console.error('Cash flow statement error (plano):', planoError)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar plano de contas',
                })
            }

            // 2. Buscar contas com parcelas no período
            const dateField = input.period.dateField || DateFilterField.EMISSION_DATE

            const { data: contas, error: contasError } = await applyDateFilterToContasQuery(
                supabase,
                user.id,
                `id, valor_total, plano_conta_id, parcelas(id, valor_final, status, data_vencimento, data_pagamento)`,
                dateField,
                startDate,
                endDate,
            )

            if (contasError) {
                console.error('Cash flow statement error (contas):', contasError)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao buscar movimentações',
                })
            }

            // 3. Mapear valores por plano_conta_id
            const valueByPlanoId: Record<string, number> = {}
            contas?.forEach((conta: any) => {
                if (!conta.plano_conta_id) return
                const value = conta.valor_total || 0
                valueByPlanoId[conta.plano_conta_id] = (valueByPlanoId[conta.plano_conta_id] || 0) + value
            })

            // 4. Construir árvore hierárquica com totais
            const tree = buildCashFlowTree(planoContas || [], valueByPlanoId)

            // 5. Flatten tree para exibição tabular
            const flatList = flattenTree(tree)

            return {
                accounts: flatList,
                totals: {
                    receitas: flatList.filter((a: any) => a.tipo === 'RECEITA' && a.nivel === 1).reduce((s: number, a: any) => s + a.total, 0),
                    despesas: flatList.filter((a: any) => a.tipo === 'DESPESA' && a.nivel === 1).reduce((s: number, a: any) => s + a.total, 0),
                    aplicacao: flatList.filter((a: any) => a.tipo === 'APLICACAO' && a.nivel === 1).reduce((s: number, a: any) => s + a.total, 0),
                },
                period: {
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd'),
                },
            }
        }),
})

//
// Helper Functions
//

function getPeriodDates(period: any) {
    const today = new Date()
    let startDate: Date
    let endDate: Date

    switch (period.type) {
        case PeriodType.CURRENT_MONTH:
            startDate = startOfMonth(today)
            endDate = endOfMonth(today)
            break
        case PeriodType.CUSTOM_RANGE:
            // Handle string dates from TRPC serialization
            startDate = period.startDate
                ? (typeof period.startDate === 'string' ? parseISO(period.startDate) : period.startDate)
                : startOfMonth(today)
            endDate = period.endDate
                ? (typeof period.endDate === 'string' ? parseISO(period.endDate) : period.endDate)
                : endOfMonth(today)
            break
        case PeriodType.QUARTER:
            // Implementar lógica de trimestre
            const quarterMonth = ((period.quarter || 1) - 1) * 3
            const yearForQuarter = period.quarterYear || today.getFullYear()
            startDate = startOfMonth(new Date(yearForQuarter, quarterMonth, 1))
            endDate = endOfMonth(addMonths(startDate, 2))
            break
        case PeriodType.YEAR:
            const year = period.fullYear || today.getFullYear()
            startDate = new Date(year, 0, 1)
            endDate = new Date(year, 11, 31)
            break
        default:
            startDate = startOfMonth(today)
            endDate = endOfMonth(today)
    }

    return { startDate, endDate }
}

function calculateTotals(contas: any[]) {
    return {
        totalAccounts: contas.length,
        totalValue: contas.reduce((sum, c) => sum + (c.valor_total || 0), 0),
        totalPaid: contas.reduce((sum, c) => {
            return sum + (c.parcelas?.filter((p: any) => p.status === 'pago')
                .reduce((acc: number, p: any) => acc + (p.valor_final || 0), 0) || 0)
        }, 0),
        totalPending: contas.reduce((sum, c) => {
            return sum + (c.parcelas?.filter((p: any) => p.status === 'pendente' || p.status === 'parcial')
                .reduce((acc: number, p: any) => acc + (p.valor_final || 0), 0) || 0)
        }, 0),
        totalInstallments: contas.reduce((sum, c) => sum + (c.parcelas?.length || 0), 0),
    }
}

function groupByStatus(contas: any[]) {
    const grouped: Record<string, any[]> = {
        ativa: [],
        quitada: [],
        cancelada: [],
    }

    contas.forEach((conta) => {
        if (grouped[conta.status]) {
            grouped[conta.status].push(conta)
        }
    })

    return Object.entries(grouped).map(([status, items]) => ({
        status,
        count: items.length,
        total: items.reduce((sum, c) => sum + (c.valor_total || 0), 0),
        items,
    }))
}

function groupBySupplier(contas: any[]) {
    const grouped: Record<string, any> = {}

    contas.forEach((conta) => {
        const supplierId = conta.fornecedor_id || 'sem-fornecedor'
        if (!grouped[supplierId]) {
            grouped[supplierId] = {
                supplier: conta.fornecedores || { nome: 'Sem Fornecedor' },
                accounts: [],
                totalValue: 0,
                totalPaid: 0,
                totalPending: 0,
            }
        }

        grouped[supplierId].accounts.push(conta)

        // Accumulate totals using enriched values or fallbacks
        grouped[supplierId].totalValue += conta.valor_total || 0
        grouped[supplierId].totalPaid += conta.valor_pago || 0
        grouped[supplierId].totalPending += conta.valor_pendente || 0
    })

    return Object.values(grouped).sort((a: any, b: any) => b.totalValue - a.totalValue)
}



function groupByCategory(contas: any[]) {
    const grouped: Record<string, any> = {}

    contas.forEach((conta) => {
        const categoryId = conta.tipo_despesa_id || 'sem-categoria'
        if (!grouped[categoryId]) {
            grouped[categoryId] = {
                category: conta.tipos_despesa || { nome: 'Sem Categoria', cor: '#gray' },
                accounts: [],
                totalValue: 0,
                totalPaid: 0,
                totalPending: 0,
            }
        }

        grouped[categoryId].accounts.push(conta)
        grouped[categoryId].totalValue += conta.valor_final || 0

        // Update to use enriched values if available, or calculate
        const paid = conta.valor_pago !== undefined ? conta.valor_pago : (conta.parcelas?.filter((p: any) => p.status === 'pago')
            .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0) || 0)
        grouped[categoryId].totalPaid += paid

        const pending = conta.valor_pendente !== undefined ? conta.valor_pendente : (conta.parcelas?.filter((p: any) => p.status === 'pendente' || p.status === 'parcial')
            .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0) || 0)
        grouped[categoryId].totalPending += pending
    })

    return Object.values(grouped).sort((a: any, b: any) => b.totalValue - a.totalValue)
}

// ... other helpers ...

// Helper para enriquecer dados da conta (mesma lógica de contas.ts)
function enrichConta(conta: any) {
    const parcelas = conta.parcelas || []
    const totalParcelas = parcelas.length

    const parcelasPagas = parcelas.filter((p: any) => p.status === 'pago').length
    const valorPago = parcelas
        .filter((p: any) => p.status === 'pago')
        .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0)
    const valorPendente = parcelas
        .filter((p: any) => p.status !== 'pago' && p.status !== 'cancelado')
        .reduce((sum: number, p: any) => sum + (p.valor_final || 0), 0)

    // Calcular totais de juros e descontos (apenas parcelas pagas)
    const totalJuros = parcelas
        .filter((p: any) => p.status === 'pago')
        .reduce((sum: number, p: any) => sum + (p.valor_juros || 0), 0)
    const totalDescontos = parcelas
        .filter((p: any) => p.status === 'pago')
        .reduce((sum: number, p: any) => sum + (p.valor_desconto || 0), 0)
    const valorOriginalPago = parcelas
        .filter((p: any) => p.status === 'pago')
        .reduce((sum: number, p: any) => sum + (p.valor_original || 0), 0)

    const proximaParcelaVencimento = parcelas
        .filter((p: any) => p.status === 'pendente' || p.status === 'atrasado')
        .sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())[0]

    // Status calculado dinamicamente
    let statusCalculado = 'ativa'
    if (totalParcelas > 0 && parcelasPagas === totalParcelas) {
        statusCalculado = 'quitada'
    } else if (conta.status === 'cancelada') {
        statusCalculado = 'cancelada'
    }

    // Calcular número da parcela atual (próxima pendente ou última paga + 1)
    let parcelaAtual = proximaParcelaVencimento?.numero_parcela || parcelasPagas + 1

    // Se estiver quitada, mantém o total de parcelas (ex: 1/1 em vez de 2/1)
    if (statusCalculado === 'quitada') {
        parcelaAtual = totalParcelas
    }

    return {
        ...conta,
        status: statusCalculado, // Sobrescreve o status do banco
        total_parcelas: totalParcelas, // Usa o total real de parcelas
        parcela_atual: parcelaAtual, // Número da parcela atual
        parcelas_pagas: parcelasPagas,
        valor_pago: valorPago,
        valor_pendente: valorPendente,
        proxima_parcela: proximaParcelaVencimento,
        total_juros: totalJuros,
        total_descontos: totalDescontos,
        valor_original_pago: valorOriginalPago,
        tem_ajustes_financeiros: totalJuros > 0 || totalDescontos > 0,
    }
}


function groupParcelasByMonth(parcelas: any[]) {
    const grouped: Record<string, any> = {}

    parcelas.forEach((parcela) => {
        const monthKey = format(parseISO(parcela.data_vencimento), 'yyyy-MM')
        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                month: monthKey,
                installments: [],
                totalValue: 0,
                count: 0,
            }
        }

        grouped[monthKey].installments.push(parcela)
        grouped[monthKey].totalValue += parcela.valor_final || 0
        grouped[monthKey].count++
    })

    return Object.values(grouped).sort((a: any, b: any) => a.month.localeCompare(b.month))
}

function groupByOverdueRange(parcelas: any[]) {
    const ranges = [
        { name: '1-30 dias', min: 1, max: 30 },
        { name: '31-60 dias', min: 31, max: 60 },
        { name: '61-90 dias', min: 61, max: 90 },
        { name: '90+ dias', min: 91, max: Infinity },
    ]

    return ranges.map(range => {
        const items = parcelas.filter(p => p.daysOverdue >= range.min && p.daysOverdue <= range.max)
        return {
            range: range.name,
            count: items.length,
            total: items.reduce((sum, p) => sum + (p.valor_final || 0), 0),
            items,
        }
    })
}

function buildDreTree(planoContas: any[], accountsByPlano: any) {
    const nodeMap: Record<string, any> = {}
    const roots: any[] = []

    // 1. Create nodes
    planoContas.forEach(pc => {
        const accounts = accountsByPlano[pc.id] || []
        const value = accounts.reduce((sum: number, c: any) => sum + (c.valor_final || 0), 0)

        nodeMap[pc.id] = {
            id: pc.id,
            codigo: pc.codigo,
            descricao: pc.descricao,
            tipo: pc.tipo,
            nivel: pc.nivel,
            conta_superior_id: pc.conta_superior_id,
            valor: value,
            total: value, // Initial total is just own value
            children: []
        }
    })

    // 2. Build Hierarchy
    planoContas.forEach(pc => {
        const node = nodeMap[pc.id]
        if (pc.conta_superior_id && nodeMap[pc.conta_superior_id]) {
            nodeMap[pc.conta_superior_id].children.push(node)
        } else {
            roots.push(node)
        }
    })

    // 3. Calculate Totals (Recursive)
    function calculateNodeTotal(node: any) {
        let childSum = 0
        node.children.forEach((child: any) => {
            childSum += calculateNodeTotal(child)
        })
        node.total = node.valor + childSum
        return node.total
    }

    roots.forEach(root => calculateNodeTotal(root))

    // Sort roots by code
    return roots.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

// Helper para construir árvore do Demonstrativo por Caixa
function buildCashFlowTree(planoContas: any[], valueByPlanoId: Record<string, number>) {
    const nodeMap: Record<string, any> = {}
    const roots: any[] = []

    // 1. Criar nós
    planoContas.forEach(pc => {
        const ownValue = valueByPlanoId[pc.id] || 0

        nodeMap[pc.id] = {
            id: pc.id,
            codigo: pc.codigo,
            descricao: pc.descricao,
            tipo: pc.tipo,
            nivel: pc.nivel,
            modo: pc.modo,
            conta_superior_id: pc.conta_superior_id,
            valor: ownValue,
            total: ownValue,
            children: []
        }
    })

    // 2. Construir hierarquia
    planoContas.forEach(pc => {
        const node = nodeMap[pc.id]
        if (pc.conta_superior_id && nodeMap[pc.conta_superior_id]) {
            nodeMap[pc.conta_superior_id].children.push(node)
        } else {
            roots.push(node)
        }
    })

    // 3. Calcular totais recursivamente (contas sintéticas agregam analíticas)
    function calculateTotal(node: any): number {
        let childSum = 0
        node.children.forEach((child: any) => {
            childSum += calculateTotal(child)
        })
        node.total = node.valor + childSum
        return node.total
    }

    roots.forEach(root => calculateTotal(root))

    // Ordenar por código
    return roots.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

// Helper para "achatar" árvore em lista ordenada hierarquicamente
function flattenTree(nodes: any[], result: any[] = []): any[] {
    nodes.forEach(node => {
        // Adicionar nó atual
        result.push({
            id: node.id,
            codigo: node.codigo,
            descricao: node.descricao,
            tipo: node.tipo,
            nivel: node.nivel,
            modo: node.modo,
            valor: node.valor,
            total: node.total,
        })
        // Recursivamente adicionar filhos (ordenados por código)
        if (node.children && node.children.length > 0) {
            const sortedChildren = [...node.children].sort((a: any, b: any) => a.codigo.localeCompare(b.codigo))
            flattenTree(sortedChildren, result)
        }
    })
    return result
}

// Helper para aplicar filtro de data dinâmico
async function applyDateFilterToContasQuery(
    supabase: SupabaseClient,
    userId: string,
    selectQuery: string,
    dateField: DateFilterField,
    startDate: Date,
    endDate: Date,
    options: { order?: { column: string, ascending: boolean } } = {}
): Promise<{ data: any[] | null; error: any }> {
    // 1. Filtro por Data de Emissão (Padrão/Simples)
    if (dateField === DateFilterField.EMISSION_DATE) {
        let query = supabase
            .from('contas')
            .select(selectQuery)
            .eq('user_id', userId)
            .gte('data_emissao', startDate.toISOString().split('T')[0])
            .lte('data_emissao', endDate.toISOString().split('T')[0])

        if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending })
        }

        return await query
    }

    // 2. Filtro por Vencimento ou Pagamento (Complexo - via Parcelas)
    // Usando any para evitar erros de tipagem do PostgREST ao mudar o select
    let parcelasQuery: any = supabase
        .from('parcelas')
        .select('conta_id, contas!inner(user_id)')
        .eq('contas.user_id', userId)

    if (dateField === DateFilterField.DUE_DATE) {
        parcelasQuery = parcelasQuery
            .gte('data_vencimento', startDate.toISOString().split('T')[0])
            .lte('data_vencimento', endDate.toISOString().split('T')[0])
    } else if (dateField === DateFilterField.PAYMENT_DATE) {
        parcelasQuery = parcelasQuery
            .gte('data_pagamento', startDate.toISOString().split('T')[0])
            .lte('data_pagamento', endDate.toISOString().split('T')[0])
            .eq('status', 'pago')
    }

    const { data: parcelas, error: parcelasError } = await parcelasQuery

    if (parcelasError) {
        return { data: null, error: parcelasError }
    }

    const contaIds = Array.from(new Set((parcelas as any[])?.map((p: any) => p.conta_id) || []))

    if (contaIds.length === 0) {
        return { data: [], error: null }
    }

    // Agora buscamos as contas completas
    let query = supabase
        .from('contas')
        .select(selectQuery)
        .in('id', contaIds)

    if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending })
    }

    return await query
}
