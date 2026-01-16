'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { getStatusColor, getStatusLabel, cn } from '@/lib/utils'

interface StatusBadgeProps {
    status: string
    className?: string
    showIcon?: boolean
    size?: 'sm' | 'default'
}

const StatusIcon = ({ status }: { status: string }) => {
    const iconClass = 'h-2.5 w-2.5'

    switch (status) {
        case 'pago':
        case 'quitada':
            return <CheckCircle2 className={iconClass} aria-hidden="true" />
        case 'pendente':
        case 'ativa':
            return <Clock className={iconClass} aria-hidden="true" />
        case 'atrasado':
            return <AlertTriangle className={iconClass} aria-hidden="true" />
        case 'cancelado':
        case 'cancelada':
            return <XCircle className={iconClass} aria-hidden="true" />
        default:
            return <Clock className={iconClass} aria-hidden="true" />
    }
}

/**
 * Badge de status com ícone para melhor acessibilidade.
 * O ícone ajuda usuários daltônicos a identificar o status.
 */
export function StatusBadge({
    status,
    className,
    showIcon = true,
    size = 'default'
}: StatusBadgeProps) {
    const sizeClasses = size === 'sm'
        ? 'text-[9px] h-4 px-1 py-0'
        : 'text-xs h-5 px-2 py-0'

    return (
        <Badge
            className={cn(
                getStatusColor(status),
                sizeClasses,
                showIcon && 'gap-0.5',
                className
            )}
        >
            {showIcon && <StatusIcon status={status} />}
            <span>{getStatusLabel(status)}</span>
        </Badge>
    )
}
