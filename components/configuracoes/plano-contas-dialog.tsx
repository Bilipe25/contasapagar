'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from '@/components/ui/checkbox'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    codigo: z.string().min(1, 'Código é obrigatório').regex(/^[0-9.]+$/, 'Apenas números e pontos (ex: 1.01)'),
    tipo: z.enum(['RECEITA', 'DESPESA', 'APLICACAO', 'OUTROS_CUSTOS']),
    modo: z.enum(['SINTETICA', 'ANALITICA']),
    conta_superior_id: z.string().uuid().optional().nullable(),
    nivel: z.number().min(1).max(7),
    conta_banco: z.boolean(),
    banco_id: z.string().uuid().optional().nullable(),
})

interface PlanoContasDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contaId: string | null
}

// Inferir tipo de saída do router
type PlanoConta = {
    id: string
    descricao: string
    codigo: string
    tipo: 'RECEITA' | 'DESPESA' | 'APLICACAO' | 'OUTROS_CUSTOS'
    modo: 'SINTETICA' | 'ANALITICA'
    nivel: number
    conta_superior_id: string | null
    conta_banco: boolean
    banco_id: string | null
}

export function PlanoContasDialog({ open, onOpenChange, contaId }: PlanoContasDialogProps) {
    const utils = trpc.useUtils()
    const { data: contas } = trpc.planoContas.list.useQuery()
    const { data: bancos } = trpc.bancos.list.useQuery()

    // Explicit typing for useForm
    type FormData = z.infer<typeof formSchema>

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            descricao: '',
            codigo: '',
            tipo: 'DESPESA',
            modo: 'ANALITICA',
            nivel: 1,
            conta_banco: false,
            conta_superior_id: null
        },
    })

    // Watchers para lógica automática
    const modo = form.watch('modo')
    const contaSuperiorId = form.watch('conta_superior_id')
    const contaBanco = form.watch('conta_banco')

    // Efeito para preencher dados ao editar
    useEffect(() => {
        if (contaId && contas) {
            const conta = contas.find((c: PlanoConta) => c.id === contaId)
            if (conta) {
                form.reset({
                    descricao: conta.descricao,
                    codigo: conta.codigo,
                    tipo: conta.tipo,
                    modo: conta.modo,
                    nivel: conta.nivel,
                    conta_banco: conta.conta_banco || false,
                    conta_superior_id: conta.conta_superior_id,
                    banco_id: conta.banco_id,
                })
            }
        } else {
            form.reset({
                descricao: '',
                codigo: '',
                tipo: 'DESPESA',
                modo: 'ANALITICA',
                nivel: 1,
                conta_banco: false,
                conta_superior_id: null,
                banco_id: null
            })
        }
    }, [contaId, contas, form, open])

    // Efeito para sugerir nível e tipo baseado na conta superior
    useEffect(() => {
        // Se estiver editando e já carregou os dados iniciais, não queremos sobrescrever o código
        // a menos que o usuário mude o pai.
        // Mas a lógica simplificada abaixo roda sempre que contaSuperiorId muda.

        async function fetchSuggestion() {
            if (contaSuperiorId && contas) {
                const pai = contas.find((c: PlanoConta) => c.id === contaSuperiorId)
                if (pai) {
                    form.setValue('nivel', pai.nivel >= 7 ? 7 : pai.nivel + 1)
                    form.setValue('tipo', pai.tipo)

                    // Buscar sugestão de código inteligentemente
                    // Só sugerir se o campo código estiver vazio ou se o usuário estiver criando uma nova conta (não edição com código já setado)
                    // Ou se mudou o pai explicitamente.
                    const currentCode = form.getValues('codigo')
                    if (!contaId || !currentCode) {
                        try {
                            const nextCode = await utils.planoContas.getNextCode.fetch({ parentId: contaSuperiorId })
                            if (nextCode) {
                                form.setValue('codigo', nextCode)
                            }
                        } catch (err) {
                            console.error('Failed to fetch next code', err)
                        }
                    }
                }
            } else if (!contaId && contaSuperiorId === null) {
                // Se removeu pai (Raiz), resetar nível e tentar sugerir próximo root code
                form.setValue('nivel', 1)
                const currentCode = form.getValues('codigo')
                if (!currentCode) {
                    try {
                        const nextCode = await utils.planoContas.getNextCode.fetch({ parentId: null })
                        if (nextCode) {
                            form.setValue('codigo', nextCode)
                        }
                    } catch (err) {
                        console.error('Failed to fetch next root code', err)
                    }
                }
            }
        }

        fetchSuggestion()
    }, [contaSuperiorId, contas, form, contaId, utils])

    const createMutation = trpc.planoContas.create.useMutation({
        onSuccess: () => {
            toast.success('Conta criada com sucesso!')
            utils.planoContas.list.invalidate()
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error('Erro ao criar conta', { description: error.message })
        },
    })

    const updateMutation = trpc.planoContas.update.useMutation({
        onSuccess: () => {
            toast.success('Conta atualizada com sucesso!')
            utils.planoContas.list.invalidate()
            onOpenChange(false)
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar conta', { description: error.message })
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (contaId) {
            updateMutation.mutate({ id: contaId, ...values })
        } else {
            createMutation.mutate(values)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    // Filtrar contas sintéticas para serem pais
    const contasSinteticas = contas?.filter((c: PlanoConta) => c.modo === 'SINTETICA') || []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{contaId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
                    <DialogDescription>
                        {contaId
                            ? 'Edite as informações da conta do plano de contas.'
                            : 'Adicione uma nova conta ao plano de contas.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="conta_superior_id"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Conta Superior</FormLabel>
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
                                                            ? contasSinteticas?.find(
                                                                (conta: any) => conta.id === field.value
                                                            )?.codigo + ' - ' + contasSinteticas?.find(
                                                                (conta: any) => conta.id === field.value
                                                            )?.descricao
                                                            : "Selecione..."}
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
                                                            <CommandItem
                                                                value="none"
                                                                onSelect={() => {
                                                                    form.setValue("conta_superior_id", null)
                                                                    form.setValue("nivel", 1)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        !field.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                Nenhuma (Raiz)
                                                            </CommandItem>
                                                            {contasSinteticas?.filter(c => c.id !== contaId).map((conta: any) => (
                                                                <CommandItem
                                                                    value={conta.codigo + ' ' + conta.descricao}
                                                                    key={conta.id}
                                                                    onSelect={() => {
                                                                        form.setValue("conta_superior_id", conta.id)
                                                                        const novoNivel = conta.nivel < 7 ? conta.nivel + 1 : 7
                                                                        form.setValue("nivel", novoNivel as any)
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
                                name="codigo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 1.01.001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Vendas de Mercadorias" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="RECEITA">Receita</SelectItem>
                                                <SelectItem value="DESPESA">Despesa</SelectItem>
                                                <SelectItem value="APLICACAO">Aplicação</SelectItem>
                                                <SelectItem value="OUTROS_CUSTOS">Outros Custos</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="modo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SINTETICA">Sintética</SelectItem>
                                                <SelectItem value="ANALITICA">Analítica</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nivel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nível</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(parseInt(val))}
                                            value={field.value?.toString()}
                                            disabled={!!contaSuperiorId} // Travar nível se tiver pai (opcional, mas seguro)
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                                    <SelectItem key={n} value={n.toString()}>
                                                        {n}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="conta_banco"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Conta Banco/Caixa
                                        </FormLabel>
                                        <FormDescription>
                                            Marque se esta for uma conta de disponibilidades (Caixa, Banco, etc).
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {contaBanco && (
                            <FormField
                                control={form.control}
                                name="banco_id"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Banco Vinculado</FormLabel>
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
                                                            ? bancos?.find(
                                                                (b: any) => b.id === field.value
                                                            )?.nome
                                                            : "Selecione o banco..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar banco..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {bancos?.map((banco: any) => (
                                                                <CommandItem
                                                                    value={banco.nome}
                                                                    key={banco.id}
                                                                    onSelect={() => {
                                                                        form.setValue("banco_id", banco.id)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            banco.id === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {banco.codigo && (
                                                                        <span className="font-mono text-muted-foreground mr-2">{banco.codigo}</span>
                                                                    )}
                                                                    {banco.nome}
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
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {contaId ? 'Salvar Alterações' : 'Criar Conta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
