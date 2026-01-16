'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AnnualReportTableProps {
    data: {
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
    }
    ano: number
}

const MESES_ABREV = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export function AnnualReportTable({ data, ano }: AnnualReportTableProps) {
    const rows = [
        {
            label: 'A Vencer',
            key: 'aVencer' as const,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30'
        },
        {
            label: 'Quitado',
            key: 'quitado' as const,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
        },
        {
            label: 'Vencido',
            key: 'vencido' as const,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-950/30'
        },
    ]

    return (
        <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg">Relatório Mensal das Contas a Pagar</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Ano: <span className="font-semibold">{ano}</span>
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:px-6 sm:pb-6">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-3 px-2 font-semibold text-muted-foreground sticky left-0 bg-card z-10 min-w-[120px]">
                                TRANSAÇÕES
                            </th>
                            {MESES_ABREV.map((mes) => (
                                <th key={mes} className="text-center py-3 px-2 font-semibold min-w-[80px]">
                                    {mes}
                                </th>
                            ))}
                            <th className="text-center py-3 px-2 font-bold min-w-[100px] bg-muted/50">
                                TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key} className={cn("border-b hover:bg-muted/30 transition-colors", row.bgColor)}>
                                <td className={cn("py-3 px-2 font-medium sticky left-0 z-10", row.color, row.bgColor)}>
                                    {row.label}
                                </td>
                                {data.meses.map((mes, index) => (
                                    <td key={index} className={cn("text-center py-3 px-2", row.color)}>
                                        {mes[row.key] > 0 ? formatCurrency(mes[row.key]) : '-'}
                                    </td>
                                ))}
                                <td className={cn("text-center py-3 px-2 font-bold bg-muted/50", row.color)}>
                                    {formatCurrency(data.totais[row.key])}
                                </td>
                            </tr>
                        ))}
                        {/* Linha de Total */}
                        <tr className="bg-muted font-bold">
                            <td className="py-3 px-2 sticky left-0 bg-muted z-10">
                                TOTAL
                            </td>
                            {data.meses.map((mes, index) => (
                                <td key={index} className="text-center py-3 px-2">
                                    {mes.total > 0 ? formatCurrency(mes.total) : '-'}
                                </td>
                            ))}
                            <td className="text-center py-3 px-2 bg-primary/10">
                                {formatCurrency(data.totais.total)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
