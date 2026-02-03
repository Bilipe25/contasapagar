'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { FormControl } from '@/components/ui/form'

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
    const { data: bancos } = trpc.bancos.list.useQuery()

    return (
        <Select
            onValueChange={(val) => {
                onChange(val === 'none' ? null : val)
            }}
            value={value || 'none'}
            disabled={disabled}
        >
            <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
            </FormControl>
            <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {bancos?.map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                        {banco.codigo ? `${banco.nome} (${banco.codigo})` : banco.nome}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
