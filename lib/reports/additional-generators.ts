import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import {
    generateReportHeader,
    generateReportFooter,
    generateTable,
    generateSummarySection,
    formatCurrency,
    formatDate,
    formatPercent,
    getDefaultDocumentDefinition,
    generateAlertBox,
    generateAgingTable,
    generateKPISection,
    REPORT_COLORS,
    type TableColumn,
    type ReportHeaderOptions,
} from './pdf-helpers'
import type { ExportConfig } from './types'

// Additional PDF generators for Phase 3

interface CategoryAnalysisData {
    categories: Array<{
        category: { nome: string }
        accounts: any[]
        totalValue: number
        totalPaid: number
        totalPending: number
        count: number
    }>
    totals: any
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Category Analysis Report
 */
export function generateCategoryAnalysisPDF(
    data: CategoryAnalysisData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Análise por Categoria',
        subtitle: 'Distribuição de Despesas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Summary
    const summaryItems = [
        { label: 'Total de Categorias', value: data.categories.length },
        { label: 'Total de Contas', value: data.totals.totalAccounts },
        { label: 'Valor Total', value: formatCurrency(data.totals.totalValue), highlight: true },
        { label: 'Valor Pago', value: formatCurrency(data.totals.totalPaid) },
        { label: 'Valor Pendente', value: formatCurrency(data.totals.totalPending) },
    ]
    const summarySection = generateSummarySection('Resumo Geral', summaryItems)
    content.push(...(Array.isArray(summarySection) ? summarySection : [summarySection]))

    // Category table
    content.push({
        text: 'Análise por Categoria',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const tableData = data.categories.map((c) => ({
        categoria: c.category.nome || 'Sem Categoria',
        contas: c.count,
        total: formatCurrency(c.totalValue),
        pago: formatCurrency(c.totalPaid),
        pendente: formatCurrency(c.totalPending),
        percentual: formatPercent((c.totalValue / data.totals.totalValue) * 100),
    }))

    const columns: TableColumn[] = [
        { header: 'Categoria', dataKey: 'categoria', width: '*', alignment: 'left' },
        { header: 'Contas', dataKey: 'contas', width: 50, alignment: 'center' },
        { header: 'Total', dataKey: 'total', width: 80, alignment: 'right' },
        { header: 'Pago', dataKey: 'pago', width: 80, alignment: 'right' },
        { header: 'Pendente', dataKey: 'pendente', width: 80, alignment: 'right' },
        { header: '%', dataKey: 'percentual', width: 50, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns))

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'portrait',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: config.format.pdf?.includePageNumbers
            ? (currentPage, pageCount) => generateReportFooter(currentPage, pageCount)
            : undefined,
    } as TDocumentDefinitions
}

interface DREData {
    revenues: Array<{ descricao: string; valor: number }>
    expenses: Array<{ categoria: string; valor: number }>
    summary: {
        totalRevenues: number
        totalExpenses: number
        netResult: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for DRE (Demonstrativo de Resultados)
 */
export function generateDREPDF(
    data: DREData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'DRE - Demonstrativo de Resultados do Exercício',
        subtitle: 'Relatório Contábil',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Revenues
    content.push({
        text: 'Receitas',
        style: 'sectionTitle',
        margin: [0, 15, 0, 10] as [number, number, number, number],
    })

    if (data.revenues && data.revenues.length > 0) {
        const revenueTable = data.revenues.map((r) => ({
            descricao: r.descricao,
            valor: formatCurrency(r.valor),
        }))

        const columns: TableColumn[] = [
            { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
            { header: 'Valor', dataKey: 'valor', width: 120, alignment: 'right' },
        ]

        content.push(generateTable(revenueTable, columns))
    }

    // Total Revenues
    content.push({
        columns: [
            { text: 'Total de Receitas', bold: true, fontSize: 11, width: '*' },
            {
                text: formatCurrency(data.summary.totalRevenues),
                bold: true,
                fontSize: 11,
                alignment: 'right' as const,
                width: 120
            },
        ],
        margin: [0, 10, 0, 20] as [number, number, number, number],
    })

    // Expenses
    content.push({
        text: 'Despesas',
        style: 'sectionTitle',
        margin: [0, 10, 0, 10] as [number, number, number, number],
    })

    if (data.expenses && data.expenses.length > 0) {
        const expenseTable = data.expenses.map((e) => ({
            categoria: e.categoria,
            valor: formatCurrency(e.valor),
        }))

        const columns: TableColumn[] = [
            { header: 'Categoria', dataKey: 'categoria', width: '*', alignment: 'left' },
            { header: 'Valor', dataKey: 'valor', width: 120, alignment: 'right' },
        ]

        content.push(generateTable(expenseTable, columns))
    }

    // Total Expenses
    content.push({
        columns: [
            { text: 'Total de Despesas', bold: true, fontSize: 11, width: '*' },
            {
                text: formatCurrency(data.summary.totalExpenses),
                bold: true,
                fontSize: 11,
                alignment: 'right' as const,
                width: 120,
                color: data.summary.totalExpenses > 0 ? '#dc2626' : undefined
            },
        ],
        margin: [0, 10, 0, 30] as [number, number, number, number],
    })

    // Net Result
    const isNegative = data.summary.netResult < 0
    content.push({
        columns: [
            {
                text: 'Resultado Líquido',
                bold: true,
                fontSize: 13,
                width: '*',
                color: '#1f2937'
            },
            {
                text: formatCurrency(data.summary.netResult),
                bold: true,
                fontSize: 13,
                alignment: 'right' as const,
                width: 120,
                color: isNegative ? '#dc2626' : '#059669'
            },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
        fillColor: '#f3f4f6',
        padding: [10, 10, 10, 10] as [number, number, number, number],
    })

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'portrait',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: config.format.pdf?.includePageNumbers
            ? (currentPage, pageCount) => generateReportFooter(currentPage, pageCount)
            : undefined,
    } as TDocumentDefinitions
}

interface FinancialPerformanceData {
    metrics: {
        paymentOnTime: number
        latePayments: number
        averageDelay: number
        cashFlowHealth: string
    }
    timeline: Array<{
        month: string
        paid: number
        pending: number
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Financial Performance Report
 */
export function generateFinancialPerformancePDF(
    data: FinancialPerformanceData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Performance Financeira',
        subtitle: 'Indicadores e Métricas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // KPIs
    const kpiItems = [
        { label: 'Pagamentos em Dia', value: `${data.metrics.paymentOnTime}%`, highlight: true },
        { label: 'Pagamentos Atrasados', value: `${data.metrics.latePayments}%` },
        { label: 'Atraso Médio (dias)', value: data.metrics.averageDelay.toFixed(1) },
        { label: 'Saúde do Fluxo de Caixa', value: data.metrics.cashFlowHealth },
    ]
    const summary = generateSummarySection('Indicadores Principais', kpiItems)
    content.push(...(Array.isArray(summary) ? summary : [summary]))

    // Timeline
    if (data.timeline && data.timeline.length > 0) {
        content.push({
            text: 'Evolução Temporal',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })

        const timelineTable = data.timeline.map((t) => ({
            mês: t.month,
            pago: formatCurrency(t.paid),
            pendente: formatCurrency(t.pending),
        }))

        const columns: TableColumn[] = [
            { header: 'Mês', dataKey: 'mês', width: '*', alignment: 'left' },
            { header: 'Pago', dataKey: 'pago', width: 100, alignment: 'right' },
            { header: 'Pendente', dataKey: 'pendente', width: 100, alignment: 'right' },
        ]

        content.push(generateTable(timelineTable, columns))
    }

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'portrait',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: config.format.pdf?.includePageNumbers
            ? (currentPage, pageCount) => generateReportFooter(currentPage, pageCount)
            : undefined,
    } as TDocumentDefinitions
}

interface CashFlowProjectionData {
    projection: Array<{
        date: string
        receita: number
        despesa: number
        saldo_acumulado: number
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Cash Flow Projection Report
 */
export function generateCashFlowProjectionPDF(
    data: CashFlowProjectionData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Projeção de Fluxo de Caixa',
        subtitle: 'Previsão de Entradas e Saídas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Summary
    const summaryItems = [
        { label: 'Total Projetado', value: formatCurrency(data.projection.reduce((sum, p) => sum + (p.receita - p.despesa), 0)), highlight: true },
        { label: 'Entradas Previstas', value: formatCurrency(data.projection.reduce((sum, p) => sum + p.receita, 0)) },
        { label: 'Saídas Previstas', value: formatCurrency(data.projection.reduce((sum, p) => sum + p.despesa, 0)) },
    ]
    const summarySection = generateSummarySection('Resumo da Projeção', summaryItems)
    content.push(...(Array.isArray(summarySection) ? summarySection : [summarySection]))

    // Projection table
    content.push({
        text: 'Detalhamento Diário',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const tableData = data.projection.map((p) => ({
        data: formatDate(p.date), // Using p.date because in report-generators logic it seems to expect a string date
        receita: formatCurrency(p.receita),
        despesa: formatCurrency(p.despesa),
        saldo: formatCurrency(p.saldo_acumulado),
        status: p.saldo_acumulado < 0 ? 'Negativo' : 'Positivo'
    }))

    const columns: TableColumn[] = [
        { header: 'Data', dataKey: 'data', width: 80, alignment: 'center' },
        { header: 'Entradas', dataKey: 'receita', width: 100, alignment: 'right' },
        { header: 'Saídas', dataKey: 'despesa', width: 100, alignment: 'right' },
        { header: 'Saldo Acumulado', dataKey: 'saldo', width: 100, alignment: 'right' },
        { header: 'Status', dataKey: 'status', width: 80, alignment: 'center' },
    ]

    content.push(generateTable(tableData, columns))

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'portrait',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: config.format.pdf?.includePageNumbers
            ? (currentPage, pageCount) => generateReportFooter(currentPage, pageCount)
            : undefined,
    } as TDocumentDefinitions
}

interface OverdueReportData {
    items: Array<{
        data_vencimento: string
        descricao: string
        fornecedores?: { nome: string }
        valor_final: number
        dias_atraso: number
        valor_corrigido: number
    }>
    totals: {
        count: number
        totalOriginal: number
        totalCorrected: number
        totalInterest: number
        totalPenalty: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Overdue Report
 * Enhanced with aging analysis, KPIs, and professional design
 */
export function generateOverdueReportPDF(
    data: OverdueReportData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Relatório de Contas Vencidas',
        subtitle: 'Análise de Inadimplência e Aging',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
        reportStyle: 'professional',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // Calculate aging analysis
    const agingData = {
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
    }

    data.items.forEach(item => {
        const dias = item.dias_atraso || 0
        const valor = item.valor_final || 0
        if (dias <= 0) agingData.current += valor
        else if (dias <= 30) agingData.days30 += valor
        else if (dias <= 60) agingData.days60 += valor
        else agingData.days90Plus += valor
    })

    // Critical Alert if high overdue amount
    const criticalThreshold = data.totals.totalOriginal * 0.3
    if (agingData.days90Plus > criticalThreshold) {
        content.push(generateAlertBox(
            `⚠️ ATENÇÃO: ${formatCurrency(agingData.days90Plus)} em contas vencidas há mais de 90 dias (${((agingData.days90Plus / data.totals.totalOriginal) * 100).toFixed(1)}% do total)`,
            'danger'
        ))
    }

    // KPIs Section
    content.push(generateKPISection([
        {
            label: 'Total Vencido',
            value: formatCurrency(data.totals.totalOriginal),
            subtext: `${data.totals.count} contas`,
            color: REPORT_COLORS.danger
        },
        {
            label: 'Encargos Estimados',
            value: formatCurrency(data.totals.totalInterest + data.totals.totalPenalty),
            subtext: 'multa + juros',
            color: REPORT_COLORS.warning
        },
        {
            label: 'Valor Corrigido',
            value: formatCurrency(data.totals.totalCorrected),
            subtext: 'total atualizado',
            color: REPORT_COLORS.textPrimary
        },
    ]))

    // Aging Analysis Section
    content.push({
        text: '📊 Análise de Aging (Antiguidade)',
        style: 'sectionTitle',
        margin: [0, 10, 0, 10] as [number, number, number, number],
    })
    content.push(generateAgingTable(agingData))

    // Overdue Items Table
    content.push({
        text: '📋 Detalhamento de Contas Vencidas',
        style: 'sectionTitle',
        margin: [0, 15, 0, 10] as [number, number, number, number],
    })

    // Sort by days overdue (most critical first)
    const sortedItems = [...data.items].sort((a, b) => (b.dias_atraso || 0) - (a.dias_atraso || 0))

    const tableData = sortedItems.map((item) => {
        const dias = item.dias_atraso || 0
        let urgencyIcon = ''
        if (dias > 90) urgencyIcon = '🔴'
        else if (dias > 60) urgencyIcon = '🟠'
        else if (dias > 30) urgencyIcon = '🟡'
        else urgencyIcon = '🟢'

        return {
            urgencia: urgencyIcon,
            vencimento: formatDate(item.data_vencimento),
            dias: dias,
            descricao: item.descricao?.substring(0, 35) + (item.descricao?.length > 35 ? '...' : ''),
            fornecedor: item.fornecedores?.nome?.substring(0, 20) || 'N/A',
            valor: formatCurrency(item.valor_final),
            encargos: formatCurrency((item.valor_corrigido || item.valor_final) - item.valor_final),
            valor_corr: formatCurrency(item.valor_corrigido || item.valor_final),
        }
    })

    const columns: TableColumn[] = [
        { header: '!', dataKey: 'urgencia', width: 20, alignment: 'center' },
        { header: 'Vencimento', dataKey: 'vencimento', width: 65, alignment: 'center' },
        { header: 'Dias', dataKey: 'dias', width: 35, alignment: 'center' },
        { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
        { header: 'Fornecedor', dataKey: 'fornecedor', width: 90, alignment: 'left' },
        { header: 'Valor Orig.', dataKey: 'valor', width: 70, alignment: 'right' },
        { header: 'Encargos', dataKey: 'encargos', width: 60, alignment: 'right' },
        { header: 'Valor Atual', dataKey: 'valor_corr', width: 70, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns, { headerBgColor: REPORT_COLORS.danger }))

    // Legend
    content.push({
        text: 'Legenda: 🔴 +90 dias  🟠 61-90 dias  🟡 31-60 dias  🟢 1-30 dias',
        fontSize: 8,
        color: REPORT_COLORS.textMuted,
        margin: [0, 5, 0, 0] as [number, number, number, number],
    })

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'landscape',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: config.format.pdf?.includePageNumbers
            ? (currentPage, pageCount) => generateReportFooter(currentPage, pageCount)
            : undefined,
    } as TDocumentDefinitions
}
