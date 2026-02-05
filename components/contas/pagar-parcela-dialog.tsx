'use client'

import { useState, useEffect } from 'react'
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
import { CheckCircle2, Loader2, CreditCard, Wallet, Building, QrCode, Receipt, ArrowLeftRight, Plus, AlertTriangle, Pencil, Check } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PagarParcelaDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    parcela: {
        id: string
        numero_parcela: number
        valor_original: number
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
    const [valorJuros, setValorJuros] = useState<string>('0')
    const [valorDesconto, setValorDesconto] = useState<string>('0')
    const [valorOriginalEdit, setValorOriginalEdit] = useState<string>('0')
    const [isEditingValor, setIsEditingValor] = useState(false)
    const [mostrarDetalhes, setMostrarDetalhes] = useState(false)

    useEffect(() => {
        if (open && parcela) {
            setValorOriginalEdit(parcela.valor_original.toString())
            setValorJuros('0')
            setValorDesconto('0')
            setIsEditingValor(false)
            setMostrarDetalhes(false)
            setDataPagamento(format(new Date(), 'yyyy-MM-dd'))
            setTipoPagamento('pix')
            setOutroTipo('')
        }
    }, [open, parcela])

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
            setValorJuros('0')
            setValorDesconto('0')
            setMostrarDetalhes(false)
            setOutroTipo('')
            setTipoPagamento('pix')
        },
        onError: (error) => {
            toast.error('Erro ao registrar pagamento', { description: error.message })
        },
    })

    const handleConfirmar = () => {
        if (!parcela) return

        const jurosNum = parseFloat(valorJuros.replace(',', '.')) || 0
        const descontoNum = parseFloat(valorDesconto.replace(',', '.')) || 0
        const valorOriginalNum = parseFloat(valorOriginalEdit.replace(',', '.')) || 0
        const valorFinal = valorOriginalNum + jurosNum - descontoNum

        if (valorFinal < 0) {
            toast.error('Valor inválido', {
                description: 'O desconto não pode ser maior que o valor original + juros'
            })
            return
        }

        marcarPago.mutate({
            id: parcela.id,
            data_pagamento: new Date(dataPagamento).toISOString(),
            tipo_pagamento: tipoPagamento === 'outro' ? undefined : tipoPagamento,
            valor_juros: jurosNum,
            valor_desconto: descontoNum,
            valor_original: valorOriginalNum !== parcela.valor_original ? valorOriginalNum : undefined,
        })
    }

    // Reset when dialog opens
    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen)
    }

    if (!parcela) return null

    // Calcular valores
    const jurosNum = parseFloat(valorJuros.replace(',', '.')) || 0
    const descontoNum = parseFloat(valorDesconto.replace(',', '.')) || 0
    const valorOriginalNum = parseFloat(valorOriginalEdit.replace(',', '.')) || 0
    const valorFinal = valorOriginalNum + jurosNum - descontoNum

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
                    {/* Valor Section - Compact & Professional */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg space-y-2">
                        {/* Header with toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Valores
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
                            >
                                {mostrarDetalhes ? 'Ocultar detalhes' : 'Adicionar juros/desconto'}
                            </Button>
                        </div>

                        {/* Valor Final Display */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-muted-foreground">Total a pagar:</span>
                            <span className={cn(
                                "text-2xl font-bold",
                                valorFinal < 0 ? "text-red-600" : "text-emerald-600"
                            )}>
                                {formatCurrency(valorFinal)}
                            </span>
                        </div>

                        {/* Detalhes Expandíveis */}
                        {mostrarDetalhes && (
                            <div className="space-y-2 pt-2 border-t">
                                {/* Valor Original */}
                                <div className="flex items-center justify-between text-sm h-9">
                                    <span className="text-muted-foreground">Valor original</span>
                                    {isEditingValor ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <Input
                                                type="number"
                                                value={valorOriginalEdit}
                                                onChange={(e) => setValorOriginalEdit(e.target.value)}
                                                className="h-7 w-24 text-right pr-2 text-sm"
                                                autoFocus
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                                onClick={() => setIsEditingValor(false)}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-medium">{formatCurrency(parseFloat(valorOriginalEdit.replace(',', '.')) || 0)}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground opacity-50 group-hover:opacity-100 hover:text-foreground hover:bg-transparent transition-all"
                                                onClick={() => setIsEditingValor(true)}
                                                title="Editar valor da parcela"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Juros Input */}
                                <div className="space-y-1">
                                    <Label htmlFor="juros" className="text-xs">Juros (+)</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">R$</span>
                                        <Input
                                            id="juros"
                                            type="text"
                                            inputMode="decimal"
                                            value={valorJuros}
                                            onChange={(e) => setValorJuros(e.target.value)}
                                            placeholder="0,00"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Desconto Input */}
                                <div className="space-y-1">
                                    <Label htmlFor="desconto" className="text-xs">Desconto (-)</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">R$</span>
                                        <Input
                                            id="desconto"
                                            type="text"
                                            inputMode="decimal"
                                            value={valorDesconto}
                                            onChange={(e) => setValorDesconto(e.target.value)}
                                            placeholder="0,00"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Calculation Display */}
                                {(jurosNum > 0 || descontoNum > 0) && (
                                    <div className="pt-2 border-t space-y-1 text-xs">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Valor original</span>
                                            <span>{formatCurrency(parcela.valor_original)}</span>
                                        </div>
                                        {jurosNum > 0 && (
                                            <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                                <span>+ Juros</span>
                                                <span>{formatCurrency(jurosNum)}</span>
                                            </div>
                                        )}
                                        {descontoNum > 0 && (
                                            <div className="flex justify-between text-emerald-600">
                                                <span>- Desconto</span>
                                                <span>{formatCurrency(descontoNum)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold pt-1 border-t">
                                            <span>Total</span>
                                            <span className={cn(
                                                valorFinal < 0 ? 'text-red-600' : 'text-emerald-600'
                                            )}>
                                                {formatCurrency(valorFinal)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {valorFinal < 0 && (
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        O desconto não pode ser maior que o valor original + juros
                                    </p>
                                )}
                            </div>
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
