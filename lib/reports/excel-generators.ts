'use client'

import ExcelJS from 'exceljs'
import { formatCurrency, formatDate, formatPercent } from './pdf-helpers'
import type { ExportConfig } from './types'

/**
 * Generates an Excel file for Monthly Detailed Report
 */
export function generateMonthlyDetailedExcel(data: any, config: ExportConfig): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        try {
            const workbook = new ExcelJS.Workbook()
            workbook.creator = 'Sistema Contas a Pagar'
            workbook.created = new Date()

            const worksheet = workbook.addWorksheet('Relatório Mensal')

            // HEADER SECTION
            worksheet.mergeCells('A1:G1')
            const titleCell = worksheet.getCell('A1')
            titleCell.value = 'Relatório Mensal Detalhado'
            titleCell.font = { size: 16, bold: true, color: { argb: 'FF1f2937' } }
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
            worksheet.getRow(1).height = 30

            // Period
            worksheet.mergeCells('A2:G2')
            const periodCell = worksheet.getCell('A2')
            periodCell.value = `Período: ${formatDate(data.period.startDate)} a ${formatDate(data.period.endDate)}`
            periodCell.font = { size: 11, italic: true }
            periodCell.alignment = { horizontal: 'center' }

            // Generated date
            worksheet.mergeCells('A3:G3')
            const dateCell = worksheet.getCell('A3')
            dateCell.value = `Gerado em: ${formatDate(new Date())}`
            dateCell.font = { size: 9, color: { argb: 'FF6b7280' } }
            dateCell.alignment = { horizontal: 'right' }

            // Empty row
            worksheet.addRow([])

            // SUMMARY SECTION
            const summaryRow = worksheet.addRow(['Resumo Geral'])
            summaryRow.font = { size: 13, bold: true }
            summaryRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFe5e7eb' }
            }

            worksheet.addRow(['Total de Contas:', data.totals.totalAccounts])
            worksheet.addRow(['Total de Parcelas:', data.totals.totalInstallments])
            worksheet.addRow(['Valor Total:', formatCurrency(data.totals.totalValue)])
            worksheet.addRow(['Valor Pago:', formatCurrency(data.totals.totalPaid)])
            worksheet.addRow(['Valor Pendente:', formatCurrency(data.totals.totalPending)])

            // Empty row
            worksheet.addRow([])

            // STATUS DISTRIBUTION
            if (data.byStatus && data.byStatus.length > 0) {
                const statusHeaderRow = worksheet.addRow(['Distribuição por Status'])
                statusHeaderRow.font = { size: 13, bold: true }
                statusHeaderRow.getCell(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFe5e7eb' }
                }

                const statusHeaders = worksheet.addRow(['Status', 'Quantidade', 'Valor Total'])
                statusHeaders.font = { bold: true }
                statusHeaders.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF3b82f6' }
                    }
                    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                })

                data.byStatus.forEach((status: any) => {
                    const row = worksheet.addRow([
                        getStatusLabel(status.status),
                        status.count,
                        formatCurrency(status.total)
                    ])
                    row.eachCell((cell, idx) => {
                        if (idx === 2) cell.alignment = { horizontal: 'center' }
                        if (idx === 3) cell.alignment = { horizontal: 'right' }
                    })
                })

                worksheet.addRow([])
            }

            // DETAILED TABLE
            if (config.detailLevel !== 'resumido' && data.contas && data.contas.length > 0) {
                const detailHeaderRow = worksheet.addRow(['Detalhamento das Contas'])
                detailHeaderRow.font = { size: 13, bold: true }
                detailHeaderRow.getCell(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFe5e7eb' }
                }

                const headers = worksheet.addRow([
                    'Descrição',
                    'Fornecedor',
                    'Categoria',
                    'Valor',
                    'Parcela',
                    'Status',
                    'Vencimento'
                ])
                headers.font = { bold: true }
                headers.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF3b82f6' }
                    }
                    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                })

                data.contas.forEach((conta: any, index: number) => {
                    const row = worksheet.addRow([
                        conta.descricao || '-',
                        conta.fornecedores?.nome || '-',
                        conta.tipos_despesa?.nome || '-',
                        formatCurrency(conta.valor_total),
                        `${conta.parcela_atual || 0}/${conta.total_parcelas || 0}`,
                        getStatusLabel(conta.status),
                        conta.proxima_parcela?.data_vencimento
                            ? formatDate(conta.proxima_parcela.data_vencimento)
                            : '-'
                    ])

                    // Zebra striping
                    if (index % 2 === 0) {
                        row.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFf3f4f6' }
                            }
                        })
                    }

                    // Alignments
                    row.getCell(4).alignment = { horizontal: 'right' }
                    row.getCell(5).alignment = { horizontal: 'center' }
                    row.getCell(6).alignment = { horizontal: 'center' }
                    row.getCell(7).alignment = { horizontal: 'center' }
                })
            }

            // Column widths
            worksheet.columns = [
                { width: 30 },  // Descrição
                { width: 20 },  // Fornecedor
                { width: 18 },  // Categoria
                { width: 15 },  // Valor
                { width: 12 },  // Parcela
                { width: 12 },  // Status
                { width: 15 },  // Vencimento
            ]

            // Generate blob
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            resolve(blob)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * Generates Excel for Supplier Consolidated Report
 */
export function generateSupplierConsolidatedExcel(data: any, config: ExportConfig): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        try {
            const workbook = new ExcelJS.Workbook()
            workbook.creator = 'Sistema Contas a Pagar'
            workbook.created = new Date()

            const worksheet = workbook.addWorksheet('Consolidado por Fornecedor')

            // HEADER
            worksheet.mergeCells('A1:F1')
            const titleCell = worksheet.getCell('A1')
            titleCell.value = 'Consolidado por Fornecedor'
            titleCell.font = { size: 16, bold: true, color: { argb: 'FF1f2937' } }
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
            worksheet.getRow(1).height = 30

            // Period
            worksheet.mergeCells('A2:F2')
            const periodCell = worksheet.getCell('A2')
            periodCell.value = `Período: ${formatDate(data.period.startDate)} a ${formatDate(data.period.endDate)}`
            periodCell.font = { size: 11, italic: true }
            periodCell.alignment = { horizontal: 'center' }

            worksheet.addRow([])

            // SUMMARY
            const summaryRow = worksheet.addRow(['Resumo Geral'])
            summaryRow.font = { size: 13, bold: true }
            summaryRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFe5e7eb' }
            }

            worksheet.addRow(['Total de Fornecedores:', data.suppliers.length])
            worksheet.addRow(['Total de Contas:', data.totals.totalAccounts])
            worksheet.addRow(['Valor Total:', formatCurrency(data.totals.totalValue)])
            worksheet.addRow(['Valor Pago:', formatCurrency(data.totals.totalPaid)])
            worksheet.addRow(['Valor Pendente:', formatCurrency(data.totals.totalPending)])

            worksheet.addRow([])

            // TABLE
            const headerRow = worksheet.addRow(['Fornecedor', 'Contas', 'Total', 'Pago', 'Pendente', '%'])
            headerRow.font = { bold: true }
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF3b82f6' }
                }
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
            })

            data.suppliers.forEach((s: any, index: number) => {
                const percentual = (s.totalValue / data.totals.totalValue) * 100
                const row = worksheet.addRow([
                    s.supplier.nome || 'Sem Fornecedor',
                    s.accounts.length,
                    formatCurrency(s.totalValue),
                    formatCurrency(s.totalPaid),
                    formatCurrency(s.totalPending),
                    formatPercent(percentual)
                ])

                if (index % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFf3f4f6' }
                        }
                    })
                }

                row.getCell(2).alignment = { horizontal: 'center' }
                row.getCell(3).alignment = { horizontal: 'right' }
                row.getCell(4).alignment = { horizontal: 'right' }
                row.getCell(5).alignment = { horizontal: 'right' }
                row.getCell(6).alignment = { horizontal: 'right' }
            })

            worksheet.columns = [
                { width: 30 },
                { width: 12 },
                { width: 18 },
                { width: 18 },
                { width: 18 },
                { width: 12 },
            ]

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            resolve(blob)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * Generates CSV export for any report
 */
export function generateCSV(data: any[], headers: string[]): Blob {
    // CSV Header
    let csv = headers.join(',') + '\n'

    // CSV Rows
    data.forEach((row) => {
        const values = headers.map((header) => {
            const value = row[header.toLowerCase().replace(/ /g, '_')]

            // Escape commas and quotes
            if (value === null || value === undefined) return ''
            const stringValue = String(value)
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
        })
        csv += values.join(',') + '\n'
    })

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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

/**
 * Legacy-compatible generateExcel function for relatorios page
 * Adapts old interface to new generateMonthlyDetailedExcel
 */
interface LegacyExcelData {
    contas: any[]
    stats: {
        totalAPagar: number
        totalVencidas: number
        totalPago: number
        quantidadePagas: number
    }
    porTipoDespesa?: any[]
}

export async function generateExcel(data: LegacyExcelData): Promise<void> {
    // Adapt legacy data format to new format
    const adaptedData = {
        contas: data.contas,
        totals: {
            totalAccounts: data.contas.length,
            totalValue: data.stats.totalAPagar,
            totalPaid: data.stats.totalPago,
            totalPending: data.stats.totalVencidas,
            totalInstallments: data.contas.reduce((acc, c) => acc + (c.total_parcelas || 1), 0),
        },
        byStatus: [],
        period: {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
        },
    }

    // Create minimal config
    const config = {
        detailLevel: 'normal' as const,
    } as any

    const blob = await generateMonthlyDetailedExcel(adaptedData, config)

    // Download the file
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
}


export interface GenericExcelData {
    title: string
    period: { startDate: string; endDate: string }
    summary: Array<{ label: string; value: string | number }>
    columns: Array<{ header: string; key: string; width?: number; format?: string }>
    data: any[]
}

/**
 * Generates a Generic Excel file for any report type
 */
export function generateGenericExcel(data: GenericExcelData): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        try {
            const workbook = new ExcelJS.Workbook()
            workbook.creator = 'Sistema Contas a Pagar'
            workbook.created = new Date()

            const worksheet = workbook.addWorksheet('Relatório')

            // HEADER
            worksheet.mergeCells('A1:E1')
            const titleCell = worksheet.getCell('A1')
            titleCell.value = data.title
            titleCell.font = { size: 16, bold: true, color: { argb: 'FF1f2937' } }
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
            worksheet.getRow(1).height = 30

            // Period
            worksheet.mergeCells('A2:E2')
            const periodCell = worksheet.getCell('A2')
            periodCell.value = `Período: ${formatDate(data.period.startDate)} a ${formatDate(data.period.endDate)}`
            periodCell.font = { size: 11, italic: true }
            periodCell.alignment = { horizontal: 'center' }

            worksheet.addRow([])

            // SUMMARY
            if (data.summary && data.summary.length > 0) {
                const summaryRow = worksheet.addRow(['Resumo'])
                summaryRow.font = { size: 13, bold: true }
                summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe5e7eb' } }

                data.summary.forEach(item => {
                    worksheet.addRow([item.label, item.value])
                })
                worksheet.addRow([])
            }

            // TABLE
            const columns = data.columns.map(c => c.header)
            const headerRow = worksheet.addRow(columns)
            headerRow.font = { bold: true }
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } }
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
            })

            // Data Rows
            data.data.forEach((item: any, index: number) => {
                const rowValues = data.columns.map(col => item[col.key])
                const row = worksheet.addRow(rowValues)

                // Zebra striping
                if (index % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf3f4f6' } }
                    })
                }
            })

            // Auto-width (basic approximation)
            worksheet.columns = data.columns.map(c => ({ width: c.width || 20 }))

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

            resolve(blob)
        } catch (error) {
            reject(error)
        }
    })
}
