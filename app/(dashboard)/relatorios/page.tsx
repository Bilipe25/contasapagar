'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useAppStore } from '@/lib/store/use-app-store'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FileDown, FileSpreadsheet, BarChart3, PieChart, Loader2, Calendar, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { CategoryChart } from '@/components/relatorios/category-chart'
import { AnnualReportTable } from '@/components/relatorios/annual-report-table'
import { AnnualBarChart } from '@/components/relatorios/annual-bar-chart'
import { AnnualSummaryCards } from '@/components/relatorios/annual-summary-cards'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { generatePDF, generateAnnualPDF } from '@/lib/reports/pdf-generator'
import { generateExcel } from '@/lib/reports/excel-generator'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Gerar últimos 12 meses para o seletor
function getLast12Months() {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
        const date = subMonths(now, i)
        const value = format(date, 'yyyy-MM')
        const label = format(date, "MMMM 'de' yyyy", { locale: ptBR })
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return months
}

// Gerar anos disponíveis (5 anos passados + atual + próximo)
function getAvailableYears() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        years.push(i)
    }
    return years
}

export default function RelatoriosPage() {
    const { mesSelecionado, setMesSelecionado } = useAppStore()
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [activeTab, setActiveTab] = useState('anual')

    const months = getLast12Months()
    const years = getAvailableYears()

    // Queries para visão mensal
    const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({ mes: mesSelecionado })
    const { data: graficoData, isLoading: graficoLoading } = trpc.dashboard.graficoMensal.useQuery()
    const { data: porTipoDespesa, isLoading: categoriaLoading } = trpc.dashboard.porTipoDespesa.useQuery({ mes: mesSelecionado })
    const { data: contas } = trpc.contas.list.useQuery({})

    // Query para visão anual
    const { data: relatorioAnual, isLoading: anualLoading } = trpc.dashboard.relatorioAnual.useQuery(
        { ano: selectedYear },
        { enabled: activeTab === 'anual' }
    )

    const handleExportPDF = async () => {
        try {
            setIsGeneratingPDF(true)

            if (activeTab === 'anual' && relatorioAnual) {
                // PDF do relatório anual
                await generateAnnualPDF({
                    meses: relatorioAnual.meses,
                    totais: relatorioAnual.totais,
                    ano: selectedYear,
                })
            } else {
                // PDF do relatório mensal
                await generatePDF({
                    contas: contas || [],
                    stats: stats || { totalAPagar: 0, totalVencidas: 0, totalPago: 0, quantidadePagas: 0 },
                    periodo: mesSelecionado,
                })
            }

            toast.success('PDF gerado com sucesso!')
        } catch (error) {
            toast.error('Erro ao gerar PDF')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const handleExportExcel = async () => {
        try {
            setIsGeneratingExcel(true)
            await generateExcel({
                contas: contas || [],
                stats: stats || { totalAPagar: 0, totalVencidas: 0, totalPago: 0, quantidadePagas: 0 },
                porTipoDespesa: porTipoDespesa || [],
            })
            toast.success('Excel gerado com sucesso!')
        } catch (error) {
            toast.error('Erro ao gerar Excel')
        } finally {
            setIsGeneratingExcel(false)
        }
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden sm:block">
                    <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
                    <p className="text-muted-foreground">
                        Análises e exportações dos seus dados
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={isGeneratingPDF || isGeneratingExcel}
                        className="flex-1 sm:flex-none"
                    >
                        {isGeneratingPDF ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <FileDown className="mr-1.5 h-4 w-4" />
                        )}
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={isGeneratingPDF || isGeneratingExcel}
                        className="flex-1 sm:flex-none"
                    >
                        {isGeneratingExcel ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                        )}
                        Excel
                    </Button>
                </div>
            </div>

            {/* Tabs principais */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mensal" className="gap-1.5 text-xs sm:text-sm">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="sm:hidden">Mensal</span>
                        <span className="hidden sm:inline">Visão Mensal</span>
                    </TabsTrigger>
                    <TabsTrigger value="anual" className="gap-1.5 text-xs sm:text-sm">
                        <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="sm:hidden">Anual</span>
                        <span className="hidden sm:inline">Visão Anual</span>
                    </TabsTrigger>
                </TabsList>

                {/* Visão Mensal */}
                <TabsContent value="mensal" className="space-y-4 sm:space-y-6">
                    {/* Seletor de Mês */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Período:</span>
                        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Selecione o mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Stats Cards */}
                    {statsLoading ? (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-32" />
                            ))}
                        </div>
                    ) : (
                        <StatsCards stats={stats} />
                    )}

                    {/* Gráficos Mensais */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            {graficoLoading ? (
                                <Skeleton className="h-[400px]" />
                            ) : (
                                <MonthlyChart data={graficoData || []} />
                            )}
                        </div>
                        <div>
                            {categoriaLoading ? (
                                <Skeleton className="h-[400px]" />
                            ) : (
                                <CategoryChart data={porTipoDespesa || []} />
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Visão Anual */}
                <TabsContent value="anual" className="space-y-4 sm:space-y-6">
                    {/* Seletor de Ano */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Ano:</span>
                        <div className="flex items-center gap-1 flex-1 sm:flex-none">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                onClick={() => setSelectedYear(y => Math.max(y - 1, years[0]))}
                                disabled={selectedYear <= years[0]}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) => setSelectedYear(parseInt(v))}
                            >
                                <SelectTrigger className="w-[90px] sm:w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                onClick={() => setSelectedYear(y => Math.min(y + 1, years[years.length - 1]))}
                                disabled={selectedYear >= years[years.length - 1]}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {anualLoading ? (
                        <div className="space-y-6">
                            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-24" />
                                ))}
                            </div>
                            <Skeleton className="h-[200px]" />
                            <Skeleton className="h-[350px]" />
                        </div>
                    ) : relatorioAnual ? (
                        <>
                            {/* Cards de Resumo Anual */}
                            <AnnualSummaryCards totais={relatorioAnual.totais} />

                            {/* Tabela Anual */}
                            <AnnualReportTable data={relatorioAnual} ano={selectedYear} />

                            {/* Gráfico de Barras Anual */}
                            <AnnualBarChart data={relatorioAnual.meses} ano={selectedYear} />
                        </>
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    )
}
