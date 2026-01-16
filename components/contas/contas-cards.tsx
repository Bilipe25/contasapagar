'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDateRelative, getStatusColor, getStatusLabel, isVencido, cn } from '@/lib/utils'
import { MoreVertical, Edit, Trash, CheckCircle, AlertTriangle, Calendar, Building2, ChevronLeft, ChevronRight, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { useState } from 'react'
import { MarcarPagoDialog } from './marcar-pago-dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { ContaActionsSheet } from './conta-actions-sheet'
import { EmptyStateNoContas } from '@/components/ui/empty-state'

interface ContasCardsProps {
    contas: any[]
    onEdit: (id: string) => void
    onView?: (id: string) => void
    onCreateClick?: () => void
}

const ITEMS_PER_PAGE = 10

export function ContasCards({ contas, onEdit, onView, onCreateClick }: ContasCardsProps) {
    const utils = trpc.useUtils()
    const [marcarPagoId, setMarcarPagoId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [actionSheetConta, setActionSheetConta] = useState<any | null>(null)

    const deleteMutation = trpc.contas.delete.useMutation({
        onSuccess: () => {
            toast.success('Conta excluída com sucesso!')
            utils.contas.list.invalidate()
            utils.dashboard.stats.invalidate()
        },
        onError: (error) => {
            toast.error('Erro ao excluir conta', {
                description: error.message,
            })
        },
    })

    const handleDelete = (id: string, descricao: string) => {
        if (confirm(`Tem certeza que deseja excluir "${descricao}"?`)) {
            deleteMutation.mutate(id)
        }
    }

    // Pagination
    const totalPages = Math.ceil(contas.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const paginatedContas = contas.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    // Safe currency formatter
    const safeFormatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) {
            return 'R$ 0,00'
        }
        return formatCurrency(value)
    }

    if (contas.length === 0) {
        return <EmptyStateNoContas onCreateClick={onCreateClick} />
    }

    return (
        <>
            {/* Results count and pagination info */}
            <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                <span>{contas.length} conta{contas.length !== 1 ? 's' : ''}</span>
                {totalPages > 1 && (
                    <span>Página {currentPage} de {totalPages}</span>
                )}
            </div>

            {/* Cards list - compact style */}
            <div className="space-y-2">
                {paginatedContas.map((conta) => {
                    const proximaParcela = conta.proxima_parcela
                    const vencida = conta.status === 'ativa' && proximaParcela && isVencido(proximaParcela.data_vencimento)
                    const valor = conta.valor_pendente ?? conta.valor_final ?? 0

                    return (
                        <div
                            key={conta.id}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all active:scale-[0.99] hover:shadow-sm",
                                vencida && "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
                                conta.status === 'quitada' && "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
                                conta.status === 'ativa' && !vencida && "border-l-4 border-l-amber-500"
                            )}
                            onClick={() => onView?.(conta.id)}
                        >
                            {/* Left content */}
                            <div className="flex-1 min-w-0">
                                {/* Title row */}
                                <div className="flex items-center gap-1.5">
                                    {vencida && (
                                        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                    )}
                                    <span className={cn(
                                        "font-medium text-sm truncate",
                                        vencida && "text-red-700 dark:text-red-400"
                                    )}>
                                        {conta.descricao || 'Sem descrição'}
                                    </span>
                                </div>

                                {/* Subtitle row */}
                                <div className="flex items-center gap-2 mt-0.5">
                                    {conta.fornecedores && (
                                        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                            {conta.fornecedores.nome}
                                        </span>
                                    )}
                                    {conta.tipos_despesa && (
                                        <Badge
                                            variant="outline"
                                            className="font-normal text-[9px] h-4 px-1 py-0"
                                            style={{
                                                borderColor: conta.tipos_despesa.cor || '#6366f1',
                                                color: conta.tipos_despesa.cor || '#6366f1',
                                            }}
                                        >
                                            {conta.tipos_despesa.nome}
                                        </Badge>
                                    )}
                                </div>

                                {/* Info row */}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                        "text-[10px]",
                                        vencida ? "text-red-600 font-medium" : "text-muted-foreground"
                                    )}>
                                        {proximaParcela ? formatDateRelative(proximaParcela.data_vencimento) : '-'}
                                    </span>
                                    {conta.total_parcelas && conta.total_parcelas > 1 && (
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">
                                            {conta.parcela_atual}/{conta.total_parcelas}
                                        </Badge>
                                    )}
                                    <StatusBadge status={conta.status} size="sm" />
                                </div>
                            </div>

                            {/* Right content - Value and actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                    "text-sm font-bold",
                                    conta.status === 'quitada' && "text-emerald-600 dark:text-emerald-400",
                                    vencida && "text-red-600 dark:text-red-400"
                                )}>
                                    {safeFormatCurrency(valor)}
                                </span>

                                {/* Mobile: Button to open Bottom Sheet */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActionSheetConta(conta)
                                    }}
                                    aria-label="Abrir menu de ações"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                                pageNum = i + 1
                            } else if (currentPage <= 3) {
                                pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                            } else {
                                pageNum = currentPage - 2 + i
                            }
                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 p-0 text-xs"
                                    onClick={() => setCurrentPage(pageNum)}
                                >
                                    {pageNum}
                                </Button>
                            )
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próximo
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </div>
            )}

            <MarcarPagoDialog
                contaId={marcarPagoId}
                onOpenChange={(open: boolean) => !open && setMarcarPagoId(null)}
            />

            {/* Bottom Sheet for Actions (Mobile) */}
            <ContaActionsSheet
                conta={actionSheetConta}
                open={!!actionSheetConta}
                onOpenChange={(open) => !open && setActionSheetConta(null)}
                onView={onView}
                onEdit={onEdit}
                onMarkAsPaid={(id) => setMarcarPagoId(id)}
                onDelete={handleDelete}
            />
        </>
    )
}
