'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { PieChartIcon } from 'lucide-react'

interface CategoryChartProps {
    data: Array<{
        nome: string
        cor: string
        total: number
    }>
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

// Tooltip customizado
interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{
        name: string
        value: number
        payload: {
            color: string
            totalGeral: number
        }
    }>
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null

    const item = payload[0]
    const total = payload[0]?.payload?.totalGeral || 0
    const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0

    return (
        <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[160px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.payload.color }}
                />
                <span className="font-semibold text-sm text-foreground">
                    {item.name}
                </span>
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">Valor</span>
                    <span className="font-bold text-sm">{formatCurrency(item.value)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">Participação</span>
                    <span className="font-bold text-sm text-primary">{percent}%</span>
                </div>
            </div>
        </div>
    )
}

export function CategoryChart({ data }: CategoryChartProps) {
    const chartData = data.map((item, index) => {
        // Se a cor for vazia, nula, ou a cor cinza padrão do backend, usar cor do array
        const isDefaultGray = !item.cor || item.cor === '#6b7280' || item.cor === ''
        const color = isDefaultGray ? COLORS[index % COLORS.length] : item.cor

        return {
            name: item.nome,
            value: item.total,
            color,
        }
    })

    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    // Adicionar totalGeral para uso no tooltip
    const chartDataWithTotal = chartData.map(item => ({
        ...item,
        totalGeral: total,
    }))

    // Encontrar a maior categoria
    const maiorCategoria = chartData.reduce((max, item) =>
        item.value > max.value ? item : max,
        { name: '', value: 0, color: '' }
    )
    const percentMaior = total > 0 ? ((maiorCategoria.value / total) * 100).toFixed(0) : 0

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg">Distribuição por Categoria</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Análise de gastos por tipo de despesa
                        </p>
                    </div>
                    {chartData.length > 0 && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: maiorCategoria.color }}
                                />
                                <span className="text-lg sm:text-xl font-bold text-foreground">
                                    {percentMaior}%
                                </span>
                            </div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                                {maiorCategoria.name}
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
                {chartData.length === 0 ? (
                    <div className="flex h-[250px] sm:h-[300px] items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <PieChartIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium text-sm sm:text-base">Nenhum dado disponível</p>
                            <p className="text-xs sm:text-sm">Adicione contas para visualizar a distribuição</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={260} className="sm:hidden">
                            <PieChart>
                                <Pie
                                    data={chartDataWithTotal}
                                    cx="50%"
                                    cy="42%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {chartDataWithTotal.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            stroke="var(--background)"
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="horizontal"
                                    align="center"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                    formatter={(value: string) => (
                                        <span className="text-[10px] text-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <ResponsiveContainer width="100%" height={320} className="hidden sm:block">
                            <PieChart>
                                <Pie
                                    data={chartDataWithTotal}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={75}
                                    outerRadius={115}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                                    }
                                    labelLine={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                                >
                                    {chartDataWithTotal.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            stroke="var(--background)"
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="horizontal"
                                    align="center"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ paddingTop: '15px' }}
                                    formatter={(value: string) => (
                                        <span className="text-xs text-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centro do donut */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '50px' }}>
                            <div className="text-center bg-background/80 rounded-full p-3">
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                                <p className="text-sm sm:text-base font-bold">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

