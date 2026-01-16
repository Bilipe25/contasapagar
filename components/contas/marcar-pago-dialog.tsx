'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const marcarPagoSchema = z.object({
    data_pagamento: z.string().min(1, 'Data de pagamento é obrigatória'),
    tipo_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia']),
})

type MarcarPagoFormValues = z.infer<typeof marcarPagoSchema>

interface MarcarPagoDialogProps {
    contaId: string | null
    onOpenChange: (open: boolean) => void
}

export function MarcarPagoDialog({ contaId, onOpenChange }: MarcarPagoDialogProps) {
    const utils = trpc.useUtils()

    const form = useForm<MarcarPagoFormValues>({
        resolver: zodResolver(marcarPagoSchema),
        defaultValues: {
            data_pagamento: new Date().toISOString().split('T')[0],
            tipo_pagamento: 'pix',
        },
    })

    const mutation = trpc.contas.marcarComoPago.useMutation({
        onSuccess: () => {
            toast.success('Conta marcada como paga!')
            utils.contas.list.invalidate()
            utils.dashboard.stats.invalidate()
            utils.dashboard.vencimentosProximos.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error: any) => {
            toast.error('Erro ao marcar conta como paga', {
                description: error.message,
            })
        },
    })

    const onSubmit = (data: MarcarPagoFormValues) => {
        if (!contaId) return
        mutation.mutate({
            id: contaId,
            ...data,
        })
    }

    return (
        <Dialog open={!!contaId} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Marcar como Pago</DialogTitle>
                    <DialogDescription>
                        Confirme a data e forma de pagamento da conta
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Data Pagamento */}
                        <FormField
                            control={form.control}
                            name="data_pagamento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data do Pagamento</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Tipo Pagamento */}
                        <FormField
                            control={form.control}
                            name="tipo_pagamento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Forma de Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="pix">PIX</SelectItem>
                                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                            <SelectItem value="transferencia">Transferência</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={mutation.isPending}
                                className="w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={mutation.isPending}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                            >
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Pagamento
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
