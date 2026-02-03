'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { trpc } from '@/lib/trpc/client'
import { BancoDialog } from '@/components/configuracoes/banco-dialog'

interface BankSelectProps {
    value: string | null | undefined
    onChange: (value: string | null) => void
    placeholder?: string
    disabled?: boolean
}

export function BankSelect({
    value,
    onChange,
    placeholder = "Selecione um banco",
    disabled
}: BankSelectProps) {
    const [open, setOpen] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    const { data: bancos } = trpc.bancos.list.useQuery()

    // Find selected bank object for display
    const selectedBank = bancos?.find((b) => b.id === value)

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="flex-1 justify-between font-normal"
                        disabled={disabled}
                    >
                        {selectedBank ? (
                            <span>
                                {selectedBank.nome}
                                {selectedBank.codigo && <span className="text-muted-foreground ml-1">({selectedBank.codigo})</span>}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Buscar banco..." />
                        <CommandList>
                            <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    value="none"
                                    onSelect={() => {
                                        onChange(null)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    Nenhum
                                </CommandItem>
                                {bancos?.map((banco) => (
                                    <CommandItem
                                        key={banco.id}
                                        value={banco.nome}
                                        onSelect={() => {
                                            onChange(banco.id)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === banco.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span>
                                            {banco.nome}
                                            {banco.codigo && <span className="text-muted-foreground ml-1">({banco.codigo})</span>}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                disabled={disabled}
                onClick={() => setDialogOpen(true)}
            >
                <Plus className="h-4 w-4" />
            </Button>

            <BancoDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    )
}
