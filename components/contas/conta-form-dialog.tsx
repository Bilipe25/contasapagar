'use client'

import { useEffect, useMemo, useState } from 'react'
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
    FormDescription,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { BankSelect } from '@/components/common/bank-select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
    Loader2,
    Plus,
    FileText,
    DollarSign,
    Calendar,
    Calculator,
    Building2,
    Tag,
    ListOrdered,
    Check,
    ChevronsUpDown,
    Folder
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { addDays, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const contaSchema = z.object({
    fornecedor_id: z.string().optional(),
    tipo_despesa_id: z.string().optional(),
    empresa_id: z.string().optional(),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    valor_total: z.string().min(1, 'Valor é obrigatório'),
    data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
    primeiro_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
    total_parcelas: z.string().min(1, 'Número de parcelas é obrigatório'),
    intervalo_dias: z.string(),
    observacoes: z.string().optional(),
    banco_id: z.string().optional().nullable(),
    plano_conta_id: z.string().optional().nullable(), // Nova classificação
})

type ContaFormValues = z.infer<typeof contaSchema>

// Interface para parcela editável
interface ParcelaEditavel {
    numero: number
    valor: number
    data: Date
}

interface ContaFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contaId?: string | null
}

export function ContaFormDialog({ open, onOpenChange, contaId }: ContaFormDialogProps) {
    const utils = trpc.useUtils()
    const isEditing = !!contaId
    const [novoFornecedor, setNovoFornecedor] = useState('')
    const [novaCategoria, setNovaCategoria] = useState('')
    const [popoverFornecedor, setPopoverFornecedor] = useState(false)
    const [popoverCategoria, setPopoverCategoria] = useState(false)
    const [comboFornecedor, setComboFornecedor] = useState(false)
    const [comboCategoria, setComboCategoria] = useState(false)
    const [comboPlanoContas, setComboPlanoContas] = useState(false) // Novo combo
    const [comboEmpresa, setComboEmpresa] = useState(false)
    const [novaEmpresa, setNovaEmpresa] = useState('')
    const [popoverEmpresa, setPopoverEmpresa] = useState(false)

    // Estado para parcelas editáveis
    const [parcelasEditaveis, setParcelasEditaveis] = useState<ParcelaEditavel[]>([])

    // Estado para "Salvar e Criar Outra"
    const [criarOutra, setCriarOutra] = useState(false)

    const form = useForm<ContaFormValues>({
        resolver: zodResolver(contaSchema),
        defaultValues: {
            fornecedor_id: '',
            tipo_despesa_id: '',
            empresa_id: '',
            descricao: '',
            valor_total: '',
            data_emissao: format(new Date(), 'yyyy-MM-dd'),
            primeiro_vencimento: '',
            total_parcelas: '1',
            intervalo_dias: '30',
            observacoes: '',
            banco_id: '',
            plano_conta_id: '',
        },
    })

    // Fetch data for selects
    const { data: fornecedores } = trpc.fornecedores.list.useQuery()
    const { data: tiposDespesa } = trpc.tiposDespesa.list.useQuery()
    const { data: empresas } = trpc.empresas.list.useQuery()

    // Fetch plano de contas (only analytic)
    const { data: planoContas } = trpc.planoContas.list.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
    })
    const contasAnaliticas = planoContas?.filter(c => c.modo === 'ANALITICA') || []


    // Fetch conta if editing
    const { data: conta, isLoading: isLoadingConta } = trpc.contas.getById.useQuery(contaId!, {
        enabled: isEditing,
    })

    // Create fornecedor mutation
    const criarFornecedor = trpc.fornecedores.create.useMutation({
        onSuccess: (data) => {
            toast.success('Fornecedor criado!')
            utils.fornecedores.list.invalidate()
            form.setValue('fornecedor_id', data.id)
            setNovoFornecedor('')
            setPopoverFornecedor(false)
        },
        onError: (error) => {
            toast.error('Erro ao criar fornecedor', { description: error.message })
        },
    })

    // Create categoria mutation
    const criarCategoria = trpc.tiposDespesa.create.useMutation({
        onSuccess: (data) => {
            toast.success('Categoria criada!')
            utils.tiposDespesa.list.invalidate()
            form.setValue('tipo_despesa_id', data.id)
            setNovaCategoria('')
            setPopoverCategoria(false)
        },
        onError: (error) => {
            toast.error('Erro ao criar categoria', { description: error.message })
        },
    })

    // Create empresa mutation
    const criarEmpresa = trpc.empresas.create.useMutation({
        onSuccess: (data) => {
            toast.success('Empresa cadastrada!')
            utils.empresas.list.invalidate()
            form.setValue('empresa_id', data.id)
            setNovaEmpresa('')
            setPopoverEmpresa(false)
        },
        onError: (error) => {
            toast.error('Erro ao criar empresa', { description: error.message })
        },
    })

    // Populate form when editing
    useEffect(() => {
        if (conta) {
            const primeiraParcela = conta.parcelas?.[0]
            const valorTotalConta = conta.parcelas?.reduce((acc: number, p: any) => acc + (p.valor_original || 0), 0) || 0
            form.reset({
                fornecedor_id: conta.fornecedor_id || '',
                tipo_despesa_id: conta.tipo_despesa_id || '',
                empresa_id: conta.empresa_id || '',
                descricao: conta.descricao,
                valor_total: valorTotalConta.toString(),
                data_emissao: conta.data_emissao,
                primeiro_vencimento: primeiraParcela?.data_vencimento?.split('T')[0] || '',
                total_parcelas: conta.total_parcelas?.toString() || '1',
                intervalo_dias: '30',
                observacoes: conta.observacoes || '',
                banco_id: conta.banco_id || '',
                plano_conta_id: conta.plano_conta_id || '',
            })
        }
    }, [conta, form])

    // Auto-select Plano de Contas when Categoria changes
    const selectedCategoriaId = form.watch('tipo_despesa_id')
    useEffect(() => {
        // Only run if not editing existing data to avoid overwriting user choice on load
        // But wait, if user simplifies changes category in edit mode, it SHOULD update.
        // We need to distinguish between "initial load" and "user change".
        // React Hook Form handles "reset" separately. So watching the value here is mostly safe for "updates".

        // Strategy: If selectedCategoriaId changes, and it matches a category with a link, update plano_conta_id.
        // Caveat: This runs on initial load too if default is set.

        if (!selectedCategoriaId || !tiposDespesa) return

        const categoria = tiposDespesa.find(t => t.id === selectedCategoriaId)

        // IMPORTANT: We should only auto-update if the current plano_conta_id is empty OR if the user just changed the category.
        // Simpler approach: If category has a link, prefer that link.
        // However, we want to respect if the user manually selected a different plano_conta_id? 
        // For now, let's strictly follow "Category dictates Plan" as the default refined behavior.
        // If user wants to override, they do it AFTER selecting category.

        if (categoria?.plano_conta_id) {
            const currentPlan = form.getValues('plano_conta_id');
            // Update if different
            if (currentPlan !== categoria.plano_conta_id) {
                form.setValue('plano_conta_id', categoria.plano_conta_id, { shouldValidate: true })
            }
        }
    }, [selectedCategoriaId, tiposDespesa, form])

    // Auto-select Empresa Padrão e Categoria Padrão do Fornecedor
    const selectedFornecedorId = form.watch('fornecedor_id')
    useEffect(() => {
        if (!selectedFornecedorId || !fornecedores) return

        const fornecedor = fornecedores.find(f => f.id === selectedFornecedorId)

        if (fornecedor) {
            // Empresa Padrão
            if (fornecedor.empresa_id) {
                const currentEmpresa = form.getValues('empresa_id')
                if (currentEmpresa !== fornecedor.empresa_id) {
                    form.setValue('empresa_id', fornecedor.empresa_id)
                }
            }
            // Categoria Padrão
            if (fornecedor.tipo_despesa_id) {
                const currentCategoria = form.getValues('tipo_despesa_id')
                if (currentCategoria !== fornecedor.tipo_despesa_id) {
                    form.setValue('tipo_despesa_id', fornecedor.tipo_despesa_id)
                }
            }
        }
    }, [selectedFornecedorId, fornecedores, form])

    // Auto-select bank when company changes
    const selectedEmpresaId = form.watch('empresa_id')
    useEffect(() => {
        if (!selectedEmpresaId || isEditing || !empresas) return

        const empresa = empresas.find(e => e.id === selectedEmpresaId)
        if (empresa?.banco_padrao_id) {
            form.setValue('banco_id', empresa.banco_padrao_id)
        } else {
            form.setValue('banco_id', null)
        }
    }, [selectedEmpresaId, empresas, isEditing, form])

    // Watch values for preview
    const valorTotal = form.watch('valor_total')
    const primeiroVencimento = form.watch('primeiro_vencimento')
    const totalParcelas = form.watch('total_parcelas')
    const intervaloDias = form.watch('intervalo_dias')

    // Recalcular parcelas quando valores mudam
    useEffect(() => {
        const qtd = parseInt(totalParcelas) || 1
        const total = parseFloat(valorTotal?.replace(',', '.')) || 0
        const intervalo = parseInt(intervaloDias) || 30
        const dataBase = primeiroVencimento ? new Date(primeiroVencimento + 'T12:00:00') : null

        if (!dataBase || qtd < 1 || total <= 0) {
            setParcelasEditaveis([])
            return
        }

        const valorPorParcela = total / qtd
        const novasParcelas = Array.from({ length: qtd }, (_, i) => ({
            numero: i + 1,
            data: addDays(dataBase, i * intervalo),
            valor: Math.round(valorPorParcela * 100) / 100, // Arredonda para 2 casas
        }))

        // Ajustar diferença de arredondamento na última parcela
        const somaAtual = novasParcelas.reduce((acc, p) => acc + p.valor, 0)
        const diferenca = Math.round((total - somaAtual) * 100) / 100
        if (diferenca !== 0 && novasParcelas.length > 0) {
            novasParcelas[novasParcelas.length - 1].valor += diferenca
        }

        setParcelasEditaveis(novasParcelas)
    }, [valorTotal, primeiroVencimento, totalParcelas, intervaloDias])

    // Funções para edição inline
    const atualizarValorParcela = (index: number, novoValor: number) => {
        setParcelasEditaveis(prev => {
            const novas = [...prev]
            novas[index] = { ...novas[index], valor: novoValor }
            return novas
        })
    }

    const atualizarDataParcela = (index: number, novaData: Date) => {
        setParcelasEditaveis(prev => {
            const novas = [...prev]
            novas[index] = { ...novas[index], data: novaData }
            return novas
        })
    }

    // Soma total das parcelas editadas
    const somaParcelas = useMemo(() => {
        return parcelasEditaveis.reduce((acc, p) => acc + p.valor, 0)
    }, [parcelasEditaveis])

    // Mutations
    const createMutation = trpc.contas.create.useMutation({
        onSuccess: () => {
            const valorMedio = somaParcelas / parcelasEditaveis.length
            toast.success('Conta criada com sucesso!', {
                description: `${parcelasEditaveis.length} parcela(s) criadas. Total: ${formatCurrency(somaParcelas)}`
            })
            utils.contas.list.invalidate()
            utils.dashboard.stats.invalidate()
            utils.dashboard.vencimentosProximos.invalidate()

            if (criarOutra) {
                // Mantém modal aberto e limpa form
                form.reset()
                setParcelasEditaveis([])
                setCriarOutra(false)
            } else {
                onOpenChange(false)
                form.reset()
                setParcelasEditaveis([])
            }
        },
        onError: (error: any) => {
            toast.error('Erro ao criar conta', {
                description: error.message,
            })
        },
    })

    const updateMutation = trpc.contas.update.useMutation({
        onSuccess: () => {
            toast.success('Conta atualizada com sucesso!')
            utils.contas.list.invalidate()
            utils.contas.getById.invalidate(contaId!)
            utils.dashboard.stats.invalidate()
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar conta', {
                description: error.message,
            })
        },
    })

    const onSubmit = (data: ContaFormValues) => {
        if (isEditing) {
            updateMutation.mutate({
                id: contaId!,
                fornecedor_id: data.fornecedor_id,
                tipo_despesa_id: data.tipo_despesa_id,
                empresa_id: data.empresa_id,
                descricao: data.descricao,
                observacoes: data.observacoes,
                banco_id: data.banco_id || null,
                plano_conta_id: data.plano_conta_id || null,
            })
        } else {
            // Enviar parcelas personalizadas
            const parcelasParaEnviar = parcelasEditaveis.map(p => ({
                valor: p.valor,
                data_vencimento: format(p.data, 'yyyy-MM-dd'),
            }))

            createMutation.mutate({
                fornecedor_id: data.fornecedor_id,
                tipo_despesa_id: data.tipo_despesa_id,
                empresa_id: data.empresa_id,
                descricao: data.descricao,
                valor_original: somaParcelas / parcelasEditaveis.length, // Média
                valor_juros: 0,
                data_emissao: data.data_emissao,
                data_vencimento: parcelasParaEnviar[0]?.data_vencimento || data.primeiro_vencimento,
                total_parcelas: parcelasEditaveis.length,
                intervalo_dias: parseInt(data.intervalo_dias),
                observacoes: data.observacoes,
                parcelas: parcelasParaEnviar, // Array com valores e datas personalizadas
                banco_id: data.banco_id || null,
                plano_conta_id: data.plano_conta_id || null,
            })
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px] p-0">
                {/* Header Moderno */}


                {isEditing && isLoadingConta ? (
                    <div className="space-y-6">
                        {/* Header Loading */}
                        <div className="border-b px-6 py-4">
                            <DialogHeader className="space-y-1 text-left">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                                    Editar Conta
                                </DialogTitle>
                                <DialogDescription>Carregando informações...</DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="space-y-6 px-6 pb-6">
                            {/* Skeleton Loading mantido */}
                            <div className="space-y-4">
                                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                </div>
                                <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            </div>
                            <div className="space-y-4">
                                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
                            {/* Header Moderno com Empresa */}
                            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <DialogHeader className="space-y-1 text-left">
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        {isEditing ? 'Editar Conta' : 'Nova Conta a Pagar'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {isEditing
                                            ? 'Atualize as informações da conta'
                                            : 'Preencha os dados para registrar uma nova conta'}
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Campo Empresa no Header */}
                                <div className="w-full sm:w-[300px]">
                                    <FormField
                                        control={form.control}
                                        name="empresa_id"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-1">
                                                <div className="flex gap-2">
                                                    <Popover open={comboEmpresa} onOpenChange={setComboEmpresa}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    aria-expanded={comboEmpresa}
                                                                    className={cn(
                                                                        "flex-1 justify-between font-normal h-9",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        <span className="flex items-center gap-2 truncate">
                                                                            <Building2 className="h-3 w-3 shrink-0" />
                                                                            <span className="truncate">
                                                                                {empresas?.find((e) => e.id === field.value)?.nome_fantasia ||
                                                                                    empresas?.find((e) => e.id === field.value)?.razao_social}
                                                                            </span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs">Selecionar empresa...</span>
                                                                    )}
                                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[300px] p-0" align="end">
                                                            <Command>
                                                                <CommandInput placeholder="Buscar empresa..." />
                                                                <CommandList>
                                                                    <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        <CommandItem
                                                                            value="_limpar_"
                                                                            onSelect={() => {
                                                                                field.onChange('')
                                                                                setComboEmpresa(false)
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    !field.value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <span className="text-muted-foreground">Nenhuma empresa</span>
                                                                        </CommandItem>
                                                                        {empresas?.map((e) => (
                                                                            <CommandItem
                                                                                key={e.id}
                                                                                value={`${e.razao_social} ${e.nome_fantasia || ''} ${e.cnpj || ''}`}
                                                                                onSelect={() => {
                                                                                    field.onChange(e.id)
                                                                                    setComboEmpresa(false)
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        field.value === e.id ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                <span className="flex flex-col truncate">
                                                                                    <span className="truncate">{e.nome_fantasia || e.razao_social}</span>
                                                                                    {e.cnpj && (
                                                                                        <span className="text-xs text-muted-foreground">{e.cnpj}</span>
                                                                                    )}
                                                                                </span>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Popover open={popoverEmpresa} onOpenChange={setPopoverEmpresa}>
                                                        <PopoverTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-64" align="end">
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium">Nova Empresa</p>
                                                                <Input
                                                                    placeholder="Razão social"
                                                                    value={novaEmpresa}
                                                                    onChange={(e) => setNovaEmpresa(e.target.value)}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    className="w-full"
                                                                    disabled={!novaEmpresa || criarEmpresa.isPending}
                                                                    onClick={() => criarEmpresa.mutate({ razao_social: novaEmpresa })}
                                                                >
                                                                    {criarEmpresa.isPending ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        'Cadastrar'
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Tabs defaultValue="geral" className="w-full">
                                <div className="px-6 pt-4 border-b bg-background sticky top-[73px] z-10">
                                    <TabsList className="w-full justify-start h-auto p-0 bg-transparent space-x-6">
                                        <TabsTrigger
                                            value="geral"
                                            className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none"
                                        >
                                            Dados do Lançamento
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="contabil"
                                            className="h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none transition-none"
                                        >
                                            Informações Contábeis
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="p-6">
                                    <TabsContent value="geral" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                                        {/* Layout em 2 Colunas */}
                                        <div className="grid gap-6 lg:grid-cols-2">
                                            {/* COLUNA ESQUERDA: Informações */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Informações Básicas
                                                </div>

                                                {/* Fornecedor e Categoria Empilhados (Vertical) */}
                                                <div className="space-y-3">
                                                    {/* Fornecedor com busca + botão novo */}
                                                    <FormField
                                                        control={form.control}
                                                        name="fornecedor_id"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>Fornecedor</FormLabel>
                                                                <div className="flex gap-2">
                                                                    <Popover open={comboFornecedor} onOpenChange={setComboFornecedor}>
                                                                        <PopoverTrigger asChild>
                                                                            <FormControl>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    role="combobox"
                                                                                    aria-expanded={comboFornecedor}
                                                                                    className={cn(
                                                                                        "flex-1 justify-between font-normal",
                                                                                        !field.value && "text-muted-foreground"
                                                                                    )}
                                                                                >
                                                                                    {field.value
                                                                                        ? fornecedores?.find((f) => f.id === field.value)?.nome
                                                                                        : "Buscar fornecedor..."}
                                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                                </Button>
                                                                            </FormControl>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-[300px] p-0" align="start">
                                                                            <Command>
                                                                                <CommandInput placeholder="Buscar fornecedor..." />
                                                                                <CommandList>
                                                                                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                                                                                    <CommandGroup>
                                                                                        {fornecedores?.map((f) => (
                                                                                            <CommandItem
                                                                                                key={f.id}
                                                                                                value={f.nome}
                                                                                                onSelect={() => {
                                                                                                    field.onChange(f.id)
                                                                                                    setComboFornecedor(false)
                                                                                                }}
                                                                                            >
                                                                                                <Check
                                                                                                    className={cn(
                                                                                                        "mr-2 h-4 w-4",
                                                                                                        field.value === f.id ? "opacity-100" : "opacity-0"
                                                                                                    )}
                                                                                                />
                                                                                                {f.nome}
                                                                                            </CommandItem>
                                                                                        ))}
                                                                                    </CommandGroup>
                                                                                </CommandList>
                                                                            </Command>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <Popover open={popoverFornecedor} onOpenChange={setPopoverFornecedor}>
                                                                        <PopoverTrigger asChild>
                                                                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                                                                <Plus className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-64" align="end">
                                                                            <div className="space-y-2">
                                                                                <p className="text-sm font-medium">Novo Fornecedor</p>
                                                                                <Input
                                                                                    placeholder="Nome do fornecedor"
                                                                                    value={novoFornecedor}
                                                                                    onChange={(e) => setNovoFornecedor(e.target.value)}
                                                                                />
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    className="w-full"
                                                                                    disabled={!novoFornecedor || criarFornecedor.isPending}
                                                                                    onClick={() => criarFornecedor.mutate({ nome: novoFornecedor })}
                                                                                >
                                                                                    {criarFornecedor.isPending ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        'Criar'
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {/* Categoria com busca + botão novo */}
                                                    <FormField
                                                        control={form.control}
                                                        name="tipo_despesa_id"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>Categoria</FormLabel>
                                                                <div className="flex gap-2">
                                                                    <Popover open={comboCategoria} onOpenChange={setComboCategoria}>
                                                                        <PopoverTrigger asChild>
                                                                            <FormControl>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    role="combobox"
                                                                                    aria-expanded={comboCategoria}
                                                                                    className={cn(
                                                                                        "flex-1 justify-between font-normal",
                                                                                        !field.value && "text-muted-foreground"
                                                                                    )}
                                                                                >
                                                                                    {field.value ? (
                                                                                        <span className="flex items-center gap-2">
                                                                                            {tiposDespesa?.find((t) => t.id === field.value)?.cor && (
                                                                                                <span
                                                                                                    className="w-3 h-3 rounded-full"
                                                                                                    style={{ backgroundColor: tiposDespesa.find((t) => t.id === field.value)?.cor }}
                                                                                                />
                                                                                            )}
                                                                                            {tiposDespesa?.find((t) => t.id === field.value)?.nome}
                                                                                        </span>
                                                                                    ) : (
                                                                                        "Buscar categoria..."
                                                                                    )}
                                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                                </Button>
                                                                            </FormControl>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-[300px] p-0" align="start">
                                                                            <Command>
                                                                                <CommandInput placeholder="Buscar categoria..." />
                                                                                <CommandList>
                                                                                    <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                                                                    <CommandGroup>
                                                                                        {tiposDespesa?.map((t) => (
                                                                                            <CommandItem
                                                                                                key={t.id}
                                                                                                value={t.nome}
                                                                                                onSelect={() => {
                                                                                                    field.onChange(t.id)
                                                                                                    setComboCategoria(false)
                                                                                                }}
                                                                                            >
                                                                                                <Check
                                                                                                    className={cn(
                                                                                                        "mr-2 h-4 w-4",
                                                                                                        field.value === t.id ? "opacity-100" : "opacity-0"
                                                                                                    )}
                                                                                                />
                                                                                                <span className="flex items-center gap-2">
                                                                                                    {t.cor && (
                                                                                                        <span
                                                                                                            className="w-3 h-3 rounded-full"
                                                                                                            style={{ backgroundColor: t.cor }}
                                                                                                        />
                                                                                                    )}
                                                                                                    {t.nome}
                                                                                                </span>
                                                                                            </CommandItem>
                                                                                        ))}
                                                                                    </CommandGroup>
                                                                                </CommandList>
                                                                            </Command>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <Popover open={popoverCategoria} onOpenChange={setPopoverCategoria}>
                                                                        <PopoverTrigger asChild>
                                                                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                                                                <Plus className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-64" align="end">
                                                                            <div className="space-y-2">
                                                                                <p className="text-sm font-medium">Nova Categoria</p>
                                                                                <Input
                                                                                    placeholder="Nome da categoria"
                                                                                    value={novaCategoria}
                                                                                    onChange={(e) => setNovaCategoria(e.target.value)}
                                                                                />
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    className="w-full"
                                                                                    disabled={!novaCategoria || criarCategoria.isPending}
                                                                                    onClick={() => criarCategoria.mutate({ nome: novaCategoria })}
                                                                                >
                                                                                    {criarCategoria.isPending ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        'Criar'
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                {/* Banco */}
                                                <FormField
                                                    control={form.control}
                                                    name="banco_id"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Banco (Opcional)</FormLabel>
                                                            <BankSelect
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Descrição */}
                                                <FormField
                                                    control={form.control}
                                                    name="descricao"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Descrição</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Conta de luz, Aluguel..." {...field} />
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
                                                            <FormLabel>Observações (opcional)</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder="Informações adicionais..."
                                                                    rows={4}
                                                                    className="resize-none"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* COLUNA DIREITA: Finanças (Valor, Datas, Parcelas) */}
                                            {!isEditing && (
                                                <div className="flex flex-col h-full space-y-4">
                                                    {/* Bloco de VALOR e DATAS - Destaque */}
                                                    <div className="bg-muted/40 p-5 rounded-xl border border-border/50 space-y-5">
                                                        {/* Valor Total com Input Grande */}
                                                        <FormField
                                                            control={form.control}
                                                            name="valor_total"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-1">
                                                                    <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Valor Total</FormLabel>
                                                                    <FormControl>
                                                                        <div className="relative group">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium group-focus-within:text-primary transition-colors">R$</span>
                                                                            <Input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                placeholder="0,00"
                                                                                className="pl-10 h-14 text-2xl font-bold bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                                                                                {...field}
                                                                            />
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        {/* Linha de Datas */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="data_emissao"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1">
                                                                        <FormLabel className="text-xs">Data Emissão</FormLabel>
                                                                        <FormControl>
                                                                            <Input type="date" className="h-9 font-medium" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name="primeiro_vencimento"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <FormLabel className="text-xs">1º Vencimento</FormLabel>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-primary">
                                                                                        <Calendar className="h-3 w-3" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-2" align="end">
                                                                                    <div className="grid grid-cols-2 gap-1">
                                                                                        {[
                                                                                            { label: 'Hoje', days: 0 },
                                                                                            { label: '+7 dias', days: 7 },
                                                                                            { label: '+15 dias', days: 15 },
                                                                                            { label: '+30 dias', days: 30 },
                                                                                        ].map(opt => (
                                                                                            <Button
                                                                                                key={opt.label}
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="text-xs justify-start"
                                                                                                onClick={() => {
                                                                                                    form.setValue('primeiro_vencimento', format(addDays(new Date(), opt.days), 'yyyy-MM-dd'))
                                                                                                }}
                                                                                            >
                                                                                                {opt.label}
                                                                                            </Button>
                                                                                        ))}
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>
                                                                        <FormControl>
                                                                            <Input type="date" className="h-9 font-medium" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Bloco de Parcelamento */}
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                                <ListOrdered className="h-3.5 w-3.5" /> Condições
                                                            </span>
                                                            {/* Chips de Parcelas */}
                                                            <div className="flex bg-muted/50 p-0.5 rounded-md">
                                                                {[
                                                                    { label: '1x', value: '1' },
                                                                    { label: '2x', value: '2' },
                                                                    { label: '3x', value: '3' },
                                                                    { label: '6x', value: '6' },
                                                                    { label: '12x', value: '12' },
                                                                ].map((opt) => (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => form.setValue('total_parcelas', opt.value)}
                                                                        className={cn(
                                                                            "px-2.5 py-1 text-[10px] font-medium rounded-sm transition-all",
                                                                            totalParcelas === opt.value
                                                                                ? "bg-background text-primary shadow-sm"
                                                                                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <FormField
                                                                control={form.control}
                                                                name="total_parcelas"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1">
                                                                        <FormLabel className="text-xs">Qtd. Parcelas</FormLabel>
                                                                        <FormControl>
                                                                            <Input type="number" min="1" max="120" className="h-8" {...field} />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="intervalo_dias"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1">
                                                                        <FormLabel className="text-xs">Intervalo</FormLabel>
                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-8">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="7">Semanal (7d)</SelectItem>
                                                                                <SelectItem value="15">Quinzenal (15d)</SelectItem>
                                                                                <SelectItem value="30">Mensal (30d)</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Tabela de Parcelas */}
                                                    {parcelasEditaveis.length > 0 && (
                                                        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col bg-background">
                                                            <div className="bg-muted/30 px-3 py-2 border-b flex justify-between items-center">
                                                                <span className="text-xs font-semibold text-muted-foreground">Parcelas Geradas</span>
                                                                <span className={cn("text-xs font-bold", Math.abs(somaParcelas - parseFloat(valorTotal?.replace(',', '.') || '0')) < 0.01 ? "text-green-600" : "text-orange-500")}>
                                                                    Total: {formatCurrency(somaParcelas)}
                                                                </span>
                                                            </div>
                                                            <div className="overflow-y-auto max-h-[140px] scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                                                <table className="w-full text-xs">
                                                                    <tbody className="divide-y">
                                                                        {parcelasEditaveis.map((p, index) => (
                                                                            <tr key={p.numero} className="group hover:bg-muted/40 transition-colors">
                                                                                <td className="px-3 py-2 w-8 text-center text-muted-foreground font-medium">{p.numero}</td>
                                                                                <td className="px-2 py-1">
                                                                                    <input
                                                                                        type="date"
                                                                                        className="bg-transparent border-none w-full text-muted-foreground focus:text-foreground focus:outline-none p-0 h-auto font-medium"
                                                                                        value={format(p.data, 'yyyy-MM-dd')}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.value) atualizarDataParcela(index, new Date(e.target.value + 'T12:00:00'))
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                                <td className="px-3 py-1 text-right">
                                                                                    <input
                                                                                        type="text"
                                                                                        className="bg-transparent border-none w-full text-right focus:outline-none p-0 h-auto font-medium"
                                                                                        value={p.valor.toFixed(2).replace('.', ',')}
                                                                                        onChange={(e) => {
                                                                                            const val = parseFloat(e.target.value.replace(',', '.')) || 0
                                                                                            atualizarValorParcela(index, val)
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="contabil" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                                        <div className="grid gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                                                    <Tag className="h-4 w-4" />
                                                    Classificação e Contabilidade
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {/* Plano de Contas */}
                                                    <FormField
                                                        control={form.control}
                                                        name="plano_conta_id"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel className="flex items-center gap-2">
                                                                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    Classificação Contábil
                                                                </FormLabel>
                                                                <Popover open={comboPlanoContas} onOpenChange={setComboPlanoContas}>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Button
                                                                                variant="outline"
                                                                                role="combobox"
                                                                                className={cn(
                                                                                    "justify-between font-normal",
                                                                                    !field.value && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                {field.value
                                                                                    ? contasAnaliticas.find(
                                                                                        (c) => c.id === field.value
                                                                                    )?.descricao
                                                                                    : "Selecione a conta analítica..."}
                                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            </Button>
                                                                        </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[400px] p-0" align="start">
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
                                                                                                setComboPlanoContas(false)
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
                                                                <FormDescription>
                                                                    Vincule esta despesa ao plano de contas para relatórios contábeis precisos.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>

                            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 mt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto order-last sm:order-first"
                                >
                                    Cancelar
                                </Button>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    {!isEditing && (
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            disabled={isLoading}
                                            onClick={() => setCriarOutra(true)}
                                            className="w-full sm:w-auto"
                                        >
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Plus className="mr-1 h-4 w-4" />
                                            Criar e Nova
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        onClick={() => setCriarOutra(false)}
                                        className="w-full sm:w-auto"
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isEditing ? 'Atualizar' : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Criar Conta
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>

                        </form>
                    </Form>
                )
                }
            </DialogContent >
        </Dialog >
    )
}
