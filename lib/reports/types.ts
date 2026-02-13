// ============================================
// Types para Central de Exportação de Relatórios
// ============================================

// ENUMS
export enum ReportType {
    // Gerenciais
    MONTHLY_DETAILED = 'monthly_detailed',
    SUPPLIER_CONSOLIDATED = 'supplier_consolidated',
    CATEGORY_ANALYSIS = 'category_analysis',
    CASH_FLOW_PROJECTION = 'cash_flow_projection',
    OVERDUE_REPORT = 'overdue_report',

    // Contábeis
    ACCOUNTING_STATEMENT = 'accounting_statement',
    ANALYTICAL_LEDGER = 'analytical_ledger',
    TRIAL_BALANCE = 'trial_balance',
    TAX_OBLIGATIONS = 'tax_obligations',
    CASH_FLOW_STATEMENT = 'cash_flow_statement',

    // Analíticos
    FINANCIAL_PERFORMANCE = 'financial_performance',
    INTEREST_DISCOUNT = 'interest_discount',
    CONSOLIDATED_MULTI_COMPANY = 'consolidated_multi_company',
    PAYMENT_AUDIT = 'payment_audit',
}

export enum ReportCategory {
    MANAGERIAL = 'managerial',
    ACCOUNTING = 'accounting',
    ANALYTICAL = 'analytical',
}

export enum PeriodType {
    CURRENT_MONTH = 'current_month',
    SPECIFIC_MONTH = 'specific_month',
    CUSTOM_RANGE = 'custom_range',
    QUARTER = 'quarter',
    YEAR = 'year',
}

export enum ExportFormat {
    PDF = 'pdf',
    EXCEL = 'excel',
    CSV = 'csv',
}

export enum PageOrientation {
    PORTRAIT = 'portrait',
    LANDSCAPE = 'landscape',
}

export enum PageSize {
    A4 = 'A4',
    LETTER = 'LETTER',
    LEGAL = 'LEGAL',
}

export enum DetailLevel {
    SUMMARY = 'resumido',
    NORMAL = 'normal',
    DETAILED = 'detalhado',
    COMPLETE = 'completo',
}

export enum CompanyMode {
    ALL = 'all',
    SELECTED = 'selected',
    CONSOLIDATED = 'consolidated',
    COMPARATIVE = 'comparative',
}

export enum GroupBy {
    NONE = 'none',
    CATEGORY = 'category',
    SUPPLIER = 'supplier',
    COMPANY = 'company',
    BANK = 'bank',
    STATUS = 'status',
}

export enum SortBy {
    DUE_DATE = 'due_date',
    PAYMENT_DATE = 'payment_date',
    AMOUNT = 'amount',
    SUPPLIER = 'supplier',
    CATEGORY = 'category',
    STATUS = 'status',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export enum DateFilterField {
    EMISSION_DATE = 'emission_date',
    DUE_DATE = 'due_date',
    PAYMENT_DATE = 'payment_date',
}

export enum ViewMode {
    BY_ACCOUNT = 'by_account',
    BY_INSTALLMENT = 'by_installment',
}

// INTERFACES

export interface ExportConfig {
    reportType: ReportType
    period: PeriodConfig
    companies: CompanyConfig
    filters: FilterConfig
    format: FormatConfig
    columns: ColumnConfig
    detailLevel: DetailLevel
    viewMode: ViewMode
    additionalOptions: AdditionalOptionsConfig
}

export interface PeriodConfig {
    type: PeriodType
    dateField?: DateFilterField
    month?: number
    year?: number
    startDate?: Date
    endDate?: Date
    quarter?: 1 | 2 | 3 | 4
    quarterYear?: number
    fullYear?: number
}

export interface CompanyConfig {
    mode: CompanyMode
    selectedCompanyIds?: string[]
    consolidate?: boolean
}

export interface FilterConfig {
    usePageFilters: boolean
    selectedCompanyId?: string
    customFilters?: CustomFilters
}

export interface CustomFilters {
    status?: ('ativa' | 'quitada' | 'cancelada')[]
    supplierIds?: string[]
    categoryIds?: string[]
    bankIds?: string[]
    minAmount?: number
    maxAmount?: number
    onlyOverdue?: boolean
    onlyWithInterest?: boolean
    onlyWithDiscount?: boolean
    onlyWithAttachments?: boolean
    hideZeroValues?: boolean
}

export interface FormatConfig {
    format: ExportFormat
    pdf?: PdfFormatConfig
    excel?: ExcelFormatConfig
    csv?: CsvFormatConfig
}

export interface PdfFormatConfig {
    orientation: PageOrientation
    pageSize: PageSize
    includeCharts: boolean
    includeCompanyLogo: boolean
    includeTableOfContents: boolean
    includePageNumbers: boolean
    monochromeMode: boolean
}

export interface ExcelFormatConfig {
    sheetName?: string
    includeFormulas: boolean
    formatAsTable: boolean
    freezeHeaders: boolean
    includeCharts: boolean
}

export interface CsvFormatConfig {
    delimiter: ',' | ';' | '\t'
    encoding: 'utf-8' | 'latin1'
    includeHeader: boolean
    dateFormat: 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy'
    decimalSeparator: ',' | '.'
}

export interface ColumnConfig {
    availableColumns: AvailableColumn[]
    selectedColumns: string[]
    columnOrder?: string[]
}

export interface AvailableColumn {
    id: string
    label: string
    description?: string
    mandatory?: boolean
    group?: 'basic' | 'financial' | 'dates' | 'additional'
}

export interface AdditionalOptionsConfig {
    groupBy?: GroupBy
    sortBy?: SortBy
    sortOrder?: SortOrder
    statistics: StatisticsConfig
    customNotes?: string
    templateId?: string
    templateName?: string
}

export interface StatisticsConfig {
    includeTotals: boolean
    includeAverages: boolean
    includeComparison: boolean
    includeTrends: boolean
}

export interface ExportPreview {
    totalAccounts: number
    totalInstallments: number
    companiesCount: number
    companyNames: string[]
    estimatedPages: number
    estimatedFileSize: string
    effectivePeriod: {
        start: Date
        end: Date
    }
    quickStats: {
        totalAmount: number
        paidAmount: number
        pendingAmount: number
        overdueAmount: number
    }
}

// Report Metadata
export interface ReportMetadata {
    type: ReportType
    category: ReportCategory
    name: string
    description: string
    icon: string
    supportsCustomColumns: boolean
    availableDetailLevels: DetailLevel[]
    recommendedOrientation: PageOrientation
    implemented: boolean // Whether this report has full backend support
}

// Report Definitions
export const REPORT_DEFINITIONS: Record<ReportType, ReportMetadata> = {
    [ReportType.MONTHLY_DETAILED]: {
        type: ReportType.MONTHLY_DETAILED,
        category: ReportCategory.MANAGERIAL,
        name: 'Relatório Mensal',
        description: 'Visão geral detalhada das contas do mês',
        icon: '📊',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL, DetailLevel.DETAILED, DetailLevel.COMPLETE],
        recommendedOrientation: PageOrientation.LANDSCAPE,
        implemented: true,
    },
    [ReportType.SUPPLIER_CONSOLIDATED]: {
        type: ReportType.SUPPLIER_CONSOLIDATED,
        category: ReportCategory.MANAGERIAL,
        name: 'Por Fornecedor',
        description: 'Consolidado de despesas por fornecedor',
        icon: '👥',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL, DetailLevel.DETAILED, DetailLevel.COMPLETE],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.CATEGORY_ANALYSIS]: {
        type: ReportType.CATEGORY_ANALYSIS,
        category: ReportCategory.MANAGERIAL,
        name: 'Por Categoria',
        description: 'Análise de despesas por categoria',
        icon: '📂',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.CASH_FLOW_PROJECTION]: {
        type: ReportType.CASH_FLOW_PROJECTION,
        category: ReportCategory.MANAGERIAL,
        name: 'Fluxo de Caixa',
        description: 'Projeção futura de pagamentos',
        icon: '💰',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL],
        recommendedOrientation: PageOrientation.LANDSCAPE,
        implemented: true,
    },
    [ReportType.OVERDUE_REPORT]: {
        type: ReportType.OVERDUE_REPORT,
        category: ReportCategory.MANAGERIAL,
        name: 'Contas Vencidas',
        description: 'Inadimplência e aging',
        icon: '⚠️',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.NORMAL, DetailLevel.DETAILED, DetailLevel.COMPLETE],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.ACCOUNTING_STATEMENT]: {
        type: ReportType.ACCOUNTING_STATEMENT,
        category: ReportCategory.ACCOUNTING,
        name: 'DRE Simplificado',
        description: 'Demonstrativo contábil baseado no plano de contas',
        icon: '📈',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.ANALYTICAL_LEDGER]: {
        type: ReportType.ANALYTICAL_LEDGER,
        category: ReportCategory.ACCOUNTING,
        name: 'Razão Analítico',
        description: 'Movimentações por conta contábil',
        icon: '📖',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.DETAILED, DetailLevel.COMPLETE],
        recommendedOrientation: PageOrientation.LANDSCAPE,
        implemented: true,
    },
    [ReportType.TRIAL_BALANCE]: {
        type: ReportType.TRIAL_BALANCE,
        category: ReportCategory.ACCOUNTING,
        name: 'Balancete',
        description: 'Balancete de verificação',
        icon: '⚖️',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.NORMAL],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.TAX_OBLIGATIONS]: {
        type: ReportType.TAX_OBLIGATIONS,
        category: ReportCategory.ACCOUNTING,
        name: 'Obrigações Fiscais',
        description: 'Relatório de despesas dedutíveis',
        icon: '🏛️',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.CASH_FLOW_STATEMENT]: {
        type: ReportType.CASH_FLOW_STATEMENT,
        category: ReportCategory.ACCOUNTING,
        name: 'Demonstrativo por Caixa',
        description: 'Fluxo de caixa hierárquico por plano de contas',
        icon: '💵',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.FINANCIAL_PERFORMANCE]: {
        type: ReportType.FINANCIAL_PERFORMANCE,
        category: ReportCategory.ANALYTICAL,
        name: 'Performance Financeira',
        description: 'KPIs e análise de desempenho',
        icon: '📊',
        supportsCustomColumns: false,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.INTEREST_DISCOUNT]: {
        type: ReportType.INTEREST_DISCOUNT,
        category: ReportCategory.ANALYTICAL,
        name: 'Juros e Descontos',
        description: 'Análise de juros pagos e descontos obtidos',
        icon: '💸',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.PORTRAIT,
        implemented: true,
    },
    [ReportType.CONSOLIDATED_MULTI_COMPANY]: {
        type: ReportType.CONSOLIDATED_MULTI_COMPANY,
        category: ReportCategory.ANALYTICAL,
        name: 'Consolidado Multi-Empresa',
        description: 'Visão consolidada de todas as empresas',
        icon: '🏢',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.SUMMARY, DetailLevel.NORMAL, DetailLevel.DETAILED],
        recommendedOrientation: PageOrientation.LANDSCAPE,
        implemented: true,
    },
    [ReportType.PAYMENT_AUDIT]: {
        type: ReportType.PAYMENT_AUDIT,
        category: ReportCategory.ANALYTICAL,
        name: 'Auditoria de Pagamentos',
        description: 'Trilha completa de pagamentos',
        icon: '🔍',
        supportsCustomColumns: true,
        availableDetailLevels: [DetailLevel.NORMAL, DetailLevel.DETAILED, DetailLevel.COMPLETE],
        recommendedOrientation: PageOrientation.LANDSCAPE,
        implemented: true,
    },
}

// Default columns for tabular reports
export const DEFAULT_ACCOUNT_COLUMNS: AvailableColumn[] = [
    { id: 'descricao', label: 'Descrição', mandatory: true, group: 'basic' },
    { id: 'fornecedor', label: 'Fornecedor', group: 'basic' },
    { id: 'categoria', label: 'Categoria', group: 'basic' },
    { id: 'empresa', label: 'Empresa', group: 'basic' },
    { id: 'valor_original', label: 'Valor Original', group: 'financial' },
    { id: 'valor_juros', label: 'Juros', group: 'financial' },
    { id: 'valor_desconto', label: 'Descontos', group: 'financial' },
    { id: 'valor_final', label: 'Valor Final', mandatory: true, group: 'financial' },
    { id: 'data_vencimento', label: 'Data de Vencimento', group: 'dates' },
    { id: 'data_emissao', label: 'Data de Emissão', group: 'dates' },
    { id: 'data_pagamento', label: 'Data de Pagamento', group: 'dates' },
    { id: 'status', label: 'Status', group: 'additional' },
    { id: 'banco', label: 'Banco/Portador', group: 'additional' },
    { id: 'forma_pagamento', label: 'Forma de Pagamento', group: 'additional' },
    { id: 'observacoes', label: 'Observações', group: 'additional' },
    { id: 'numero_parcela', label: 'Número da Parcela', group: 'additional' },
]

// Default export config
export const DEFAULT_EXPORT_CONFIG: Partial<ExportConfig> = {
    period: {
        type: PeriodType.CURRENT_MONTH,
        dateField: DateFilterField.EMISSION_DATE,
    },
    companies: {
        mode: CompanyMode.ALL,
    },
    filters: {
        usePageFilters: true,
    },
    format: {
        format: ExportFormat.PDF,
        pdf: {
            orientation: PageOrientation.PORTRAIT,
            pageSize: PageSize.A4,
            includeCharts: true,
            includeCompanyLogo: true,
            includeTableOfContents: false,
            includePageNumbers: true,
            monochromeMode: false,
        },
    },
    columns: {
        availableColumns: DEFAULT_ACCOUNT_COLUMNS,
        selectedColumns: DEFAULT_ACCOUNT_COLUMNS.filter(c => c.mandatory).map(c => c.id),
    },
    detailLevel: DetailLevel.NORMAL,
    viewMode: ViewMode.BY_ACCOUNT,
    additionalOptions: {
        statistics: {
            includeTotals: true,
            includeAverages: true,
            includeComparison: false,
            includeTrends: false,
        },
    },
}
