'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, CreditCard, Wallet, Building, QrCode, Receipt, ArrowLeftRight, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PagarParcelaDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    parcela: {
        id: string
        numero_parcela: number
        valor_final: number
        data_vencimento: string
    } | null
    contaId: string
    contaDescricao?: string
}

const tiposPagamento = [
    { value: 'pix', label: 'PIX', icon: QrCode },
    { value: 'dinheiro', label: 'Dinheiro', icon: Wallet },
    { value: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
    { value: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard },
    { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight },
    { value: 'boleto', label: 'Boleto', icon: Receipt },
]

type TipoPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto'

export function PagarParcelaDialog({
    open,
    onOpenChange,
    parcela,
    contaId,
    contaDescricao,
}: PagarParcelaDialogProps) {
    const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento | 'outro'>('pix')
    const [outroTipo, setOutroTipo] = useState('')
    const [valorPago, setValorPago] = useState<string>('')
    const [editandoValor, setEditandoValor] = useState(false)

    const utils = trpc.useUtils()

    const marcarPago = trpc.parcelas.marcarPago.useMutation({
        onSuccess: () => {
            toast.success('Parcela paga com sucesso!', {
                description: `Parcela ${parcela?.numero_parcela} registrada como paga.`,
            })
            utils.contas.list.invalidate()
            utils.contas.getById.invalidate(contaId)
            onOpenChange(false)
            // Reset states
            setValorPago('')
            setEditandoValor(false)
            setOutroTipo('')
            setTipoPagamento('pix')
        },
        onError: (error) => {
            toast.error('Erro ao registrar pagamento', { description: error.message })
        },
    })

    const handleConfirmar = () => {
        if (!parcela) return

        const valorFinal = editandoValor && valorPago
            ? parseFloat(valorPago.replace(',', '.'))
            : parcela.valor_final

        marcarPago.mutate({
            id: parcela.id,
            data_pagamento: new Date(dataPagamento).toISOString(),
            tipo_pagamento: tipoPagamento === 'outro' ? undefined : tipoPagamento,
            valor_final: valorFinal,
        })
    }

    // Reset when dialog opens
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen && parcela) {
            setValorPago(parcela.valor_final.toString())
            setEditandoValor(false)
            setDataPagamento(format(new Date(), 'yyyy-MM-dd'))
            setTipoPagamento('pix')
            setOutroTipo('')
        }
        onOpenChange(newOpen)
    }

    if (!parcela) return null

    const valorExibir = editandoValor && valorPago
        ? parseFloat(valorPago.replace(',', '.')) || 0
        : parcela.valor_final

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Confirmar Pagamento
                    </DialogTitle>
                    <DialogDescription>
                        {contaDescricao && <span className="font-medium">{contaDescricao}</span>}
                        {' - '}Parcela {parcela.numero_parcela}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Valor */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Valor a pagar</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setEditandoValor(!editandoValor)}
                            >
                                {editandoValor ? 'Usar original' : 'Editar valor'}
                            </Button>
                        </div>
                        {editandoValor ? (
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-emerald-600">R$</span>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={valorPago}
                                    onChange={(e) => setValorPago(e.target.value)}
                                    placeholder={parcela.valor_final.toFixed(2)}
                                    className="text-xl font-bold h-12 bg-white dark:bg-background"
                                />
                            </div>
                        ) : (
                            <span className="text-2xl font-bold text-emerald-600 block">
                                {formatCurrency(valorExibir)}
                            </span>
                        )}
                        {editandoValor && valorExibir !== parcela.valor_final && (
                            <p className="text-xs text-muted-foreground">
                                Valor original: {formatCurrency(parcela.valor_final)}
                            </p>
                        )}
                    </div>

                    {/* Data de Pagamento */}
                    <div className="space-y-2">
                        <Label htmlFor="data-pagamento">Data do Pagamento</Label>
                        <Input
                            id="data-pagamento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            max={format(new Date(), 'yyyy-MM-dd')}
                        />
                    </div>

                    {/* Tipo de Pagamento */}
                    <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {tiposPagamento.map((tipo) => {
                                const Icon = tipo.icon
                                const isSelected = tipoPagamento === tipo.value
                                return (
                                    <button
                                        key={tipo.value}
                                        type="button"
                                        onClick={() => setTipoPagamento(tipo.value as TipoPagamento)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center min-h-[60px]",
                                            isSelected
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-muted hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-[11px] font-medium leading-tight">{tipo.label}</span>
                                    </button>
                                )
                            })}
                            {/* Botão "Outro" */}
                            <button
                                type="button"
                                onClick={() => setTipoPagamento('outro')}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all min-h-[60px]",
                                    tipoPagamento === 'outro'
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-muted hover:border-muted-foreground/50"
                                )}
                            >
                                <Plus className="h-5 w-5" />
                                <span className="text-[11px] font-medium">Outro</span>
                            </button>
                        </div>

                        {/* Campo para outro tipo */}
                        {tipoPagamento === 'outro' && (
                            <Input
                                placeholder="Digite a forma de pagamento..."
                                value={outroTipo}
                                onChange={(e) => setOutroTipo(e.target.value)}
                                className="mt-2"
                            />
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={marcarPago.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmar}
                        disabled={marcarPago.isPending || (tipoPagamento === 'outro' && !outroTipo)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {marcarPago.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar Pagamento
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
