'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { cn, formatCurrency } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const schema = z.object({
    valor: z.string().min(1, 'Informe o valor'),
    data_vencimento: z.date(),
})

type FormData = z.infer<typeof schema>

interface AddParcelaDialogProps {
    contaId: string
    proximoNumero: number
    onSuccess?: () => void
}

export function AddParcelaDialog({ contaId, proximoNumero, onSuccess }: AddParcelaDialogProps) {
    const [open, setOpen] = useState(false)

    const utils = trpc.useUtils()
    const { mutate: createParcela, isPending } = trpc.parcelas.create.useMutation({
        onSuccess: () => {
            toast.success('Parcela adicionada com sucesso!')
            utils.contas.getById.invalidate(contaId)
            utils.parcelas.listByConta.invalidate(contaId) // Invalidate parcel list as well just in case
            setOpen(false)
            form.reset({
                valor: '',
                data_vencimento: undefined
            })
            onSuccess?.()
        },
        onError: (error) => {
            toast.error('Erro ao adicionar parcela: ' + error.message)
        }
    })

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            valor: '',
        }
    })

    const onSubmit = (data: FormData) => {
        const valor = parseFloat(data.valor.replace('R$', '').replace(/\./g, '').replace(',', '.'))

        if (isNaN(valor) || valor <= 0) {
            form.setError('valor', { message: 'Valor inválido' })
            return
        }

        createParcela({
            conta_id: contaId,
            numero_parcela: proximoNumero,
            valor_original: valor,
            data_vencimento: format(data.data_vencimento, 'yyyy-MM-dd'),
        })
    }

    // Currency mask logic
    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '')
        const floatValue = parseFloat(value) / 100

        if (isNaN(floatValue)) {
            form.setValue('valor', '')
            return
        }

        form.setValue('valor', formatCurrency(floatValue))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Nova Parcela
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Parcela {proximoNumero}</DialogTitle>
                    <DialogDescription>
                        Adicione uma nova parcela manualmente a esta conta.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="valor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor da Parcela</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                placeholder="R$ 0,00"
                                                className="text-lg font-semibold"
                                                {...field}
                                                onChange={handleValorChange}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="data_vencimento"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Vencimento</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "dd 'de' MMMM, yyyy")
                                                    ) : (
                                                        <span>Selecione uma data</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Adicionar Parcela
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
