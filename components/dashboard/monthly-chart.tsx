'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MonthlyChartProps {
    data: Array<{
        mes: string
        previsto: number
        pago: number
    }>
}

// Tooltip customizado
interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{
        value: number
        dataKey: string
    }>
    label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null

    const previsto = payload.find((p) => p.dataKey === 'previsto')?.value || 0
    const pago = payload.find((p) => p.dataKey === 'pago')?.value || 0
    const diff = previsto - pago
    const percentPago = previsto > 0 ? ((pago / previsto) * 100).toFixed(0) : 0

    return (
        <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
            <p className="font-semibold text-sm text-foreground mb-2 border-b border-border pb-2">
                {label}
            </p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                        <span className="text-xs text-muted-foreground">Previsto</span>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(previsto)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600" />
                        <span className="text-xs text-muted-foreground">Pago</span>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(pago)}</span>
                </div>
                <div className="pt-1.5 border-t border-border mt-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Execução</span>
                        <span className={`font-bold text-sm ${Number(percentPago) >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {percentPago}%
                        </span>
                    </div>
                    {diff !== 0 && (
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                                {diff > 0 ? 'Economia' : 'Excedente'}
                            </span>
                            <span className={`font-medium text-xs ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function MonthlyChart({ data }: MonthlyChartProps) {
    // Formatar mês para exibição (YYYY-MM -> MMM/YY)
    const formattedData = data.map((item) => {
        const [year, month] = item.mes.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        return {
            ...item,
            mesFormatado: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year.slice(2)}`,
        }
    })

    const maxValue = Math.max(...data.map(d => Math.max(d.previsto, d.pago)), 1000)

    // Calcular totais para o resumo
    const totalPrevisto = data.reduce((sum, d) => sum + d.previsto, 0)
    const totalPago = data.reduce((sum, d) => sum + d.pago, 0)
    const percentTotal = totalPrevisto > 0 ? ((totalPago / totalPrevisto) * 100).toFixed(0) : 0
    const tendencia = totalPago < totalPrevisto ? 'down' : totalPago > totalPrevisto ? 'up' : 'neutral'

    return (
        <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Comparação entre valores previstos e pagos
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            {tendencia === 'down' ? (
                                <TrendingDown className="h-4 w-4 text-emerald-500" />
                            ) : tendencia === 'up' ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : (
                                <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-lg sm:text-xl font-bold ${tendencia === 'down' ? 'text-emerald-500' :
                                tendencia === 'up' ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                {percentTotal}%
                            </span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                            do previsto
                        </span>
                    </div>
                </div>
                {/* Legenda customizada */}
                <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500 to-indigo-600" />
                        <span className="text-xs text-muted-foreground">Previsto</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-green-600" />
                        <span className="text-xs text-muted-foreground">Pago</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-2 pb-4 px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                        data={formattedData}
                        margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                        barCategoryGap="20%"
                    >
                        <defs>
                            <linearGradient id="gradientPrevisto" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="gradientPago" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border)"
                            strokeOpacity={0.5}
                        />
                        <XAxis
                            dataKey="mesFormatado"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--foreground)' }}
                            dy={8}
                        />
                        <YAxis
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--foreground)' }}
                            tickFormatter={(value) => {
                                if (value >= 1000) {
                                    return `${(value / 1000).toFixed(0)}k`
                                }
                                return `${value}`
                            }}
                            domain={[0, maxValue * 1.15]}
                            width={40}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'var(--accent)', opacity: 0.3, radius: 4 }}
                        />
                        <Bar
                            dataKey="previsto"
                            name="Previsto"
                            fill="url(#gradientPrevisto)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                        >
                            <LabelList
                                dataKey="previsto"
                                position="top"
                                fontSize={9}
                                fill="var(--muted-foreground)"
                                formatter={(value) => typeof value === 'number' && value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                className="hidden sm:block"
                            />
                        </Bar>
                        <Bar
                            dataKey="pago"
                            name="Pago"
                            fill="url(#gradientPago)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                        >
                            <LabelList
                                dataKey="pago"
                                position="top"
                                fontSize={9}
                                fill="var(--muted-foreground)"
                                formatter={(value) => typeof value === 'number' && value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                className="hidden sm:block"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

