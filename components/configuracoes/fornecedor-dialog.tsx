'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { formatarCNPJ, formatarCEP, formatarTelefone, limparCNPJ } from '@/lib/api/consulta-cnpj'
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
import { Loader2, Building2, Search, MapPin, Phone, Mail, FileText } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const schema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    cnpj_cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    telefone: z.string().optional(),
    observacoes: z.string().optional(),
    // Campos de endereço
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional(),
    cep: z.string().optional(),
    // Campos adicionais
    inscricao_estadual: z.string().optional(),
    situacao_cadastral: z.string().optional(),
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
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: '',
            cep: '',
            inscricao_estadual: '',
            situacao_cadastral: '',
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
                logradouro: fornecedor.logradouro || '',
                numero: fornecedor.numero || '',
                complemento: fornecedor.complemento || '',
                bairro: fornecedor.bairro || '',
                cidade: fornecedor.cidade || '',
                uf: fornecedor.uf || '',
                cep: fornecedor.cep || '',
                inscricao_estadual: fornecedor.inscricao_estadual || '',
                situacao_cadastral: fornecedor.situacao_cadastral || '',
            })
        } else if (!isEditing) {
            form.reset({
                nome: '',
                cnpj_cpf: '',
                email: '',
                telefone: '',
                observacoes: '',
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
                cep: '',
                inscricao_estadual: '',
                situacao_cadastral: '',
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

    const consultarCNPJMutation = trpc.fornecedores.consultarCNPJ.useMutation({
        onSuccess: (dados) => {
            // Preencher os campos com os dados retornados
            form.setValue('nome', dados.razao_social)
            // form.setValue('cnpj_cpf', dados.cnpj) // Normalmente mantemos o que o usuário digitou ou formatamos
            form.setValue('logradouro', dados.logradouro)
            form.setValue('numero', dados.numero)
            form.setValue('complemento', dados.complemento)
            form.setValue('bairro', dados.bairro)
            form.setValue('cidade', dados.municipio)
            form.setValue('uf', dados.uf)
            form.setValue('cep', dados.cep)

            if (dados.telefone1) {
                form.setValue('telefone', dados.telefone1)
            }
            if (dados.email) {
                form.setValue('email', dados.email)
            }
            if (dados.inscricao_estadual) {
                form.setValue('inscricao_estadual', dados.inscricao_estadual)
            }
            if (dados.situacao_cadastral) {
                form.setValue('situacao_cadastral', dados.situacao_cadastral)
            }

            toast.success('Dados do CNPJ carregados!', {
                description: dados.nome_fantasia || dados.razao_social
            })
        },
        onError: (error) => {
            toast.error('Erro ao consultar CNPJ', {
                description: error.message
            })
        }
    })

    const handleConsultarCNPJ = async () => {
        const cnpj = form.getValues('cnpj_cpf')
        if (!cnpj || limparCNPJ(cnpj).length !== 14) {
            toast.error('Digite um CNPJ válido com 14 dígitos')
            return
        }

        consultarCNPJMutation.mutate(cnpj)
    }

    // Formatar CNPJ enquanto digita
    const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const limpo = limparCNPJ(value)
        if (limpo.length <= 14) {
            form.setValue('cnpj_cpf', limpo.length === 14 ? formatarCNPJ(limpo) : value)
        }
    }

    // Formatar CEP enquanto digita
    const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        if (value.length <= 8) {
            form.setValue('cep', value.length === 8 ? formatarCEP(value) : value)
        }
    }

    // Formatar telefone enquanto digita
    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        if (value.length <= 11) {
            form.setValue('telefone', value.length >= 10 ? formatarTelefone(value) : value)
        }
    }

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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Seção: Dados Básicos */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                Dados Básicos
                            </div>

                            {/* CNPJ/CPF com botão de consulta */}
                            <div className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name="cnpj_cpf"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>CNPJ/CPF</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00.000.000/0000-00"
                                                    {...field}
                                                    onChange={handleCNPJChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleConsultarCNPJ}
                                        disabled={consultarCNPJMutation.isPending}
                                        className="gap-2"
                                    >
                                        {consultarCNPJMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                        Consultar
                                    </Button>
                                </div>
                            </div>

                            {/* Nome */}
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome / Razão Social *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do fornecedor" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Inscrição Estadual e Situação Cadastral */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="inscricao_estadual"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inscrição Estadual</FormLabel>
                                            <FormControl>
                                                <Input placeholder="IE" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="situacao_cadastral"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Situação Cadastral</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ativa" {...field} disabled className="bg-muted" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Seção: Contato */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                Contato
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="telefone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="(00) 00000-0000"
                                                    {...field}
                                                    onChange={handleTelefoneChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                            </div>
                        </div>

                        <Separator />

                        {/* Seção: Endereço */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                Endereço
                            </div>

                            {/* CEP e UF */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="cep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00000-000"
                                                    {...field}
                                                    onChange={handleCEPChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="uf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SP" maxLength={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cidade"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="São Paulo" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Logradouro e Número */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="logradouro"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-3">
                                            <FormLabel>Logradouro</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rua, Avenida..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="numero"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Complemento e Bairro */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="complemento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Complemento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Sala, Bloco..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bairro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Centro" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

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
