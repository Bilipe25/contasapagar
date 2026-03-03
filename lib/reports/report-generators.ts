import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import {
    generateReportHeader,
    generateReportFooter,
    generateTable,
    generateCompactSummaryCards,
    generateTableTotalsRow,
    getStatusBadge,
    formatCurrency,
    formatDate,
    getDefaultDocumentDefinition,
    REPORT_COLORS,
    type TableColumn,
    type ReportHeaderOptions,
} from './pdf-helpers'
import { type ExportConfig, ViewMode, DEFAULT_ACCOUNT_COLUMNS } from './types'

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

    const headerOptions: ReportHeaderOptions = {
        title: 'Relatório Mensal Detalhado',
        subtitle: 'Contas a Pagar',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
        reportStyle: 'professional',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    const isInstallmentView = config.viewMode === ViewMode.BY_INSTALLMENT
    let tableData: any[] = []

    // ---- EXTRACT AND FILTER INSTALLMENTS IF NEEDED ----
    if (isInstallmentView && data.contas.length > 0) {
        const periodStart = data.period?.startDate ? new Date(data.period.startDate) : null
        const periodEnd = data.period?.endDate ? new Date(data.period.endDate + 'T23:59:59') : null
        const statusFilter = config.filters?.customFilters?.parcelaStatus
        const dateField = config.period?.dateField || DEFAULT_ACCOUNT_COLUMNS[0] // fallback or use the one from config

        let installments = data.contas.flatMap(conta => {
            return (conta.parcelas || [])
                .filter((p: any) => {
                    // Filter parcelas by period when in installment view
                    if (periodStart && periodEnd) {
                        const dateToCompare = config.period?.dateField === 'payment_date'
                            ? (p.data_pagamento ? new Date(p.data_pagamento) : null)
                            : new Date(p.data_vencimento)

                        if (!dateToCompare || dateToCompare < periodStart || dateToCompare > periodEnd) return false
                    }
                    // Filter by status
                    if (statusFilter && statusFilter.length > 0) {
                        if (!statusFilter.includes(p.status)) return false
                    }
                    return true
                })
                .map((p: any) => {
                    const badge = getStatusBadge(p.status)
                    // Infer valor_pago
                    const valorPago = p.status === 'pago' ? (p.valor_final || 0) : (p.valor_pago || 0)
                    const valorPendente = Math.max(0, (p.valor_final || 0) - valorPago)

                    return {
                        ...p,
                        conta_descricao: conta.descricao,
                        fornecedor_nome: conta.fornecedores?.nome,
                        categoria_nome: conta.tipos_despesa?.nome,
                        parcela_info: `${p.numero_parcela}/${conta.total_parcelas}`,
                        inferred_valor_pago: valorPago,
                        inferred_valor_pendente: valorPendente,
                        badge_text: badge.text
                    }
                })
        })

        // Sort by due date
        installments.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())

        // OVERRIDE TOTALS AND STATUS DISTRIBUTION BASED ON FILTERED INSTALLMENTS
        data.totals.totalAccounts = new Set(installments.map(i => i.conta_id)).size
        data.totals.totalInstallments = installments.length
        data.totals.totalValue = installments.reduce((sum, i) => sum + (i.valor_final || 0), 0)
        data.totals.totalPaid = installments.reduce((sum, i) => sum + i.inferred_valor_pago, 0)
        data.totals.totalPending = installments.reduce((sum, i) => sum + i.inferred_valor_pendente, 0)

        const groupedStatus: Record<string, { count: number, total: number }> = {}
        installments.forEach(i => {
            if (!groupedStatus[i.status]) groupedStatus[i.status] = { count: 0, total: 0 }
            groupedStatus[i.status].count++
            groupedStatus[i.status].total += i.valor_final || 0
        })

        data.byStatus = Object.entries(groupedStatus).map(([status, agg]) => ({
            status,
            count: agg.count,
            total: agg.total,
            items: [] // not needed for headers
        }))

        // Prepare table data
        tableData = installments.map((item) => ({
            descricao: truncate(item.conta_descricao, 35),
            fornecedor: truncate(item.fornecedor_nome, 20),
            categoria: truncate(item.categoria_nome, 15),
            valor: formatCurrency(item.valor_final),
            valor_pago: formatCurrency(item.inferred_valor_pago),
            valor_pendente: formatCurrency(item.inferred_valor_pendente),
            parcelas: item.parcela_info,
            status: item.badge_text,
            vencimento: formatDate(item.data_vencimento),
            pagamento: item.data_pagamento ? formatDate(item.data_pagamento) : '-',
        }))
    } else if (data.contas.length > 0) {
        // By Account (Standard)
        tableData = data.contas.map((conta) => {
            const badge = getStatusBadge(conta.status)
            return {
                descricao: truncate(conta.descricao, 40),
                fornecedor: truncate(conta.fornecedores?.nome, 20),
                categoria: truncate(conta.tipos_despesa?.nome, 15),
                valor: formatCurrency(conta.valor_total),
                valor_pago: formatCurrency(conta.valor_pago || 0),
                valor_pendente: formatCurrency(conta.valor_pendente ?? Math.max(0, (conta.valor_total || 0) - (conta.valor_pago || 0))),
                parcelas: `${conta.parcela_atual || 0}/${conta.total_parcelas || 0}`,
                status: badge.text,
                vencimento: conta.proxima_parcela?.data_vencimento
                    ? formatDate(conta.proxima_parcela.data_vencimento)
                    : '-',
                pagamento: '-',
            }
        })
    }
    // ------------------------------------------------

    // KPI Cards compactos
    const paidPercent = data.totals.totalValue > 0
        ? ((data.totals.totalPaid / data.totals.totalValue) * 100).toFixed(1) + '%'
        : '0%'
    content.push(generateCompactSummaryCards([
        { label: 'VALOR TOTAL', value: formatCurrency(data.totals.totalValue), color: REPORT_COLORS.primary, icon: '💰' },
        { label: 'VALOR PAGO', value: formatCurrency(data.totals.totalPaid), color: REPORT_COLORS.success, icon: '✅' },
        { label: 'VALOR PENDENTE', value: formatCurrency(data.totals.totalPending), color: REPORT_COLORS.warning, icon: '⏳' },
        { label: 'CONTAS', value: `${data.totals.totalAccounts}`, subtext: `${data.totals.totalInstallments} parcelas · ${paidPercent} pago`, icon: '📊' },
    ]))

    // Resumo por Status (compacto, inline)
    if (data.byStatus && data.byStatus.length > 0) {
        content.push({
            text: 'Distribuição por Status',
            style: 'sectionTitle',
            margin: [0, 5, 0, 8] as [number, number, number, number],
        })

        const statusData = data.byStatus.map((s) => {
            const badge = getStatusBadge(s.status)
            return {
                status_label: badge.text,
                count: s.count,
                total: formatCurrency(s.total),
                percentual: data.totals.totalValue > 0
                    ? formatPercent((s.total / data.totals.totalValue) * 100)
                    : '0%',
            }
        })

        const statusColumns: TableColumn[] = [
            { header: 'Status', dataKey: 'status_label', width: '*', alignment: 'left' },
            { header: 'Qtd', dataKey: 'count', width: 45, alignment: 'center' },
            { header: 'Valor', dataKey: 'total', width: 90, alignment: 'right' },
            { header: '%', dataKey: 'percentual', width: 50, alignment: 'right' },
        ]

        content.push(generateTable(statusData, statusColumns))
    }

    // Detalhamento das Contas
    if (config.detailLevel !== 'resumido' && data.contas.length > 0) {
        content.push({
            text: isInstallmentView ? 'Detalhamento das Parcelas' : 'Detalhamento das Contas',
            style: 'sectionTitle',
            margin: [0, 15, 0, 8] as [number, number, number, number],
            pageBreak: 'before' as const,
        })

        // Define available columns mapping
        const availableColsMap: Record<string, TableColumn> = {
            // Internal/Legacy mappings safely mapped to data keys
            'valor': { header: 'Valor', dataKey: 'valor', width: 75, alignment: 'right' },
            'parcelas': { header: 'Parc.', dataKey: 'parcelas', width: 35, alignment: 'center' },
            'vencimento': { header: 'Vencto', dataKey: 'vencimento', width: 60, alignment: 'center' },
            'pagamento': { header: 'Pagto', dataKey: 'pagamento', width: 60, alignment: 'center' },

            // Standard IDs from types.ts (DEFAULT_ACCOUNT_COLUMNS)
            'descricao': { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
            'fornecedor': { header: 'Fornecedor', dataKey: 'fornecedor', width: 85, alignment: 'left' },
            'categoria': { header: 'Categoria', dataKey: 'categoria', width: 65, alignment: 'left' },
            'valor_final': { header: 'Valor Final', dataKey: 'valor', width: 75, alignment: 'right' },
            'valor_pago': { header: 'Valor Pago', dataKey: 'valor_pago', width: 75, alignment: 'right' },
            'valor_pendente': { header: 'Valor Pendente', dataKey: 'valor_pendente', width: 80, alignment: 'right' },
            'numero_parcela': { header: 'Parc.', dataKey: 'parcelas', width: 35, alignment: 'center' },
            'status': { header: 'Status', dataKey: 'status', width: 60, alignment: 'center' },
            'data_vencimento': { header: 'Vencto', dataKey: 'vencimento', width: 60, alignment: 'center' },
            'data_pagamento': { header: 'Pagto', dataKey: 'pagamento', width: 60, alignment: 'center' },

            // Backward compatibility aliases if needed (matching id patterns)
            'col-description': { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
            'col-supplier': { header: 'Fornecedor', dataKey: 'fornecedor', width: 85, alignment: 'left' },
            'col-category': { header: 'Categoria', dataKey: 'categoria', width: 65, alignment: 'left' },
            'col-value': { header: 'Valor', dataKey: 'valor', width: 75, alignment: 'right' },
            'col-installments': { header: 'Parc.', dataKey: 'parcelas', width: 35, alignment: 'center' },
            'col-status': { header: 'Status', dataKey: 'status', width: 60, alignment: 'center' },
            'col-due-date': { header: 'Vencto', dataKey: 'vencimento', width: 60, alignment: 'center' },
            'col-payment-date': { header: 'Pagto', dataKey: 'pagamento', width: 60, alignment: 'center' },
        }

        let columns: TableColumn[] = []

        // If specific columns selected, use them
        if (config.columns?.selectedColumns && config.columns.selectedColumns.length > 0) {
            columns = config.columns.selectedColumns
                .map(colId => availableColsMap[colId])
                .filter(Boolean) as TableColumn[]
        }

        // Fallback to default if no columns matched or selected
        if (columns.length === 0) {
            columns = [
                availableColsMap['descricao'],
                availableColsMap['fornecedor'],
                availableColsMap['categoria'],
                availableColsMap['valor_final'],
                availableColsMap['numero_parcela'],
                availableColsMap['status'],
                availableColsMap['data_vencimento']
            ]
        }

        const widths = config.format.pdf?.orientation === 'landscape'
            ? columns.map(c => c.width === '*' ? '*' : (typeof c.width === 'number' ? c.width * 1.3 : c.width)) // Scale up for landscape
            : columns.map((col) => col.width!)

        content.push(
            generateTable(tableData, columns, {
                alternateRowColors: true,
                widths: widths as any, // dynamic widths
            })
        )

        // Totals row below table
        content.push({
            table: {
                widths: ['*', 90],
                body: [
                    [
                        { text: `Total: ${data.contas.length} contas`, bold: true, fontSize: 9, fillColor: REPORT_COLORS.bgHeader, color: '#FFFFFF', margin: [4, 4, 4, 4] as [number, number, number, number] },
                        { text: formatCurrency(data.totals.totalValue), bold: true, fontSize: 9, fillColor: REPORT_COLORS.bgHeader, color: '#FFFFFF', alignment: 'right' as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
                    ]
                ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 10] as [number, number, number, number],
        })
    }

    // Notas personalizadas
    if (config.additionalOptions.customNotes) {
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
        pageOrientation: config.format.pdf?.orientation || 'landscape',
        pageSize: config.format.pdf?.pageSize || 'A4',
        footer: (currentPage, pageCount) => generateReportFooter(currentPage, pageCount),
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
        subtitle: 'Análise de Despesas por Fornecedor',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
        reportStyle: 'professional',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // KPI Cards
    const totalContas = data.suppliers.reduce((sum, s) => sum + s.accounts.length, 0)
    const paidPercent = data.totals.totalValue > 0
        ? ((data.totals.totalPaid / data.totals.totalValue) * 100).toFixed(1) + '%'
        : '0%'

    content.push(generateCompactSummaryCards([
        { label: 'FORNECEDORES', value: `${data.suppliers.length}`, icon: '🏢' },
        { label: 'VALOR TOTAL', value: formatCurrency(data.totals.totalValue), color: REPORT_COLORS.primary, icon: '💰' },
        { label: 'VALOR PAGO', value: formatCurrency(data.totals.totalPaid), color: REPORT_COLORS.success, subtext: paidPercent, icon: '✅' },
        { label: 'VALOR PENDENTE', value: formatCurrency(data.totals.totalPending), color: REPORT_COLORS.warning, icon: '⏳' },
    ]))

    // Tabela de Fornecedores
    content.push({
        text: 'Detalhamento por Fornecedor',
        style: 'sectionTitle',
        margin: [0, 5, 0, 8] as [number, number, number, number],
    })

    // Sort by total value descending
    const sortedSuppliers = [...data.suppliers].sort((a, b) => b.totalValue - a.totalValue)

    const tableData = sortedSuppliers.map((s) => ({
        fornecedor: truncate(s.supplier.nome, 30) || 'Sem Fornecedor',
        contas: s.accounts.length,
        total: formatCurrency(s.totalValue),
        pago: formatCurrency(s.totalPaid),
        pendente: formatCurrency(s.totalPending),
        percentual: data.totals.totalValue > 0
            ? formatPercent((s.totalValue / data.totals.totalValue) * 100)
            : '0%',
    }))

    const columns: TableColumn[] = [
        { header: 'Fornecedor', dataKey: 'fornecedor', width: '*', alignment: 'left' },
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
                    { label: `TOTAL (${data.suppliers.length} fornecedores)`, value: '', colSpan: 2 },
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

function truncate(text: string | null | undefined, maxLength: number): string {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '…'
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
}
