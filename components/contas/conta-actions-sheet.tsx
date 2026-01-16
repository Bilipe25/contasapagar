'use client'

import { useState } from 'react'
import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetAction,
    BottomSheetSeparator
} from '@/components/ui/bottom-sheet'
import { Eye, Edit, CheckCircle, Trash2, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ContaActionsSheetProps {
    conta: {
        id: string
        descricao: string
        valor_pendente?: number
        status: string
        fornecedores?: { nome: string } | null
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onView?: (id: string) => void
    onEdit?: (id: string) => void
    onMarkAsPaid?: (id: string) => void
    onDelete?: (id: string, descricao: string) => void
}

export function ContaActionsSheet({
    conta,
    open,
    onOpenChange,
    onView,
    onEdit,
    onMarkAsPaid,
    onDelete
}: ContaActionsSheetProps) {
    if (!conta) return null

    const handleAction = (action: () => void) => {
        onOpenChange(false)
        // Pequeno delay para a animação de fechamento
        setTimeout(action, 150)
    }

    const isActive = conta.status === 'ativa'

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange}>
            <BottomSheetContent title={`Ações para ${conta.descricao}`}>
                {/* Header com info da conta */}
                <BottomSheetHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                                {conta.descricao}
                            </h3>
                            {conta.fornecedores?.nome && (
                                <p className="text-sm text-muted-foreground truncate">
                                    {conta.fornecedores.nome}
                                </p>
                            )}
                        </div>
                        {conta.valor_pendente !== undefined && conta.valor_pendente > 0 && (
                            <span className="text-lg font-bold text-primary shrink-0">
                                {formatCurrency(conta.valor_pendente)}
                            </span>
                        )}
                    </div>
                </BottomSheetHeader>

                {/* Ações */}
                <div className="space-y-1">
                    {onView && (
                        <BottomSheetAction
                            icon={<Eye className="h-5 w-5" />}
                            label="Ver detalhes"
                            onClick={() => handleAction(() => onView(conta.id))}
                        />
                    )}

                    {isActive && onMarkAsPaid && (
                        <BottomSheetAction
                            icon={<CheckCircle className="h-5 w-5" />}
                            label="Marcar como pago"
                            onClick={() => handleAction(() => onMarkAsPaid(conta.id))}
                        />
                    )}

                    {onEdit && (
                        <BottomSheetAction
                            icon={<Edit className="h-5 w-5" />}
                            label="Editar conta"
                            onClick={() => handleAction(() => onEdit(conta.id))}
                        />
                    )}

                    <BottomSheetSeparator />

                    {onDelete && (
                        <BottomSheetAction
                            icon={<Trash2 className="h-5 w-5" />}
                            label="Excluir conta"
                            variant="destructive"
                            onClick={() => handleAction(() => onDelete(conta.id, conta.descricao))}
                        />
                    )}
                </div>
            </BottomSheetContent>
        </BottomSheet>
    )
}
