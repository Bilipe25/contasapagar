'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import {
    Dialog,
    DialogContent,
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

const schema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    cor: z.string().optional(),
    plano_conta_id: z.string().uuid().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

// Cores predefinidas para seleção rápida
const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
]

interface TipoDespesaDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tipoDespesaId?: string | null
}

export function TipoDespesaDialog({ open, onOpenChange, tipoDespesaId }: TipoDespesaDialogProps) {
    const utils = trpc.useUtils()
    const isEditing = !!tipoDespesaId

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { nome: '', cor: '#6366f1', plano_conta_id: null },
    })

    // Fetch plano de contas for selection (only analytic)
    const { data: planoContas } = trpc.planoContas.list.useQuery(undefined, {
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const contasAnaliticas = planoContas?.filter(c => c.modo === 'ANALITICA') || []

    // Fetch tipo despesa data if editing
    const { data: tipoDespesa } = trpc.tiposDespesa.list.useQuery(undefined, {
        enabled: isEditing,
        select: (data) => data.find(t => t.id === tipoDespesaId),
    })

    // Update form when data is loaded
    useEffect(() => {
        if (tipoDespesa) {
            form.reset({
                nome: tipoDespesa.nome,
                cor: tipoDespesa.cor || '#6366f1',
                plano_conta_id: tipoDespesa.plano_conta_id || null
            })
        } else if (!isEditing) {
            form.reset({ nome: '', cor: '#6366f1', plano_conta_id: null })
        }
    }, [tipoDespesa, isEditing, form])

    const createMutation = trpc.tiposDespesa.create.useMutation({
        onSuccess: () => {
            toast.success('Categoria criada!')
            utils.tiposDespesa.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao criar', { description: error.message })
        },
    })

    const updateMutation = trpc.tiposDespesa.update.useMutation({
        onSuccess: () => {
            toast.success('Categoria atualizada!')
            utils.tiposDespesa.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao atualizar', { description: error.message })
        },
    })

    const onSubmit = (data: FormValues) => {
        if (isEditing && tipoDespesaId) {
            updateMutation.mutate({ id: tipoDespesaId, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending
    const selectedColor = form.watch('cor')

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) form.reset()
            onOpenChange(newOpen)
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome da categoria" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="plano_conta_id"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Plano de Contas (Vínculo Contábil)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? contasAnaliticas.find(
                                                            (c) => c.id === field.value
                                                        )?.descricao
                                                        : "Selecione a conta contábil..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar conta..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                                    <CommandGroup>
                                                        {contasAnaliticas.map((conta) => (
                                                            <CommandItem
                                                                value={conta.descricao}
                                                                key={conta.id}
                                                                onSelect={() => {
                                                                    form.setValue("plano_conta_id", conta.id)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        conta.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                <span className="font-mono text-muted-foreground mr-2">{conta.codigo}</span>
                                                                {conta.descricao}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cor</FormLabel>
                                    <FormControl>
                                        <div className="space-y-2 sm:space-y-3">
                                            {/* Color presets */}
                                            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                                                {PRESET_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => form.setValue('cor', color)}
                                                    />
                                                ))}
                                            </div>
                                            {/* Custom color picker */}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="color"
                                                    {...field}
                                                    className="w-10 h-9 sm:w-12 sm:h-10 p-1 cursor-pointer"
                                                />
                                                <Input
                                                    value={field.value}
                                                    onChange={(e) => form.setValue('cor', e.target.value)}
                                                    placeholder="#6366f1"
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full sm:w-auto"
                            >
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Salvar' : 'Criar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
