import { formatCurrency, formatDate } from '@/lib/utils'
import type { TDocumentDefinitions, TableCell, Alignment } from 'pdfmake/interfaces'

interface GeneratePDFParams {
    contas: Array<{
        descricao: string
        valor_final: number
        data_vencimento: string
        status: string
        fornecedores: { nome: string } | null
        tipos_despesa: { nome: string } | null
    }>
    stats: {
        totalAPagar: number
        totalVencidas: number
        totalPago: number
        quantidadePagas: number
    }
    periodo: string
}

interface GenerateAnnualPDFParams {
    meses: Array<{
        mes: string
        aVencer: number
        quitado: number
        vencido: number
        total: number
    }>
    totais: {
        aVencer: number
        quitado: number
        vencido: number
        total: number
    }
    ano: number
}

const MESES_NOMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

// Cores do tema
const COLORS = {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#0f3460',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    white: '#ffffff',
}

async function initPdfMake() {
    const pdfMakeModule = await import('pdfmake/build/pdfmake')
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts')

    const pdfMake = pdfMakeModule.default || pdfMakeModule
    const pdfFonts = pdfFontsModule.default || pdfFontsModule

    // @ts-expect-error - pdfMake vfs assignment structure is dynamic
    pdfMake.vfs = (pdfFonts as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }).pdfMake?.vfs || (pdfFonts as { vfs?: Record<string, string> }).vfs || pdfFonts

    return pdfMake
}

export async function generatePDF({ contas, stats, periodo }: GeneratePDFParams) {
    const pdfMake = await initPdfMake()

    const [year, month] = periodo.split('-')
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    })

    const docDefinition: TDocumentDefinitions = {
        content: [
            {
                text: 'Relatório de Contas a Pagar',
                style: 'header',
                alignment: 'center',
            },
            {
                text: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                style: 'subheader',
                alignment: 'center',
                margin: [0, 0, 0, 20],
            },
            {
                text: 'Resumo',
                style: 'tableHeader',
                margin: [0, 10, 0, 5],
            },
            {
                table: {
                    widths: ['*', '*', '*', '*'],
                    body: [
                        [
                            { text: 'Total a Pagar', bold: true },
                            { text: 'Vencidas', bold: true },
                            { text: 'Total Pago', bold: true },
                            { text: 'Qtd. Pagas', bold: true },
                        ],
                        [
                            formatCurrency(stats.totalAPagar),
                            stats.totalVencidas.toString(),
                            formatCurrency(stats.totalPago),
                            stats.quantidadePagas.toString(),
                        ],
                    ],
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 20],
            },
            {
                text: 'Detalhamento de Contas',
                style: 'tableHeader',
                margin: [0, 10, 0, 5],
            },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Descrição', bold: true },
                            { text: 'Fornecedor', bold: true },
                            { text: 'Categoria', bold: true },
                            { text: 'Vencimento', bold: true },
                            { text: 'Valor', bold: true },
                        ],
                        ...contas.map((conta) => [
                            conta.descricao || 'Sem descrição',
                            conta.fornecedores?.nome || '-',
                            conta.tipos_despesa?.nome || '-',
                            formatDate(conta.data_vencimento),
                            formatCurrency(conta.valor_final),
                        ]),
                    ],
                },
                layout: {
                    fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f0f0f0' : null),
                },
            },
            {
                text: `Gerado em ${new Date().toLocaleString('pt-BR')}`,
                alignment: 'center',
                margin: [0, 20, 0, 0],
                fontSize: 8,
                color: '#666',
            },
        ],
        styles: {
            header: { fontSize: 18, bold: true },
            subheader: { fontSize: 14, color: '#666' },
            tableHeader: { fontSize: 14, bold: true },
        },
        defaultStyle: { fontSize: 10 },
    }

    pdfMake.createPdf(docDefinition).download(`relatorio-${periodo}.pdf`)
}

export async function generateAnnualPDF({ meses, totais, ano }: GenerateAnnualPDFParams) {
    const pdfMake = await initPdfMake()

    // Header da tabela
    // Header da tabela
    const tableHeader: TableCell[] = [
        { text: 'TRANSAÇÕES', style: 'tableHeaderCell', fillColor: COLORS.primary, color: COLORS.white },
        ...MESES_NOMES.map(mes => ({
            text: mes,
            style: 'tableHeaderCell',
            fillColor: COLORS.primary,
            color: COLORS.white,
            alignment: 'center' as Alignment
        })),
        { text: 'TOTAL', style: 'tableHeaderCell', fillColor: COLORS.secondary, color: COLORS.white, alignment: 'center' as Alignment },
    ]

    // Linha A Vencer
    // Linha A Vencer
    const aVencerRow: TableCell[] = [
        { text: 'A Vencer', style: 'rowLabel', color: COLORS.blue },
        ...meses.map(m => ({
            text: m.aVencer > 0 ? formatCurrency(m.aVencer) : '-',
            alignment: 'center' as Alignment,
            color: COLORS.blue,
            fontSize: 8,
        })),
        { text: formatCurrency(totais.aVencer), alignment: 'center' as Alignment, bold: true, color: COLORS.blue },
    ]

    // Linha Quitado
    // Linha Quitado
    const quitadoRow: TableCell[] = [
        { text: 'Quitado', style: 'rowLabel', color: COLORS.green },
        ...meses.map(m => ({
            text: m.quitado > 0 ? formatCurrency(m.quitado) : '-',
            alignment: 'center' as Alignment,
            color: COLORS.green,
            fontSize: 8,
        })),
        { text: formatCurrency(totais.quitado), alignment: 'center' as Alignment, bold: true, color: COLORS.green },
    ]

    // Linha Vencido
    // Linha Vencido
    const vencidoRow: TableCell[] = [
        { text: 'Vencido', style: 'rowLabel', color: COLORS.red },
        ...meses.map(m => ({
            text: m.vencido > 0 ? formatCurrency(m.vencido) : '-',
            alignment: 'center' as Alignment,
            color: COLORS.red,
            fontSize: 8,
        })),
        { text: formatCurrency(totais.vencido), alignment: 'center' as Alignment, bold: true, color: COLORS.red },
    ]

    // Linha Total
    // Linha Total
    const totalRow: TableCell[] = [
        { text: 'TOTAL', style: 'rowLabel', bold: true, fillColor: COLORS.lightGray },
        ...meses.map(m => ({
            text: m.total > 0 ? formatCurrency(m.total) : '-',
            alignment: 'center' as Alignment,
            bold: true,
            fillColor: COLORS.lightGray,
            fontSize: 8,
        })),
        { text: formatCurrency(totais.total), alignment: 'center' as Alignment, bold: true, fillColor: COLORS.accent, color: COLORS.white },
    ]

    const docDefinition: TDocumentDefinitions = {
        pageOrientation: 'landscape',
        pageSize: 'A4',
        pageMargins: [30, 40, 30, 40],
        content: [
            // Header com título
            {
                columns: [
                    {
                        text: 'RELATÓRIO MENSAL DAS CONTAS A PAGAR',
                        style: 'mainHeader',
                        width: '*',
                    },
                    {
                        text: `ANO: ${ano}`,
                        style: 'yearBadge',
                        width: 'auto',
                        alignment: 'right',
                    },
                ],
                margin: [0, 0, 0, 20],
            },

            // Cards de resumo
            {
                columns: [
                    {
                        stack: [
                            { text: 'TOTAL GERAL', style: 'cardLabel' },
                            { text: formatCurrency(totais.total), style: 'cardValue' },
                        ],
                        width: '*',
                        margin: [0, 0, 10, 0],
                    },
                    {
                        stack: [
                            { text: 'A VENCER', style: 'cardLabel' },
                            { text: formatCurrency(totais.aVencer), style: 'cardValueBlue' },
                        ],
                        width: '*',
                        margin: [0, 0, 10, 0],
                    },
                    {
                        stack: [
                            { text: 'QUITADO', style: 'cardLabel' },
                            { text: formatCurrency(totais.quitado), style: 'cardValueGreen' },
                        ],
                        width: '*',
                        margin: [0, 0, 10, 0],
                    },
                    {
                        stack: [
                            { text: 'VENCIDO', style: 'cardLabel' },
                            { text: formatCurrency(totais.vencido), style: 'cardValueRed' },
                        ],
                        width: '*',
                    },
                ],
                margin: [0, 0, 0, 25],
            },

            // Tabela principal
            {
                table: {
                    headerRows: 1,
                    widths: [80, ...Array(12).fill('*'), 55],
                    body: [
                        tableHeader,
                        aVencerRow,
                        quitadoRow,
                        vencidoRow,
                        totalRow,
                    ],
                },
                layout: {
                    hLineWidth: (i: number, node: { table: { body: Array<unknown> } }) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => COLORS.gray,
                    vLineColor: () => '#e5e7eb',
                    paddingTop: () => 8,
                    paddingBottom: () => 8,
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                },
            },

            // Rodapé
            {
                columns: [
                    {
                        text: `Gerado em ${new Date().toLocaleString('pt-BR')}`,
                        style: 'footer',
                        width: '*',
                    },
                    {
                        text: 'Sistema de Controle de Contas a Pagar',
                        style: 'footer',
                        width: 'auto',
                        alignment: 'right',
                    },
                ],
                margin: [0, 25, 0, 0],
            },
        ],
        styles: {
            mainHeader: {
                fontSize: 16,
                bold: true,
                color: COLORS.primary,
            },
            yearBadge: {
                fontSize: 14,
                bold: true,
                color: COLORS.accent,
            },
            cardLabel: {
                fontSize: 9,
                color: COLORS.gray,
                margin: [0, 0, 0, 4],
            },
            cardValue: {
                fontSize: 16,
                bold: true,
                color: COLORS.primary,
            },
            cardValueBlue: {
                fontSize: 16,
                bold: true,
                color: COLORS.blue,
            },
            cardValueGreen: {
                fontSize: 16,
                bold: true,
                color: COLORS.green,
            },
            cardValueRed: {
                fontSize: 16,
                bold: true,
                color: COLORS.red,
            },
            tableHeaderCell: {
                fontSize: 9,
                bold: true,
                margin: [0, 4, 0, 4],
            },
            rowLabel: {
                fontSize: 10,
                bold: true,
            },
            footer: {
                fontSize: 8,
                color: COLORS.gray,
            },
        },
        defaultStyle: {
            fontSize: 9,
        },
    }

    pdfMake.createPdf(docDefinition).download(`relatorio-anual-${ano}.pdf`)
}
