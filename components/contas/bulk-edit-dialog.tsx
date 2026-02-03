'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BankSelect } from '@/components/common/bank-select'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
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
import { cn } from '@/lib/utils'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'

interface BulkEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'empresa' | 'banco' | 'categoria' | 'fornecedor' | null
    selectedIds: string[]
    onSuccess: () => void
}

export function BulkEditDialog({
    open,
    onOpenChange,
    mode,
    selectedIds,
    onSuccess
}: BulkEditDialogProps) {
    const utils = trpc.useUtils()

    // States para cada tipo de edição
    const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null)
    const [selectedBanco, setSelectedBanco] = useState<string | null>(null)
    const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
    const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null)

    // Data fetching
    const { data: empresas } = trpc.empresas.list.useQuery(undefined, { enabled: mode === 'empresa' })
    const { data: categorias } = trpc.tiposDespesa.list.useQuery(undefined, { enabled: mode === 'categoria' })
    const { data: fornecedores } = trpc.fornecedores.list.useQuery(undefined, { enabled: mode === 'fornecedor' })

    const updateMutation = trpc.contas.bulkUpdate.useMutation({
        onSuccess: () => {
            utils.contas.list.invalidate()
            onSuccess()
            onOpenChange(false)
            // Reset states
            setSelectedEmpresa(null)
            setSelectedBanco(null)
            setSelectedCategoria(null)
            setSelectedFornecedor(null)
        }
    })

    const handleConfirm = () => {
        if (!mode) return

        const updateData: any = {}

        if (mode === 'empresa') updateData.empresa_id = selectedEmpresa
        if (mode === 'banco') updateData.banco_id = selectedBanco
        if (mode === 'categoria') updateData.tipo_despesa_id = selectedCategoria
        if (mode === 'fornecedor') updateData.fornecedor_id = selectedFornecedor

        updateMutation.mutate({
            ids: selectedIds,
            data: updateData
        })
    }

    const isLoading = updateMutation.isPending

    const getTitle = () => {
        switch (mode) {
            case 'empresa': return 'Alterar Empresa em Lote'
            case 'banco': return 'Alterar Banco em Lote'
            case 'categoria': return 'Alterar Categoria em Lote'
            case 'fornecedor': return 'Alterar Fornecedor em Lote'
            default: return 'Edição em Lote'
        }
    }

    // Comboboxes state
    const [comboEmpresa, setComboEmpresa] = useState(false)
    const [comboFornecedor, setComboFornecedor] = useState(false)
    const [comboCategoria, setComboCategoria] = useState(false)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>
                        Esta ação afetará {selectedIds.length} contas selecionadas.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {mode === 'banco' && (
                        <div className="grid gap-2">
                            <Label>Novo Banco</Label>
                            <BankSelect
                                value={selectedBanco}
                                onChange={setSelectedBanco}
                                placeholder="Selecione o novo banco..."
                            />
                        </div>
                    )}

                    {mode === 'empresa' && (
                        <div className="grid gap-2">
                            <Label>Nova Empresa</Label>
                            <Select value={selectedEmpresa || "none"} onValueChange={(val) => setSelectedEmpresa(val === "none" ? null : val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {empresas?.map((empresa) => (
                                        <SelectItem key={empresa.id} value={empresa.id}>
                                            {empresa.nome_fantasia || empresa.razao_social}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {mode === 'categoria' && (
                        <div className="grid gap-2">
                            <Label>Nova Categoria</Label>
                            <Popover open={comboCategoria} onOpenChange={setComboCategoria}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={comboCategoria}
                                        className="justify-between"
                                    >
                                        {selectedCategoria
                                            ? categorias?.find((c) => c.id === selectedCategoria)?.nome
                                            : "Selecione a categoria..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar categoria..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => { setSelectedCategoria(null); setComboCategoria(false) }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", !selectedCategoria ? "opacity-100" : "opacity-0")} />
                                                    Nenhuma
                                                </CommandItem>
                                                {categorias?.map((categoria) => (
                                                    <CommandItem
                                                        key={categoria.id}
                                                        value={categoria.nome}
                                                        onSelect={() => {
                                                            setSelectedCategoria(categoria.id)
                                                            setComboCategoria(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedCategoria === categoria.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {categoria.nome}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Alteração
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
