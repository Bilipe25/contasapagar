'use client'

import { trpc } from '@/lib/trpc/client'
import { formatCurrency, parseLocalDate } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    ArrowRight,
    Receipt
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SupplierAccountsListProps {
    fornecedorId: string
    onViewConta?: (contaId: string) => void
}

export function SupplierAccountsList({ fornecedorId, onViewConta }: SupplierAccountsListProps) {
    const { data: contas, isLoading } = trpc.contas.list.useQuery({
        fornecedorId: fornecedorId,
        status: undefined // Busca todas
    })

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
        )
    }

    if (!contas || contas.length === 0) {
        return (
            <div className="text-center py-8">
                <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                    Nenhuma conta encontrada para este fornecedor.
                </p>
                {/* Opcional: Botão de criar conta pré-preenchida poderia ir aqui */}
            </div>
        )
    }

    // Ordenar contas: Vencidas primeiro, depois pendentes mais próximas, depois quitadas (mais recentes primeiro)
    const sortedContas = [...contas].sort((a, b) => {
        // First priority: Status
        const getStatusPriority = (c: typeof a) => {
            if (c.status === 'cancelado') return 4
            if (c.status === 'pago') return 3
            if (c.parcelasAtrasadas > 0) return 0 // Vencida = Top priority
            return 1 // Pendente = Second priority
        }

        const priorityA = getStatusPriority(a)
        const priorityB = getStatusPriority(b)

        if (priorityA !== priorityB) return priorityA - priorityB

        // Second priority: Date
        const dateA = a.proxima_parcela ? parseLocalDate(a.proxima_parcela.data_vencimento) : new Date(0)
        const dateB = b.proxima_parcela ? parseLocalDate(b.proxima_parcela.data_vencimento) : new Date(0)

        // For 'pago' (3), newer first. For pending/late (0, 1), older first (closest due date)
        if (priorityA === 3) return dateB.getTime() - dateA.getTime()
        return dateA.getTime() - dateB.getTime()
    })

    return (
        <div className="space-y-3">
            {sortedContas.slice(0, 10).map(conta => { // Limit to 10 for performance in drawer
                const statusColor = {
                    quitada: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900',
                    ativa: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900',
                    vencida: 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900',
                }

                const status = conta.status === 'quitada' ? 'quitada' :
                    conta.parcelasAtrasadas > 0 ? 'vencida' : 'ativa'

                return (
                    <div
                        key={conta.id}
                        className={`group flex flex-col gap-2 p-3 rounded-lg border bg-card transition-all ${onViewConta ? 'cursor-pointer hover:shadow-md active:scale-[0.99] hover:border-primary/20' : ''}`}
                        onClick={() => onViewConta?.(conta.id)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                                <h4 className="font-medium text-sm truncate pr-2 group-hover:text-primary transition-colors">
                                    {conta.descricao}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {conta.tipos_despesa && (
                                        <span className="flex items-center gap-1">
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: conta.tipos_despesa.cor || '#6366f1' }}
                                            />
                                            {conta.tipos_despesa.nome}
                                        </span>
                                    )}
                                    {conta.parcelas_pendentes > 1 && (
                                        <span className="text-[10px] bg-muted px-1.5 rounded-sm">
                                            {conta.parcelas_pendentes}x rest.
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-[10px] uppercase tracking-wide border-0 px-2 py-0.5 ${statusColor[status]}`}
                            >
                                {status === 'quitada' ? 'Quitada' :
                                    status === 'vencida' ? 'Atrasada' : 'Pendente'}
                            </Badge>
                        </div>

                        {/* Values row */}
                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed group-hover:border-primary/10 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {status === 'quitada' ? 'Pago em' : 'Vencimento'}
                                </span>
                                <span className={`text-xs font-medium flex items-center gap-1.5 mt-0.5 ${status === 'vencida' ? 'text-red-600' : ''}`}>
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    {status === 'quitada'
                                        ? (conta.updated_at ? format(new Date(conta.updated_at), 'dd/MM/yyyy') : '-') // Data de atualização como proxy, melhor seria updated_at da parcela
                                        : (conta.proxima_parcela
                                            ? format(parseLocalDate(conta.proxima_parcela.data_vencimento), 'dd/MM/yyyy')
                                            : '-')
                                    }
                                </span>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Valor {status === 'quitada' ? 'Pago' : 'Pendente'}
                                </span>
                                <span className={`text-sm font-bold mt-0.5 ${status === 'quitada' ? 'text-emerald-600' :
                                        status === 'vencida' ? 'text-red-600' : 'text-blue-600'
                                    }`}>
                                    {formatCurrency(
                                        status === 'quitada' ? conta.valor_pago : conta.valor_pendente
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}

            <Button asChild variant="ghost" className="w-full text-xs h-8 mt-2 hover:bg-muted/50">
                <Link href={`/contas?fornecedor=${fornecedorId}`}>
                    Ver listagem completa
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                </Link>
            </Button>
        </div>
    )
}
