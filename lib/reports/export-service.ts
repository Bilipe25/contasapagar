'use client'

import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatCurrency, formatDate } from './pdf-helpers'
import { generatePDF } from './pdf-generator'
import { generateSupplierConsolidatedPDF } from './report-generators'
import {
    generateCategoryAnalysisPDF,
    generateDREPDF,
    generateFinancialPerformancePDF,
    generateCashFlowProjectionPDF,
    generateOverdueReportPDF
} from './additional-generators'
import {
    generateAnalyticalLedgerPDF,
    generateTrialBalancePDF,
    generateInterestDiscountPDF,
    generateMultiCompanyPDF,
    generateTaxObligationsPDF,
    generatePaymentAuditPDF,
    generateCashFlowStatementPDF
} from './accounting-generators'
import { generateMonthlyDetailedExcel, generateSupplierConsolidatedExcel, generateCSV, generateGenericExcel } from './excel-generators'
import { type ExportConfig, ViewMode } from './types'

// Configure pdfMake fonts - using dynamic import for vfs_fonts
if (typeof window !== 'undefined') {
    import('pdfmake/build/vfs_fonts').then((vfs: any) => {
        pdfMake.vfs = vfs.default?.addFontsToPdfMake ? vfs.default.pdfMake.vfs : (vfs.pdfMake?.vfs || vfs.vfs || {})
    }).catch((err) => {
        console.error('Failed to load pdfMake fonts:', err)
    })
}

export interface ExportReportParams {
    config: ExportConfig
    data: any
}

/**
 * Main export orchestrator - handles PDF, Excel, and CSV exports
 */
export async function exportReport({ config, data }: ExportReportParams) {
    switch (config.format.format) {
        case 'pdf':
            return exportPDF(data, config)
        case 'excel':
            return exportExcel(data, config)
        case 'csv':
            return exportCSV(data, config)
        default:
            throw new Error(`Formato de exportação não suportado: ${config.format.format}`)
    }
}

/**
 * Generates and downloads a PDF report
 */
async function exportPDF(data: any, config: ExportConfig) {
    let docDefinition: TDocumentDefinitions
    const reportTypeStr = String(config.reportType)

    switch (reportTypeStr) {
        case 'monthly_detailed':
            // Pass configuration to support dynamic columns
            docDefinition = await generatePDF({
                contas: data.contas || [], // Corrected from data.items
                stats: {
                    totalAPagar: data.totals?.total || 0,
                    totalVencidas: data.totals?.overdue || 0,
                    totalPago: data.totals?.paid || 0,
                    quantidadePagas: data.totals?.paidCount || 0,
                    totalJuros: data.totals?.interest || 0,
                    totalDescontos: data.totals?.discount || 0
                },
                periodo: (typeof data.period === 'string' ? data.period :
                    (data.period instanceof Date ? data.period.toISOString().slice(0, 7) :
                        (config.period.startDate ? config.period.startDate.toISOString().slice(0, 7) :
                            new Date().toISOString().slice(0, 7)))),
                config: config,
                availableColumns: config.columns?.availableColumns
            })
            break

        case 'supplier_consolidated':
            docDefinition = generateSupplierConsolidatedPDF(data, config)
            break

        case 'category_analysis':
            docDefinition = generateCategoryAnalysisPDF(data, config)
            break

        case 'accounting_statement': {
            // Flatten the hierarchical tree preserving level and code
            const dreEntries: Array<{
                codigo: string; descricao: string; valor: number;
                total: number; nivel: number; isSynthetic: boolean
            }> = []
            const flattenDreTree = (nodes: any[]) => {
                const sorted = [...nodes].sort((a: any, b: any) =>
                    (a.codigo || '').localeCompare(b.codigo || '')
                )
                sorted.forEach((node: any) => {
                    const hasChildren = node.children && node.children.length > 0
                    // Only include entries with value or that are synthetic parents
                    if (node.total > 0 || hasChildren) {
                        dreEntries.push({
                            codigo: node.codigo || '000',
                            descricao: node.descricao || 'Sem Descrição',
                            valor: node.valor || 0,
                            total: node.total || 0,
                            nivel: node.nivel || 1,
                            isSynthetic: hasChildren,
                        })
                    }
                    if (hasChildren) {
                        flattenDreTree(node.children)
                    }
                })
            }

            if (data.statement) {
                flattenDreTree(data.statement)
            }

            const totalExpenses = (data.statement || []).reduce(
                (sum: number, root: any) => sum + (root.total || 0), 0
            )

            const dreData = {
                period: data.period,
                entries: dreEntries,
                summary: {
                    totalExpenses,
                    netResult: -totalExpenses,
                }
            }

            docDefinition = generateDREPDF(dreData, config)
            break
        }

        case 'financial_performance': {
            // Pass real backend data directly
            const financialData = {
                period: data.period,
                metrics: {
                    total: data.metrics?.total || 0,
                    count: data.metrics?.count || 0,
                    average: data.metrics?.average || 0,
                },
                topCategories: (data.topCategories || []).map((c: any) => ({
                    category: c.category || 'Sem Categoria',
                    total: c.total || 0,
                    count: c.count || 0,
                })),
                topSuppliers: (data.topSuppliers || []).map((s: any) => ({
                    supplier: s.supplier || 'Sem Fornecedor',
                    total: s.total || 0,
                    count: s.count || 0,
                })),
                trend: data.trend || [],
            }
            docDefinition = generateFinancialPerformancePDF(financialData, config)
            break
        }

        case 'analytical_ledger':
            // Map data from reports.ts to match generator interface
            const analyticalData = {
                period: data.period,
                accounts: (data.ledger || []).map((item: any) => {
                    let runningBalance = 0 // Assuming starts at 0 for now as reports.ts doesn't fetch pre-period balance

                    const transactions = (item.items || []).map((t: any) => {
                        // Treating bills as Credit (Liability) or Debit (Expense)?
                        // reports.ts treats as Debits in Trial Balance simplifiction.
                        // Let's stick to: Bill = Increases Balance. If Balance is Expense, it's Debit.
                        const debit = t.valor_final || 0
                        const credit = 0
                        runningBalance += (debit - credit)

                        return {
                            date: t.data_emissao,
                            description: t.descricao || 'Sem descrição',
                            debit,
                            credit,
                            balance: runningBalance
                        }
                    })

                    return {
                        account: {
                            code: item.plano_conta?.codigo || '000',
                            name: item.plano_conta?.descricao || 'Indefinido'
                        },
                        transactions,
                        openingBalance: 0,
                        closingBalance: runningBalance
                    }
                })
            }
            docDefinition = generateAnalyticalLedgerPDF(analyticalData, config)
            break

        case 'trial_balance':
            // Map data for Trial Balance
            const trialData = {
                period: data.period,
                totals: {
                    totalDebit: 0,
                    totalCredit: 0,
                    totalDebitBalance: 0,
                    totalCreditBalance: 0
                },
                accounts: (data.balances || []).filter((b: any) =>
                    b.previousBalance !== 0 || b.debits !== 0 || b.credits !== 0 || b.finalBalance !== 0
                ).map((b: any) => {
                    // reports.ts "balances" structure: { account: {}, previousBalance, debits, credits, finalBalance }
                    // It treats everything as debits (expenses) currently
                    const debit = b.debits || 0
                    const credit = b.credits || 0
                    const balance = b.finalBalance || 0

                    return {
                        code: b.account?.codigo || '000',
                        name: b.account?.descricao || 'Indefinido',
                        debit,
                        credit,
                        debitBalance: balance > 0 ? balance : 0,
                        creditBalance: balance < 0 ? Math.abs(balance) : 0
                    }
                })
            }
            // Calculate totals
            trialData.accounts.forEach((acc: any) => {
                trialData.totals.totalDebit += acc.debit
                trialData.totals.totalCredit += acc.credit
                trialData.totals.totalDebitBalance += acc.debitBalance
                trialData.totals.totalCreditBalance += acc.creditBalance
            })

            docDefinition = generateTrialBalancePDF(trialData, config)
            break

        // duplicate financial_performance case removed

        case 'interest_discount':
            // Map data for Interest/Discount
            const interestData = {
                period: data.period,
                totals: {
                    totalOriginalValue: (data.items || []).reduce((sum: number, i: any) => sum + (i.valor_original || 0), 0),
                    totalFinalValue: (data.items || []).reduce((sum: number, i: any) => sum + (i.valor_final || 0), 0),
                    totalInterest: data.totals?.interest || 0,
                    totalDiscount: data.totals?.discount || 0
                },
                transactions: (data.items || []).map((item: any) => ({
                    accountDescription: item.contas?.descricao || '-',
                    supplier: item.contas?.fornecedores?.nome || '-',
                    originalValue: item.valor_original || 0,
                    finalValue: item.valor_final || 0,
                    interest: item.valor_juros || 0,
                    discount: item.valor_desconto || 0,
                    dueDate: item.data_vencimento,
                    paymentDate: item.data_pagamento
                }))
            }
            docDefinition = generateInterestDiscountPDF(interestData, config)
            break

        case 'consolidated_multi_company':
            // Map data for Multi Company
            const multiCompanyData = {
                period: data.period,
                companies: (data.companies || []).map((c: any) => ({
                    company: {
                        id: c.empresa?.id || 'unknown',
                        name: c.empresa?.nome_fantasia || 'Sem Nome'
                    },
                    accounts: Array.isArray(c.accounts) ? c.accounts.length : 0,
                    totalValue: c.totalValue || 0,
                    totalPaid: c.totalPaid || 0,
                    totalPending: c.totalPending || 0
                })),
                consolidated: {
                    totalCompanies: (data.companies || []).length,
                    totalAccounts: (data.companies || []).reduce((sum: number, c: any) => sum + (c.accounts?.length || 0), 0),
                    totalValue: (data.companies || []).reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0),
                    totalPaid: (data.companies || []).reduce((sum: number, c: any) => sum + (c.totalPaid || 0), 0),
                    totalPending: (data.companies || []).reduce((sum: number, c: any) => sum + (c.totalPending || 0), 0)
                }
            }
            docDefinition = generateMultiCompanyPDF(multiCompanyData, config)
            break

        case 'tax_obligations':
            docDefinition = generateTaxObligationsPDF(data, config)
            break

        case 'payment_audit':
            docDefinition = generatePaymentAuditPDF(data, config)
            break

        case 'cash_flow_projection':
            docDefinition = generateCashFlowProjectionPDF(data, config)
            break

        case 'overdue_report':
            docDefinition = generateOverdueReportPDF(data, config)
            break

        case 'cash_flow_statement':
            docDefinition = generateCashFlowStatementPDF(data, config)
            break

        default:
            throw new Error(`Gerador de PDF não implementado para: ${config.reportType}`)
    }

    // Generate and download
    const pdfInstance = pdfMake.createPdf(docDefinition)
    pdfInstance.download(getReportFilename(config, 'pdf'))
}

/**
 * Generates and downloads an Excel report
 */
async function exportExcel(data: any, config: ExportConfig) {
    let blob: Blob
    const reportTypeStr = String(config.reportType)

    switch (reportTypeStr) {
        case 'monthly_detailed':
            // Custom logic for Monthly Detailed to support ViewMode and Columns
            const isInstallmentView = config.viewMode === ViewMode.BY_INSTALLMENT
            let excelItems: any[] = []

            if (isInstallmentView) {
                excelItems = data.contas.flatMap((conta: any) => {
                    return (conta.parcelas || []).map((p: any) => ({
                        ...p,
                        conta_descricao: conta.descricao,
                        fornecedor_nome: conta.fornecedores?.nome,
                        categoria_nome: conta.tipos_despesa?.nome,
                        parcela_info: `${p.numero_parcela}/${conta.total_parcelas}`
                    }))
                })
                excelItems.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
            } else {
                excelItems = data.contas.map((conta: any) => ({
                    ...conta,
                    conta_descricao: conta.descricao,
                    fornecedor_nome: conta.fornecedores?.nome,
                    categoria_nome: conta.tipos_despesa?.nome,
                    parcela_info: `${conta.parcela_atual || 0}/${conta.total_parcelas || 0}`,
                    valor_final: conta.valor_total,
                    data_vencimento: conta.proxima_parcela?.data_vencimento
                }))
            }

            // Define available columns matching DEFAULT_ACCOUNT_COLUMNS ids
            const excelAvailableCols: Record<string, any> = {
                'descricao': { header: 'Descrição', key: 'conta_descricao', width: 30 },
                'fornecedor': { header: 'Fornecedor', key: 'fornecedor_nome', width: 25 },
                'categoria': { header: 'Categoria', key: 'categoria_nome', width: 20 },
                'valor_final': { header: 'Valor', key: 'valor_final', width: 15 },
                'numero_parcela': { header: 'Parcela', key: 'parcela_info', width: 10 },
                'status': { header: 'Status', key: 'status', width: 15 },
                'data_vencimento': { header: 'Vencimento', key: 'data_vencimento', width: 15 },
                'data_pagamento': { header: 'Pagamento', key: 'data_pagamento', width: 15 },
                // aliases for backward compatibility if needed
                'col-description': { header: 'Descrição', key: 'conta_descricao', width: 30 },
            }

            // Select columns
            let excelColumns: any[] = []
            if (config.columns?.selectedColumns && config.columns.selectedColumns.length > 0) {
                excelColumns = config.columns.selectedColumns
                    .map(colId => excelAvailableCols[colId])
                    .filter(Boolean)
            }

            // Default columns
            if (excelColumns.length === 0) {
                excelColumns = [
                    excelAvailableCols['descricao'],
                    excelAvailableCols['fornecedor'],
                    excelAvailableCols['categoria'],
                    excelAvailableCols['valor_final'],
                    excelAvailableCols['numero_parcela'],
                    excelAvailableCols['status'],
                    excelAvailableCols['data_vencimento']
                ]
            }

            blob = await generateGenericExcel({
                title: isInstallmentView ? 'Relatório Detalhado (Por Parcela)' : 'Relatório Detalhado (Por Conta)',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Registros', value: excelItems.length },
                    { label: 'Valor Total', value: formatCurrency(data.totals.totalValue) },
                ],
                columns: excelColumns,
                data: excelItems.map(item => {
                    const mapped: any = {}
                    excelColumns.forEach(col => {
                        let val = item[col.key]
                        if (col.key === 'valor_final') val = typeof val === 'number' ? val : 0
                        if (col.key === 'data_vencimento' || col.key === 'data_pagamento') val = val ? formatDate(val) : '-'
                        mapped[col.key] = val
                    })
                    return mapped
                })
            })
            break

        case 'supplier_consolidated':
            blob = await generateSupplierConsolidatedExcel(data, config)
            break

        case 'category_analysis':
            blob = await generateGenericExcel({
                title: 'Análise por Categoria',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Categorias', value: data.categories.length },
                    { label: 'Valor Total', value: formatCurrency(data.totals.totalValue) },
                ],
                columns: [
                    { header: 'Categoria', key: 'category', width: 30 },
                    { header: 'Contas', key: 'count', width: 10 },
                    { header: 'Valor Total', key: 'totalValue', width: 20 },
                    { header: 'Valor Pago', key: 'totalPaid', width: 20 },
                    { header: 'Valor Pendente', key: 'totalPending', width: 20 },
                ],
                data: data.categories.map((c: any) => ({
                    category: c.category.nome,
                    count: c.count,
                    totalValue: c.totalValue,
                    totalPaid: c.totalPaid,
                    totalPending: c.totalPending,
                }))
            })
            break

        case 'cash_flow_projection': {
            let saldoAcumulado = 0
            const projRows = (data.projection || []).map((p: any) => {
                saldoAcumulado += (p.totalValue || 0)
                return {
                    mes: p.month || '-',
                    qtd: p.count || 0,
                    valor: p.totalValue || 0,
                    saldo: saldoAcumulado,
                }
            })
            blob = await generateGenericExcel({
                title: 'Projeção de Fluxo de Caixa',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Projetado', value: formatCurrency(data.totals?.totalProjected || 0) },
                    { label: 'Parcelas', value: data.totals?.count || 0 },
                ],
                columns: [
                    { header: 'Mês', key: 'mes', width: 14 },
                    { header: 'Parcelas', key: 'qtd', width: 12 },
                    { header: 'Valor', key: 'valor', width: 20 },
                    { header: 'Saldo Acumulado', key: 'saldo', width: 20 },
                ],
                data: projRows
            })
            break
        }

        case 'overdue_report':
            blob = await generateGenericExcel({
                title: 'Relatório de Contas Vencidas',
                period: { startDate: data.asOfDate, endDate: data.asOfDate },
                summary: [
                    { label: 'Total de Parcelas', value: data.totals?.count || 0 },
                    { label: 'Valor Total Vencido', value: formatCurrency(data.totals?.total || 0) },
                    { label: 'Data Referência', value: formatDate(data.asOfDate) },
                ],
                columns: [
                    { header: 'Vencimento', key: 'vencimento', width: 14 },
                    { header: 'Dias Atraso', key: 'dias', width: 12 },
                    { header: 'Descrição', key: 'descricao', width: 28 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 22 },
                    { header: 'Valor', key: 'valor', width: 16 },
                    { header: 'Status', key: 'status', width: 12 },
                ],
                data: (data.overdue || []).map((i: any) => ({
                    vencimento: formatDate(i.data_vencimento),
                    dias: i.daysOverdue || 0,
                    descricao: i.contas?.descricao || '-',
                    fornecedor: i.contas?.fornecedores?.nome || '-',
                    valor: i.valor_final || 0,
                    status: i.status || '-',
                }))
            })
            break

        case 'accounting_statement': { // DRE
            const excelDreRows: any[] = []
            const flattenForExcel = (nodes: any[]) => {
                const sorted = [...nodes].sort((a: any, b: any) =>
                    (a.codigo || '').localeCompare(b.codigo || '')
                )
                sorted.forEach((node: any) => {
                    const hasChildren = node.children && node.children.length > 0
                    if (node.total > 0 || hasChildren) {
                        excelDreRows.push({
                            codigo: node.codigo || '000',
                            nivel: node.nivel || 1,
                            tipo: hasChildren ? 'Sintética' : 'Analítica',
                            descricao: node.descricao || 'Sem Descrição',
                            valor: hasChildren ? node.total : node.valor,
                        })
                    }
                    if (hasChildren) flattenForExcel(node.children)
                })
            }
            if (data.statement) flattenForExcel(data.statement)

            const totalDre = (data.statement || []).reduce(
                (s: number, r: any) => s + (r.total || 0), 0
            )
            blob = await generateGenericExcel({
                title: 'DRE — Demonstrativo de Despesas do Exercício',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Despesas', value: formatCurrency(totalDre) },
                    { label: 'Resultado Líquido', value: formatCurrency(-totalDre) },
                ],
                columns: [
                    { header: 'Código', key: 'codigo', width: 12 },
                    { header: 'Nível', key: 'nivel', width: 8 },
                    { header: 'Tipo', key: 'tipo', width: 12 },
                    { header: 'Descrição', key: 'descricao', width: 40 },
                    { header: 'Valor', key: 'valor', width: 18 },
                ],
                data: excelDreRows
            })
            break
        }

        case 'financial_performance':
            blob = await generateGenericExcel({
                title: 'Performance Financeira',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Despesas', value: formatCurrency(data.metrics?.total || 0) },
                    { label: 'Quantidade de Contas', value: data.metrics?.count || 0 },
                    { label: 'Ticket Médio', value: formatCurrency(data.metrics?.average || 0) },
                ],
                columns: [
                    { header: 'Data', key: 'data', width: 14 },
                    { header: 'Valor', key: 'valor', width: 20 },
                ],
                data: (data.trend || []).map((t: any) => ({
                    data: formatDate(t.date),
                    valor: t.value || 0,
                }))
            })
            break

        case 'analytical_ledger': {
            // Achatar data.ledger (agrupado por conta) em linhas individuais
            const ledgerRows: any[] = []
            let totalLedgerRecords = 0
                ; (data.ledger || []).forEach((group: any) => {
                    const codigo = group.plano_conta?.codigo || '000'
                    const contaName = group.plano_conta?.descricao || 'Sem Classificação'
                        ; (group.items || []).forEach((item: any) => {
                            totalLedgerRecords++
                            ledgerRows.push({
                                data: formatDate(item.data_emissao),
                                codigo,
                                conta: contaName,
                                historico: item.descricao || 'Sem descrição',
                                fornecedor: item.fornecedores?.nome || '-',
                                debito: item.valor_final || 0,
                                credito: 0,
                            })
                        })
                })
            blob = await generateGenericExcel({
                title: 'Razão Analítico',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Lançamentos', value: totalLedgerRecords },
                    { label: 'Contas Contábeis', value: (data.ledger || []).length },
                ],
                columns: [
                    { header: 'Data', key: 'data', width: 14 },
                    { header: 'Código', key: 'codigo', width: 10 },
                    { header: 'Conta Contábil', key: 'conta', width: 25 },
                    { header: 'Histórico', key: 'historico', width: 35 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 20 },
                    { header: 'Débito', key: 'debito', width: 15 },
                    { header: 'Crédito', key: 'credito', width: 15 },
                ],
                data: ledgerRows
            })
            break
        }

        case 'trial_balance': {
            // Filtrar contas sem movimentação
            const balanceRows = (data.balances || []).filter((b: any) =>
                b.previousBalance !== 0 || b.debits !== 0 || b.credits !== 0 || b.finalBalance !== 0
            )
            const totalDebits = balanceRows.reduce((s: number, b: any) => s + (b.debits || 0), 0)
            const totalCredits = balanceRows.reduce((s: number, b: any) => s + (b.credits || 0), 0)
            blob = await generateGenericExcel({
                title: 'Balancete de Verificação',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Contas com Movimento', value: balanceRows.length },
                    { label: 'Total Débitos', value: formatCurrency(totalDebits) },
                    { label: 'Total Créditos', value: formatCurrency(totalCredits) },
                ],
                columns: [
                    { header: 'Código', key: 'codigo', width: 12 },
                    { header: 'Conta', key: 'conta', width: 30 },
                    { header: 'Saldo Anterior', key: 'anterior', width: 18 },
                    { header: 'Débitos', key: 'debitos', width: 18 },
                    { header: 'Créditos', key: 'creditos', width: 18 },
                    { header: 'Saldo Final', key: 'saldo_final', width: 18 },
                ],
                data: balanceRows.map((b: any) => ({
                    codigo: b.account?.codigo || '-',
                    conta: b.account?.descricao || 'Indefinido',
                    anterior: b.previousBalance || 0,
                    debitos: b.debits || 0,
                    creditos: b.credits || 0,
                    saldo_final: b.finalBalance || 0,
                }))
            })
            break
        }

        case 'interest_discount':
            blob = await generateGenericExcel({
                title: 'Análise de Juros e Descontos',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Juros', value: formatCurrency(data.totals?.interest || 0) },
                    { label: 'Total de Descontos', value: formatCurrency(data.totals?.discount || 0) },
                    { label: 'Impacto Líquido', value: formatCurrency((data.totals?.discount || 0) - (data.totals?.interest || 0)) },
                ],
                columns: [
                    { header: 'Descrição', key: 'descricao', width: 30 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 25 },
                    { header: 'Categoria', key: 'categoria', width: 18 },
                    { header: 'Vencimento', key: 'vencimento', width: 14 },
                    { header: 'Pagamento', key: 'pagamento', width: 14 },
                    { header: 'Valor Original', key: 'original', width: 16 },
                    { header: 'Juros', key: 'juros', width: 14 },
                    { header: 'Desconto', key: 'desconto', width: 14 },
                    { header: 'Valor Final', key: 'final', width: 16 },
                ],
                data: (data.items || []).map((p: any) => ({
                    descricao: p.contas?.descricao || '-',
                    fornecedor: p.contas?.fornecedores?.nome || '-',
                    categoria: p.contas?.tipos_despesa?.nome || '-',
                    vencimento: formatDate(p.data_vencimento),
                    pagamento: formatDate(p.data_pagamento),
                    original: p.valor_original || 0,
                    juros: p.valor_juros || 0,
                    desconto: p.valor_desconto || 0,
                    final: p.valor_final || 0,
                }))
            })
            break

        case 'consolidated_multi_company': {
            const totalConsolidado = (data.companies || []).reduce(
                (s: number, c: any) => s + (c.totalValue || 0), 0
            )
            const totalPagoConsolidado = (data.companies || []).reduce(
                (s: number, c: any) => s + (c.totalPaid || 0), 0
            )
            const totalPendenteConsolidado = (data.companies || []).reduce(
                (s: number, c: any) => s + (c.totalPending || 0), 0
            )
            blob = await generateGenericExcel({
                title: 'Consolidado Multi-Empresa',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Empresas', value: (data.companies || []).length },
                    { label: 'Valor Total', value: formatCurrency(totalConsolidado) },
                    { label: 'Valor Pago', value: formatCurrency(totalPagoConsolidado) },
                    { label: 'Valor Pendente', value: formatCurrency(totalPendenteConsolidado) },
                ],
                columns: [
                    { header: 'Empresa', key: 'empresa', width: 30 },
                    { header: 'Total Contas', key: 'qtd', width: 15 },
                    { header: 'Valor Total', key: 'total', width: 20 },
                    { header: 'Pago', key: 'pago', width: 20 },
                    { header: 'Pendente', key: 'pendente', width: 20 },
                    { header: '% do Total', key: 'pct', width: 14 },
                ],
                data: (data.companies || []).map((c: any) => ({
                    empresa: c.empresa?.nome_fantasia || c.empresa?.razao_social || 'Sem Empresa',
                    qtd: Array.isArray(c.accounts) ? c.accounts.length : 0,
                    total: c.totalValue || 0,
                    pago: c.totalPaid || 0,
                    pendente: c.totalPending || 0,
                    pct: totalConsolidado > 0 ? `${((c.totalValue || 0) / totalConsolidado * 100).toFixed(1)}%` : '0%',
                }))
            })
            break
        }

        case 'tax_obligations': {
            const taxTotal = (data.obligations || []).reduce((s: number, c: any) => s + (c.valor_total || 0), 0)
            blob = await generateGenericExcel({
                title: 'Obrigações Fiscais',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Registros', value: (data.obligations || []).length },
                    { label: 'Valor Total', value: formatCurrency(taxTotal) },
                ],
                columns: [
                    { header: 'Data Emissão', key: 'emissao', width: 14 },
                    { header: 'Descrição', key: 'descricao', width: 28 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 22 },
                    { header: 'Categoria', key: 'categoria', width: 18 },
                    { header: 'Valor Total', key: 'valor', width: 16 },
                ],
                data: (data.obligations || []).map((c: any) => ({
                    emissao: formatDate(c.data_emissao),
                    descricao: c.descricao || '-',
                    fornecedor: c.fornecedores?.nome || '-',
                    categoria: c.tipos_despesa?.nome || '-',
                    valor: c.valor_total || 0,
                }))
            })
            break
        }

        case 'payment_audit':
            blob = await generateGenericExcel({
                title: 'Auditoria de Pagamentos',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Pagamentos', value: data.totals?.count || 0 },
                    { label: 'Valor Total Pago', value: formatCurrency(data.totals?.value || 0) },
                ],
                columns: [
                    { header: 'Data Pagamento', key: 'data', width: 14 },
                    { header: 'Descrição', key: 'descricao', width: 28 },
                    { header: 'Favorecido', key: 'favorecido', width: 22 },
                    { header: 'CPF/CNPJ', key: 'documento', width: 18 },
                    { header: 'Empresa', key: 'empresa', width: 20 },
                    { header: 'Banco', key: 'banco', width: 16 },
                    { header: 'Valor Pago', key: 'valor', width: 16 },
                ],
                data: (data.auditLogs || []).map((p: any) => ({
                    data: formatDate(p.data_pagamento),
                    descricao: p.contas?.descricao || '-',
                    favorecido: p.contas?.fornecedores?.nome || '-',
                    documento: p.contas?.fornecedores?.cnpj_cpf || '-',
                    empresa: p.contas?.empresas?.nome_fantasia || '-',
                    banco: p.contas?.bancos?.nome || '-',
                    valor: p.valor_final || 0,
                }))
            })
            break

        case 'cash_flow_statement': {
            const cfsTotal = (data.accounts || []).reduce((s: number, a: any) => s + (a.total || 0), 0)
            blob = await generateGenericExcel({
                title: 'Demonstrativo por Fluxo de Caixa',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Receitas', value: formatCurrency(data.totals?.receitas || 0) },
                    { label: 'Despesas', value: formatCurrency(data.totals?.despesas || 0) },
                    { label: 'Resultado', value: formatCurrency((data.totals?.receitas || 0) - (data.totals?.despesas || 0)) },
                ],
                columns: [
                    { header: 'Código', key: 'codigo', width: 12 },
                    { header: 'Descrição', key: 'descricao', width: 35 },
                    { header: 'Tipo', key: 'tipo', width: 12 },
                    { header: 'Nível', key: 'nivel', width: 8 },
                    { header: 'Valor', key: 'valor', width: 18 },
                ],
                data: (data.accounts || []).filter((a: any) => a.total > 0).map((a: any) => ({
                    codigo: a.codigo || '-',
                    descricao: a.descricao || '-',
                    tipo: a.tipo || '-',
                    nivel: a.nivel || 1,
                    valor: a.total || 0,
                }))
            })
            break
        }

        default:
            throw new Error(`Gerador de Excel não implementado para: ${config.reportType}`)
    }

    // Download blob
    downloadBlob(blob, getReportFilename(config, 'xlsx'))
}

/**
 * Generates and downloads a CSV report
 */
async function exportCSV(data: any, config: ExportConfig) {
    const reportTypeStr = String(config.reportType)

    let csvData: any[]
    let headers: string[]

    switch (reportTypeStr) {
        case 'monthly_detailed':
            const isInstallmentViewCSV = config.viewMode === ViewMode.BY_INSTALLMENT
            let csvItems: any[] = []

            if (isInstallmentViewCSV) {
                csvItems = data.contas.flatMap((conta: any) => {
                    return (conta.parcelas || []).map((p: any) => ({
                        ...p,
                        conta_descricao: conta.descricao,
                        fornecedor_nome: conta.fornecedores?.nome,
                        categoria_nome: conta.tipos_despesa?.nome,
                        parcela_info: `${p.numero_parcela}/${conta.total_parcelas}`
                    }))
                })
                csvItems.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
            } else {
                csvItems = data.contas.map((conta: any) => ({
                    ...conta,
                    conta_descricao: conta.descricao,
                    fornecedor_nome: conta.fornecedores?.nome,
                    categoria_nome: conta.tipos_despesa?.nome,
                    parcela_info: `${conta.parcela_atual || 0}/${conta.total_parcelas || 0}`,
                    valor_final: conta.valor_total,
                    data_vencimento: conta.proxima_parcela?.data_vencimento
                }))
            }

            // Define available columns matching DEFAULT_ACCOUNT_COLUMNS ids
            const csvAvailableCols: Record<string, any> = {
                'descricao': { header: 'Descrição', key: 'conta_descricao' },
                'fornecedor': { header: 'Fornecedor', key: 'fornecedor_nome' },
                'categoria': { header: 'Categoria', key: 'categoria_nome' },
                'valor_final': { header: 'Valor', key: 'valor_final' },
                'numero_parcela': { header: 'Parcela', key: 'parcela_info' },
                'status': { header: 'Status', key: 'status' },
                'data_vencimento': { header: 'Vencimento', key: 'data_vencimento' },
                'data_pagamento': { header: 'Pagamento', key: 'data_pagamento' },
            }

            // Select columns
            let csvColumns: any[] = []
            if (config.columns?.selectedColumns && config.columns.selectedColumns.length > 0) {
                csvColumns = config.columns.selectedColumns
                    .map(colId => csvAvailableCols[colId])
                    .filter(Boolean)
            }

            // Default columns
            if (csvColumns.length === 0) {
                csvColumns = [
                    csvAvailableCols['descricao'],
                    csvAvailableCols['fornecedor'],
                    csvAvailableCols['categoria'],
                    csvAvailableCols['valor_final'],
                    csvAvailableCols['numero_parcela'],
                    csvAvailableCols['status'],
                    csvAvailableCols['data_vencimento']
                ]
            }

            headers = csvColumns.map(c => c.header)
            csvData = csvItems.map(item => {
                const mapped: any = {}
                csvColumns.forEach(col => {
                    let val = item[col.key]
                    // Format values for CSV? Usually raw is better, but consistency with "view" might key
                    // Let's format dates at least
                    if (col.key === 'data_vencimento' || col.key === 'data_pagamento') val = val ? formatDate(val) : '-'
                    // Maybe numeric values should be kept as numbers for CSV? Or formatted?
                    // Standard CSV export usually keeps raw numbers. But user asked for "Description, Supplier..." in view.
                    // Let's keep it simple.
                    mapped[col.header] = val
                })
                return mapped
            })
            break

        case 'supplier_consolidated':
            headers = ['Fornecedor', 'Contas', 'Total', 'Pago', 'Pendente']
            csvData = data.suppliers.map((s: any) => ({
                fornecedor: s.supplier.nome || 'Sem Fornecedor',
                contas: s.accounts.length,
                total: s.totalValue,
                pago: s.totalPaid,
                pendente: s.totalPending,
            }))
            break

        case 'category_analysis':
            headers = ['Categoria', 'Contas', 'Valor Total', 'Valor Pago', 'Valor Pendente']
            csvData = data.categories.map((c: any) => ({
                categoria: c.category.nome,
                contas: c.count,
                valor_total: c.totalValue,
                valor_pago: c.totalPaid,
                valor_pendente: c.totalPending,
            }))
            break

        case 'cash_flow_projection': {
            headers = ['Mês', 'Parcelas', 'Valor', 'Saldo Acumulado']
            let csvSaldo = 0
            csvData = (data.projection || []).map((p: any) => {
                csvSaldo += (p.totalValue || 0)
                return {
                    mes: p.month || '-',
                    parcelas: p.count || 0,
                    valor: p.totalValue || 0,
                    saldo_acumulado: csvSaldo,
                }
            })
            break
        }

        case 'overdue_report':
            headers = ['Vencimento', 'Dias Atraso', 'Descrição', 'Fornecedor', 'Valor', 'Status']
            csvData = (data.overdue || []).map((i: any) => ({
                vencimento: formatDate(i.data_vencimento),
                dias_atraso: i.daysOverdue || 0,
                descricao: i.contas?.descricao || '-',
                fornecedor: i.contas?.fornecedores?.nome || '-',
                valor: i.valor_final || 0,
                status: i.status || '-',
            }))
            break

        case 'accounting_statement': { // DRE
            headers = ['Código', 'Nível', 'Tipo', 'Descrição', 'Valor']
            const csvDreRows: any[] = []
            const flattenForCsv = (nodes: any[]) => {
                const sorted = [...nodes].sort((a: any, b: any) =>
                    (a.codigo || '').localeCompare(b.codigo || '')
                )
                sorted.forEach((node: any) => {
                    const hasChildren = node.children && node.children.length > 0
                    if (node.total > 0 || hasChildren) {
                        csvDreRows.push({
                            codigo: node.codigo || '000',
                            nivel: node.nivel || 1,
                            tipo: hasChildren ? 'Sintética' : 'Analítica',
                            descricao: node.descricao || 'Sem Descrição',
                            valor: hasChildren ? node.total : node.valor,
                        })
                    }
                    if (hasChildren) flattenForCsv(node.children)
                })
            }
            if (data.statement) flattenForCsv(data.statement)
            csvData = csvDreRows
            break
        }

        case 'financial_performance':
            headers = ['Data', 'Valor']
            csvData = (data.trend || []).map((t: any) => ({
                data: formatDate(t.date),
                valor: t.value || 0,
            }))
            break

        case 'analytical_ledger': {
            headers = ['Data', 'Código', 'Conta Contábil', 'Histórico', 'Fornecedor', 'Débito', 'Crédito']
            const csvLedgerRows: any[] = []
                ; (data.ledger || []).forEach((group: any) => {
                    const codigo = group.plano_conta?.codigo || '000'
                    const contaName = group.plano_conta?.descricao || 'Sem Classificação'
                        ; (group.items || []).forEach((item: any) => {
                            csvLedgerRows.push({
                                data: formatDate(item.data_emissao),
                                codigo,
                                conta: contaName,
                                historico: item.descricao || 'Sem descrição',
                                fornecedor: item.fornecedores?.nome || '-',
                                debito: item.valor_final || 0,
                                credito: 0,
                            })
                        })
                })
            csvData = csvLedgerRows
            break
        }

        case 'trial_balance': {
            headers = ['Código', 'Conta', 'Saldo Anterior', 'Débitos', 'Créditos', 'Saldo Final']
            const csvBalanceRows = (data.balances || []).filter((b: any) =>
                b.previousBalance !== 0 || b.debits !== 0 || b.credits !== 0 || b.finalBalance !== 0
            )
            csvData = csvBalanceRows.map((b: any) => ({
                codigo: b.account?.codigo || '-',
                conta: b.account?.descricao || 'Indefinido',
                saldo_anterior: b.previousBalance || 0,
                debitos: b.debits || 0,
                creditos: b.credits || 0,
                saldo_final: b.finalBalance || 0,
            }))
            break
        }

        case 'interest_discount':
            headers = ['Descrição', 'Fornecedor', 'Categoria', 'Vencimento', 'Pagamento', 'Valor Original', 'Juros', 'Desconto', 'Valor Final']
            csvData = (data.items || []).map((p: any) => ({
                descricao: p.contas?.descricao || '-',
                fornecedor: p.contas?.fornecedores?.nome || '-',
                categoria: p.contas?.tipos_despesa?.nome || '-',
                vencimento: formatDate(p.data_vencimento),
                pagamento: formatDate(p.data_pagamento),
                valor_original: p.valor_original || 0,
                juros: p.valor_juros || 0,
                desconto: p.valor_desconto || 0,
                valor_final: p.valor_final || 0,
            }))
            break

        case 'consolidated_multi_company':
            headers = ['Empresa', 'Total Contas', 'Valor Total', 'Valor Pago', 'Valor Pendente']
            csvData = (data.companies || []).map((c: any) => ({
                empresa: c.empresa?.nome_fantasia || c.empresa?.razao_social || 'Sem Empresa',
                total_contas: Array.isArray(c.accounts) ? c.accounts.length : 0,
                valor_total: c.totalValue || 0,
                valor_pago: c.totalPaid || 0,
                valor_pendente: c.totalPending || 0,
            }))
            break

        case 'tax_obligations':
            headers = ['Data Emissão', 'Descrição', 'Fornecedor', 'Categoria', 'Valor Total']
            csvData = (data.obligations || []).map((c: any) => ({
                data_emissao: formatDate(c.data_emissao),
                descricao: c.descricao || '-',
                fornecedor: c.fornecedores?.nome || '-',
                categoria: c.tipos_despesa?.nome || '-',
                valor_total: c.valor_total || 0,
            }))
            break

        case 'payment_audit':
            headers = ['Data Pagamento', 'Descrição', 'Favorecido', 'CPF/CNPJ', 'Empresa', 'Banco', 'Valor Pago']
            csvData = (data.auditLogs || []).map((p: any) => ({
                data_pagamento: formatDate(p.data_pagamento),
                descricao: p.contas?.descricao || '-',
                favorecido: p.contas?.fornecedores?.nome || '-',
                cpf_cnpj: p.contas?.fornecedores?.cnpj_cpf || '-',
                empresa: p.contas?.empresas?.nome_fantasia || '-',
                banco: p.contas?.bancos?.nome || '-',
                valor_pago: p.valor_final || 0,
            }))
            break

        case 'cash_flow_statement':
            headers = ['Código', 'Descrição', 'Tipo', 'Nível', 'Valor']
            csvData = (data.accounts || []).filter((a: any) => a.total > 0).map((a: any) => ({
                codigo: a.codigo || '-',
                descricao: a.descricao || '-',
                tipo: a.tipo || '-',
                nivel: a.nivel || 1,
                valor: a.total || 0,
            }))
            break

        default:
            throw new Error(`Gerador de CSV não implementado para: ${config.reportType}`)
    }

    const blob = generateCSV(csvData, headers)
    downloadBlob(blob, getReportFilename(config, 'csv'))
}

/**
 * Helper to download a blob
 */
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Generates a filename forthe exported report
 */
function getReportFilename(config: ExportConfig, extension: string): string {
    const reportNames: Record<string, string> = {
        monthly_detailed: 'relatorio-mensal',
        supplier_consolidated: 'consolidado-fornecedor',
        category_analysis: 'analise-categoria',
        cash_flow_projection: 'projecao-fluxo-caixa',
        overdue_report: 'contas-vencidas',
        accounting_statement: 'dre',
        analytical_ledger: 'razao-analitico',
        trial_balance: 'balancete',
        tax_obligations: 'obrigacoes-fiscais',
        financial_performance: 'performance-financeira',
        interest_discount: 'juros-descontos',
        consolidated_multi_company: 'consolidado-multi-empresa',
        payment_audit: 'auditoria-pagamentos',
        cash_flow_statement: 'demonstrativo-caixa',
    }

    const reportName = reportNames[String(config.reportType)] || 'relatorio'
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    return `${reportName}-${timestamp}.${extension}`
}
