'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, FileText, Search, Package, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    variant?: 'default' | 'search' | 'error'
    className?: string
}

const variantConfig = {
    default: {
        icon: FileText,
        iconClass: 'text-muted-foreground',
        bgClass: 'bg-muted/30',
    },
    search: {
        icon: Search,
        iconClass: 'text-muted-foreground',
        bgClass: 'bg-muted/20',
    },
    error: {
        icon: AlertCircle,
        iconClass: 'text-red-500',
        bgClass: 'bg-red-50 dark:bg-red-950/20',
    },
}

/**
 * Componente de estado vazio com visual refinado e opção de ação.
 * 
 * @example
 * <EmptyState
 *   title="Nenhuma conta encontrada"
 *   description="Crie uma nova conta ou ajuste os filtros"
 *   action={{ label: 'Nova Conta', onClick: () => openForm() }}
 * />
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className
}: EmptyStateProps) {
    const config = variantConfig[variant]
    const Icon = icon || config.icon

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed animate-fade-in',
                config.bgClass,
                className
            )}
        >
            <div className={cn(
                'rounded-full p-4 mb-4',
                variant === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
            )}>
                <Icon className={cn('h-8 w-8', config.iconClass)} />
            </div>

            <h3 className="text-lg font-semibold text-center">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-muted-foreground text-center mt-1.5 max-w-xs">
                    {description}
                </p>
            )}

            {action && (
                <Button
                    onClick={action.onClick}
                    className="mt-4"
                    variant="default"
                >
                    {action.label}
                </Button>
            )}
        </div>
    )
}

// Presets para casos comuns
export function EmptyStateNoContas({ onCreateClick }: { onCreateClick?: () => void }) {
    return (
        <EmptyState
            icon={Calendar}
            title="Nenhuma conta encontrada"
            description="Crie uma nova conta ou ajuste os filtros de busca"
            action={onCreateClick ? { label: 'Nova Conta', onClick: onCreateClick } : undefined}
        />
    )
}

export function EmptyStateNoResults() {
    return (
        <EmptyState
            variant="search"
            title="Nenhum resultado"
            description="Tente buscar com outros termos"
        />
    )
}

export function EmptyStateError({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            variant="error"
            title="Erro ao carregar"
            description="Não foi possível carregar os dados. Tente novamente."
            action={onRetry ? { label: 'Tentar novamente', onClick: onRetry } : undefined}
        />
    )
}
