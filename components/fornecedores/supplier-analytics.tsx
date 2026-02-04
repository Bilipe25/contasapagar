'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'
import {
    TrendingUp,
    DollarSign,
    CreditCard,
    Receipt,
    Wallet,
    PieChart as PieChartIcon,
    ArrowUpRight,
    Calendar,
    Filter,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SupplierAnalyticsProps {
    fornecedorId: string
}

export function SupplierAnalytics({ fornecedorId }: SupplierAnalyticsProps) {
    const [range, setRange] = useState(12)
    const { data: analytics, isLoading } = trpc.fornecedores.analytics.useQuery({
        fornecedorId,
        range
    })

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        )
    }

    if (!analytics || analytics.kpis.totalContas === 0) {
        return (
            <div className="text-center py-12">
                <div className="bg-muted/30 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">Sem dados suficientes</h3>
                <p className="text-sm text-muted-foreground">
                    Adicione contas a este fornecedor para gerar insights.
                </p>
            </div>
        )
    }

    const { monthlyHistory, categoryDistribution, kpis } = analytics

    // Format monthly data for chart
    const chartData = monthlyHistory.map(item => ({
        month: format(parseISO(item.month + '-01'), 'MMM', { locale: ptBR }).toUpperCase(),
        fullMonth: format(parseISO(item.month + '-01'), 'MMMM yyyy', { locale: ptBR }),
        value: item.amount
    }))

    const RADIAN = Math.PI / 180
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)

        return percent > 0.1 ? (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        ) : null
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Visão Geral de Gastos
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                            <Filter className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6">Últimos 6 meses</SelectItem>
                            <SelectItem value="12">Últimos 12 meses</SelectItem>
                            <SelectItem value="24">Últimos 24 meses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="shadow-none border bg-muted/20">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground flex items-center gap-1.5">
                            <Wallet className="h-3 w-3" />
                            Ticket Médio
                        </span>
                        <span className="text-xl font-bold tracking-tight">
                            {formatCurrency(kpis.averageTicket)}
                        </span>
                    </CardContent>
                </Card>
                <Card className="shadow-none border bg-muted/20">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground flex items-center gap-1.5">
                            <Receipt className="h-3 w-3" />
                            Maior Conta
                        </span>
                        <span className="text-xl font-bold tracking-tight">
                            {formatCurrency(kpis.maxBillAmount)}
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly History */}
                <Card className="shadow-none border-none">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Histórico Mensal
                        </CardTitle>
                        <CardDescription>
                            Evolução de gastos nos últimos {range} meses
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="month" // Changed to short month
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(value) => `R$${value / 1000}k`}
                                    width={40}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload
                                            return (
                                                <div className="bg-popover border border-border shadow-sm rounded-lg p-2 text-xs">
                                                    <p className="font-semibold text-foreground mb-1">{data.fullMonth}</p>
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                                        <span className="font-mono font-medium">
                                                            {formatCurrency(payload[0].value as number)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card className="shadow-none border-none">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-primary" />
                            Distribuição por Categoria
                        </CardTitle>
                        <CardDescription>
                            Representatividade das categorias
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {categoryDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} stroke="hsl(var(--background))" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data: any = payload[0].payload
                                            return (
                                                <div className="bg-popover border border-border shadow-sm rounded-lg p-2 text-xs">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
                                                        <span className="font-semibold text-foreground">{data.name}</span>
                                                    </div>
                                                    <span className="font-mono text-muted-foreground block">
                                                        {formatCurrency(data.value)}
                                                    </span>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                    {/* Compact Legend */}
                    <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-[60px] overflow-y-auto custom-scrollbar">
                        {categoryDistribution.map((cat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px] bg-muted/40 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="truncate max-w-[80px] text-muted-foreground">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            {/* Status Breakdown */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="shadow-none border bg-emerald-50/50 dark:bg-emerald-950/10">
                    <CardContent className="p-3 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Pago
                        </span>
                        <span className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(kpis.statusBreakdown?.paid || 0)}
                        </span>
                    </CardContent>
                </Card>
                <Card className="shadow-none border bg-amber-50/50 dark:bg-amber-950/10">
                    <CardContent className="p-3 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Pendente
                        </span>
                        <span className="text-lg font-bold tracking-tight text-amber-700 dark:text-amber-300">
                            {formatCurrency(kpis.statusBreakdown?.pending || 0)}
                        </span>
                    </CardContent>
                </Card>
                <Card className="shadow-none border bg-red-50/50 dark:bg-red-950/10">
                    <CardContent className="p-3 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasado
                        </span>
                        <span className="text-lg font-bold tracking-tight text-red-700 dark:text-red-300">
                            {formatCurrency(kpis.statusBreakdown?.overdue || 0)}
                        </span>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
