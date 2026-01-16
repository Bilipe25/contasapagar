'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface AnnualSummaryCardsProps {
    totais: {
        aVencer: number
        quitado: number
        vencido: number
        total: number
    }
}

export function AnnualSummaryCards({ totais }: AnnualSummaryCardsProps) {
    const cards = [
        {
            label: 'Total Geral',
            value: totais.total,
            icon: DollarSign,
            color: 'text-foreground',
            bgColor: 'bg-muted',
            borderColor: 'border-l-primary',
        },
        {
            label: 'A Vencer',
            value: totais.aVencer,
            icon: Clock,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            borderColor: 'border-l-blue-500',
        },
        {
            label: 'Quitado',
            value: totais.quitado,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
            borderColor: 'border-l-emerald-500',
        },
        {
            label: 'Vencido',
            value: totais.vencido,
            icon: AlertTriangle,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-900/30',
            borderColor: 'border-l-red-500',
        },
    ]

    return (
        <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.label} className={`border-l-4 ${card.borderColor}`}>
                        <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">
                                        {card.label}
                                    </p>
                                    <p className={`text-base sm:text-xl font-bold mt-0.5 sm:mt-1 truncate ${card.color}`}>
                                        {formatCurrency(card.value)}
                                    </p>
                                </div>
                                <div className={`rounded-lg p-1.5 sm:p-2 ${card.bgColor} hidden sm:block`}>
                                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
