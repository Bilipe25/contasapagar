'use client'

import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatCurrency, formatDate } from './pdf-helpers'
import { generateMonthlyDetailedPDF, generateSupplierConsolidatedPDF } from './report-generators'
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
            docDefinition = generateMonthlyDetailedPDF(data, config)
            break

        case 'supplier_consolidated':
            docDefinition = generateSupplierConsolidatedPDF(data, config)
            break

        case 'category_analysis':
            docDefinition = generateCategoryAnalysisPDF(data, config)
            break

        case 'accounting_statement':
            // Map tree structure to simple DRE format
            // reports.ts returns 'statement' which is a tree.
            // valid DRE separates Revenues and Expenses. Since this is AP (Contas a Pagar), mostly Expenses.
            const dreData = {
                period: data.period,
                revenues: [], // No revenue data in AP module usually
                expenses: [],
                summary: {
                    totalRevenues: 0,
                    totalExpenses: 0,
                    netResult: 0
                }
            }

            // Flatten tree for expenses
            const traverseTree = (nodes: any[], target: any[]) => {
                nodes.forEach(node => {
                    if (node.valor > 0) { // Only show active accounts
                        target.push({
                            categoria: node.descricao,
                            valor: node.total // Use calculated total
                        });
                    }
                    if (node.children && node.children.length > 0) {
                        traverseTree(node.children, target);
                    }
                })
            }

            if (data.statement) {
                traverseTree(data.statement, dreData.expenses)
                // Remove duplicates if tree traversal added parents and children? 
                // Actually reports.ts 'total' includes children. 
                // For a flat list, we probably only want leaves or top level?
                // additional-generators.ts just lists them.
                // Let's use top level roots for simplicity.
                dreData.expenses = data.statement.map((root: any) => ({
                    categoria: root.descricao,
                    valor: root.total
                }))
            }

            dreData.summary.totalExpenses = dreData.expenses.reduce((sum: number, e: any) => sum + e.valor, 0)
            dreData.summary.netResult = -dreData.summary.totalExpenses

            docDefinition = generateDREPDF(dreData, config)
            break

        case 'financial_performance':
            // Map available metrics to required structure
            const financialData = {
                period: data.period,
                metrics: {
                    paymentOnTime: 0, // Not available in current query
                    latePayments: 0, // Not available
                    averageDelay: 0, // Not available
                    cashFlowHealth: 'N/A'
                },
                timeline: (data.trend || []).map((t: any) => ({
                    month: formatDate(t.date).substring(3), // dd/MM/yyyy -> MM/yyyy
                    paid: t.value || 0, // Assuming all emitted were paid/will be paid involved
                    pending: 0
                }))
            }
            docDefinition = generateFinancialPerformancePDF(financialData, config)
            break

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
                accounts: (data.balances || []).map((b: any) => {
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

        case 'financial_performance':
            docDefinition = generateFinancialPerformancePDF(data, config)
            break

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

        case 'cash_flow_projection':
            blob = await generateGenericExcel({
                title: 'Projeção de Fluxo de Caixa',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Projetado', value: formatCurrency(data.totals?.totalProjected || 0) },
                ],
                columns: [
                    { header: 'Data', key: 'date', width: 15 },
                    { header: 'Entradas', key: 'receita', width: 20 },
                    { header: 'Saídas', key: 'despesa', width: 20 },
                    { header: 'Saldo Acumulado', key: 'saldo', width: 20 },
                ],
                data: data.projection.map((p: any) => ({
                    date: formatDate(p.date),
                    receita: p.receita,
                    despesa: p.despesa,
                    saldo: p.saldo_acumulado,
                }))
            })
            break

        case 'overdue_report':
            blob = await generateGenericExcel({
                title: 'Relatório de Contas Vencidas',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Contas', value: data.totals.count },
                    { label: 'Valor Corrigido', value: formatCurrency(data.totals.totalCorrected) },
                ],
                columns: [
                    { header: 'Vencimento', key: 'vencimento', width: 15 },
                    { header: 'Dias Atraso', key: 'dias', width: 10 },
                    { header: 'Descrição', key: 'descricao', width: 30 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 25 },
                    { header: 'Valor Original', key: 'valor', width: 20 },
                    { header: 'Encargos', key: 'encargos', width: 15 },
                    { header: 'Valor Corrigido', key: 'valor_corr', width: 20 },
                ],
                data: data.items.map((i: any) => ({
                    vencimento: formatDate(i.data_vencimento),
                    dias: i.dias_atraso,
                    descricao: i.descricao,
                    fornecedor: i.fornecedores?.nome || 'N/A',
                    valor: i.valor_final,
                    encargos: (i.valor_corrigido || i.valor_final) - i.valor_final,
                    valor_corr: i.valor_corrigido || i.valor_final,
                }))
            })
            break

        case 'accounting_statement': // DRE
            const dreData = [
                ...(data.revenues || []).map((r: any) => ({ tipo: 'Receita', descricao: r.descricao, valor: r.valor })),
                ...(data.expenses || []).map((e: any) => ({ tipo: 'Despesa', descricao: e.categoria, valor: e.valor * -1 }))
            ]
            blob = await generateGenericExcel({
                title: 'DRE - Demonstrativo de Resultados',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Resultado Líquido', value: formatCurrency(data.summary.netResult) },
                ],
                columns: [
                    { header: 'Tipo', key: 'tipo', width: 15 },
                    { header: 'Descrição', key: 'descricao', width: 40 },
                    { header: 'Valor', key: 'valor', width: 20 },
                ],
                data: dreData
            })
            break

        case 'financial_performance':
            blob = await generateGenericExcel({
                title: 'Performance Financeira',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Pagamentos em Dia', value: `${data.metrics.paymentOnTime}%` },
                    { label: 'Atraso Médio', value: `${data.metrics.averageDelay.toFixed(1)} dias` },
                ],
                columns: [
                    { header: 'Mês', key: 'month', width: 20 },
                    { header: 'Total Pago', key: 'paid', width: 20 },
                    { header: 'Total Pendente', key: 'pending', width: 20 },
                ],
                data: data.timeline.map((t: any) => ({
                    month: t.month,
                    paid: t.paid,
                    pending: t.pending,
                }))
            })
            break

        case 'analytical_ledger':
            blob = await generateGenericExcel({
                title: 'Razão Analítico',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total de Registros', value: data.records.length },
                ],
                columns: [
                    { header: 'Data', key: 'data', width: 15 },
                    { header: 'Conta', key: 'conta', width: 25 },
                    { header: 'Histórico', key: 'historico', width: 40 },
                    { header: 'Débito', key: 'debito', width: 15 },
                    { header: 'Crédito', key: 'credito', width: 15 },
                ],
                data: data.records.map((r: any) => ({
                    data: formatDate(r.date),
                    conta: r.accountName,
                    historico: r.history,
                    debito: r.type === 'debit' ? r.value : 0,
                    credito: r.type === 'credit' ? r.value : 0,
                }))
            })
            break

        case 'trial_balance':
            blob = await generateGenericExcel({
                title: 'Balancete de Verificação',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [],
                columns: [
                    { header: 'Conta', key: 'conta', width: 30 },
                    { header: 'Saldo Anterior', key: 'anterior', width: 20 },
                    { header: 'Débitos', key: 'debitos', width: 20 },
                    { header: 'Créditos', key: 'creditos', width: 20 },
                    { header: 'Saldo Atual', key: 'atual', width: 20 },
                ],
                data: data.accounts.map((a: any) => ({
                    conta: a.name,
                    anterior: a.previousBalance,
                    debitos: a.debits,
                    creditos: a.credits,
                    atual: a.currentBalance,
                }))
            })
            break

        case 'interest_discount':
            blob = await generateGenericExcel({
                title: 'Relatório de Juros e Descontos',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Juros', value: formatCurrency(data.totals.interest) },
                    { label: 'Total Descontos', value: formatCurrency(data.totals.discounts) },
                ],
                columns: [
                    { header: 'Conta', key: 'conta', width: 30 },
                    { header: 'Fornecedor', key: 'fornecedor', width: 25 },
                    { header: 'Vencimento', key: 'vencimento', width: 15 },
                    { header: 'Pagamento', key: 'pagamento', width: 15 },
                    { header: 'Juros', key: 'juros', width: 15 },
                    { header: 'Multa', key: 'multa', width: 15 },
                    { header: 'Desconto', key: 'desconto', width: 15 },
                    { header: 'Total Pago', key: 'total', width: 15 },
                ],
                data: data.accounts.map((a: any) => ({
                    conta: a.descricao,
                    fornecedor: a.fornecedor,
                    vencimento: formatDate(a.vencimento),
                    pagamento: formatDate(a.pagamento),
                    juros: a.juros,
                    multa: a.multa,
                    desconto: a.desconto,
                    total: a.valor_pago,
                }))
            })
            break

        case 'consolidated_multi_company':
            blob = await generateGenericExcel({
                title: 'Consolidado Multi-Empresa',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Geral', value: formatCurrency(data.totals.grandTotal) },
                ],
                columns: [
                    { header: 'Empresa', key: 'empresa', width: 30 },
                    { header: 'Total Contas', key: 'qtd', width: 15 },
                    { header: 'Valor Total', key: 'total', width: 20 },
                    { header: 'Pago', key: 'pago', width: 20 },
                    { header: 'Pendente', key: 'pendente', width: 20 },
                ],
                data: data.companies.map((c: any) => ({
                    empresa: c.name,
                    qtd: c.count,
                    total: c.totalValue,
                    pago: c.totalPaid,
                    pendente: c.totalPending,
                }))
            })
            break

        case 'tax_obligations':
            blob = await generateGenericExcel({
                title: 'Obrigações Fiscais',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Impostos', value: formatCurrency(data.summary.totalTaxes) },
                ],
                columns: [
                    { header: 'Imposto', key: 'imposto', width: 20 },
                    { header: 'Conta Origem', key: 'conta', width: 30 },
                    { header: 'Vencimento', key: 'vencimento', width: 15 },
                    { header: 'Valor Base', key: 'base', width: 20 },
                    { header: 'Valor Imposto', key: 'valor', width: 20 },
                ],
                data: data.items.map((i: any) => ({
                    imposto: i.taxType,
                    conta: i.sourceAccount,
                    vencimento: formatDate(i.dueDate),
                    base: i.baseAmount,
                    valor: i.taxAmount,
                }))
            })
            break

        case 'payment_audit':
            blob = await generateGenericExcel({
                title: 'Auditoria de Pagamentos',
                period: { startDate: data.period.startDate, endDate: data.period.endDate },
                summary: [
                    { label: 'Total Auditado', value: formatCurrency(data.summary.totalAmount) },
                ],
                columns: [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Conta', key: 'conta', width: 30 },
                    { header: 'Data Pagamento', key: 'data', width: 18 },
                    { header: 'Usuário', key: 'usuario', width: 20 },
                    { header: 'Valor', key: 'valor', width: 20 },
                    { header: 'Ação', key: 'acao', width: 15 },
                ],
                data: data.payments.map((p: any) => ({
                    id: p.id,
                    conta: p.descricao,
                    data: formatDate(p.paymentDate), // Assuming data structure has paymentDate
                    usuario: p.user,
                    valor: p.amount,
                    acao: p.action || 'Pagamento',
                }))
            })
            break

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

        case 'cash_flow_projection':
            headers = ['Data', 'Entradas', 'Saídas', 'Saldo Acumulado']
            csvData = data.projection.map((p: any) => ({
                data: formatDate(p.date),
                entradas: p.receita,
                saidas: p.despesa,
                saldo_acumulado: p.saldo_acumulado,
            }))
            break

        case 'overdue_report':
            headers = ['Vencimento', 'Dias Atraso', 'Descrição', 'Fornecedor', 'Valor Original', 'Encargos', 'Valor Corrigido']
            csvData = data.items.map((i: any) => ({
                vencimento: formatDate(i.data_vencimento),
                dias_atraso: i.dias_atraso,
                descricao: i.descricao,
                fornecedor: i.fornecedores?.nome || 'N/A',
                valor_original: i.valor_final,
                encargos: (i.valor_corrigido || i.valor_final) - i.valor_final,
                valor_corrigido: i.valor_corrigido || i.valor_final,
            }))
            break

        case 'accounting_statement': // DRE
            headers = ['Tipo', 'Descrição', 'Valor']
            csvData = [
                ...(data.revenues || []).map((r: any) => ({ tipo: 'Receita', descricao: r.descricao, valor: r.valor })),
                ...(data.expenses || []).map((e: any) => ({ tipo: 'Despesa', descricao: e.categoria, valor: e.valor * -1 }))
            ]
            break

        case 'financial_performance':
            headers = ['Mês', 'Total Pago', 'Total Pendente']
            csvData = data.timeline.map((t: any) => ({
                mes: t.month,
                total_pago: t.paid,
                total_pendente: t.pending,
            }))
            break

        case 'analytical_ledger':
            headers = ['Data', 'Conta', 'Histórico', 'Débito', 'Crédito']
            csvData = data.records.map((r: any) => ({
                data: formatDate(r.date),
                conta: r.accountName,
                historico: r.history,
                debito: r.type === 'debit' ? r.value : 0,
                credito: r.type === 'credit' ? r.value : 0,
            }))
            break

        case 'trial_balance':
            headers = ['Conta', 'Saldo Anterior', 'Débitos', 'Créditos', 'Saldo Atual']
            csvData = data.accounts.map((a: any) => ({
                conta: a.name,
                saldo_anterior: a.previousBalance,
                debitos: a.debits,
                creditos: a.credits,
                saldo_atual: a.currentBalance,
            }))
            break

        case 'interest_discount':
            headers = ['Conta', 'Fornecedor', 'Vencimento', 'Pagamento', 'Juros', 'Multa', 'Desconto', 'Valor Pago']
            csvData = data.accounts.map((a: any) => ({
                conta: a.descricao,
                fornecedor: a.fornecedor,
                vencimento: formatDate(a.vencimento),
                pagamento: formatDate(a.pagamento),
                juros: a.juros,
                multa: a.multa,
                desconto: a.desconto,
                valor_pago: a.valor_pago,
            }))
            break

        case 'consolidated_multi_company':
            headers = ['Empresa', 'Total Contas', 'Valor Total', 'Valor Pago', 'Valor Pendente']
            csvData = data.companies.map((c: any) => ({
                empresa: c.name,
                total_contas: c.count,
                valor_total: c.totalValue,
                valor_pago: c.totalPaid,
                valor_pendente: c.totalPending,
            }))
            break

        case 'tax_obligations':
            headers = ['Imposto', 'Conta Origem', 'Vencimento', 'Valor Base', 'Valor Imposto']
            csvData = data.items.map((i: any) => ({
                imposto: i.taxType,
                conta_origem: i.sourceAccount,
                vencimento: formatDate(i.dueDate),
                valor_base: i.baseAmount,
                valor_imposto: i.taxAmount,
            }))
            break

        case 'payment_audit':
            headers = ['ID', 'Conta', 'Data Pagamento', 'Usuário', 'Valor', 'Ação']
            csvData = data.payments.map((p: any) => ({
                id: p.id,
                conta: p.descricao,
                data_pagamento: formatDate(p.paymentDate),
                usuario: p.user,
                valor: p.amount,
                acao: p.action || 'Pagamento',
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
    }

    const reportName = reportNames[String(config.reportType)] || 'relatorio'
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    return `${reportName}-${timestamp}.${extension}`
}
