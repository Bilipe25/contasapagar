
import * as XLSX from 'xlsx'
import { formatCurrency, formatDate } from '@/lib/utils'

interface GenerateExcelParams {
    conta: any
}

export function generateContaExcel({ conta }: GenerateExcelParams) {
    const wb = XLSX.utils.book_new()

    // 1. Dados da Empresa e Fornecedor
    const empresaNome = conta.empresas?.nome_fantasia || conta.empresas?.razao_social || 'Minha Empresa'
    const fornecedorNome = conta.fornecedores?.nome || conta.fornecedores?.razao_social || 'Fornecedor não informado'

    // 2. Lógica de Vencimento
    let labelVencimento = 'Data de Vencimento'
    let dataVencimentoDisplay = conta.data_vencimento
    const isPaid = conta.status === 'quitada' || conta.status === 'pago'

    if (conta.parcelas && conta.parcelas.length > 0 && !isPaid) {
        const parcelasPendentes = conta.parcelas
            .filter((p: any) => p.status !== 'pago' && p.status !== 'cancelado')
            .sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())

        if (parcelasPendentes.length > 0) {
            labelVencimento = 'Próximo Vencimento'
            dataVencimentoDisplay = parcelasPendentes[0].data_vencimento
        }
    } else if (conta.proxima_parcela && !isPaid) {
        labelVencimento = 'Próximo Vencimento'
        dataVencimentoDisplay = conta.proxima_parcela.data_vencimento
    }

    // Preparar dados
    const dadosGerais = [
        ['DEMONSTRATIVO DE CONTA'],
        [''],
        ['DADOS DA CONTA'],
        ['Descrição', conta.descricao],
        ['Fornecedor', fornecedorNome],
        ['CNPJ/CPF Fornecedor', conta.fornecedores?.cnpj_cpf || '-'],
        ['Banco / Portador', conta.bancos?.nome || '-'],
        ['Categoria', conta.tipos_despesa?.nome || '-'],
        [''],
        ['DADOS DA EMPRESA (PAGADOR)'],
        ['Empresa', empresaNome],
        ['CNPJ Empresa', conta.empresas?.cnpj || '-'],
        [''],
        ['DETALHES DE PAGAMENTO'],
        ['Data de Emissão', formatDate(conta.data_emissao)],
        [labelVencimento, dataVencimentoDisplay ? formatDate(dataVencimentoDisplay) : '-'],
        ['Data de Competência', conta.data_competencia ? formatDate(conta.data_competencia) : '-'],
        ['Status', conta.status.toUpperCase()],
        ['Observações', conta.observacoes || '-'],
        [''],
        ['RESUMO FINANCEIRO'],
        ['Valor Original', formatCurrency(conta.valor_total || conta.valor)],
        ['Valor Pago', formatCurrency(conta.valor_pago || 0)],
        ['Valor Total a Pagar', formatCurrency(conta.valor_final || conta.valor_total || conta.valor)],
    ]

    // Criar planilha de detalhes
    const ws = XLSX.utils.aoa_to_sheet(dadosGerais)

    // Ajustar larguras
    const wscols = [
        { wch: 25 }, // A (Labels)
        { wch: 50 }, // B (Values)
    ]
    ws['!cols'] = wscols

    // Se tiver parcelas, adicionar
    if (conta.parcelas && conta.parcelas.length > 0) {
        XLSX.utils.sheet_add_aoa(ws, [[''], ['DETALHAMENTO DE PARCELAS'], ['Número', 'Vencimento', 'Status', 'Data Pagamento', 'Valor']], { origin: -1 })

        const parcelasData = conta.parcelas.map((p: any) => [
            p.numero_parcela,
            formatDate(p.data_vencimento),
            p.status.toUpperCase(),
            p.data_pagamento ? formatDate(p.data_pagamento) : '-',
            formatCurrency(p.valor_final || p.valor),
        ])

        XLSX.utils.sheet_add_aoa(ws, parcelasData, { origin: -1 })
    }

    XLSX.utils.book_append_sheet(wb, ws, "Detalhes da Conta")

    // Download
    XLSX.writeFile(wb, `conta-${conta.descricao ? conta.descricao.substring(0, 15).replace(/[^a-z0-9]/gi, '_') : 'detalhes'}.xlsx`)
}

interface GenerateReportParams {
    contas: any[]
    stats: any
    porTipoDespesa: any[]
}

export function generateExcel({ contas, stats, porTipoDespesa }: GenerateReportParams) {
    const wb = XLSX.utils.book_new()

    // 1. Aba de Resumo
    const resumoData = [
        ['RESUMO DO PERÍODO'],
        [''],
        ['Total a Pagar', formatCurrency(stats.totalAPagar)],
        ['Total Vencido', formatCurrency(stats.totalVencidas)],
        ['Total Pago', formatCurrency(stats.totalPago)],
        ['Quantidade de Contas Pagas', stats.quantidadePagas],
        [''],
        ['TOP CATEGORIAS'],
        ['Categoria', 'Valor Total', 'Quantidade'],
        ...porTipoDespesa.slice(0, 5).map((c: any) => [c.categoria, formatCurrency(c.total), c.quantidade])
    ]

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
    wsResumo['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo")

    // 2. Aba de Contas
    const headers = ['Descrição', 'Fornecedor', 'Categoria', 'Vencimento', 'Valor', 'Status', 'Observações']
    const contasData = [
        headers,
        ...contas.map((c: any) => [
            c.descricao,
            c.fornecedores?.nome || c.fornecedores?.razao_social || '-',
            c.tipos_despesa?.nome || '-',
            formatDate(c.data_vencimento),
            formatCurrency(c.valor_final || c.valor),
            c.status.toUpperCase(),
            c.observacoes || '-'
        ])
    ]

    const wsContas = XLSX.utils.aoa_to_sheet(contasData)
    wsContas['!cols'] = [
        { wch: 40 }, // Descrição
        { wch: 30 }, // Fornecedor
        { wch: 20 }, // Categoria
        { wch: 12 }, // Vencimento
        { wch: 15 }, // Valor
        { wch: 10 }, // Status
        { wch: 40 }  // Observações
    ]
    XLSX.utils.book_append_sheet(wb, wsContas, "Relatório de Contas")

    // Download
    XLSX.writeFile(wb, `relatorio-contas-${new Date().toISOString().split('T')[0]}.xlsx`)
}
