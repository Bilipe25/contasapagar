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

interface GenerateContaPDFParams {
    conta: any
}

export async function generateContaPDF({ conta }: GenerateContaPDFParams) {
    const pdfMake = await initPdfMake()

    // 1. Correção: Acessar 'empresas' (plural) conforme retorno do Supabase
    const empresaNome = conta.empresas?.nome_fantasia || conta.empresas?.razao_social || 'Minha Empresa'
    const empresaCNPJ = conta.empresas?.cnpj || ''

    // Fornecedor
    const fornecedorNome = conta.fornecedores?.nome || conta.fornecedores?.razao_social || 'Fornecedor não informado'

    // Status
    const isPaid = conta.status === 'quitada' || conta.status === 'pago'
    const docStatus = isPaid ? 'PAGO' : (isVencido(conta.data_vencimento) ? 'VENCIDO' : 'PENDENTE')
    const statusColor = isPaid ? COLORS.green : (isVencido(conta.data_vencimento) ? COLORS.red : COLORS.blue)

    // Lógica para Data de Vencimento Inteligente
    let headerVencimento = 'VENCIMENTO'
    let dataVencimentoDisplay = conta.data_vencimento

    // Se tiver parcelas carregadas
    if (conta.parcelas && conta.parcelas.length > 0 && !isPaid) {
        // Ordena por data
        const parcelasPendentes = conta.parcelas
            .filter((p: any) => p.status !== 'pago' && p.status !== 'cancelado')
            .sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())

        if (parcelasPendentes.length > 0) {
            headerVencimento = 'PRÓXIMO VENCIMENTO'
            dataVencimentoDisplay = parcelasPendentes[0].data_vencimento
        } else {
            // Se não tem pendentes, pega a última data
            const ultimas = conta.parcelas.sort((a: any, b: any) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime())
            dataVencimentoDisplay = ultimas[0]?.data_vencimento || conta.data_vencimento
        }
    } else if (conta.proxima_parcela && !isPaid) {
        // Se veio do objeto 'list' que tem 'proxima_parcela'
        headerVencimento = 'PRÓXIMO VENCIMENTO'
        dataVencimentoDisplay = conta.proxima_parcela.data_vencimento
    }


    // Definição das parcelas (Tabela)
    const parcelasSection = []
    if (conta.parcelas && conta.parcelas.length > 0) {
        parcelasSection.push(
            { text: 'DETALHAMENTO DE PARCELAS', style: 'sectionHeader', margin: [0, 20, 0, 8] as [number, number, number, number] },
            {
                table: {
                    headerRows: 1,
                    widths: [30, 80, 80, '*', 90], // Larguras ajustadas
                    body: [
                        [
                            { text: '#', style: 'tableHeaderSmall', alignment: 'center' },
                            { text: 'Vencimento', style: 'tableHeaderSmall' },
                            { text: 'Status', style: 'tableHeaderSmall' },
                            { text: 'Pagamento', style: 'tableHeaderSmall' },
                            { text: 'Valor', style: 'tableHeaderSmall', alignment: 'right' },
                        ],
                        ...conta.parcelas.map((p: any) => [
                            { text: p.numero_parcela ? `${p.numero_parcela}` : '-', style: 'tableCellSmall', alignment: 'center' },
                            { text: formatDate(p.data_vencimento), style: 'tableCellSmall' },
                            {
                                text: p.status.toUpperCase(),
                                style: 'tableCellSmall',
                                color: p.status === 'pago' ? COLORS.green : (p.status === 'atrasado' ? COLORS.red : COLORS.primary)
                            },
                            { text: p.data_pagamento ? formatDate(p.data_pagamento) : '-', style: 'tableCellSmall' },
                            { text: formatCurrency(p.valor_final || p.valor), style: 'tableCellSmall', alignment: 'right' },
                        ])
                    ]
                },
                layout: {
                    hLineWidth: (i: number) => 1,
                    vLineWidth: (i: number) => 0,
                    hLineColor: (i: number) => i === 0 || i === 1 ? '#e5e7eb' : '#f3f4f6',
                    fillColor: (i: number) => i % 2 === 0 ? null : '#fafafa' // Zebra striping sutil
                }
            }
        )
    }

    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            // Header Topo
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: 'DEMONSTRATIVO DE CONTA A PAGAR', style: 'header' },
                            {
                                text: [
                                    { text: 'Emitido em: ', color: COLORS.gray },
                                    { text: formatDate(new Date()), bold: true }
                                ],
                                style: 'subHeaderSmall'
                            }
                        ]
                    },
                    {
                        width: 'auto',
                        table: {
                            body: [
                                [{ text: docStatus, style: 'statusBadge', fillColor: statusColor, color: 'white' }]
                            ]
                        },
                        layout: 'noBorders'
                    }
                ],
                margin: [0, 0, 0, 15]
            },

            // Linha divisória
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLORS.primary }] },

            // Info Blocks (Pagador / Beneficiário)
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'PAGADOR (EMPRESA)', style: 'label' },
                            { text: empresaNome, style: 'value' },
                            { text: empresaCNPJ ? `CNPJ: ${empresaCNPJ}` : 'CNPJ não informado', style: 'subValue' },
                            { text: conta.empresas?.email || '', style: 'subValue' }
                        ],
                        margin: [0, 15, 10, 0]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'BENEFICIÁRIO (FORNECEDOR)', style: 'label' },
                            { text: fornecedorNome, style: 'value' },
                            { text: conta.fornecedores?.cnpj_cpf ? `CPF/CNPJ: ${conta.fornecedores.cnpj_cpf}` : 'Documento não informado', style: 'subValue' },
                            { text: conta.fornecedores?.email || '', style: 'subValue' }
                        ],
                        margin: [10, 15, 0, 0]
                    }
                ]
            },

            // Detalhes da Conta (Grid Compacto e limpo)
            { text: 'DADOS DA CONTA', style: 'sectionHeader', margin: [0, 25, 0, 8] },
            {
                table: {
                    widths: ['33%', '33%', '33%'],
                    body: [
                        [
                            { text: headerVencimento, style: 'fieldLabel' },
                            { text: 'BANCO / PORTADOR', style: 'fieldLabel' },
                            { text: 'CATEGORIA', style: 'fieldLabel' },
                        ],
                        [
                            { text: dataVencimentoDisplay ? formatDate(dataVencimentoDisplay) : '-', style: 'fieldValueHighlight' },
                            { text: conta.bancos?.nome || '-', style: 'fieldValue' },
                            { text: conta.tipos_despesa?.nome || '-', style: 'fieldValue' },
                        ],
                        [
                            { text: 'COMPETÊNCIA', style: 'fieldLabel', margin: [0, 10, 0, 2] },
                            { text: 'DATA EMISSÃO', style: 'fieldLabel', margin: [0, 10, 0, 2] },
                            { text: '', style: 'fieldLabel', margin: [0, 10, 0, 2] },
                        ],
                        [
                            { text: conta.data_competencia ? formatDate(conta.data_competencia) : '-', style: 'fieldValue' },
                            { text: formatDate(conta.data_emissao), style: 'fieldValue' },
                            { text: '', style: 'fieldValue' },
                        ]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }] },

            // Descrição e Observações
            {
                margin: [0, 15, 0, 0],
                table: {
                    widths: ['100%'],
                    body: [
                        [{ text: 'DESCRIÇÃO', style: 'fieldLabel' }],
                        [{ text: conta.descricao, style: 'fieldValue', margin: [0, 0, 0, 10] }],
                        [{ text: 'OBSERVAÇÕES', style: 'fieldLabel' }],
                        [{ text: conta.observacoes || 'Nenhuma observação registrada.', style: 'fieldValueSmall' }]
                    ]
                },
                layout: 'noBorders'
            },

            // Parcelas (Se houver)
            ...parcelasSection,

            // Resumo Financeiro
            { text: 'RESUMO FINANCEIRO', style: 'sectionHeader', margin: [0, 25, 0, 8] },
            {
                columns: [
                    { width: '*', text: '' }, // Espaço vazio para alinhar à direita
                    {
                        width: 'auto',
                        table: {
                            widths: [140, 110],
                            body: [
                                [
                                    { text: 'Valor Original', style: 'moneyLabel' },
                                    { text: formatCurrency(conta.valor_total || conta.valor), style: 'moneyValue' }
                                ],
                                [
                                    { text: 'Descontos', style: 'moneyLabel' },
                                    { text: '-', style: 'moneyValueGray' }
                                ],
                                [
                                    { text: 'Juros / Multa', style: 'moneyLabel' },
                                    { text: '-', style: 'moneyValueGray' }
                                ],
                                // Totais com destaque
                                [
                                    { text: 'VALOR PAGO', style: 'moneyLabel', color: isPaid ? COLORS.green : COLORS.gray },
                                    { text: formatCurrency(conta.valor_pago || 0), style: 'moneyValue', color: isPaid ? COLORS.green : COLORS.gray }
                                ],
                                [
                                    { text: 'TOTAL A PAGAR', style: 'totalLabel', fillColor: '#f8fafc' },
                                    { text: formatCurrency(conta.valor_final || conta.valor_total || conta.valor), style: 'totalValue', fillColor: '#f8fafc' }
                                ]
                            ]
                        },
                        layout: {
                            hLineWidth: (i) => i === 4 ? 1 : 0,
                            vLineWidth: () => 0,
                            hLineColor: () => '#e2e8f0'
                        }
                    }
                ]
            },

            // Footer
            {
                text: [
                    'Este documento é apenas um demonstrativo de controle interno.\n',
                    'Gerado automaticamente pelo Sistema de Controle de Contas.'
                ],
                style: 'footer',
                alignment: 'center',
                margin: [0, 60, 0, 0]
            }
        ],
        styles: {
            header: { fontSize: 16, bold: true, color: COLORS.primary },
            subHeaderSmall: { fontSize: 9, color: COLORS.gray, margin: [0, 2, 0, 0] },
            statusBadge: { fontSize: 10, bold: true, alignment: 'center', margin: [10, 3, 10, 3] },

            label: { fontSize: 8, color: COLORS.gray, bold: true, margin: [0, 0, 0, 2] },
            value: { fontSize: 10, color: COLORS.primary, bold: true },
            subValue: { fontSize: 9, color: COLORS.gray },

            sectionHeader: { fontSize: 11, bold: true, color: COLORS.accent, margin: [0, 0, 0, 0] },

            fieldLabel: { fontSize: 8, color: COLORS.gray, bold: true, margin: [0, 2, 0, 2], opacity: 0.8 },
            fieldValue: { fontSize: 10, color: COLORS.primary, margin: [0, 0, 0, 5] },
            fieldValueHighlight: { fontSize: 10, color: COLORS.primary, bold: true, margin: [0, 0, 0, 5] },
            fieldValueSmall: { fontSize: 9, color: COLORS.gray, italics: true },

            tableHeaderSmall: { fontSize: 8, bold: true, color: COLORS.gray, fillColor: '#f1f5f9', margin: [0, 6, 0, 6] },
            tableCellSmall: { fontSize: 9, color: COLORS.primary, margin: [0, 6, 0, 6] },

            moneyLabel: { fontSize: 9, color: COLORS.gray, alignment: 'right', margin: [0, 4, 10, 4] },
            moneyValue: { fontSize: 10, color: COLORS.primary, alignment: 'right', bold: true, margin: [0, 4, 0, 4] },
            moneyValueGray: { fontSize: 10, color: '#94a3b8', alignment: 'right', margin: [0, 4, 0, 4] },

            totalLabel: { fontSize: 11, color: COLORS.primary, alignment: 'right', bold: true, margin: [0, 10, 10, 10] },
            totalValue: { fontSize: 13, color: COLORS.primary, alignment: 'right', bold: true, margin: [0, 10, 0, 10] },

            footer: { fontSize: 7, color: '#94a3b8', italics: true, lineHeight: 1.3 },
        },
        defaultStyle: {
            font: 'Roboto'
        }
    }

    pdfMake.createPdf(docDefinition).download(`conta-${conta.id.slice(0, 8)}.pdf`)
}

function isVencido(dataStr: string): boolean {
    if (!dataStr) return false
    const venc = new Date(dataStr)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return venc < hoje
}
