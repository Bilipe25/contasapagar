'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Clock, MoreVertical, Edit, Undo2, Trash2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, isVencido, formatDate, parseLocalDate } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PagarParcelaDialog } from './pagar-parcela-dialog'
import { EditarParcelaDialog } from './editar-parcela-dialog'

interface Parcela {
    id: string
    numero_parcela: number
    valor_original?: number
    valor_juros?: number
    valor_final: number
    data_vencimento: string
    status: string
    data_pagamento?: string | null
    tipo_pagamento?: string | null
    observacoes?: string | null
}

interface ParcelasTableProps {
    parcelas: Parcela[]
    contaId: string
    contaDescricao?: string
}

const tiposPagamentoLabels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão Créd.',
    cartao_debito: 'Cartão Déb.',
    transferencia: 'Transferência',
    boleto: 'Boleto',
}

export function ParcelasTable({ parcelas, contaId, contaDescricao }: ParcelasTableProps) {
    const [parcelaPagar, setParcelaPagar] = useState<Parcela | null>(null)
    const [parcelaExcluir, setParcelaExcluir] = useState<Parcela | null>(null)
    const [parcelaEditar, setParcelaEditar] = useState<Parcela | null>(null)
    const utils = trpc.useUtils()

    const reverterPagamento = trpc.parcelas.update.useMutation({
        onSuccess: () => {
            toast.success('Pagamento revertido!')
            utils.contas.list.invalidate()
            utils.contas.getById.invalidate(contaId)
        },
        onError: (error) => {
            toast.error('Erro ao reverter', { description: error.message })
        },
    })

    const excluirParcela = trpc.parcelas.delete.useMutation({
        onSuccess: () => {
            toast.success('Parcela excluída!')
            utils.contas.list.invalidate()
            utils.contas.getById.invalidate(contaId)
            setParcelaExcluir(null)
        },
        onError: (error) => {
            toast.error('Erro ao excluir', { description: error.message })
        },
    })

    const statusConfig = {
        pendente: { label: 'Pendente', icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400' },
        pago: { label: 'Pago', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400' },
        atrasado: { label: 'Atrasado', icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400' },
        cancelado: { label: 'Cancelado', icon: AlertCircle, color: 'text-muted-foreground bg-muted' },
    }

    const handleReverterPagamento = (parcela: Parcela) => {
        reverterPagamento.mutate({
            id: parcela.id,
            status: 'pendente',
            data_pagamento: null,
            tipo_pagamento: null,
        })
    }

    const handleExcluirParcela = () => {
        if (parcelaExcluir) {
            excluirParcela.mutate(parcelaExcluir.id)
        }
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">#</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parcelas.map((parcela, index) => {
                            const status = statusConfig[parcela.status as keyof typeof statusConfig] || statusConfig.pendente
                            const isLate = isVencido(parcela.data_vencimento) && parcela.status === 'pendente'
                            const displayStatus = isLate ? statusConfig.atrasado : status
                            const isPago = parcela.status === 'pago'

                            return (
                                <TableRow
                                    key={parcela.id}
                                    className={cn(
                                        index % 2 === 0 ? 'bg-muted/30' : '',
                                        isPago && 'opacity-60',
                                        isLate && 'bg-red-50/50 dark:bg-red-950/10'
                                    )}
                                >
                                    <TableCell className="font-medium">
                                        <span className={cn(
                                            "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold",
                                            isPago ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted"
                                        )}>
                                            {parcela.numero_parcela}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "font-medium",
                                                isLate && "text-red-600",
                                                isPago && "line-through text-muted-foreground"
                                            )}>
                                                {formatDate(parcela.data_vencimento)}
                                            </span>
                                            {parcela.data_pagamento && (
                                                <span className="text-xs text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Pago {format(parseLocalDate(parcela.data_pagamento), "dd/MM")}
                                                    {parcela.tipo_pagamento && ` • ${tiposPagamentoLabels[parcela.tipo_pagamento] || parcela.tipo_pagamento}`}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "font-semibold",
                                            isPago && "text-emerald-600",
                                            isLate && "text-red-600"
                                        )}>
                                            {formatCurrency(parcela.valor_final)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                            displayStatus.color
                                        )}>
                                            <displayStatus.icon className="w-3.5 h-3.5" />
                                            {displayStatus.label}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Botão rápido de pagar */}
                                            {!isPago && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => setParcelaPagar(parcela)}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    Pagar
                                                </Button>
                                            )}

                                            {/* Menu de opções */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Opções</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {!isPago && (
                                                        <DropdownMenuItem onClick={() => setParcelaPagar(parcela)}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                                            Registrar pagamento
                                                        </DropdownMenuItem>
                                                    )}
                                                    {isPago && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleReverterPagamento(parcela)}
                                                            className="text-orange-600"
                                                        >
                                                            <Undo2 className="mr-2 h-4 w-4" />
                                                            Reverter pagamento
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => setParcelaEditar(parcela)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar parcela
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setParcelaExcluir(parcela)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir parcela
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog de Pagamento */}
            <PagarParcelaDialog
                open={!!parcelaPagar}
                onOpenChange={(open) => !open && setParcelaPagar(null)}
                parcela={parcelaPagar}
                contaId={contaId}
                contaDescricao={contaDescricao}
            />

            {/* Dialog de Confirmação de Exclusão */}
            {parcelaExcluir && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">Excluir Parcela</h3>
                        <p className="text-muted-foreground mb-4">
                            Tem certeza que deseja excluir a parcela {parcelaExcluir.numero_parcela}?
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setParcelaExcluir(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleExcluirParcela}
                                disabled={excluirParcela.isPending}
                            >
                                {excluirParcela.isPending ? 'Excluindo...' : 'Excluir'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de Edição de Parcela */}
            <EditarParcelaDialog
                open={!!parcelaEditar}
                onOpenChange={(open) => !open && setParcelaEditar(null)}
                parcela={parcelaEditar as any}
                contaId={contaId}
            />
        </>
    )
}

