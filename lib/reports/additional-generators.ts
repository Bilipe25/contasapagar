import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import {
    generateReportHeader,
    generateReportFooter,
    generateTable,
    generateSummarySection,
    generateCompactSummaryCards,
    generateTableTotalsRow,
    generateDistributionBars,
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
        subtitle: 'Distribuição de Despesas por Tipo',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
        reportStyle: 'professional',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // KPI Cards compactos
    const totalContas = data.categories.reduce((sum, c) => sum + c.count, 0)
    const paidPercent = data.totals.totalValue > 0
        ? ((data.totals.totalPaid / data.totals.totalValue) * 100).toFixed(1) + '%'
        : '0%'

    content.push(generateCompactSummaryCards([
        { label: 'CATEGORIAS', value: `${data.categories.length}`, icon: '📂' },
        { label: 'VALOR TOTAL', value: formatCurrency(data.totals.totalValue), color: REPORT_COLORS.primary, icon: '💰' },
        { label: 'VALOR PAGO', value: formatCurrency(data.totals.totalPaid), color: REPORT_COLORS.success, subtext: paidPercent, icon: '✅' },
        { label: 'CONTAS', value: `${totalContas}`, subtext: `${data.categories.length} categorias`, icon: '📊' },
    ]))

    // Distribution Bars (top 5)
    const sortedCategories = [...data.categories].sort((a, b) => b.totalValue - a.totalValue)
    const top5 = sortedCategories.slice(0, 5)

    if (top5.length > 0) {
        content.push({
            text: 'Distribuição - Top Categorias',
            style: 'sectionTitle',
            margin: [0, 5, 0, 8] as [number, number, number, number],
        })

        const barItems = top5.map(c => ({
            label: c.category.nome || 'Sem Categoria',
            value: c.totalValue,
            percentage: data.totals.totalValue > 0
                ? (c.totalValue / data.totals.totalValue) * 100
                : 0,
        }))

        content.push(generateDistributionBars(barItems))
    }

    // Category table
    content.push({
        text: 'Detalhamento por Categoria',
        style: 'sectionTitle',
        margin: [0, 10, 0, 8] as [number, number, number, number],
    })

    const tableData = sortedCategories.map((c) => ({
        categoria: c.category.nome || 'Sem Categoria',
        contas: c.count,
        total: formatCurrency(c.totalValue),
        pago: formatCurrency(c.totalPaid),
        pendente: formatCurrency(c.totalPending),
        percentual: data.totals.totalValue > 0
            ? formatPercent((c.totalValue / data.totals.totalValue) * 100)
            : '0%',
    }))

    const columns: TableColumn[] = [
        { header: 'Categoria', dataKey: 'categoria', width: '*', alignment: 'left' },
        { header: 'Qtd', dataKey: 'contas', width: 35, alignment: 'center' },
        { header: 'Total', dataKey: 'total', width: 80, alignment: 'right' },
        { header: 'Pago', dataKey: 'pago', width: 80, alignment: 'right' },
        { header: 'Pendente', dataKey: 'pendente', width: 80, alignment: 'right' },
        { header: '% Total', dataKey: 'percentual', width: 50, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns))

    // Totals row
    content.push({
        table: {
            widths: ['*', 35, 80, 80, 80, 50],
            body: [
                generateTableTotalsRow([
                    { label: `TOTAL (${data.categories.length} categorias)`, value: '', colSpan: 2 },
                    { value: formatCurrency(data.totals.totalValue) },
                    { value: formatCurrency(data.totals.totalPaid) },
                    { value: formatCurrency(data.totals.totalPending) },
                    { value: '100%' },
                ], 6),
            ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10] as [number, number, number, number],
    })

    // Notas personalizadas
    if (config.additionalOptions?.customNotes) {
        content.push({
            text: 'Observações',
            style: 'sectionTitle',
            margin: [0, 15, 0, 5] as [number, number, number, number],
        })
        content.push({
            text: config.additionalOptions.customNotes,
            fontSize: 8,
            color: REPORT_COLORS.textSecondary,
            margin: [0, 0, 0, 10] as [number, number, number, number],
        })
    }

    return {
        ...docDef,
        content,
        pageOrientation: config.format.pdf?.orientation || 'portrait',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: (currentPage, pageCount) => generateReportFooter(currentPage, pageCount),
    } as TDocumentDefinitions
}

interface DREEntry {
    codigo: string
    descricao: string
    valor: number
    total: number
    nivel: number
    isSynthetic: boolean // Has children (conta sintética)
}

interface DREData {
    entries: DREEntry[]
    summary: {
        totalExpenses: number
        netResult: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for DRE (Demonstrativo de Resultados) with hierarchical tree
 */
export function generateDREPDF(
    data: DREData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'DRE — Demonstrativo de Despesas do Exercício',
        subtitle: 'Relatório Contábil — Contas a Pagar',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // Hierarchical Expenses Table
    content.push({
        text: 'Classificação de Despesas',
        style: 'sectionTitle',
        margin: [0, 15, 0, 10] as [number, number, number, number],
    })

    if (data.entries && data.entries.length > 0) {
        // Build pdfmake table manually with indentation and formatting
        const tableBody: any[][] = [
            // Header row
            [
                { text: 'Código', bold: true, fontSize: 8, color: '#374151', fillColor: '#f3f4f6' },
                { text: 'Descrição', bold: true, fontSize: 8, color: '#374151', fillColor: '#f3f4f6' },
                { text: 'Valor', bold: true, fontSize: 8, color: '#374151', alignment: 'right', fillColor: '#f3f4f6' },
            ]
        ]

        data.entries.forEach(entry => {
            const indent = '  '.repeat(Math.max(0, entry.nivel - 1))
            const isBold = entry.isSynthetic
            const fontSize = entry.isSynthetic ? 9 : 8
            const fillColor = entry.nivel === 1 && entry.isSynthetic ? '#f9fafb' : undefined
            const displayValue = entry.isSynthetic ? entry.total : entry.valor

            tableBody.push([
                { text: entry.codigo, fontSize: 8, color: '#6b7280', fillColor },
                { text: `${indent}${entry.descricao}`, bold: isBold, fontSize, fillColor },
                {
                    text: displayValue > 0 ? formatCurrency(displayValue) : '-',
                    alignment: 'right' as const,
                    bold: isBold,
                    fontSize,
                    fillColor,
                    color: displayValue > 0 ? '#1f2937' : '#9ca3af'
                },
            ])
        })

        content.push({
            table: {
                headerRows: 1,
                widths: [60, '*', 100],
                body: tableBody,
            },
            layout: {
                hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: () => 0,
                hLineColor: (i: number) => i <= 1 ? '#d1d5db' : '#e5e7eb',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            },
        })
    }

    // Total line
    content.push({
        columns: [
            { text: 'TOTAL DE DESPESAS', bold: true, fontSize: 11, width: '*' },
            {
                text: formatCurrency(data.summary.totalExpenses),
                bold: true,
                fontSize: 11,
                alignment: 'right' as const,
                width: 120,
                color: data.summary.totalExpenses > 0 ? '#dc2626' : '#059669'
            },
        ],
        margin: [0, 12, 0, 8] as [number, number, number, number],
    })

    // Double line separator (accounting convention)
    content.push({
        canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#374151' },
            { type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 1, lineColor: '#374151' },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
    })

    // Net Result
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
                color: data.summary.netResult < 0 ? '#dc2626' : '#059669'
            },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
        fillColor: '#f3f4f6',
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
        total: number
        count: number
        average: number
    }
    topCategories: Array<{
        category: string
        total: number
        count: number
    }>
    topSuppliers: Array<{
        supplier: string
        total: number
        count: number
    }>
    trend: Array<{
        date: string
        value: number
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Financial Performance Report
 * Shows real KPIs, top categories, top suppliers, and daily trend
 */
export function generateFinancialPerformancePDF(
    data: FinancialPerformanceData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Performance Financeira',
        subtitle: 'Indicadores, Rankings e Tendência',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // KPIs reais
    const kpiItems = [
        { label: 'Total de Despesas', value: formatCurrency(data.metrics.total), highlight: true },
        { label: 'Qtde. de Contas', value: data.metrics.count.toString() },
        { label: 'Ticket Médio', value: formatCurrency(data.metrics.average) },
    ]
    const summary = generateSummarySection('Indicadores Principais', kpiItems)
    content.push(...(Array.isArray(summary) ? summary : [summary]))

    // Top Categorias
    if (data.topCategories && data.topCategories.length > 0) {
        content.push({
            text: 'Ranking — Top Categorias',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })

        const catTable = data.topCategories.map((c, i) => ({
            pos: `${i + 1}°`,
            categoria: c.category,
            valor: formatCurrency(c.total),
            qtd: c.count.toString(),
            pct: data.metrics.total > 0
                ? formatPercent((c.total / data.metrics.total) * 100)
                : '0%',
        }))

        const catColumns: TableColumn[] = [
            { header: '#', dataKey: 'pos', width: 30, alignment: 'center' },
            { header: 'Categoria', dataKey: 'categoria', width: '*', alignment: 'left' },
            { header: 'Valor Total', dataKey: 'valor', width: 100, alignment: 'right' },
            { header: 'Contas', dataKey: 'qtd', width: 50, alignment: 'center' },
            { header: '% do Total', dataKey: 'pct', width: 70, alignment: 'right' },
        ]

        content.push(generateTable(catTable, catColumns))
    }

    // Top Fornecedores
    if (data.topSuppliers && data.topSuppliers.length > 0) {
        content.push({
            text: 'Ranking — Top Fornecedores',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })

        const supTable = data.topSuppliers.map((s, i) => ({
            pos: `${i + 1}°`,
            fornecedor: s.supplier,
            valor: formatCurrency(s.total),
            qtd: s.count.toString(),
            pct: data.metrics.total > 0
                ? formatPercent((s.total / data.metrics.total) * 100)
                : '0%',
        }))

        const supColumns: TableColumn[] = [
            { header: '#', dataKey: 'pos', width: 30, alignment: 'center' },
            { header: 'Fornecedor', dataKey: 'fornecedor', width: '*', alignment: 'left' },
            { header: 'Valor Total', dataKey: 'valor', width: 100, alignment: 'right' },
            { header: 'Contas', dataKey: 'qtd', width: 50, alignment: 'center' },
            { header: '% do Total', dataKey: 'pct', width: 70, alignment: 'right' },
        ]

        content.push(generateTable(supTable, supColumns))
    }

    // Evolução Diária (Tendência)
    if (data.trend && data.trend.length > 0) {
        content.push({
            text: 'Evolução Diária de Despesas',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })

        const trendTable = data.trend.map((t) => ({
            data: formatDate(t.date),
            valor: formatCurrency(t.value),
        }))

        const trendColumns: TableColumn[] = [
            { header: 'Data', dataKey: 'data', width: 100, alignment: 'center' },
            { header: 'Valor', dataKey: 'valor', width: '*', alignment: 'right' },
        ]

        content.push(generateTable(trendTable, trendColumns))
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
