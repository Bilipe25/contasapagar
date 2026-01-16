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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'

const schema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    cnpj_cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    telefone: z.string().optional(),
    observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface FornecedorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fornecedorId?: string | null
}

export function FornecedorDialog({ open, onOpenChange, fornecedorId }: FornecedorDialogProps) {
    const utils = trpc.useUtils()
    const isEditing = !!fornecedorId

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            nome: '',
            cnpj_cpf: '',
            email: '',
            telefone: '',
            observacoes: '',
        },
    })

    // Fetch fornecedor data if editing
    const { data: fornecedor } = trpc.fornecedores.list.useQuery(undefined, {
        enabled: isEditing,
        select: (data) => data.find(f => f.id === fornecedorId),
    })

    // Update form when fornecedor data is loaded
    useEffect(() => {
        if (fornecedor) {
            form.reset({
                nome: fornecedor.nome || '',
                cnpj_cpf: fornecedor.cnpj_cpf || '',
                email: fornecedor.email || '',
                telefone: fornecedor.telefone || '',
                observacoes: fornecedor.observacoes || '',
            })
        } else if (!isEditing) {
            form.reset({
                nome: '',
                cnpj_cpf: '',
                email: '',
                telefone: '',
                observacoes: '',
            })
        }
    }, [fornecedor, isEditing, form])

    const createMutation = trpc.fornecedores.create.useMutation({
        onSuccess: () => {
            toast.success('Fornecedor criado com sucesso!')
            utils.fornecedores.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao criar fornecedor', { description: error.message })
        },
    })

    const updateMutation = trpc.fornecedores.update.useMutation({
        onSuccess: () => {
            toast.success('Fornecedor atualizado com sucesso!')
            utils.fornecedores.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao atualizar fornecedor', { description: error.message })
        },
    })

    const onSubmit = (data: FormValues) => {
        if (isEditing && fornecedorId) {
            updateMutation.mutate({ id: fornecedorId, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) form.reset()
            onOpenChange(newOpen)
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Nome */}
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do fornecedor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* CNPJ/CPF e Telefone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cnpj_cpf"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CNPJ/CPF</FormLabel>
                                        <FormControl>
                                            <Input placeholder="00.000.000/0000-00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="telefone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(00) 00000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="contato@fornecedor.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Observações */}
                        <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Notas sobre o fornecedor..."
                                            className="resize-none"
                                            rows={3}
                                            {...field}
                                        />
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
