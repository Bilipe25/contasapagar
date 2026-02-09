import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============================================
// CORES CORPORATIVAS PADRONIZADAS
// ============================================
export const REPORT_COLORS = {
    // Cores primárias
    primary: '#2563eb',      // Azul principal
    primaryDark: '#1d4ed8',  // Azul escuro
    primaryLight: '#3b82f6', // Azul claro

    // Cores de status
    success: '#16a34a',      // Verde - quitado/pago
    warning: '#ea580c',      // Laranja - pendente
    danger: '#dc2626',       // Vermelho - vencido
    info: '#0891b2',         // Ciano - informação

    // Cores de texto
    textPrimary: '#111827',   // Preto principal
    textSecondary: '#4b5563', // Cinza médio
    textMuted: '#9ca3af',     // Cinza claro

    // Cores de fundo
    bgLight: '#f9fafb',       // Fundo claro
    bgMuted: '#f3f4f6',       // Fundo alternado
    bgHeader: '#1e3a5f',      // Cabeçalho escuro profissional

    // Bordas
    border: '#e5e7eb',
    borderDark: '#d1d5db',
} as const

export type ReportStyle = 'professional' | 'compact' | 'accounting' | 'minimal'

export interface ReportHeaderOptions {
    title: string
    subtitle?: string
    period?: {
        start: string
        end: string
    }
    companyName?: string
    companyCnpjCpf?: string
    companyLogo?: string
    generatedAt?: Date
    reportStyle?: ReportStyle
    showDecorations?: boolean
}

export interface TableColumn {
    header: string
    dataKey: string
    width?: string | number
    alignment?: 'left' | 'center' | 'right'
    format?: (value: any) => string
}

/**
 * Gera cabeçalho padrão para relatórios PDF
 */
export function generateReportHeader(options: ReportHeaderOptions): Content {
    const {
        title,
        subtitle,
        period,
        companyName,
        companyCnpjCpf,
        companyLogo,
        generatedAt = new Date(),
        reportStyle = 'professional',
        showDecorations = true
    } = options

    const header: Content[] = []

    // Estilo profissional com barra colorida superior
    if (reportStyle === 'professional' && showDecorations) {
        header.push({
            canvas: [{
                type: 'rect',
                x: 0,
                y: 0,
                w: 515,
                h: 4,
                color: REPORT_COLORS.primary
            }],
            margin: [0, 0, 0, 15] as [number, number, number, number],
        })
    }

    // Layout com logo à esquerda e info à direita (estilo profissional)
    if (companyLogo && reportStyle === 'professional') {
        header.push({
            columns: [
                {
                    image: companyLogo,
                    width: 80,
                    margin: [0, 0, 0, 0] as [number, number, number, number],
                },
                {
                    stack: [
                        {
                            text: companyName || '',
                            style: 'companyName',
                            alignment: 'right' as const,
                        },
                        {
                            text: `Gerado em: ${format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
                            style: 'generatedDate',
                            alignment: 'right' as const,
                            margin: [0, 3, 0, 0] as [number, number, number, number],
                        }
                    ],
                    width: '*',
                }
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        })
    } else if (companyLogo) {
        header.push({
            image: companyLogo,
            width: 100,
            alignment: 'left' as const,
            margin: [0, 0, 0, 10] as [number, number, number, number],
        })
    }

    // Título principal
    header.push({
        text: title,
        style: reportStyle === 'accounting' ? 'accountingTitle' : 'reportTitle',
        alignment: 'center' as const,
        margin: [0, companyLogo ? 0 : 10, 0, subtitle ? 5 : 10] as [number, number, number, number],
    })

    // Subtítulo
    if (subtitle) {
        header.push({
            text: subtitle,
            style: 'reportSubtitle',
            alignment: 'center' as const,
            margin: [0, 0, 0, 10] as [number, number, number, number],
        })
    }

    // Nome da empresa com CNPJ/CPF (quando não há logo ou estilo diferente)
    if (companyName && !companyLogo) {
        const companyInfo: Content[] = [
            {
                text: companyName,
                style: 'companyName',
                alignment: 'center' as const,
            }
        ]

        if (companyCnpjCpf) {
            companyInfo.push({
                text: `CNPJ/CPF: ${companyCnpjCpf}`,
                fontSize: 9,
                color: REPORT_COLORS.textSecondary,
                alignment: 'center' as const,
                margin: [0, 2, 0, 0] as [number, number, number, number],
            })
        }

        header.push({
            stack: companyInfo,
            margin: [0, 0, 0, 10] as [number, number, number, number],
        })
    }

    // Período com destaque visual
    if (period) {
        const startDate = format(new Date(period.start), 'dd/MM/yyyy', { locale: ptBR })
        const endDate = format(new Date(period.end), 'dd/MM/yyyy', { locale: ptBR })

        if (reportStyle === 'professional' || reportStyle === 'accounting') {
            header.push({
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            text: `Período: ${startDate} a ${endDate}`,
                            style: 'reportPeriod',
                            alignment: 'center' as const,
                            fillColor: REPORT_COLORS.bgLight,
                            margin: [10, 8, 10, 8] as [number, number, number, number],
                        }
                    ]]
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 0,
                    hLineColor: () => REPORT_COLORS.border,
                },
                margin: [0, 5, 0, 15] as [number, number, number, number],
            })
        } else {
            header.push({
                text: `Período: ${startDate} a ${endDate}`,
                style: 'reportPeriod',
                alignment: 'center' as const,
                margin: [0, 0, 0, 10] as [number, number, number, number],
            })
        }
    }

    // Data de geração (apenas quando não há logo ou estilo simplificado)
    if (!companyLogo || reportStyle !== 'professional') {
        header.push({
            text: `Gerado em: ${format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
            style: 'generatedDate',
            alignment: 'right' as const,
            margin: [0, 0, 0, 15] as [number, number, number, number],
        })
    }

    // Linha separadora decorativa
    if (showDecorations && reportStyle !== 'minimal') {
        header.push({
            canvas: [{
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 515,
                y2: 0,
                lineWidth: 1,
                lineColor: REPORT_COLORS.border
            }],
            margin: [0, 5, 0, 15] as [number, number, number, number],
        })
    }

    return header
}

/**
 * Gera rodapé padrão com paginação
 */
export function generateReportFooter(currentPage: number, pageCount: number): Content {
    return {
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center' as const,
        style: 'footer',
        margin: [0, 10, 0, 0] as [number, number, number, number],
    }
}

/**
 * Formata uma tabela de dados para PDF
 */
export function generateTable(
    data: any[],
    columns: TableColumn[],
    options?: {
        headerBgColor?: string
        alternateRowColors?: boolean
        showBorders?: boolean
        widths?: (string | number)[]
    }
): Content {
    const {
        headerBgColor = '#3b82f6',
        alternateRowColors = true,
        showBorders = true,
        widths,
    } = options || {}

    // Cabeçalhos
    const headers = columns.map((col) => ({
        text: col.header,
        style: 'tableHeader',
        fillColor: headerBgColor,
        color: '#FFFFFF',
        alignment: col.alignment || 'left',
    }))

    // Linhas de dados
    const rows = data.map((row, index) => {
        const fillColor = alternateRowColors && index % 2 === 0 ? '#f3f4f6' : undefined

        return columns.map((col) => {
            const value = row[col.dataKey]
            const formattedValue = col.format ? col.format(value) : value

            return {
                text: formattedValue ?? '-',
                style: 'tableCell',
                alignment: col.alignment || 'left',
                fillColor,
            }
        })
    })

    return {
        table: {
            headerRows: 1,
            widths: widths || columns.map((col) => col.width || 'auto'),
            body: [headers, ...rows],
        },
        layout: showBorders ? 'lightHorizontalLines' : 'noBorders',
        margin: [0, 10, 0, 10] as [number, number, number, number],
    }
}

/**
 * Gera uma seção de resumo com totais
 */
export function generateSummarySection(
    title: string,
    items: { label: string; value: string | number; highlight?: boolean }[]
): Content {
    return [
        {
            text: title,
            style: 'sectionTitle',
            margin: [0, 15, 0, 10] as [number, number, number, number],
        },
        {
            table: {
                widths: ['*', 'auto'],
                body: items.map((item) => [
                    {
                        text: item.label,
                        style: item.highlight ? 'summaryLabelHighlight' : 'summaryLabel',
                        border: [false, false, false, false],
                    },
                    {
                        text: item.value,
                        style: item.highlight ? 'summaryValueHighlight' : 'summaryValue',
                        alignment: 'right' as const,
                        border: [false, false, false, false],
                    },
                ]),
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 15] as [number, number, number, number],
        },
    ]
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-'
    try {
        const d = typeof date === 'string' ? new Date(date) : date
        return format(d, 'dd/MM/yyyy', { locale: ptBR })
    } catch {
        return '-'
    }
}

/**
 * Formata percentual
 */
export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0%'
    return `${value.toFixed(2)}%`
}

/**
 * Estilos padrão para relatórios
 */
export const reportStyles: StyleDictionary = {
    reportTitle: {
        fontSize: 20,
        bold: true,
        color: '#1f2937',
    },
    reportSubtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    companyName: {
        fontSize: 12,
        bold: true,
        color: '#374151',
    },
    reportPeriod: {
        fontSize: 11,
        color: '#6b7280',
        italics: true,
    },
    generatedDate: {
        fontSize: 9,
        color: '#9ca3af',
    },
    sectionTitle: {
        fontSize: 14,
        bold: true,
        color: '#1f2937',
    },
    tableHeader: {
        fontSize: 10,
        bold: true,
        margin: [5, 5, 5, 5] as [number, number, number, number],
    },
    tableCell: {
        fontSize: 9,
        margin: [5, 3, 5, 3] as [number, number, number, number],
    },
    tableCellBold: {
        fontSize: 9,
        bold: true,
        margin: [5, 3, 5, 3] as [number, number, number, number],
    },
    summaryLabel: {
        fontSize: 10,
        color: '#374151',
    },
    summaryValue: {
        fontSize: 10,
        bold: true,
        color: '#1f2937',
    },
    summaryLabelHighlight: {
        fontSize: 11,
        bold: true,
        color: '#1f2937',
    },
    summaryValueHighlight: {
        fontSize: 11,
        bold: true,
        color: '#3b82f6',
    },
    footer: {
        fontSize: 8,
        color: '#9ca3af',
    },
    // Novos estilos adicionados
    accountingTitle: {
        fontSize: 18,
        bold: true,
        color: REPORT_COLORS.textPrimary,
        decoration: 'underline',
    },
    accountingSubtitle: {
        fontSize: 12,
        bold: true,
        color: REPORT_COLORS.textSecondary,
    },
    statusPaid: {
        fontSize: 9,
        bold: true,
        color: REPORT_COLORS.success,
    },
    statusPending: {
        fontSize: 9,
        bold: true,
        color: REPORT_COLORS.warning,
    },
    statusOverdue: {
        fontSize: 9,
        bold: true,
        color: REPORT_COLORS.danger,
    },
    valuePositive: {
        fontSize: 9,
        color: REPORT_COLORS.success,
    },
    valueNegative: {
        fontSize: 9,
        color: REPORT_COLORS.danger,
    },
    subtotalRow: {
        fontSize: 10,
        bold: true,
        fillColor: REPORT_COLORS.bgMuted,
    },
    totalRow: {
        fontSize: 11,
        bold: true,
        fillColor: REPORT_COLORS.primaryLight,
        color: '#FFFFFF',
    },
    alertInfo: {
        fontSize: 9,
        color: REPORT_COLORS.info,
        italics: true,
    },
    alertWarning: {
        fontSize: 9,
        color: REPORT_COLORS.warning,
        bold: true,
    },
    alertDanger: {
        fontSize: 9,
        color: REPORT_COLORS.danger,
        bold: true,
    },
}

/**
 * Configuração padrão do documento PDF
 */
export function getDefaultDocumentDefinition(): Partial<TDocumentDefinitions> {
    return {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60] as [number, number, number, number],
        styles: reportStyles,
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
        },
    }
}

// ============================================
// FUNÇÕES AUXILIARES ADICIONAIS
// ============================================

/**
 * Gera uma caixa de alerta/informação destacada
 */
export function generateAlertBox(
    message: string,
    type: 'info' | 'warning' | 'danger' | 'success' = 'info'
): Content {
    const colors = {
        info: { bg: '#e0f2fe', border: REPORT_COLORS.info, text: REPORT_COLORS.info },
        warning: { bg: '#fef3c7', border: REPORT_COLORS.warning, text: REPORT_COLORS.warning },
        danger: { bg: '#fee2e2', border: REPORT_COLORS.danger, text: REPORT_COLORS.danger },
        success: { bg: '#dcfce7', border: REPORT_COLORS.success, text: REPORT_COLORS.success },
    }
    const c = colors[type]

    return {
        table: {
            widths: ['*'],
            body: [[
                {
                    text: message,
                    color: c.text,
                    fillColor: c.bg,
                    margin: [10, 8, 10, 8] as [number, number, number, number],
                }
            ]]
        },
        layout: {
            hLineWidth: () => 0,
            vLineWidth: (i: number) => i === 0 ? 3 : 0,
            vLineColor: () => c.border,
        },
        margin: [0, 10, 0, 10] as [number, number, number, number],
    }
}

/**
 * Gera badge de status colorido
 */
export function getStatusBadge(status: string): { text: string; style: string } {
    const statusMap: Record<string, { text: string; style: string }> = {
        pago: { text: '● PAGO', style: 'statusPaid' },
        quitado: { text: '● QUITADO', style: 'statusPaid' },
        pendente: { text: '● PENDENTE', style: 'statusPending' },
        atrasado: { text: '● VENCIDO', style: 'statusOverdue' },
        vencido: { text: '● VENCIDO', style: 'statusOverdue' },
        cancelado: { text: '○ CANCELADO', style: 'tableCell' },
    }
    return statusMap[status?.toLowerCase()] || { text: status || '-', style: 'tableCell' }
}

/**
 * Gera tabela de aging analysis (30/60/90+ dias)
 */
export function generateAgingTable(data: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
}): Content {
    const total = data.current + data.days30 + data.days60 + data.days90Plus

    return {
        table: {
            widths: ['*', '*', '*', '*', '*'],
            body: [
                [
                    { text: 'A Vencer', style: 'tableHeader', fillColor: REPORT_COLORS.success, color: '#fff', alignment: 'center' as const },
                    { text: '1-30 dias', style: 'tableHeader', fillColor: REPORT_COLORS.info, color: '#fff', alignment: 'center' as const },
                    { text: '31-60 dias', style: 'tableHeader', fillColor: REPORT_COLORS.warning, color: '#fff', alignment: 'center' as const },
                    { text: '61-90+ dias', style: 'tableHeader', fillColor: REPORT_COLORS.danger, color: '#fff', alignment: 'center' as const },
                    { text: 'Total', style: 'tableHeader', fillColor: REPORT_COLORS.primaryDark, color: '#fff', alignment: 'center' as const },
                ],
                [
                    { text: formatCurrency(data.current), alignment: 'center' as const, style: 'tableCell' },
                    { text: formatCurrency(data.days30), alignment: 'center' as const, style: 'tableCell' },
                    { text: formatCurrency(data.days60), alignment: 'center' as const, style: 'tableCell' },
                    { text: formatCurrency(data.days90Plus), alignment: 'center' as const, style: 'tableCell' },
                    { text: formatCurrency(total), alignment: 'center' as const, style: 'tableCellBold' },
                ],
            ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 15] as [number, number, number, number],
    }
}

/**
 * Gera linha de subtotal para tabelas
 */
export function generateSubtotalRow(
    label: string,
    value: number,
    colSpan: number = 1
): any[] {
    const cells: any[] = []

    if (colSpan > 1) {
        cells.push({
            text: label,
            style: 'subtotalRow',
            colSpan: colSpan,
            alignment: 'right' as const,
            margin: [5, 5, 10, 5] as [number, number, number, number],
        })
        for (let i = 1; i < colSpan; i++) {
            cells.push({})
        }
    }

    cells.push({
        text: formatCurrency(value),
        style: 'subtotalRow',
        alignment: 'right' as const,
        margin: [5, 5, 5, 5] as [number, number, number, number],
    })

    return cells
}

/**
 * Formata número com casas decimais
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined) return '0'
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)
}

/**
 * Calcula dias de atraso
 */
export function calculateDaysOverdue(dueDate: string | Date): number {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
    const today = new Date()
    due.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - due.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Gera seção de KPIs/métricas em grid
 */
export function generateKPISection(
    kpis: { label: string; value: string; subtext?: string; color?: string }[]
): Content {
    const kpiColumns = kpis.map(kpi => ({
        stack: [
            {
                text: kpi.value,
                fontSize: 18,
                bold: true,
                color: kpi.color || REPORT_COLORS.primary,
                alignment: 'center' as const,
            },
            {
                text: kpi.label,
                fontSize: 9,
                color: REPORT_COLORS.textSecondary,
                alignment: 'center' as const,
                margin: [0, 3, 0, 0] as [number, number, number, number],
            },
            ...(kpi.subtext ? [{
                text: kpi.subtext,
                fontSize: 8,
                color: REPORT_COLORS.textMuted,
                alignment: 'center' as const,
                italics: true,
            }] : []),
        ],
        width: '*',
    }))

    return {
        columns: kpiColumns,
        margin: [0, 10, 0, 20] as [number, number, number, number],
    }
}

