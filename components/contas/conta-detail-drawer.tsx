'use client'

import { useMemo } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { trpc } from '@/lib/trpc/client'
import { ParcelasTable } from './parcelas-table'
import { AddParcelaDialog } from './add-parcela-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    Calendar,
    Building2,
    Tag,
    FileText,
    Edit,
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingUp,
    Wallet
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, parseLocalDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ContaDetailDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contaId: string | null
    onEdit?: (contaId: string) => void
}

export function ContaDetailDrawer({ open, onOpenChange, contaId, onEdit }: ContaDetailDrawerProps) {
    const { data: conta, isLoading } = trpc.contas.getById.useQuery(contaId!, {
        enabled: !!contaId && open,
    })

    // Calcular estatísticas
    const stats = useMemo(() => {
        if (!conta?.parcelas) return null

        const parcelas = conta.parcelas as any[]
        const totalParcelas = parcelas.length
        const parcelasPagas = parcelas.filter(p => p.status === 'pago').length
        const parcelasPendentes = parcelas.filter(p => p.status === 'pendente' || p.status === 'atrasado').length
        const parcelasAtrasadas = parcelas.filter(p => {
            if (p.status !== 'pendente') return false
            const vencimento = parseLocalDate(p.data_vencimento)
            vencimento.setHours(12, 0, 0, 0)
            const hoje = new Date()
            hoje.setHours(12, 0, 0, 0)

            return vencimento < hoje
        }).length

        const valorTotal = parcelas.reduce((sum, p) => sum + (p.valor_final || 0), 0)
        const valorPago = parcelas
            .filter(p => p.status === 'pago')
            .reduce((sum, p) => sum + (p.valor_final || 0), 0)
        const valorPendente = parcelas
            .filter(p => p.status !== 'pago' && p.status !== 'cancelado')
            .reduce((sum, p) => sum + (p.valor_final || 0), 0)

        const progresso = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0
        const isQuitada = parcelasPagas === totalParcelas && totalParcelas > 0

        return {
            totalParcelas,
            parcelasPagas,
            parcelasPendentes,
            parcelasAtrasadas,
            valorTotal,
            valorPago,
            valorPendente,
            progresso,
            isQuitada,
        }
    }, [conta?.parcelas])

    const statusBadge = useMemo(() => {
        if (!stats) return null
        if (stats.isQuitada) {
            return { label: 'Quitada', color: 'bg-emerald-500', icon: CheckCircle2 }
        }
        if (stats.parcelasAtrasadas > 0) {
            return { label: 'Atrasada', color: 'bg-red-500', icon: AlertTriangle }
        }
        return { label: 'Ativa', color: 'bg-blue-500', icon: Clock }
    }, [stats])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl w-full overflow-y-auto p-0">
                {/* SR-only title for accessibility */}
                <SheetHeader className={isLoading || !conta ? '' : 'sr-only'}>
                    <SheetTitle>Detalhes da Conta</SheetTitle>
                    <SheetDescription>Carregando informações...</SheetDescription>
                </SheetHeader>

                {isLoading || !conta ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                        </div>
                        <div className="space-y-2 mt-8">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 p-4 sm:p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{conta.descricao}</h2>
                                    {statusBadge && (
                                        <Badge className={cn("text-white text-[10px] sm:text-xs", statusBadge.color)}>
                                            <statusBadge.icon className="h-3 w-3 mr-1" />
                                            {statusBadge.label}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-muted-foreground text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        {conta.fornecedores?.nome || 'Sem fornecedor'}
                                    </span>
                                    {conta.tipos_despesa && (
                                        <>
                                            <span className="text-muted-foreground/50">•</span>
                                            <span className="flex items-center gap-1">
                                                <span
                                                    className="w-2 h-2 rounded-full inline-block"
                                                    style={{ backgroundColor: conta.tipos_despesa.cor || '#6366f1' }}
                                                />
                                                {conta.tipos_despesa.nome}
                                            </span>
                                        </>
                                    )}
                                    {(conta as any).empresas && (
                                        <>
                                            <span className="text-muted-foreground/50">•</span>
                                            <span className="flex items-center gap-1 text-primary/80">
                                                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                {(conta as any).empresas.nome_fantasia || (conta as any).empresas.razao_social}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {onEdit && (
                                <Button variant="outline" size="sm" onClick={() => onEdit(conta.id)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                            )}
                        </div>

                        {/* Cards de Resumo */}
                        {stats && (
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs mb-1">
                                        <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        Valor Total
                                    </div>
                                    <p className="text-base sm:text-xl font-bold">{formatCurrency(stats.valorTotal)}</p>
                                </div>
                                <div className={cn(
                                    "p-3 sm:p-4 rounded-lg border",
                                    stats.isQuitada ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-orange-50 dark:bg-orange-950/20"
                                )}>
                                    <div className={cn(
                                        "flex items-center gap-1.5 text-[10px] sm:text-xs mb-1",
                                        stats.isQuitada ? "text-emerald-600" : "text-orange-600"
                                    )}>
                                        {stats.isQuitada ? <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                                        {stats.isQuitada ? 'Totalmente Pago' : 'Valor Pendente'}
                                    </div>
                                    <p className={cn(
                                        "text-base sm:text-xl font-bold",
                                        stats.isQuitada ? "text-emerald-600" : "text-orange-600"
                                    )}>
                                        {formatCurrency(stats.isQuitada ? stats.valorPago : stats.valorPendente)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Barra de Progresso */}
                        {stats && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progresso de Pagamento</span>
                                    <span className="font-medium">
                                        {stats.parcelasPagas} de {stats.totalParcelas} parcelas
                                    </span>
                                </div>
                                <Progress
                                    value={stats.progresso}
                                    className="h-2"
                                />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        {formatCurrency(stats.valorPago)} pago
                                    </span>
                                    {stats.parcelasAtrasadas > 0 && (
                                        <span className="flex items-center gap-1 text-red-500">
                                            <AlertTriangle className="h-3 w-3" />
                                            {stats.parcelasAtrasadas} atrasada{stats.parcelasAtrasadas > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Informações Adicionais */}
                        <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                            <div className="space-y-1">
                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <Calendar className="h-3 w-3" /> Data de Emissão
                                </span>
                                <p className="font-medium">
                                    {format(parseLocalDate(conta.data_emissao), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </p>
                            </div>
                            {conta.observacoes && (
                                <div className="col-span-2 space-y-1">
                                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                        <FileText className="h-3 w-3" /> Observações
                                    </span>
                                    <p className="text-muted-foreground bg-muted p-2 rounded-md text-xs">
                                        {conta.observacoes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Lista de Parcelas */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                    Parcelas
                                </h3>
                                <AddParcelaDialog
                                    contaId={conta.id}
                                    proximoNumero={(conta.parcelas?.length || 0) + 1}
                                />
                            </div>
                            <ParcelasTable
                                parcelas={conta.parcelas as any[]}
                                contaId={conta.id}
                                contaDescricao={conta.descricao}
                            />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
