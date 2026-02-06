'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ContasStatsProps {
    stats?: {
        total: number
        pendentes: number
        valorPendente: number
        vencidas: number
        valorVencido: number
        pagas: number
        valorPago: number
        totalJuros?: number
        totalDescontos?: number
    }
    isLoading?: boolean
}

export function ContasStats({ stats, isLoading }: ContasStatsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
        )
    }

    if (!stats) return null

    const totalJuros = stats.totalJuros || 0
    const totalDescontos = stats.totalDescontos || 0
    const impactoFinanceiro = totalJuros - totalDescontos
    const temAjustes = totalJuros > 0 || totalDescontos > 0

    const cards = [
        {
            title: 'Total de Contas',
            value: stats.total,
            subValue: `${stats.pendentes} pendentes`,
            icon: DollarSign,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            title: 'Valor Pendente',
            value: formatCurrency(stats.valorPendente),
            subValue: `${stats.pendentes} contas`,
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            title: 'Contas Vencidas',
            value: stats.vencidas,
            subValue: formatCurrency(stats.valorVencido),
            icon: AlertTriangle,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-900/30',
            highlight: stats.vencidas > 0,
        },
        {
            title: 'Pagas no Mês',
            value: stats.pagas,
            subValue: formatCurrency(stats.valorPago),
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        },
    ]

    // Adicionar card de impacto financeiro apenas se houver ajustes
    if (temAjustes) {
        cards.push({
            title: 'Impacto Financeiro',
            value: formatCurrency(Math.abs(impactoFinanceiro)),
            subValue: totalJuros > 0 || totalDescontos > 0
                ? `${totalJuros > 0 ? '+' + formatCurrency(totalJuros) : ''} ${totalDescontos > 0 ? '-' + formatCurrency(totalDescontos) : ''}`.trim()
                : 'Sem ajustes',
            icon: impactoFinanceiro > 0 ? AlertTriangle : CheckCircle,
            color: impactoFinanceiro > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400',
            bgColor: impactoFinanceiro > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30',
        })
    }

    return (
        <div className={`grid gap-2 grid-cols-2 ${temAjustes ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card
                        key={card.title}
                        className={`transition-all hover:shadow-md ${card.highlight ? 'border-red-300 dark:border-red-800' : ''
                            }`}
                    >
                        <CardContent className="p-3 lg:p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                                        {card.title}
                                    </p>
                                    <p className="text-base lg:text-2xl font-bold mt-0.5 lg:mt-1 truncate">
                                        {card.value}
                                    </p>
                                    <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                                        {card.subValue}
                                    </p>
                                </div>
                                <div className={`rounded-full p-2 lg:p-3 ${card.bgColor} hidden lg:block`}>
                                    <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
