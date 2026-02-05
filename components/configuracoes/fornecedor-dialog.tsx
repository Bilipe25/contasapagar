'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { formatarCNPJ, formatarCPF, formatarCEP, formatarTelefone, limparCNPJ } from '@/lib/api/consulta-cnpj'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Building2, Search, MapPin, Phone, Mail, FileText, User, Check } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const schema = z.object({
    tipo_pessoa: z.enum(['PF', 'PJ']).optional(),
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
    // Campos adicionais
    inscricao_estadual: z.string().optional(),
    situacao_cadastral: z.string().optional(),
    empresa_id: z.string().optional(),
    tipo_despesa_id: z.string().optional(),
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

    const { data: empresas } = trpc.empresas.list.useQuery()
    const { data: categorias } = trpc.tiposDespesa.list.useQuery()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            tipo_pessoa: undefined,
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
            empresa_id: '',
            tipo_despesa_id: '',
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
                tipo_pessoa: fornecedor.tipo_pessoa as 'PF' | 'PJ' | undefined,
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
                empresa_id: fornecedor.empresa_id || '',
                tipo_despesa_id: fornecedor.tipo_despesa_id || '',
            })
        } else if (!isEditing) {
            form.reset({
                tipo_pessoa: undefined,
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
                empresa_id: '',
                tipo_despesa_id: '',
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

    // Formatar CNPJ/CPF enquanto digita e auto-detectar tipo
    const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const limpo = limparCNPJ(value)

        // Auto-detectar tipo pessoa baseado no tamanho
        if (limpo.length === 11) {
            form.setValue('tipo_pessoa', 'PF')
            form.setValue('cnpj_cpf', formatarCPF(limpo))
        } else if (limpo.length === 14) {
            form.setValue('tipo_pessoa', 'PJ')
            form.setValue('cnpj_cpf', formatarCNPJ(limpo))
        } else if (limpo.length <= 14) {
            // Ainda digitando, não formata
            form.setValue('cnpj_cpf', value)
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header Compacto */}
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {isEditing ? 'Atualize as informações do fornecedor' : 'Cadastre um novo fornecedor'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        {/* Tabs */}
                        <Tabs defaultValue="cadastrais" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 px-4 h-9">
                                <TabsTrigger
                                    value="cadastrais"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm h-9"
                                >
                                    📋 Dados Cadastrais
                                </TabsTrigger>
                                <TabsTrigger
                                    value="contato"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm h-9"
                                >
                                    📞 Contato & Endereço
                                </TabsTrigger>
                                <TabsTrigger
                                    value="adicionais"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm h-9"
                                >
                                    📝 Informações Adicionais
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto">
                                {/* Tab 1: Dados Cadastrais */}
                                <TabsContent value="cadastrais" className="p-4 space-y-3 mt-0">
                                    {/* Tipo Pessoa */}
                                    <FormField
                                        control={form.control}
                                        name="tipo_pessoa"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium">
                                                    Tipo <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="flex gap-4"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="PF" id="pf" className="h-4 w-4" />
                                                            <Label htmlFor="pf" className="text-sm cursor-pointer font-normal">
                                                                👤 Pessoa Física
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="PJ" id="pj" className="h-4 w-4" />
                                                            <Label htmlFor="pj" className="text-sm cursor-pointer font-normal">
                                                                🏢 Pessoa Jurídica
                                                            </Label>
                                                        </div>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* CNPJ/CPF com botão de consulta */}
                                    <div className="flex gap-2">
                                        <FormField
                                            control={form.control}
                                            name="cnpj_cpf"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel className="text-xs font-medium">
                                                        {form.watch('tipo_pessoa') === 'PF' ? 'CPF' : form.watch('tipo_pessoa') === 'PJ' ? 'CNPJ' : 'CNPJ/CPF'}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={form.watch('tipo_pessoa') === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                                                            {...field}
                                                            onChange={handleCNPJChange}
                                                            className="h-8"
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
                                                disabled={consultarCNPJMutation.isPending || form.watch('tipo_pessoa') === 'PF'}
                                                className="gap-2 h-8"
                                                size="sm"
                                            >
                                                {consultarCNPJMutation.isPending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Search className="h-3.5 w-3.5" />
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
                                                <FormLabel className="text-xs font-medium">
                                                    {form.watch('tipo_pessoa') === 'PF' ? 'Nome Completo' : 'Nome / Razão Social'} <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={form.watch('tipo_pessoa') === 'PF' ? 'Nome completo' : 'Nome do fornecedor'}
                                                        {...field}
                                                        className="h-8"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Inscrição Estadual e Situação Cadastral */}
                                    {form.watch('tipo_pessoa') === 'PJ' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="inscricao_estadual"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Inscrição Estadual</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="IE" {...field} className="h-8" />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Situação Cadastral</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ativa" {...field} disabled className="bg-muted h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Empresa Padrão e Categoria Padrão */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="empresa_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-medium text-muted-foreground">Empresa Padrão</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Selecione..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none_value">Nenhuma</SelectItem>
                                                            {empresas?.map((empresa) => (
                                                                <SelectItem key={empresa.id} value={empresa.id}>
                                                                    {empresa.nome_fantasia || empresa.razao_social}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tipo_despesa_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-medium text-muted-foreground">Categoria Padrão</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Selecione..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none_value">Nenhuma</SelectItem>
                                                            {categorias?.map((categoria) => (
                                                                <SelectItem key={categoria.id} value={categoria.id}>
                                                                    {categoria.nome}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                {/* Tab 2: Contato & Endereço */}
                                <TabsContent value="contato" className="p-4 space-y-3 mt-0">
                                    {/* Contato */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1.5 border-b">
                                            <Phone className="h-3.5 w-3.5" />
                                            Contato
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="telefone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Telefone</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="(00) 00000-0000"
                                                                {...field}
                                                                onChange={handleTelefoneChange}
                                                                className="h-8"
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Email</FormLabel>
                                                        <FormControl>
                                                            <Input type="email" placeholder="contato@fornecedor.com" {...field} className="h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1.5 border-b">
                                            <MapPin className="h-3.5 w-3.5" />
                                            Endereço
                                        </div>

                                        {/* CEP, UF e Cidade */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="cep"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">CEP</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="00000-000"
                                                                {...field}
                                                                onChange={handleCEPChange}
                                                                className="h-8"
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">UF</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="SP" maxLength={2} {...field} className="h-8 uppercase" />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Cidade</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="São Paulo" {...field} className="h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Logradouro e Número */}
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="logradouro"
                                                render={({ field }) => (
                                                    <FormItem className="col-span-2 sm:col-span-3">
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Logradouro</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Rua, Avenida..." {...field} className="h-8" />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Número</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="123" {...field} className="h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Complemento e Bairro */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="complemento"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Complemento</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Sala, Bloco..." {...field} className="h-8" />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Bairro</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Centro" {...field} className="h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab 3: Informações Adicionais */}
                                <TabsContent value="adicionais" className="p-4 space-y-3 mt-0">
                                    <FormField
                                        control={form.control}
                                        name="observacoes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-muted-foreground">Observações</FormLabel>
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
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Footer Compacto */}
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 px-4 py-3 border-t bg-muted/30">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="w-full sm:w-auto h-8"
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full sm:w-auto h-8"
                                size="sm"
                            >
                                {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                {isEditing ? 'Salvar' : 'Criar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
