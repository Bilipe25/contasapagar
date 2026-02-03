'use client'

import { useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Landmark } from 'lucide-react'

const bancoSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    codigo: z.string().optional(),
})

type BancoFormValues = z.infer<typeof bancoSchema>

interface BancoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bancoId?: string | null
}

export function BancoDialog({ open, onOpenChange, bancoId }: BancoDialogProps) {
    const utils = trpc.useUtils()
    const isEditing = !!bancoId

    const form = useForm<BancoFormValues>({
        resolver: zodResolver(bancoSchema),
        defaultValues: {
            nome: '',
            codigo: '',
        },
    })

    // Fetch banco if editing
    const { data: banco, isLoading: isLoadingBanco } = trpc.bancos.getById.useQuery(bancoId!, {
        enabled: isEditing,
    })

    // Populate form when editing
    useEffect(() => {
        if (banco) {
            form.reset({
                nome: banco.nome,
                codigo: banco.codigo || '',
            })
        } else if (!isEditing) {
            form.reset({
                nome: '',
                codigo: '',
            })
        }
    }, [banco, isEditing, form])

    // Mutations
    const createMutation = trpc.bancos.create.useMutation({
        onSuccess: () => {
            toast.success('Banco cadastrado com sucesso!')
            utils.bancos.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao criar banco', { description: error.message })
        },
    })

    const updateMutation = trpc.bancos.update.useMutation({
        onSuccess: () => {
            toast.success('Banco atualizado com sucesso!')
            utils.bancos.list.invalidate()
            utils.bancos.getById.invalidate(bancoId!)
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error('Erro ao atualizar banco', { description: error.message })
        },
    })

    const onSubmit = (data: BancoFormValues) => {
        if (isEditing) {
            updateMutation.mutate({ id: bancoId!, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        {isEditing ? 'Editar Banco' : 'Novo Banco'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações do banco'
                            : 'Cadastre um novo banco para suas transações'}
                    </DialogDescription>
                </DialogHeader>

                {isEditing && isLoadingBanco ? (
                    <div className="space-y-4 py-4">
                        <div className="h-10 w-full bg-muted animate-pulse rounded" />
                        <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Banco *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Nubank, Itaú..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="codigo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 260" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditing ? 'Atualizar' : 'Cadastrar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
