'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface StatsCardsProps {
    stats?: {
        totalAPagar: number
        totalVencidas: number
        totalPago: number
        quantidadePagas: number
    }
}

export function StatsCards({ stats }: StatsCardsProps) {
    const router = useRouter()

    if (!stats) return null

    const handleCardClick = (filter?: string) => {
        if (filter) {
            router.push(`/contas?status=${filter}`)
        } else {
            router.push('/contas')
        }
    }

    const cards = [
        {
            title: 'Total a Pagar',
            value: formatCurrency(stats.totalAPagar),
            icon: DollarSign,
            description: 'Contas pendentes este mês',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            borderColor: 'border-l-blue-500',
            filter: 'ativa',
            clickable: true,
        },
        {
            title: 'Contas Vencidas',
            value: stats.totalVencidas,
            icon: AlertCircle,
            description: 'Contas em atraso',
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-900/30',
            borderColor: 'border-l-red-500',
            highlight: stats.totalVencidas > 0,
            filter: 'vencidas',
            clickable: true,
        },
        {
            title: 'Total Pago',
            value: formatCurrency(stats.totalPago),
            icon: TrendingUp,
            description: `${stats.quantidadePagas} contas pagas`,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
            borderColor: 'border-l-emerald-500',
            filter: 'quitada',
            clickable: true,
        },
        {
            title: 'Economia',
            value: formatCurrency(0),
            icon: TrendingDown,
            description: 'Pagamentos antecipados',
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-100 dark:bg-violet-900/30',
            borderColor: 'border-l-violet-500',
            clickable: false,
        },
    ]

    return (
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card
                        key={card.title}
                        className={cn(
                            "border-l-2 lg:border-l-4 transition-all min-w-0 shadow-sm",
                            card.borderColor,
                            card.highlight && "animate-pulse",
                            card.clickable && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        )}
                        onClick={() => card.clickable && handleCardClick(card.filter)}
                        role={card.clickable ? "button" : undefined}
                        tabIndex={card.clickable ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (card.clickable && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                handleCardClick(card.filter)
                            }
                        }}
                        aria-label={card.clickable ? `${card.title}: ${card.value}. Clique para ver detalhes.` : undefined}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 lg:p-4 lg:pb-1.5">
                            <CardTitle className="text-[10px] lg:text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">
                                {card.title}
                            </CardTitle>
                            <div className={cn(`rounded-md p-1 ${card.bgColor} shrink-0`, "hidden lg:block")}>
                                <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
                            <div className="text-base sm:text-lg lg:text-2xl font-bold tracking-tight truncate leading-none">
                                {card.value}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate hidden sm:block">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
