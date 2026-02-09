'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, Loader2, ChevronRight, FileSpreadsheet, Settings2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
    ReportType,
    ReportCategory,
    PageSize,
    REPORT_DEFINITIONS,
    type ReportMetadata,
    type ExportConfig,
    DEFAULT_EXPORT_CONFIG,
} from '@/lib/reports/types'
import { ReportConfigSection } from './report-config-section'
import { exportReport } from '@/lib/reports/export-service'
import { trpc } from '@/lib/trpc/client'

interface ReportsExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentFilters?: any
}

export function ReportsExportDialog({ open, onOpenChange, currentFilters }: ReportsExportDialogProps) {
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
    const [activeCategory, setActiveCategory] = useState<ReportCategory>(ReportCategory.MANAGERIAL)
    const [exportConfig, setExportConfig] = useState<ExportConfig>({
        ...DEFAULT_EXPORT_CONFIG,
    } as ExportConfig)
    const [isExporting, setIsExporting] = useState(false)
    const { toast } = useToast()

    const utils = trpc.useUtils()

    const reportsByCategory = useMemo(() => {
        const grouped: Record<ReportCategory, ReportMetadata[]> = {
            [ReportCategory.MANAGERIAL]: [],
            [ReportCategory.ACCOUNTING]: [],
            [ReportCategory.ANALYTICAL]: [],
        }

        Object.values(REPORT_DEFINITIONS).forEach((report) => {
            grouped[report.category].push(report)
        })

        return grouped
    }, [])

    const handleReportSelect = (reportType: ReportType) => {
        setSelectedReport(reportType)
        const reportDef = REPORT_DEFINITIONS[reportType]

        setExportConfig((prev) => ({
            ...prev,
            reportType,
            format: {
                format: prev.format.format,
                pdf: {
                    orientation: reportDef.recommendedOrientation,
                    pageSize: (prev.format.pdf?.pageSize || PageSize.A4) as PageSize,
                    includeCharts: prev.format.pdf?.includeCharts ?? true,
                    includeCompanyLogo: prev.format.pdf?.includeCompanyLogo ?? true,
                    includeTableOfContents: prev.format.pdf?.includeTableOfContents ?? false,
                    includePageNumbers: prev.format.pdf?.includePageNumbers ?? true,
                    monochromeMode: prev.format.pdf?.monochromeMode ?? false,
                },
                excel: prev.format.excel,
                csv: prev.format.csv,
            },
            detailLevel: reportDef.availableDetailLevels[0],
        }))
    }

    const handleConfigChange = (partialConfig: Partial<ExportConfig>) => {
        setExportConfig(prev => ({
            ...prev,
            ...partialConfig,
        }))
    }

    const handleExport = async () => {
        if (!selectedReport || !exportConfig.reportType) return

        setIsExporting(true)
        try {
            let data

            const reportTypeStr = String(selectedReport)

            const { startDate, endDate, ...restPeriod } = exportConfig.period
            const serializedPeriod = {
                ...restPeriod,
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
            }

            switch (reportTypeStr) {
                case 'monthly_detailed':
                    data = await utils.reports.monthlyDetailed.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'supplier_consolidated':
                    data = await utils.reports.supplierConsolidated.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'category_analysis':
                    data = await utils.reports.categoryAnalysis.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'cash_flow_projection':
                    data = await utils.reports.cashFlowProjection.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'overdue_report':
                    data = await utils.reports.overdueReport.fetch({
                        asOfDate: new Date(),
                    })
                    break

                case 'accounting_statement':
                    data = await utils.reports.accountingStatement.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'analytical_ledger':
                    data = await utils.reports.analyticalLedger.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'trial_balance':
                    data = await utils.reports.trialBalance.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'tax_obligations':
                    data = await utils.reports.taxObligations.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'financial_performance':
                    data = await utils.reports.financialPerformance.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'interest_discount':
                    data = await utils.reports.interestDiscount.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'consolidated_multi_company':
                    data = await utils.reports.consolidatedMultiCompany.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'payment_audit':
                    data = await utils.reports.paymentAudit.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                case 'cash_flow_statement':
                    data = await utils.reports.cashFlowStatement.fetch({
                        reportType: reportTypeStr,
                        period: serializedPeriod,
                        filters: exportConfig.filters,
                    })
                    break

                default:
                    throw new Error(`Tipo de relatório não suportado: ${reportTypeStr}`)
            }

            let selectedCompany = null
            if (exportConfig.filters?.selectedCompanyId) {
                try {
                    selectedCompany = await utils.empresas.getById.fetch(exportConfig.filters.selectedCompanyId)
                } catch (e) {
                    console.warn('Empresa não encontrada:', e)
                }
            }

            const enrichedData = {
                ...data,
                companyInfo: selectedCompany ? {
                    name: selectedCompany.nome_fantasia || selectedCompany.razao_social,
                    cnpjCpf: selectedCompany.cnpj || '',
                } : null,
            }

            await exportReport({ config: exportConfig as ExportConfig, data: enrichedData })

            toast({
                title: 'Sucesso!',
                description: 'Relatório exportado com sucesso.',
            })

            onOpenChange(false)
        } catch (error) {
            console.error('Erro ao exportar:', error)
            toast({
                title: 'Erro na exportação',
                description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o relatório.',
                variant: 'destructive',
            })
        } finally {
            setIsExporting(false)
        }
    }

    const categories = [
        { key: ReportCategory.MANAGERIAL, label: 'Gerenciais', icon: '📊' },
        { key: ReportCategory.ACCOUNTING, label: 'Contábeis', icon: '📈' },
        { key: ReportCategory.ANALYTICAL, label: 'Analíticos', icon: '📋' },
    ]

    const selectedReportDef = selectedReport ? REPORT_DEFINITIONS[selectedReport] : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[95vw] w-[1400px] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col sm:max-w-[1400px]"
                style={{ maxWidth: '95vw', width: '1400px' }}
            >
                {/* Header Compacto */}
                <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                    <DialogTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        Central de Exportação
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Painel Esquerdo - Seleção de Relatórios */}
                    <div className="w-[320px] border-r flex flex-col bg-muted/20">
                        {/* Categorias */}
                        <div className="flex border-b">
                            {categories.map((cat) => (
                                <button
                                    key={cat.key}
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeCategory === cat.key
                                        ? 'bg-background border-b-2 border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <span className="mr-1">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Lista de Relatórios */}
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {reportsByCategory[activeCategory].map((report) => {
                                    const isSelected = selectedReport === report.type
                                    const isDisabled = !report.implemented

                                    return (
                                        <button
                                            key={report.type}
                                            onClick={() => !isDisabled && handleReportSelect(report.type)}
                                            disabled={isDisabled}
                                            className={`w-full text-left p-3 rounded-lg transition-all group ${isDisabled
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isSelected
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'hover:bg-muted'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-xl flex-shrink-0">{report.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium text-sm truncate ${isSelected ? '' : 'text-foreground'
                                                            }`}>
                                                            {report.name}
                                                        </span>
                                                        {isDisabled && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                                                                Breve
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className={`text-xs mt-0.5 line-clamp-2 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                                        }`}>
                                                        {report.description}
                                                    </p>
                                                </div>
                                                {!isDisabled && (
                                                    <ChevronRight className={`h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''
                                                        }`} />
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Painel Direito - Configurações */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {selectedReport && selectedReportDef ? (
                            <>
                                {/* Header do Relatório Selecionado */}
                                <div className="px-6 py-4 border-b bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{selectedReportDef.icon}</span>
                                        <div>
                                            <h3 className="font-semibold">{selectedReportDef.name}</h3>
                                            <p className="text-xs text-muted-foreground">{selectedReportDef.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Configurações */}
                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium text-muted-foreground">Configurações de Exportação</span>
                                        </div>
                                        <ReportConfigSection
                                            reportType={selectedReport}
                                            config={exportConfig}
                                            onChange={handleConfigChange}
                                            currentFilters={currentFilters}
                                        />
                                    </div>
                                </ScrollArea>

                                {/* Rodapé com Ações */}
                                <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        Formato: <span className="font-medium">{exportConfig.format?.format?.toUpperCase() || 'PDF'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleExport}
                                            disabled={isExporting}
                                            className="gap-2 min-w-[140px]"
                                        >
                                            {isExporting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Exportando...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4" />
                                                    Exportar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Estado vazio */
                            <div className="flex-1 flex items-center justify-center p-6">
                                <div className="text-center max-w-sm">
                                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="font-medium mb-1">Selecione um Relatório</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Escolha um tipo de relatório na lista ao lado para configurar e exportar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
