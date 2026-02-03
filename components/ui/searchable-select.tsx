'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

export interface ComboboxOption {
    value: string
    label: string
}

interface SearchableSelectProps {
    options: ComboboxOption[]
    value: string | null
    onChange: (value: string | null) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    className?: string
    disabled?: boolean
    icon?: React.ReactNode
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    searchPlaceholder = 'Buscar...',
    emptyText = 'Nenhum resultado encontrado.',
    className,
    disabled = false,
    icon,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')

    const selectedOption = options.find((option) => option.value === value)

    const filteredOptions = React.useMemo(() => {
        if (!search) return options
        const searchLower = search.toLowerCase()
        return options.filter((option) =>
            option.label.toLowerCase().includes(searchLower)
        )
    }, [options, search])

    const handleSelect = (optionValue: string) => {
        onChange(optionValue === value ? null : optionValue)
        setOpen(false)
        setSearch('')
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
        setSearch('')
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal",
                        !selectedOption && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <span className="flex items-center gap-2 truncate">
                        {icon}
                        {selectedOption?.label || placeholder}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {selectedOption && (
                            <span
                                role="button"
                                className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
                                onClick={handleClear}
                            >
                                <X className="h-3 w-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                {/* Search Input */}
                <div className="flex items-center border-b px-3">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    {search && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setSearch('')}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* Options List */}
                <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {emptyText}
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    value === option.value && "bg-accent"
                                )}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <span className="truncate">{option.label}</span>
                            </button>
                        ))
                    )}
                </div>

                {/* Clear Option */}
                {selectedOption && (
                    <div className="border-t p-1">
                        <button
                            onClick={() => {
                                onChange(null)
                                setOpen(false)
                                setSearch('')
                            }}
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Limpar seleção
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
