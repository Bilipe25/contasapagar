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
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface AnnualBarChartProps {
    data: Array<{
        mes: string
        aVencer: number
        quitado: number
        vencido: number
    }>
    ano: number
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Tooltip customizado
interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string }>
    label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null

    const aVencer = payload.find((p: any) => p.dataKey === 'aVencer')?.value || 0
    const quitado = payload.find((p: any) => p.dataKey === 'quitado')?.value || 0
    const vencido = payload.find((p: any) => p.dataKey === 'vencido')?.value || 0
    const total = aVencer + quitado + vencido
    const percentQuitado = total > 0 ? ((quitado / total) * 100).toFixed(0) : 0

    return (
        <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
            <p className="font-semibold text-sm text-foreground mb-2 border-b border-border pb-2">
                {label}
            </p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                        <span className="text-xs text-muted-foreground">A Vencer</span>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(aVencer)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600" />
                        <span className="text-xs text-muted-foreground">Quitado</span>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(quitado)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600" />
                        <span className="text-xs text-muted-foreground">Vencido</span>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(vencido)}</span>
                </div>
                <div className="pt-1.5 border-t border-border mt-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-bold text-sm">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Quitado</span>
                        <span className={`font-bold text-sm ${Number(percentQuitado) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {percentQuitado}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function AnnualBarChart({ data, ano }: AnnualBarChartProps) {
    const chartData = data.map((item, index) => ({
        ...item,
        mesLabel: MESES_ABREV[index],
    }))

    const maxValue = Math.max(
        ...data.map(d => d.aVencer + d.quitado + d.vencido),
        1000
    )

    // Calcular totais para o resumo
    const totalQuitado = data.reduce((sum, d) => sum + d.quitado, 0)
    const totalVencido = data.reduce((sum, d) => sum + d.vencido, 0)
    const totalAVencer = data.reduce((sum, d) => sum + d.aVencer, 0)
    const totalGeral = totalQuitado + totalVencido + totalAVencer
    const percentQuitado = totalGeral > 0 ? ((totalQuitado / totalGeral) * 100).toFixed(0) : 0

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg">Evolução Anual - {ano}</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Comparativo mensal por status
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            {Number(percentQuitado) >= 80 ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : totalVencido > 0 ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                            )}
                            <span className={`text-lg sm:text-xl font-bold ${Number(percentQuitado) >= 80 ? 'text-emerald-500' :
                                totalVencido > 0 ? 'text-amber-500' : 'text-blue-500'
                                }`}>
                                {percentQuitado}%
                            </span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                            quitado
                        </span>
                    </div>
                </div>
                {/* Legenda customizada */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-gradient-to-r from-blue-500 to-indigo-600" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">A Vencer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-green-600" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Quitado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-gradient-to-r from-red-500 to-rose-600" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Vencido</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-2 pb-4 px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                        barCategoryGap="15%"
                    >
                        <defs>
                            <linearGradient id="gradientAVencer" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="gradientQuitado" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="gradientVencido" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                <stop offset="100%" stopColor="#f87171" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--border))"
                            strokeOpacity={0.5}
                        />
                        <XAxis
                            dataKey="mesLabel"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            dy={5}
                        />
                        <YAxis
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => {
                                if (value >= 1000) {
                                    return `${(value / 1000).toFixed(0)}k`
                                }
                                return `${value}`
                            }}
                            domain={[0, maxValue * 1.15]}
                            width={35}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3, radius: 4 }}
                        />
                        <Bar
                            dataKey="aVencer"
                            name="A Vencer"
                            fill="url(#gradientAVencer)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                        />
                        <Bar
                            dataKey="quitado"
                            name="Quitado"
                            fill="url(#gradientQuitado)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                        />
                        <Bar
                            dataKey="vencido"
                            name="Vencido"
                            fill="url(#gradientVencido)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

