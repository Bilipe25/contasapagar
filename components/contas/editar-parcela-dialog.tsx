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
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Edit, Loader2, Save, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Parcela {
    id: string
    numero_parcela: number
    valor_original: number
    valor_juros: number
    valor_final: number
    data_vencimento: string
    status: string
    data_pagamento?: string | null
    tipo_pagamento?: string | null
    observacoes?: string | null
}

interface EditarParcelaDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    parcela: Parcela | null
    contaId: string
}

export function EditarParcelaDialog({
    open,
    onOpenChange,
    parcela,
    contaId,
}: EditarParcelaDialogProps) {
    const [valorOriginal, setValorOriginal] = useState('')
    const [valorJuros, setValorJuros] = useState('')
    const [dataVencimento, setDataVencimento] = useState('')
    const [status, setStatus] = useState<'pendente' | 'pago' | 'atrasado' | 'cancelado'>('pendente')
    const [observacoes, setObservacoes] = useState('')

    const utils = trpc.useUtils()

    // Carregar dados quando abrir
    useEffect(() => {
        if (parcela && open) {
            setValorOriginal(parcela.valor_original.toString())
            setValorJuros(parcela.valor_juros?.toString() || '0')
            setDataVencimento(parcela.data_vencimento.split('T')[0])
            setStatus(parcela.status as any)
            setObservacoes(parcela.observacoes || '')
        }
    }, [parcela, open])

    const atualizarParcela = trpc.parcelas.update.useMutation({
        onSuccess: () => {
            toast.success('Parcela atualizada!', {
                description: `Parcela ${parcela?.numero_parcela} foi atualizada com sucesso.`,
            })
            utils.contas.list.invalidate()
            utils.contas.getById.invalidate(contaId)
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error('Erro ao atualizar', { description: error.message })
        },
    })

    const handleSalvar = () => {
        if (!parcela) return

        const valorOriginalNum = parseFloat(valorOriginal.replace(',', '.')) || 0
        const valorJurosNum = parseFloat(valorJuros.replace(',', '.')) || 0

        atualizarParcela.mutate({
            id: parcela.id,
            valor_original: valorOriginalNum,
            valor_juros: valorJurosNum,
            data_vencimento: dataVencimento,
            status: status,
            observacoes: observacoes || null,
        })
    }

    if (!parcela) return null

    const valorFinalCalculado = (parseFloat(valorOriginal.replace(',', '.')) || 0) +
        (parseFloat(valorJuros.replace(',', '.')) || 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-primary" />
                        Editar Parcela {parcela.numero_parcela}
                    </DialogTitle>
                    <DialogDescription>
                        Altere os dados da parcela conforme necessário.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Valor Original */}
                    <div className="space-y-2">
                        <Label htmlFor="valor-original">Valor Original (R$)</Label>
                        <Input
                            id="valor-original"
                            type="text"
                            inputMode="decimal"
                            value={valorOriginal}
                            onChange={(e) => setValorOriginal(e.target.value)}
                            placeholder="0,00"
                        />
                    </div>

                    {/* Valor Juros */}
                    <div className="space-y-2">
                        <Label htmlFor="valor-juros">Juros/Multa (R$)</Label>
                        <Input
                            id="valor-juros"
                            type="text"
                            inputMode="decimal"
                            value={valorJuros}
                            onChange={(e) => setValorJuros(e.target.value)}
                            placeholder="0,00"
                        />
                    </div>

                    {/* Valor Final (calculado) */}
                    <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Valor Final</span>
                            <span className="font-bold text-lg">
                                R$ {valorFinalCalculado.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>

                    {/* Data de Vencimento */}
                    <div className="space-y-2">
                        <Label htmlFor="data-vencimento">Data de Vencimento</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="data-vencimento"
                                type="date"
                                value={dataVencimento}
                                onChange={(e) => setDataVencimento(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="atrasado">Atrasado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                            id="observacoes"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Notas sobre esta parcela..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={atualizarParcela.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSalvar}
                        disabled={atualizarParcela.isPending}
                    >
                        {atualizarParcela.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
