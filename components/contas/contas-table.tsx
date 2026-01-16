'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    MoreHorizontal,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Eye,
    Trash,
    Edit,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react'
import { formatCurrency, formatDate, formatDateRelative, isVencido, parseLocalDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface ContasTableProps {
    contas: any[]
    onEdit?: (id: string) => void
    onView?: (id: string) => void
    onDelete?: (id: string, descricao: string) => void
}

type SortField = 'descricao' | 'data_vencimento' | 'valor_final' | 'data_emissao'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE_OPTIONS = [15, 30, 50]

export function ContasTable({ contas, onEdit, onView, onDelete }: ContasTableProps) {
    const [sortField, setSortField] = useState<SortField>('data_emissao')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(30)

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
        setCurrentPage(1) // Reset para primeira página ao ordenar
    }

    // Função para renderizar ícone de ordenação
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
        }
        return sortOrder === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
            : <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    }

    const sortedContas = [...contas].sort((a, b) => {
        // Ordenação especial para vencimento (considerando próxima parcela)
        if (sortField === 'data_vencimento') {
            const dateA = a.proxima_parcela
                ? parseLocalDate(a.proxima_parcela.data_vencimento).getTime()
                : (a.status === 'quitada' ? 0 : Number.MAX_SAFE_INTEGER)
            const dateB = b.proxima_parcela
                ? parseLocalDate(b.proxima_parcela.data_vencimento).getTime()
                : (b.status === 'quitada' ? 0 : Number.MAX_SAFE_INTEGER)
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
        }

        // Ordenação para valor (valor pendente)
        if (sortField === 'valor_final') {
            const valA = a.valor_pendente || 0
            const valB = b.valor_pendente || 0
            return sortOrder === 'asc' ? valA - valB : valB - valA
        }

        // Ordenação por data de emissão
        if (sortField === 'data_emissao') {
            const dateA = a.data_emissao ? parseLocalDate(a.data_emissao).getTime() : 0
            const dateB = b.data_emissao ? parseLocalDate(b.data_emissao).getTime() : 0
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
        }

        // Default: string compare
        const valA = a[sortField] || ''
        const valB = b[sortField] || ''
        return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA)
    })

    // Paginação
    const totalPages = Math.ceil(sortedContas.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedContas = sortedContas.slice(startIndex, endIndex)

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-0 hover:bg-transparent",
                                        sortField === 'data_emissao' && "text-primary font-semibold"
                                    )}
                                    onClick={() => handleSort('data_emissao')}
                                >
                                    Emissão
                                    <SortIcon field="data_emissao" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[280px]">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-0 hover:bg-transparent",
                                        sortField === 'descricao' && "text-primary font-semibold"
                                    )}
                                    onClick={() => handleSort('descricao')}
                                >
                                    Descrição / Fornecedor
                                    <SortIcon field="descricao" />
                                </Button>
                            </TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-0 hover:bg-transparent",
                                        sortField === 'data_vencimento' && "text-primary font-semibold"
                                    )}
                                    onClick={() => handleSort('data_vencimento')}
                                >
                                    Próx. Vencimento
                                    <SortIcon field="data_vencimento" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-0 hover:bg-transparent",
                                        sortField === 'valor_final' && "text-primary font-semibold"
                                    )}
                                    onClick={() => handleSort('valor_final')}
                                >
                                    Valor Pendente
                                    <SortIcon field="valor_final" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">Progresso</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedContas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Nenhuma conta encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedContas.map((conta) => {
                                const isQuitada = conta.status === 'quitada'
                                const proximaParcela = conta.proxima_parcela
                                const vencida = proximaParcela && isVencido(proximaParcela.data_vencimento)

                                // Progresso (ex: 3/10)
                                const progresso = Math.round((conta.parcelas_pagas / conta.total_parcelas) * 100)

                                return (
                                    <TableRow
                                        key={conta.id}
                                        className={cn(
                                            "cursor-pointer hover:bg-muted/50 transition-colors",
                                            vencida && "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30",
                                            isQuitada && "bg-emerald-50/50 dark:bg-emerald-950/10 opacity-70"
                                        )}
                                        onClick={() => onView?.(conta.id)}
                                    >
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {conta.data_emissao ? formatDate(conta.data_emissao) : '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className={cn("font-medium", vencida && "text-red-700 dark:text-red-400")}>
                                                    {conta.descricao}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {vencida && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                                    {conta.fornecedores?.nome || 'Sem fornecedor'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal" style={{
                                                backgroundColor: conta.tipos_despesa?.cor ? `${conta.tipos_despesa.cor}20` : undefined,
                                                color: conta.tipos_despesa?.cor,
                                            }}>
                                                {conta.tipos_despesa?.nome || 'Geral'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {isQuitada ? (
                                                <span className="text-emerald-600 flex items-center gap-1 text-sm font-medium">
                                                    <CheckCircle2 className="h-4 w-4" /> Quitada
                                                </span>
                                            ) : proximaParcela ? (
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "flex items-center gap-1 font-medium",
                                                        vencida ? "text-red-600" : "text-foreground"
                                                    )}>
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(proximaParcela.data_vencimento)}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs",
                                                        vencida ? "text-red-500 font-medium" : "text-muted-foreground"
                                                    )}>
                                                        {formatDateRelative(proximaParcela.data_vencimento)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "font-bold",
                                                    isQuitada ? "text-emerald-600" : "text-foreground",
                                                    vencida && "text-red-600"
                                                )}>
                                                    {formatCurrency(conta.valor_pendente)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Total: {formatCurrency(conta.valor_total)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden max-w-[60px]">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            isQuitada ? "bg-emerald-500" : "bg-primary"
                                                        )}
                                                        style={{ width: `${progresso}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {conta.parcelas_pagas}/{conta.total_parcelas} pagas
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                        <span className="sr-only">Menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(conta.id) }}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(conta.id) }}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar conta
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={(e) => { e.stopPropagation(); onDelete?.(conta.id, conta.descricao) }}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginação */}
            {sortedContas.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Mostrando</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value))
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option.toString()}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>de {sortedContas.length} contas</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 px-2">
                            <span className="text-sm font-medium">{currentPage}</span>
                            <span className="text-sm text-muted-foreground">de</span>
                            <span className="text-sm font-medium">{totalPages || 1}</span>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
