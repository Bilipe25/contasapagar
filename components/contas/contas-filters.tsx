'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Search,
    Filter,
    X,
    ChevronDown,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Building2,
    Tag,
    Briefcase,
    Landmark,
    SlidersHorizontal,
} from 'lucide-react'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'

interface Fornecedor {
    id: string
    nome: string
}

interface TipoDespesa {
    id: string
    nome: string
    cor?: string
}

interface Empresa {
    id: string
    razao_social: string
    nome_fantasia?: string | null
}

interface ContasFiltersProps {
    // Search
    searchQuery: string
    onSearchChange: (value: string) => void
    // Status
    filtroStatus: 'todos' | 'ativa' | 'quitada' | 'cancelada'
    onStatusChange: (value: 'todos' | 'ativa' | 'quitada' | 'cancelada') => void
    filtroVencidas: boolean
    onVencidasChange: (value: boolean) => void
    // Fornecedor
    filtroFornecedor: string | null
    onFornecedorChange: (value: string | null) => void
    fornecedores?: Fornecedor[]
    // Tipo Despesa
    filtroTipoDespesa: string | null
    onTipoDespesaChange: (value: string | null) => void
    tiposDespesa?: TipoDespesa[]
    // Empresa
    filtroEmpresa: string | null
    onEmpresaChange: (value: string | null) => void
    empresas?: Empresa[]
    // Banco
    filtroBanco: string | null
    onBancoChange: (value: string | null) => void
    bancos?: { id: string; nome: string }[]
    // Período
    mesSelecionado: Date | null
    onMesSelecionadoChange: (date: Date | null) => void
    onPeriodChange: (start: string | null, end: string | null) => void
    // Limpar
    onClearFilters: () => void
    // Resultados
    totalResults: number
    hasActiveFilters: boolean
}

const statusConfig = {
    todos: { label: 'Todos', icon: Filter, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    ativa: { label: 'Em Aberto', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    vencidas: { label: 'Vencidas', icon: AlertTriangle, color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
    quitada: { label: 'Quitadas', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
    cancelada: { label: 'Canceladas', icon: XCircle, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export function ContasFilters({
    searchQuery,
    onSearchChange,
    filtroStatus,
    onStatusChange,
    filtroVencidas,
    onVencidasChange,
    filtroFornecedor,
    onFornecedorChange,
    fornecedores,
    filtroTipoDespesa,
    onTipoDespesaChange,
    tiposDespesa,
    filtroEmpresa,
    onEmpresaChange,
    empresas,
    filtroBanco,
    onBancoChange,
    bancos,
    mesSelecionado,
    onMesSelecionadoChange,
    onPeriodChange,
    onClearFilters,
    totalResults,
    hasActiveFilters,
}: ContasFiltersProps) {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const currentStatus = filtroVencidas ? 'vencidas' : filtroStatus
    const StatusIcon = statusConfig[currentStatus]?.icon || Filter

    // Contar filtros ativos
    const activeFilterCount = [
        filtroStatus !== 'todos' || filtroVencidas,
        !!filtroFornecedor,
        !!filtroTipoDespesa,
        !!filtroEmpresa,
    ].filter(Boolean).length

    // Obter nomes dos filtros selecionados
    const selectedFornecedor = fornecedores?.find(f => f.id === filtroFornecedor)
    const selectedTipo = tiposDespesa?.find(t => t.id === filtroTipoDespesa)
    const selectedEmpresa = empresas?.find(e => e.id === filtroEmpresa)
    const selectedBanco = bancos?.find(b => b.id === filtroBanco)

    const handleStatusSelect = (value: string) => {
        if (value === 'vencidas') {
            onStatusChange('ativa')
            onVencidasChange(true)
        } else {
            onStatusChange(value as 'todos' | 'ativa' | 'quitada' | 'cancelada')
            onVencidasChange(false)
        }
    }

    return (
        <div className="space-y-3">
            {/* Search Bar + Quick Actions */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição, fornecedor..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 bg-background"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => onSearchChange('')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>

                {/* Status Quick Filter */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="default"
                            className={cn(
                                "gap-2 min-w-[130px] justify-between",
                                statusConfig[currentStatus]?.color
                            )}
                        >
                            <StatusIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">{statusConfig[currentStatus]?.label}</span>
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        {Object.entries(statusConfig).map(([key, config]) => {
                            const Icon = config.icon
                            const isSelected = currentStatus === key
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleStatusSelect(key)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                        isSelected
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {config.label}
                                    {isSelected && (
                                        <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />
                                    )}
                                </button>
                            )
                        })}
                    </PopoverContent>
                </Popover>

                {/* Advanced Filters Toggle */}
                <Button
                    variant={showAdvanced || activeFilterCount > 0 ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="relative"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Chip */}
                    {(filtroStatus !== 'todos' || filtroVencidas) && (
                        <Badge
                            variant="secondary"
                            className={cn(
                                "gap-1 pl-2 pr-1 py-1",
                                statusConfig[currentStatus]?.color
                            )}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[currentStatus]?.label}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-black/10"
                                onClick={() => {
                                    onStatusChange('todos')
                                    onVencidasChange(false)
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}

                    {/* Fornecedor Chip */}
                    {selectedFornecedor && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                            <Building2 className="h-3 w-3" />
                            {selectedFornecedor.nome}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-black/10"
                                onClick={() => onFornecedorChange(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}

                    {/* Tipo Despesa Chip */}
                    {selectedTipo && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                            <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: selectedTipo.cor || '#6366f1' }}
                            />
                            {selectedTipo.nome}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-black/10"
                                onClick={() => onTipoDespesaChange(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}

                    {/* Empresa Chip */}
                    {selectedEmpresa && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                            <Briefcase className="h-3 w-3" />
                            {selectedEmpresa.nome_fantasia || selectedEmpresa.razao_social}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-black/10"
                                onClick={() => onEmpresaChange(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}

                    {/* Banco Chip */}
                    {selectedBanco && (
                        <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                            <Landmark className="h-3 w-3" />
                            {selectedBanco.nome}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-black/10"
                                onClick={() => onBancoChange(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}

                    {/* Clear All */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Limpar tudo
                    </Button>
                </div>
            )}

            {/* Advanced Filters Panel */}
            {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50 border">
                    {/* Fornecedor */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Fornecedor
                        </label>
                        <SearchableSelect
                            options={fornecedores?.map(f => ({ value: f.id, label: f.nome })) || []}
                            value={filtroFornecedor}
                            onChange={onFornecedorChange}
                            placeholder="Selecionar fornecedor"
                            searchPlaceholder="Buscar fornecedor..."
                            emptyText="Nenhum fornecedor encontrado"
                            className="h-9 bg-background"
                        />
                    </div>

                    {/* Categoria */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Categoria
                        </label>
                        <SearchableSelect
                            options={tiposDespesa?.map(t => ({ value: t.id, label: t.nome })) || []}
                            value={filtroTipoDespesa}
                            onChange={onTipoDespesaChange}
                            placeholder="Selecionar categoria"
                            searchPlaceholder="Buscar categoria..."
                            emptyText="Nenhuma categoria encontrada"
                            className="h-9 bg-background"
                        />
                    </div>

                    {/* Empresa */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            Empresa
                        </label>
                        <Select
                            value={filtroEmpresa || 'all'}
                            onValueChange={(v) => onEmpresaChange(v === 'all' ? null : v)}
                        >
                            <SelectTrigger className="h-9 bg-background">
                                <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {empresas?.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.nome_fantasia || e.razao_social}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Banco */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Landmark className="h-3 w-3" />
                            Banco
                        </label>
                        <SearchableSelect
                            options={bancos?.map(b => ({ value: b.id, label: b.nome })) || []}
                            value={filtroBanco}
                            onChange={onBancoChange}
                            placeholder="Selecionar banco"
                            searchPlaceholder="Buscar banco..."
                            emptyText="Nenhum banco encontrado"
                            className="h-9 bg-background"
                        />
                    </div>
                </div>
            )}

            {/* Period Selector + Results Count */}
            <div className="flex items-center justify-between pt-1">
                <MonthYearPicker
                    value={mesSelecionado}
                    onChange={onMesSelecionadoChange}
                    onPeriodChange={onPeriodChange}
                />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{totalResults}</span>
                    <span>conta{totalResults !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>
    )
}
