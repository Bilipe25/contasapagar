'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
    label: string
    href?: string
}

// Mapeamento de rotas para labels amigáveis
const routeLabels: Record<string, string> = {
    '': 'Dashboard',
    'contas': 'Contas',
    'fornecedores': 'Fornecedores',
    'relatorios': 'Relatórios',
    'configuracoes': 'Configurações',
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean)

    if (segments.length === 0) {
        return [{ label: 'Dashboard' }]
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/' }
    ]

    let currentPath = ''
    segments.forEach((segment, index) => {
        currentPath += `/${segment}`
        const isLast = index === segments.length - 1
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

        breadcrumbs.push({
            label,
            href: isLast ? undefined : currentPath
        })
    })

    return breadcrumbs
}

interface BreadcrumbsProps {
    className?: string
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
    const pathname = usePathname()
    const breadcrumbs = generateBreadcrumbs(pathname)

    // Não mostrar breadcrumbs na página inicial
    if (pathname === '/') {
        return null
    }

    return (
        <nav
            aria-label="Navegação em trilha"
            className={cn('flex items-center text-sm text-muted-foreground', className)}
        >
            <ol className="flex items-center gap-1" role="list">
                {breadcrumbs.map((item, index) => {
                    const isFirst = index === 0
                    const isLast = index === breadcrumbs.length - 1

                    return (
                        <li key={index} className="flex items-center gap-1">
                            {!isFirst && (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
                            )}
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'hover:text-foreground transition-colors flex items-center gap-1',
                                        isFirst && 'text-muted-foreground'
                                    )}
                                >
                                    {isFirst && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                                    <span className={cn(isFirst && 'sr-only sm:not-sr-only')}>
                                        {item.label}
                                    </span>
                                </Link>
                            ) : (
                                <span
                                    className="text-foreground font-medium"
                                    aria-current="page"
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
