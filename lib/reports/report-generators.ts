import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import {
    generateReportHeader,
    generateReportFooter,
    generateTable,
    generateSummarySection,
    formatCurrency,
    formatDate,
    getDefaultDocumentDefinition,
    type TableColumn,
    type ReportHeaderOptions,
} from './pdf-helpers'
import type { ExportConfig } from './types'

interface MonthlyDetailedData {
    contas: any[]
    totals: {
        totalAccounts: number
        totalValue: number
        totalPaid: number
        totalPending: number
        totalInstallments: number
    }
    byStatus: Array<{
        status: string
        count: number
        total: number
        items: any[]
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Gera PDF do Relatório Mensal Detalhado
 */
export function generateMonthlyDetailedPDF(
    data: MonthlyDetailedData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    // Cabeçalho
    const headerOptions: ReportHeaderOptions = {
        title: 'Relatório Mensal Detalhado',
        subtitle: 'Contas a Pagar',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        companyName: undefined, // TODO: Get from company settings
        companyLogo: config.format.pdf?.includeCompanyLogo ? undefined : undefined, // TODO: Get logo
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Resumo Geral
    const summaryItems = [
        { label: 'Total de Contas', value: data.totals.totalAccounts },
        { label: 'Total de Parcelas', value: data.totals.totalInstallments },
        { label: 'Valor Total', value: formatCurrency(data.totals.totalValue), highlight: true },
        { label: 'Valor Pago', value: formatCurrency(data.totals.totalPaid) },
        { label: 'Valor Pendente', value: formatCurrency(data.totals.totalPending) },
    ]
    const summarySection = generateSummarySection('Resumo Geral', summaryItems)
    content.push(...(Array.isArray(summarySection) ? summarySection : [summarySection]))

    // Resumo por Status
    if (data.byStatus && data.byStatus.length > 0) {
        content.push({
            text: 'Distribuição por Status',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })

        const statusData = data.byStatus.map((status) => ({
            status_label: getStatusLabel(status.status),
            count: status.count,
            total: formatCurrency(status.total),
        }))

        const statusColumns: TableColumn[] = [
            { header: 'Status', dataKey: 'status_label', width: '*', alignment: 'left' },
            { header: 'Quantidade', dataKey: 'count', width: 80, alignment: 'center' },
            { header: 'Valor Total', dataKey: 'total', width: 100, alignment: 'right' },
        ]

        content.push(generateTable(statusData, statusColumns))
    }

    // Detalhamento das Contas
    if (config.detailLevel !== 'resumido' && data.contas.length > 0) {
        content.push({
            text: 'Detalhamento das Contas',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
            pageBreak: 'before' as const,
        })

        const tableData = data.contas.map((conta) => ({
            descricao: conta.descricao || '-',
            fornecedor: conta.fornecedores?.nome || '-',
            categoria: conta.tipos_despesa?.nome || '-',
            valor_original: formatCurrency(conta.valor_total),
            parcelas: `${conta.parcela_atual || 0}/${conta.total_parcelas || 0}`,
            status: getStatusLabel(conta.status),
            vencimento: conta.proxima_parcela?.data_vencimento
                ? formatDate(conta.proxima_parcela.data_vencimento)
                : '-',
        }))

        const columns: TableColumn[] = [
            { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
            { header: 'Fornecedor', dataKey: 'fornecedor', width: 100, alignment: 'left' },
            { header: 'Categoria', dataKey: 'categoria', width: 80, alignment: 'left' },
            { header: 'Valor', dataKey: 'valor_original', width: 80, alignment: 'right' },
            { header: 'Parcela', dataKey: 'parcelas', width: 50, alignment: 'center' },
            { header: 'Status', dataKey: 'status', width: 60, alignment: 'center' },
            { header: 'Vencimento', dataKey: 'vencimento', width: 70, alignment: 'center' },
        ]

        const widths = config.format.pdf?.orientation === 'landscape'
            ? ['*', 120, 100, 90, 60, 70, 80]
            : columns.map((col) => col.width!)

        content.push(
            generateTable(tableData, columns, {
                alternateRowColors: true,
                widths,
            })
        )
    }

    // Notas personalizadas
    if (config.additionalOptions.customNotes) {
        content.push({
            text: 'Observações',
            style: 'sectionTitle',
            margin: [0, 20, 0, 10] as [number, number, number, number],
        })
        content.push({
            text: config.additionalOptions.customNotes,
            fontSize: 9,
            margin: [0, 0, 0, 15] as [number, number, number, number],
        })
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

/**
 * Gera PDF do Consolidado por Fornecedor
 */
export function generateSupplierConsolidatedPDF(
    data: {
        suppliers: Array<{
            supplier: { nome: string }
            accounts: any[]
            totalValue: number
            totalPaid: number
            totalPending: number
        }>
        totals: any
        period: { startDate: string; endDate: string }
    },
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Consolidado por Fornecedor',
        subtitle: 'Análise de Despesas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Resumo
    const summarySectionItems = generateSummarySection('Resumo Geral', [
        { label: 'Total de Fornecedores', value: data.suppliers.length },
        { label: 'Total de Contas', value: data.totals.totalAccounts },
        { label: 'Valor Total', value: formatCurrency(data.totals.totalValue), highlight: true },
        { label: 'Valor Pago', value: formatCurrency(data.totals.totalPaid) },
        { label: 'Valor Pendente', value: formatCurrency(data.totals.totalPending) },
    ])
    content.push(...(Array.isArray(summarySectionItems) ? summarySectionItems : [summarySectionItems]))

    // Tabela de Fornecedores
    content.push({
        text: 'Detalhamento por Fornecedor',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const tableData = data.suppliers.map((s) => ({
        fornecedor: s.supplier.nome || 'Sem Fornecedor',
        contas: s.accounts.length,
        total: formatCurrency(s.totalValue),
        pago: formatCurrency(s.totalPaid),
        pendente: formatCurrency(s.totalPending),
        percentual: formatPercent((s.totalValue / data.totals.totalValue) * 100),
    }))

    const columns: TableColumn[] = [
        { header: 'Fornecedor', dataKey: 'fornecedor', width: '*', alignment: 'left' },
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

// Helper functions
function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
        ativa: 'Ativa',
        quitada: 'Quitada',
        cancelada: 'Cancelada',
        pendente: 'Pendente',
        pago: 'Pago',
        parcial: 'Parcial',
    }
    return statusMap[status] || status
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
}
