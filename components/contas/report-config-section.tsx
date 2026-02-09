'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import {
    ReportType,
    ExportConfig,
    PeriodType,
    ExportFormat,
    PageOrientation,
    PageSize,
    DetailLevel,
    GroupBy,
    SortBy,
    SortOrder,
    CompanyMode,
    REPORT_DEFINITIONS,
    DEFAULT_ACCOUNT_COLUMNS,
} from '@/lib/reports/types'

interface ReportConfigSectionProps {
    reportType: ReportType
    config: Partial<ExportConfig>
    onChange: (config: Partial<ExportConfig>) => void
    currentFilters?: any
}

export function ReportConfigSection({
    reportType,
    config,
    onChange,
    currentFilters,
}: ReportConfigSectionProps) {
    const reportDef = REPORT_DEFINITIONS[reportType]
    const { data: empresas = [] } = trpc.empresas.list.useQuery()

    const [expandedSections, setExpandedSections] = useState({
        period: true,
        filters: false,
        format: true,
        columns: reportDef.supportsCustomColumns,
        additional: false,
    })

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
    }

    // Helpers para atualizar configuração
    const updatePeriod = (updates: Partial<ExportConfig['period']>) => {
        const currentPeriod = config.period || {
            type: PeriodType.CURRENT_MONTH
        }

        onChange({
            ...config,
            period: { ...currentPeriod, ...updates },
        })
    }

    const updateFormat = (updates: Partial<ExportConfig['format']>) => {
        const currentFormat = config.format || {
            format: ExportFormat.PDF,
            pdf: {
                orientation: PageOrientation.PORTRAIT,
                pageSize: PageSize.A4,
                includeCharts: true,
                includeCompanyLogo: true,
                includeTableOfContents: false,
                includePageNumbers: true,
                monochromeMode: false
            }
        }

        onChange({
            ...config,
            format: { ...currentFormat, ...updates },
        })
    }

    const updatePdfConfig = (updates: any) => {
        const currentFormat = config.format || {
            format: ExportFormat.PDF,
            pdf: {
                orientation: PageOrientation.PORTRAIT,
                pageSize: PageSize.A4,
                includeCharts: true,
                includeCompanyLogo: true,
                includeTableOfContents: false,
                includePageNumbers: true,
                monochromeMode: false
            }
        }

        const currentPdf = currentFormat.pdf || {
            orientation: PageOrientation.PORTRAIT,
            pageSize: PageSize.A4,
            includeCharts: true,
            includeCompanyLogo: true,
            includeTableOfContents: false,
            includePageNumbers: true,
            monochromeMode: false
        }

        onChange({
            ...config,
            format: {
                ...currentFormat,
                pdf: { ...currentPdf, ...updates },
            },
        })
    }

    const updateFilters = (updates: Partial<ExportConfig['filters']>) => {
        const currentFilters = config.filters || {
            usePageFilters: true
        }

        onChange({
            ...config,
            filters: { ...currentFilters, ...updates },
        })
    }

    const updateColumns = (updates: Partial<ExportConfig['columns']>) => {
        const currentColumns = config.columns || {
            availableColumns: DEFAULT_ACCOUNT_COLUMNS,
            selectedColumns: DEFAULT_ACCOUNT_COLUMNS.filter((c: any) => c.mandatory).map((c: any) => c.id),
            columnOrder: []
        }

        onChange({
            ...config,
            columns: {
                ...currentColumns,
                ...updates,
                availableColumns: updates.availableColumns || currentColumns.availableColumns,
                selectedColumns: updates.selectedColumns || currentColumns.selectedColumns,
            },
        })
    }

    const updateAdditionalOptions = (updates: Partial<ExportConfig['additionalOptions']>) => {
        const currentOptions = config.additionalOptions || {
            statistics: {
                includeTotals: true,
                includeAverages: true,
                includeComparison: false,
                includeTrends: false
            }
        }

        onChange({
            ...config,
            additionalOptions: {
                ...currentOptions,
                ...updates,
                statistics: updates.statistics || currentOptions.statistics
            },
        })
    }

    const updateStatistics = (updates: any) => {
        onChange({
            ...config,
            additionalOptions: {
                ...config.additionalOptions,
                statistics: {
                    ...config.additionalOptions?.statistics,
                    ...updates,
                },
            },
        })
    }

    const currentMonth = new Date()

    return (
        <div className="space-y-4">
            {/* Período e Dados */}
            <ConfigSection
                title="📅 Período e Dados"
                expanded={expandedSections.period}
                onToggle={() => toggleSection('period')}
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium">Período de Análise</Label>
                        <RadioGroup
                            value={config.period?.type || PeriodType.CURRENT_MONTH}
                            onValueChange={(value) => updatePeriod({ type: value as PeriodType })}
                            className="mt-2 space-y-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value={PeriodType.CURRENT_MONTH} id="period-current" />
                                <Label htmlFor="period-current" className="font-normal cursor-pointer">
                                    Mês Atual ({format(currentMonth, 'MMMM/yyyy', { locale: ptBR })})
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value={PeriodType.CUSTOM_RANGE} id="period-custom" />
                                <Label htmlFor="period-custom" className="font-normal cursor-pointer">
                                    Período Customizado
                                </Label>
                            </div>
                        </RadioGroup>

                        {config.period?.type === PeriodType.CUSTOM_RANGE && (
                            <div className="mt-3 flex gap-3 items-center pl-6">
                                <div className="flex-1">
                                    <Label className="text-xs">Data Inicial</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {config.period?.startDate ? format(config.period.startDate, 'dd/MM/yyyy') : 'Selecionar'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={config.period?.startDate}
                                                onSelect={(date) => updatePeriod({ startDate: date })}
                                                locale={ptBR}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <span className="text-muted-foreground mt-5">até</span>
                                <div className="flex-1">
                                    <Label className="text-xs">Data Final</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {config.period?.endDate ? format(config.period.endDate, 'dd/MM/yyyy') : 'Selecionar'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={config.period?.endDate}
                                                onSelect={(date) => updatePeriod({ endDate: date })}
                                                locale={ptBR}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ConfigSection>

            {/* Filtros Avançados */}
            <ConfigSection
                title="🔍 Filtros Avançados"
                expanded={expandedSections.filters}
                onToggle={() => toggleSection('filters')}
            >
                <div className="space-y-4">
                    {/* Seletor de Empresa */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Empresa
                        </Label>
                        <Select
                            value={config.filters?.selectedCompanyId || 'all'}
                            onValueChange={(value) => updateFilters({
                                selectedCompanyId: value === 'all' ? undefined : value
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as empresas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as empresas</SelectItem>
                                {empresas.map((empresa: any) => (
                                    <SelectItem key={empresa.id} value={empresa.id}>
                                        {empresa.nome_fantasia || empresa.razao_social}
                                        {empresa.cnpj && ` (${empresa.cnpj})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            A empresa selecionada aparecerá no cabeçalho do relatório
                        </p>
                    </div>

                    <Separator />

                    {/* Opção específica para DFC */}
                    {reportType === ReportType.CASH_FLOW_STATEMENT && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="hide-zero-values"
                                checked={config.filters?.customFilters?.hideZeroValues || false}
                                onCheckedChange={(checked) => updateFilters({
                                    customFilters: {
                                        ...config.filters?.customFilters,
                                        hideZeroValues: checked as boolean
                                    }
                                })}
                            />
                            <Label htmlFor="hide-zero-values" className="cursor-pointer font-normal">
                                Ocultar contas com valores zerados
                            </Label>
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="use-page-filters"
                            checked={config.filters?.usePageFilters !== false}
                            onCheckedChange={(checked) => updateFilters({ usePageFilters: checked as boolean })}
                        />
                        <Label htmlFor="use-page-filters" className="cursor-pointer font-normal">
                            Usar filtros atuais da página
                        </Label>
                    </div>
                    {currentFilters && config.filters?.usePageFilters && (
                        <p className="text-xs text-muted-foreground pl-6">
                            {Object.keys(currentFilters).length} filtro(s) serão aplicados
                        </p>
                    )}
                </div>
            </ConfigSection>

            {/* Formato e Apresentação */}
            <ConfigSection
                title="📄 Formato e Apresentação"
                expanded={expandedSections.format}
                onToggle={() => toggleSection('format')}
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium">Formato de Saída</Label>
                        <RadioGroup
                            value={config.format?.format || ExportFormat.PDF}
                            onValueChange={(value) => updateFormat({ format: value as ExportFormat })}
                            className="mt-2 flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value={ExportFormat.PDF} id="format-pdf" />
                                <Label htmlFor="format-pdf" className="cursor-pointer font-normal">PDF</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value={ExportFormat.EXCEL} id="format-excel" />
                                <Label htmlFor="format-excel" className="cursor-pointer font-normal">Excel</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value={ExportFormat.CSV} id="format-csv" />
                                <Label htmlFor="format-csv" className="cursor-pointer font-normal">CSV</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {config.format?.format === ExportFormat.PDF && (
                        <>
                            <div>
                                <Label className="text-sm font-medium">Orientação da Página</Label>
                                <RadioGroup
                                    value={config.format?.pdf?.orientation || PageOrientation.PORTRAIT}
                                    onValueChange={(value) => updatePdfConfig({ orientation: value })}
                                    className="mt-2 flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={PageOrientation.PORTRAIT} id="orient-portrait" />
                                        <Label htmlFor="orient-portrait" className="cursor-pointer font-normal">
                                            Retrato
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={PageOrientation.LANDSCAPE} id="orient-landscape" />
                                        <Label htmlFor="orient-landscape" className="cursor-pointer font-normal">
                                            Paisagem
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Tamanho do Papel</Label>
                                <Select
                                    value={config.format?.pdf?.pageSize || PageSize.A4}
                                    onValueChange={(value) => updatePdfConfig({ pageSize: value })}
                                >
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={PageSize.A4}>A4</SelectItem>
                                        <SelectItem value={PageSize.LETTER}>Carta (Letter)</SelectItem>
                                        <SelectItem value={PageSize.LEGAL}>Ofício (Legal)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Elementos Visuais</Label>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="include-charts"
                                            checked={config.format?.pdf?.includeCharts !== false}
                                            onCheckedChange={(checked) => updatePdfConfig({ includeCharts: checked })}
                                        />
                                        <Label htmlFor="include-charts" className="cursor-pointer font-normal">
                                            Incluir gráficos e visualizações
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="include-logo"
                                            checked={config.format?.pdf?.includeCompanyLogo !== false}
                                            onCheckedChange={(checked) => updatePdfConfig({ includeCompanyLogo: checked })}
                                        />
                                        <Label htmlFor="include-logo" className="cursor-pointer font-normal">
                                            Incluir logo da empresa no cabeçalho
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="include-page-numbers"
                                            checked={config.format?.pdf?.includePageNumbers !== false}
                                            onCheckedChange={(checked) => updatePdfConfig({ includePageNumbers: checked })}
                                        />
                                        <Label htmlFor="include-page-numbers" className="cursor-pointer font-normal">
                                            Incluir numeração de páginas
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </ConfigSection>

            {/* Colunas (apenas para relatórios tabulares) */}
            {reportDef.supportsCustomColumns && (
                <ConfigSection
                    title="📊 Colunas e Detalhamento"
                    expanded={expandedSections.columns}
                    onToggle={() => toggleSection('columns')}
                >
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium">Nível de Detalhamento</Label>
                            <RadioGroup
                                value={config.detailLevel || DetailLevel.NORMAL}
                                onValueChange={(value) => onChange({ ...config, detailLevel: value as DetailLevel })}
                                className="mt-2 space-y-2"
                            >
                                {reportDef.availableDetailLevels.map((level) => (
                                    <div key={level} className="flex items-center space-x-2">
                                        <RadioGroupItem value={level} id={`detail-${level}`} />
                                        <Label htmlFor={`detail-${level}`} className="cursor-pointer font-normal">
                                            {level === DetailLevel.SUMMARY && 'Resumido (apenas totais e indicadores)'}
                                            {level === DetailLevel.NORMAL && 'Normal (dados principais)'}
                                            {level === DetailLevel.DETAILED && 'Detalhado (todos os campos)'}
                                            {level === DetailLevel.COMPLETE && 'Completo (incluir parcelas individuais)'}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </ConfigSection>
            )}

            {/* Opções Adicionais */}
            <ConfigSection
                title="⚡ Opções Adicionais"
                expanded={expandedSections.additional}
                onToggle={() => toggleSection('additional')}
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium">Análises Estatísticas</Label>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-totals"
                                    checked={config.additionalOptions?.statistics?.includeTotals !== false}
                                    onCheckedChange={(checked) => updateStatistics({ includeTotals: checked })}
                                />
                                <Label htmlFor="include-totals" className="cursor-pointer font-normal">
                                    Incluir totalizações
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-averages"
                                    checked={config.additionalOptions?.statistics?.includeAverages !== false}
                                    onCheckedChange={(checked) => updateStatistics({ includeAverages: checked })}
                                />
                                <Label htmlFor="include-averages" className="cursor-pointer font-normal">
                                    Incluir médias e percentuais
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="custom-notes" className="text-sm font-medium">Observações Personalizadas</Label>
                        <Textarea
                            id="custom-notes"
                            placeholder="Adicionar nota personalizada ao relatório..."
                            className="mt-2"
                            rows={3}
                            value={config.additionalOptions?.customNotes || ''}
                            onChange={(e) => updateAdditionalOptions({ customNotes: e.target.value })}
                        />
                    </div>
                </div>
            </ConfigSection>
        </div>
    )
}

// Componente auxiliar para seção colapsável
interface ConfigSectionProps {
    title: string
    expanded: boolean
    onToggle: () => void
    children: React.ReactNode
}

function ConfigSection({ title, expanded, onToggle, children }: ConfigSectionProps) {
    return (
        <div className="border rounded-lg">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
                <h4 className="font-medium">{title}</h4>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded && (
                <>
                    <Separator />
                    <div className="p-4">{children}</div>
                </>
            )}
        </div>
    )
}
