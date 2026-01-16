import * as XLSX from 'xlsx'
import { formatCurrency, formatDate } from '@/lib/utils'

interface GenerateExcelParams {
    contas: Array<{
        descricao: string
        valor_final: number
        data_vencimento: string
        data_pagamento?: string | null
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
    porTipoDespesa: Array<{
        nome: string
        total: number
    }>
}

export async function generateExcel({ contas, stats, porTipoDespesa }: GenerateExcelParams) {
    // Workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Resumo
    const resumoData = [
        ['Relatório de Contas a Pagar'],
        [''],
        ['Métrica', 'Valor'],
        ['Total a Pagar', formatCurrency(stats.totalAPagar)],
        ['Contas Vencidas', stats.totalVencidas],
        ['Total Pago', formatCurrency(stats.totalPago)],
        ['Quantidade Pagas', stats.quantidadePagas],
    ]
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    // Sheet 2: Contas
    const contasData = [
        ['Descrição', 'Fornecedor', 'Categoria', 'Vencimento', 'Pagamento', 'Valor', 'Status'],
        ...contas.map((conta) => [
            conta.descricao,
            conta.fornecedores?.nome || '-',
            conta.tipos_despesa?.nome || '-',
            formatDate(conta.data_vencimento),
            conta.data_pagamento ? formatDate(conta.data_pagamento) : '-',
            conta.valor_final,
            conta.status,
        ]),
    ]
    const wsContas = XLSX.utils.aoa_to_sheet(contasData)
    XLSX.utils.book_append_sheet(wb, wsContas, 'Contas')

    // Sheet 3: Por Categoria
    const categoriaData = [
        ['Categoria', 'Total'],
        ...porTipoDespesa.map((item) => [item.nome, item.total]),
    ]
    const wsCategoria = XLSX.utils.aoa_to_sheet(categoriaData)
    XLSX.utils.book_append_sheet(wb, wsCategoria, 'Por Categoria')

    // Download
    XLSX.writeFile(wb, `relatorio-${new Date().toISOString().split('T')[0]}.xlsx`)
}
