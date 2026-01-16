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
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
    ChevronsUpDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { addDays, format } from 'date-fns'
import { cn } from '@/lib/utils'

const contaSchema = z.object({
    fornecedor_id: z.string().optional(),
    tipo_despesa_id: z.string().optional(),
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    valor_total: z.string().min(1, 'Valor é obrigatório'),
    data_emissao: z.string().min(1, 'Data de emissão é obrigatória'),
    primeiro_vencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
    total_parcelas: z.string().min(1, 'Número de parcelas é obrigatório'),
    intervalo_dias: z.string(),
    observacoes: z.string().optional(),
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

    // Estado para parcelas editáveis
    const [parcelasEditaveis, setParcelasEditaveis] = useState<ParcelaEditavel[]>([])

    // Estado para "Salvar e Criar Outra"
    const [criarOutra, setCriarOutra] = useState(false)

    const form = useForm<ContaFormValues>({
        resolver: zodResolver(contaSchema),
        defaultValues: {
            fornecedor_id: '',
            tipo_despesa_id: '',
            descricao: '',
            valor_total: '',
            data_emissao: format(new Date(), 'yyyy-MM-dd'),
            primeiro_vencimento: '',
            total_parcelas: '1',
            intervalo_dias: '30',
            observacoes: '',
        },
    })

    // Fetch data for selects
    const { data: fornecedores } = trpc.fornecedores.list.useQuery()
    const { data: tiposDespesa } = trpc.tiposDespesa.list.useQuery()

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

    // Populate form when editing
    useEffect(() => {
        if (conta) {
            const primeiraParcela = conta.parcelas?.[0]
            const valorTotalConta = conta.parcelas?.reduce((acc: number, p: any) => acc + (p.valor_original || 0), 0) || 0
            form.reset({
                fornecedor_id: conta.fornecedor_id || '',
                tipo_despesa_id: conta.tipo_despesa_id || '',
                descricao: conta.descricao,
                valor_total: valorTotalConta.toString(),
                data_emissao: conta.data_emissao,
                primeiro_vencimento: primeiraParcela?.data_vencimento?.split('T')[0] || '',
                total_parcelas: conta.total_parcelas?.toString() || '1',
                intervalo_dias: '30',
                observacoes: conta.observacoes || '',
            })
        }
    }, [conta, form])

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
                descricao: data.descricao,
                observacoes: data.observacoes,
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
                descricao: data.descricao,
                valor_original: somaParcelas / parcelasEditaveis.length, // Média
                valor_juros: 0,
                data_emissao: data.data_emissao,
                data_vencimento: parcelasParaEnviar[0]?.data_vencimento || data.primeiro_vencimento,
                total_parcelas: parcelasEditaveis.length,
                intervalo_dias: parseInt(data.intervalo_dias),
                observacoes: data.observacoes,
                parcelas: parcelasParaEnviar, // Array com valores e datas personalizadas
            })
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {isEditing ? 'Editar Conta' : 'Nova Conta a Pagar'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações da conta'
                            : 'Preencha os dados para criar uma nova conta a pagar'}
                    </DialogDescription>
                </DialogHeader>

                {isEditing && isLoadingConta ? (
                    <div className="space-y-6 py-4">
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
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* SEÇÃO: Informações Básicas */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                                    <Building2 className="h-4 w-4" />
                                    Informações Básicas
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
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
                                                            <Button type="button" variant="outline" size="icon">
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
                                                            <Button type="button" variant="outline" size="icon">
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
                            </div>

                            {/* SEÇÃO: Valores e Parcelamento */}
                            {!isEditing && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <DollarSign className="h-4 w-4" />
                                            Valores e Parcelamento
                                        </div>
                                        {/* Atalhos de parcelas rápidas */}
                                        <div className="flex items-center gap-1">
                                            {[
                                                { label: 'À Vista', value: '1' },
                                                { label: '2x', value: '2' },
                                                { label: '3x', value: '3' },
                                                { label: '6x', value: '6' },
                                                { label: '12x', value: '12' },
                                            ].map((opt) => (
                                                <Button
                                                    key={opt.value}
                                                    type="button"
                                                    variant={totalParcelas === opt.value ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => form.setValue('total_parcelas', opt.value)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        {/* Valor Total da Conta */}
                                        <FormField
                                            control={form.control}
                                            name="valor_total"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Valor Total (R$)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0,00"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Número de Parcelas */}
                                        <FormField
                                            control={form.control}
                                            name="total_parcelas"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nº de Parcelas</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="120" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Intervalo */}
                                        <FormField
                                            control={form.control}
                                            name="intervalo_dias"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Intervalo (dias)</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="7">7 dias</SelectItem>
                                                            <SelectItem value="15">15 dias</SelectItem>
                                                            <SelectItem value="30">30 dias (mensal)</SelectItem>
                                                            <SelectItem value="60">60 dias</SelectItem>
                                                            <SelectItem value="90">90 dias</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SEÇÃO: Datas */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                                    <Calendar className="h-4 w-4" />
                                    Datas
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Data Emissão */}
                                    <FormField
                                        control={form.control}
                                        name="data_emissao"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de Emissão</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Primeiro Vencimento com atalhos */}
                                    {!isEditing && (
                                        <FormField
                                            control={form.control}
                                            name="primeiro_vencimento"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>1º Vencimento</FormLabel>
                                                    <div className="space-y-2">
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        {/* Atalhos de data */}
                                                        <div className="flex gap-1 flex-wrap">
                                                            {[
                                                                { label: 'Hoje', days: 0 },
                                                                { label: '+7d', days: 7 },
                                                                { label: '+15d', days: 15 },
                                                                { label: '+30d', days: 30 },
                                                            ].map((opt) => (
                                                                <Button
                                                                    key={opt.label}
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                                    onClick={() => {
                                                                        const data = addDays(new Date(), opt.days)
                                                                        field.onChange(format(data, 'yyyy-MM-dd'))
                                                                    }}
                                                                >
                                                                    {opt.label}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* SEÇÃO: Tabela de Parcelas Editável */}
                            {!isEditing && parcelasEditaveis.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <ListOrdered className="h-4 w-4" />
                                            Parcelas ({parcelasEditaveis.length})
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                Total:
                                            </span>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                Math.abs(somaParcelas - parseFloat(valorTotal?.replace(',', '.') || '0')) < 0.01
                                                    ? "text-green-600"
                                                    : "text-orange-500"
                                            )}>
                                                {formatCurrency(somaParcelas)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tabela Profissional */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">#</th>
                                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fornecedor</th>
                                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vencimento</th>
                                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor (R$)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {parcelasEditaveis.map((p, index) => (
                                                    <tr key={p.numero} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-3 py-2">
                                                            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                                {p.numero}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {fornecedores?.find(f => f.id === form.watch('fornecedor_id'))?.nome || '-'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="date"
                                                                className="h-8 w-[140px]"
                                                                value={format(p.data, 'yyyy-MM-dd')}
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        atualizarDataParcela(index, new Date(e.target.value + 'T12:00:00'))
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="h-8 w-[100px] text-right ml-auto"
                                                                value={p.valor.toFixed(2).replace('.', ',')}
                                                                onChange={(e) => {
                                                                    const novoValor = parseFloat(e.target.value.replace(',', '.')) || 0
                                                                    atualizarValorParcela(index, novoValor)
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-muted/30">
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-2 text-right font-medium">
                                                        Total:
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-primary">
                                                        {formatCurrency(somaParcelas)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Aviso de diferença */}
                                    {Math.abs(somaParcelas - parseFloat(valorTotal?.replace(',', '.') || '0')) >= 0.01 && (
                                        <div className="p-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                            <Calculator className="h-3 w-3" />
                                            Soma das parcelas ({formatCurrency(somaParcelas)}) difere do valor total informado ({formatCurrency(parseFloat(valorTotal?.replace(',', '.') || '0'))})
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SEÇÃO: Observações */}
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="observacoes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Observações (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Informações adicionais sobre a conta..."
                                                    rows={2}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
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
                )}
            </DialogContent>
        </Dialog>
    )
}
