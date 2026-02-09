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
    generateKPISection,
    generateAlertBox,
    REPORT_COLORS,
    type TableColumn,
    type ReportHeaderOptions,
} from './pdf-helpers'
import type { ExportConfig } from './types'

// Accounting Report Generators

interface AnalyticalLedgerData {
    accounts: Array<{
        account: { code: string; name: string }
        transactions: Array<{
            date: string
            description: string
            debit: number
            credit: number
            balance: number
        }>
        openingBalance: number
        closingBalance: number
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Razão Analítico (Analytical Ledger)
 * Enhanced with accounting style and totals
 */
export function generateAnalyticalLedgerPDF(
    data: AnalyticalLedgerData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Razão Analítico',
        subtitle: 'Movimentação Detalhada por Conta Contábil',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
        reportStyle: 'accounting',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // Calculate grand totals
    let grandTotalDebit = 0
    let grandTotalCredit = 0

    // Iterate through each account
    data.accounts.forEach((acc, index) => {
        if (index > 0) {
            content.push({ text: '', margin: [0, 20, 0, 0] as [number, number, number, number] })
        }

        // Account header with styled box
        content.push({
            table: {
                widths: ['*'],
                body: [[
                    {
                        text: `${acc.account.code} - ${acc.account.name}`,
                        bold: true,
                        fontSize: 11,
                        fillColor: REPORT_COLORS.bgHeader,
                        color: '#FFFFFF',
                        margin: [10, 8, 10, 8] as [number, number, number, number],
                    }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 5] as [number, number, number, number],
        })

        // Opening balance line
        content.push({
            table: {
                widths: ['auto', '*'],
                body: [[
                    { text: 'Saldo Inicial:', bold: true, fontSize: 9, border: [false, false, false, false] },
                    {
                        text: formatCurrency(acc.openingBalance),
                        fontSize: 9,
                        alignment: 'left' as const,
                        color: acc.openingBalance < 0 ? REPORT_COLORS.danger : REPORT_COLORS.textPrimary,
                        border: [false, false, false, false]
                    },
                ]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 5] as [number, number, number, number],
        })

        // Transactions table
        if (acc.transactions && acc.transactions.length > 0) {
            // Calculate account totals
            let accountDebit = 0
            let accountCredit = 0

            const tableData = acc.transactions.map((t) => {
                accountDebit += t.debit || 0
                accountCredit += t.credit || 0
                return {
                    data: formatDate(t.date),
                    descricao: t.description,
                    debito: t.debit > 0 ? formatCurrency(t.debit) : '',
                    credito: t.credit > 0 ? formatCurrency(t.credit) : '',
                    saldo: formatCurrency(t.balance),
                }
            })

            grandTotalDebit += accountDebit
            grandTotalCredit += accountCredit

            const columns: TableColumn[] = [
                { header: 'Data', dataKey: 'data', width: 65, alignment: 'center' },
                { header: 'Histórico', dataKey: 'descricao', width: '*', alignment: 'left' },
                { header: 'Débito', dataKey: 'debito', width: 85, alignment: 'right' },
                { header: 'Crédito', dataKey: 'credito', width: 85, alignment: 'right' },
                { header: 'Saldo', dataKey: 'saldo', width: 85, alignment: 'right' },
            ]

            content.push(generateTable(tableData, columns, {
                headerBgColor: REPORT_COLORS.primaryDark,
                alternateRowColors: true
            }))

            // Account totals row
            content.push({
                table: {
                    widths: ['*', 85, 85, 85],
                    body: [[
                        { text: 'TOTAL DA CONTA:', bold: true, fontSize: 9, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted },
                        { text: formatCurrency(accountDebit), bold: true, fontSize: 9, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted },
                        { text: formatCurrency(accountCredit), bold: true, fontSize: 9, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted },
                        { text: formatCurrency(acc.closingBalance), bold: true, fontSize: 9, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted, color: acc.closingBalance < 0 ? REPORT_COLORS.danger : REPORT_COLORS.success },
                    ]]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 10] as [number, number, number, number],
            })
        } else {
            content.push({
                text: 'Sem movimentações no período.',
                fontSize: 9,
                italics: true,
                color: REPORT_COLORS.textMuted,
                margin: [0, 5, 0, 10] as [number, number, number, number],
            })
        }
    })

    // Grand totals section
    if (data.accounts.length > 1) {
        content.push({
            text: '',
            margin: [0, 20, 0, 0] as [number, number, number, number],
        })
        content.push({
            table: {
                widths: ['*', 100, 100],
                body: [
                    [
                        { text: 'RESUMO GERAL', bold: true, fontSize: 11, fillColor: REPORT_COLORS.primary, color: '#FFFFFF', colSpan: 3, alignment: 'center' as const },
                        { text: '' }, { text: '' }
                    ],
                    [
                        { text: 'Total de Débitos:', fontSize: 10, alignment: 'right' as const },
                        { text: formatCurrency(grandTotalDebit), bold: true, fontSize: 10, alignment: 'right' as const },
                        { text: '' }
                    ],
                    [
                        { text: 'Total de Créditos:', fontSize: 10, alignment: 'right' as const },
                        { text: formatCurrency(grandTotalCredit), bold: true, fontSize: 10, alignment: 'right' as const },
                        { text: '' }
                    ],
                    [
                        { text: 'Diferença:', fontSize: 10, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted },
                        { text: formatCurrency(grandTotalDebit - grandTotalCredit), bold: true, fontSize: 10, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted, color: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01 ? REPORT_COLORS.success : REPORT_COLORS.danger },
                        { text: '', fillColor: REPORT_COLORS.bgMuted }
                    ],
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 0] as [number, number, number, number],
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

interface TrialBalanceData {
    accounts: Array<{
        code: string
        name: string
        debit: number
        credit: number
        debitBalance: number
        creditBalance: number
    }>
    totals: {
        totalDebit: number
        totalCredit: number
        totalDebitBalance: number
        totalCreditBalance: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Balancete (Trial Balance)
 */
export function generateTrialBalancePDF(
    data: TrialBalanceData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Balancete de Verificação',
        subtitle: 'Demonstrativo Contábil',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Accounts table
    const tableData = data.accounts.map((acc) => ({
        codigo: acc.code,
        conta: acc.name,
        debito: acc.debit > 0 ? formatCurrency(acc.debit) : '-',
        credito: acc.credit > 0 ? formatCurrency(acc.credit) : '-',
        saldo_devedor: acc.debitBalance > 0 ? formatCurrency(acc.debitBalance) : '-',
        saldo_credor: acc.creditBalance > 0 ? formatCurrency(acc.creditBalance) : '-',
    }))

    const columns: TableColumn[] = [
        { header: 'Código', dataKey: 'codigo', width: 60, alignment: 'left' },
        { header: 'Conta', dataKey: 'conta', width: '*', alignment: 'left' },
        { header: 'Débito', dataKey: 'debito', width: 80, alignment: 'right' },
        { header: 'Crédito', dataKey: 'credito', width: 80, alignment: 'right' },
        { header: 'Saldo Devedor', dataKey: 'saldo_devedor', width: 90, alignment: 'right' },
        { header: 'Saldo Credor', dataKey: 'saldo_credor', width: 90, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns, {
        alternateRowColors: true
    }))

    // Totals section
    content.push({
        text: 'Totais',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const totalItems = [
        { label: 'Total Débito', value: formatCurrency(data.totals.totalDebit) },
        { label: 'Total Crédito', value: formatCurrency(data.totals.totalCredit) },
        { label: 'Total Saldo Devedor', value: formatCurrency(data.totals.totalDebitBalance), highlight: true },
        { label: 'Total Saldo Credor', value: formatCurrency(data.totals.totalCreditBalance), highlight: true },
    ]
    const totalsSection = generateSummarySection('Resumo dos Totais', totalItems)
    content.push(...(Array.isArray(totalsSection) ? totalsSection : [totalsSection]))

    // Verification note
    const isBalanced = Math.abs(data.totals.totalDebit - data.totals.totalCredit) < 0.01
    content.push({
        text: isBalanced
            ? '✓ Balancete equilibrado: Total Débito = Total Crédito'
            : '⚠ Atenção: Balancete desbalanceado',
        margin: [0, 15, 0, 0] as [number, number, number, number],
        fontSize: 10,
        color: isBalanced ? '#059669' : '#dc2626',
        bold: true,
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

// Analytical Report Generators

interface InterestDiscountData {
    transactions: Array<{
        accountDescription: string
        supplier: string
        originalValue: number
        finalValue: number
        interest: number
        discount: number
        dueDate: string
        paymentDate: string
    }>
    totals: {
        totalOriginalValue: number
        totalFinalValue: number
        totalInterest: number
        totalDiscount: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Interest and Discount Analysis
 */
export function generateInterestDiscountPDF(
    data: InterestDiscountData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Análise de Juros e Descontos',
        subtitle: 'Relatório Analítico Financeiro',
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
        { label: 'Valor Original Total', value: formatCurrency(data.totals.totalOriginalValue) },
        { label: 'Valor Final Total', value: formatCurrency(data.totals.totalFinalValue) },
        { label: 'Total de Juros', value: formatCurrency(data.totals.totalInterest), highlight: data.totals.totalInterest > 0 },
        { label: 'Total de Descontos', value: formatCurrency(data.totals.totalDiscount), highlight: data.totals.totalDiscount > 0 },
    ]
    const summary = generateSummarySection('Resumo Geral', summaryItems)
    content.push(...(Array.isArray(summary) ? summary : [summary]))

    // Transactions table
    content.push({
        text: 'Detalhamento de Transações',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const tableData = data.transactions.map((t) => ({
        descricao: t.accountDescription,
        fornecedor: t.supplier,
        valor_original: formatCurrency(t.originalValue),
        juros: t.interest > 0 ? formatCurrency(t.interest) : '-',
        desconto: t.discount > 0 ? formatCurrency(t.discount) : '-',
        valor_final: formatCurrency(t.finalValue),
        vencimento: formatDate(t.dueDate),
        pagamento: formatDate(t.paymentDate),
    }))

    const columns: TableColumn[] = [
        { header: 'Descrição', dataKey: 'descricao', width: '*', alignment: 'left' },
        { header: 'Fornecedor', dataKey: 'fornecedor', width: 80, alignment: 'left' },
        { header: 'Valor Original', dataKey: 'valor_original', width: 70, alignment: 'right' },
        { header: 'Juros', dataKey: 'juros', width: 60, alignment: 'right' },
        { header: 'Desconto', dataKey: 'desconto', width: 60, alignment: 'right' },
        { header: 'Valor Final', dataKey: 'valor_final', width: 70, alignment: 'right' },
        { header: 'Vencimento', dataKey: 'vencimento', width: 70, alignment: 'center' },
        { header: 'Pagamento', dataKey: 'pagamento', width: 70, alignment: 'center' },
    ]

    content.push(generateTable(tableData, columns))

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

interface MultiCompanyData {
    companies: Array<{
        company: { id: string; name: string }
        accounts: number
        totalValue: number
        totalPaid: number
        totalPending: number
    }>
    consolidated: {
        totalCompanies: number
        totalAccounts: number
        totalValue: number
        totalPaid: number
        totalPending: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Multi-Company Consolidated Report
 */
export function generateMultiCompanyPDF(
    data: MultiCompanyData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Consolidado Multi-Empresa',
        subtitle: 'Visão Consolidada de Múltiplas Empresas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    // Consolidated summary
    const summaryItems = [
        { label: 'Total de Empresas', value: data.consolidated.totalCompanies },
        { label: 'Total de Contas', value: data.consolidated.totalAccounts },
        { label: 'Valor Total Consolidado', value: formatCurrency(data.consolidated.totalValue), highlight: true },
        { label: 'Valor Pago', value: formatCurrency(data.consolidated.totalPaid) },
        { label: 'Valor Pendente', value: formatCurrency(data.consolidated.totalPending) },
    ]
    const summary = generateSummarySection('Resumo Consolidado', summaryItems)
    content.push(...(Array.isArray(summary) ? summary : [summary]))

    // Company breakdown
    content.push({
        text: 'Detalhamento por Empresa',
        style: 'sectionTitle',
        margin: [0, 20, 0, 10] as [number, number, number, number],
    })

    const tableData = data.companies.map((c) => ({
        empresa: c.company.name,
        contas: c.accounts,
        total: formatCurrency(c.totalValue),
        pago: formatCurrency(c.totalPaid),
        pendente: formatCurrency(c.totalPending),
        percentual: formatPercent((c.totalValue / data.consolidated.totalValue) * 100),
    }))

    const columns: TableColumn[] = [
        { header: 'Empresa', dataKey: 'empresa', width: '*', alignment: 'left' },
        { header: 'Contas', dataKey: 'contas', width: 50, alignment: 'center' },
        { header: 'Total', dataKey: 'total', width: 90, alignment: 'right' },
        { header: 'Pago', dataKey: 'pago', width: 90, alignment: 'right' },
        { header: 'Pendente', dataKey: 'pendente', width: 90, alignment: 'right' },
        { header: '% do Total', dataKey: 'percentual', width: 70, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns))

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

interface TaxObligationsData {
    obligations: Array<{
        data_emissao: string
        descricao: string
        valor_final: number
        fornecedores?: {
            nome: string
            cnpj_cpf: string
        }
        tipos_despesa?: {
            nome: string
        }
    }>
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Tax Obligations Report
 */
export function generateTaxObligationsPDF(
    data: TaxObligationsData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Obrigações Fiscais',
        subtitle: 'Relatório para Contabilidade',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        generatedAt: new Date(),
    }

    const content = []
    content.push(generateReportHeader(headerOptions))

    const tableData = data.obligations.map((o) => ({
        data: formatDate(o.data_emissao),
        fornecedor: o.fornecedores?.nome || 'N/A',
        cnpj: o.fornecedores?.cnpj_cpf || 'N/A',
        descricao: o.descricao,
        categoria: o.tipos_despesa?.nome || 'N/A',
        valor: formatCurrency(o.valor_final),
    }))

    const columns: TableColumn[] = [
        { header: 'Data', dataKey: 'data', width: 70, alignment: 'center' },
        { header: 'Fornecedor', dataKey: 'fornecedor', width: '*', alignment: 'left' },
        { header: 'CNPJ/CPF', dataKey: 'cnpj', width: 100, alignment: 'center' },
        { header: 'Descrição', dataKey: 'descricao', width: 120, alignment: 'left' },
        { header: 'Categoria', dataKey: 'categoria', width: 100, alignment: 'left' },
        { header: 'Valor', dataKey: 'valor', width: 80, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns))

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

interface PaymentAuditData {
    auditLogs: Array<{
        data_pagamento: string
        descricao: string
        valor_final: number
        fornecedores?: { nome: string; cnpj_cpf: string }
        bancos?: { nome: string }
        empresas?: { nome_fantasia: string }
        forma_pagamento?: string
    }>
    totals: {
        count: number
        value: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Payment Audit Report
 */
export function generatePaymentAuditPDF(
    data: PaymentAuditData,
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Auditoria de Pagamentos',
        subtitle: 'Registro Detalhado de Pagamentos',
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
        { label: 'Total de Pagamentos', value: data.totals.count },
        { label: 'Valor Total Pago', value: formatCurrency(data.totals.value), highlight: true },
    ]
    const summary = generateSummarySection('Resumo', summaryItems)
    content.push(...(Array.isArray(summary) ? summary : [summary]))

    // Logs table
    const tableData = data.auditLogs.map((log) => ({
        data: formatDate(log.data_pagamento),
        empresa: log.empresas?.nome_fantasia || '-',
        favorecido: log.fornecedores?.nome || '-',
        documento: log.fornecedores?.cnpj_cpf || '-',
        banco: log.bancos?.nome || '-',
        valor: formatCurrency(log.valor_final),
    }))

    const columns: TableColumn[] = [
        { header: 'Data', dataKey: 'data', width: 70, alignment: 'center' },
        { header: 'Empresa Pagadora', dataKey: 'empresa', width: 100, alignment: 'left' },
        { header: 'Favorecido', dataKey: 'favorecido', width: '*', alignment: 'left' },
        { header: 'CPF/CNPJ', dataKey: 'documento', width: 90, alignment: 'center' },
        { header: 'Banco/Origem', dataKey: 'banco', width: 80, alignment: 'left' },
        { header: 'Valor Pago', dataKey: 'valor', width: 80, alignment: 'right' },
    ]

    content.push(generateTable(tableData, columns))

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

// Interface para Demonstrativo por Caixa
interface CashFlowStatementData {
    accounts: Array<{
        id: string
        codigo: string
        descricao: string
        tipo: string
        nivel: number
        modo: string
        valor: number
        total: number
    }>
    totals: {
        receitas: number
        despesas: number
        aplicacao: number
    }
    period: {
        startDate: string
        endDate: string
    }
}

/**
 * Generates PDF for Demonstrativo por Caixa (Cash Flow Statement)
 * Hierarchical layout with synthetic/analytic accounts
 */
export function generateCashFlowStatementPDF(
    data: CashFlowStatementData & { companyInfo?: { name: string; cnpjCpf: string } | null },
    config: ExportConfig
): TDocumentDefinitions {
    const docDef = getDefaultDocumentDefinition()

    const headerOptions: ReportHeaderOptions = {
        title: 'Demonstrativo por Caixa',
        subtitle: 'Fluxo de Caixa por Plano de Contas',
        period: {
            start: data.period.startDate,
            end: data.period.endDate,
        },
        companyName: data.companyInfo?.name,
        companyCnpjCpf: data.companyInfo?.cnpjCpf,
        generatedAt: new Date(),
        reportStyle: 'accounting',
    }

    const content: any[] = []
    content.push(generateReportHeader(headerOptions))

    // Filtrar contas zeradas se opção ativa
    const hideZeroValues = config.filters?.customFilters?.hideZeroValues || false
    const filteredAccounts = hideZeroValues
        ? data.accounts.filter(account => account.total !== 0)
        : data.accounts

    // Colunas da tabela
    const tableHeaders = [
        { text: 'Conta do Fluxo de Caixa', style: 'tableHeader', alignment: 'left' as const },
        { text: 'Nível', style: 'tableHeader', alignment: 'center' as const, width: 40 },
        { text: 'Modo', style: 'tableHeader', alignment: 'center' as const, width: 70 },
        { text: 'Valor R$', style: 'tableHeader', alignment: 'right' as const, width: 100 },
    ]

    // Construir linhas da tabela
    const tableBody: any[][] = [tableHeaders]

    filteredAccounts.forEach((account) => {
        const isSynthetic = account.modo === 'SINTETICA'
        const indentation = (account.nivel - 1) * 10 // Indentação baseada no nível

        // Cor de fundo para contas sintéticas
        const fillColor = isSynthetic ? REPORT_COLORS.bgMuted : undefined
        const fontWeight = isSynthetic ? true : false

        // Formatar código + descrição com indentação
        const codigoDesc = `${account.codigo} - ${account.descricao}`

        // Determinar cor do valor (negativo = vermelho)
        const valorColor = account.total < 0 ? REPORT_COLORS.danger : '#333333'

        tableBody.push([
            {
                text: codigoDesc,
                margin: [indentation, 2, 0, 2],
                bold: fontWeight,
                fontSize: isSynthetic ? 9 : 8,
                fillColor,
            },
            {
                text: account.nivel.toString(),
                alignment: 'center' as const,
                fontSize: 8,
                fillColor,
            },
            {
                text: account.modo === 'SINTETICA' ? 'Sintético' : 'Analítico',
                alignment: 'center' as const,
                fontSize: 8,
                fillColor,
                color: isSynthetic ? REPORT_COLORS.primary : REPORT_COLORS.textMuted,
            },
            {
                text: formatCurrency(account.total),
                alignment: 'right' as const,
                bold: fontWeight,
                fontSize: isSynthetic ? 9 : 8,
                fillColor,
                color: valorColor,
            },
        ])
    })

    // Adicionar tabela
    content.push({
        table: {
            headerRows: 1,
            widths: ['*', 40, 70, 100],
            body: tableBody,
        },
        layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0.3),
            vLineWidth: () => 0.3,
            hLineColor: () => REPORT_COLORS.border,
            vLineColor: () => REPORT_COLORS.border,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
        },
        margin: [0, 10, 0, 20],
    })

    // Seção de Totais
    content.push({
        table: {
            widths: ['*', 120],
            body: [
                [
                    { text: 'RESUMO GERAL', bold: true, fontSize: 11, fillColor: REPORT_COLORS.primary, color: '#FFFFFF', colSpan: 2, alignment: 'center' as const },
                    { text: '' }
                ],
                [
                    { text: 'Total Receitas:', fontSize: 10, alignment: 'right' as const },
                    { text: formatCurrency(data.totals.receitas), bold: true, fontSize: 10, alignment: 'right' as const, color: REPORT_COLORS.success },
                ],
                [
                    { text: 'Total Despesas:', fontSize: 10, alignment: 'right' as const },
                    { text: formatCurrency(data.totals.despesas), bold: true, fontSize: 10, alignment: 'right' as const, color: REPORT_COLORS.danger },
                ],
                [
                    { text: 'Total Aplicações:', fontSize: 10, alignment: 'right' as const },
                    { text: formatCurrency(data.totals.aplicacao), bold: true, fontSize: 10, alignment: 'right' as const, color: REPORT_COLORS.info },
                ],
                [
                    { text: 'Saldo:', fontSize: 10, alignment: 'right' as const, fillColor: REPORT_COLORS.bgMuted },
                    {
                        text: formatCurrency(data.totals.receitas - data.totals.despesas - data.totals.aplicacao),
                        bold: true,
                        fontSize: 10,
                        alignment: 'right' as const,
                        fillColor: REPORT_COLORS.bgMuted,
                        color: (data.totals.receitas - data.totals.despesas - data.totals.aplicacao) < 0 ? REPORT_COLORS.danger : REPORT_COLORS.success
                    },
                ],
            ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 10, 0, 0],
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
