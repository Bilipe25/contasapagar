'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'

// Função para formatar CNPJ
function formatCNPJ(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

// Função para formatar telefone
function formatTelefone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits ? `(${digits}` : ''
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const empresaSchema = z.object({
    razao_social: z.string().min(1, 'Razão social é obrigatória'),
    nome_fantasia: z.string().optional(),
    cnpj: z.string().optional(),
    inscricao_estadual: z.string().optional(),
    endereco: z.string().optional(),
    telefone: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    observacoes: z.string().optional(),
})

type EmpresaFormValues = z.infer<typeof empresaSchema>

interface EmpresaDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    empresaId?: string | null
}

export function EmpresaDialog({ open, onOpenChange, empresaId }: EmpresaDialogProps) {
    const utils = trpc.useUtils()
    const isEditing = !!empresaId

    const form = useForm<EmpresaFormValues>({
        resolver: zodResolver(empresaSchema),
        defaultValues: {
            razao_social: '',
            nome_fantasia: '',
            cnpj: '',
            inscricao_estadual: '',
            endereco: '',
            telefone: '',
            email: '',
            observacoes: '',
        },
    })

    // Fetch empresa if editing
    const { data: empresa, isLoading: isLoadingEmpresa } = trpc.empresas.getById.useQuery(empresaId!, {
        enabled: isEditing,
    })

    // Populate form when editing
    useEffect(() => {
        if (empresa) {
            form.reset({
                razao_social: empresa.razao_social,
                nome_fantasia: empresa.nome_fantasia || '',
                cnpj: empresa.cnpj || '',
                inscricao_estadual: empresa.inscricao_estadual || '',
                endereco: empresa.endereco || '',
                telefone: empresa.telefone || '',
                email: empresa.email || '',
                observacoes: empresa.observacoes || '',
            })
        } else if (!isEditing) {
            form.reset({
                razao_social: '',
                nome_fantasia: '',
                cnpj: '',
                inscricao_estadual: '',
                endereco: '',
                telefone: '',
                email: '',
                observacoes: '',
            })
        }
    }, [empresa, isEditing, form])

    // Mutations
    const createMutation = trpc.empresas.create.useMutation({
        onSuccess: () => {
            toast.success('Empresa cadastrada com sucesso!')
            utils.empresas.list.invalidate()
            onOpenChange(false)
            form.reset()
        },
        onError: (error) => {
            toast.error('Erro ao criar empresa', { description: error.message })
        },
    })

    const updateMutation = trpc.empresas.update.useMutation({
        onSuccess: () => {
            toast.success('Empresa atualizada com sucesso!')
            utils.empresas.list.invalidate()
            utils.empresas.getById.invalidate(empresaId!)
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error('Erro ao atualizar empresa', { description: error.message })
        },
    })

    const onSubmit = (data: EmpresaFormValues) => {
        if (isEditing) {
            updateMutation.mutate({ id: empresaId!, ...data })
        } else {
            createMutation.mutate(data)
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações da empresa'
                            : 'Preencha os dados para cadastrar uma nova empresa'}
                    </DialogDescription>
                </DialogHeader>

                {isEditing && isLoadingEmpresa ? (
                    <div className="space-y-4 py-4">
                        <div className="h-10 w-full bg-muted animate-pulse rounded" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            <div className="h-10 w-full bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Razão Social */}
                            <FormField
                                control={form.control}
                                name="razao_social"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razão Social *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome oficial da empresa" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Nome Fantasia e CNPJ */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="nome_fantasia"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Fantasia</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome comercial" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="cnpj"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00.000.000/0000-00"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Inscrição Estadual e Telefone */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="inscricao_estadual"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inscrição Estadual</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Número da IE" {...field} />
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
                                                <Input
                                                    placeholder="(00) 00000-0000"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(formatTelefone(e.target.value))}
                                                />
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
                                            <Input type="email" placeholder="contato@empresa.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Endereço */}
                            <FormField
                                control={form.control}
                                name="endereco"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Endereço</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Endereço completo" {...field} />
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
                                                placeholder="Informações adicionais..."
                                                rows={2}
                                                {...field}
                                            />
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
