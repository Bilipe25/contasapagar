'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Receipt, BarChart3, Building2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavItem {
    href: string
    icon: React.ElementType
    label: string
}

const navItems: NavItem[] = [
    { href: '/', icon: LayoutDashboard, label: 'Início' },
    { href: '/contas', icon: Receipt, label: 'Contas' },
    // Centro reservado para o botão de ação
    { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { href: '/fornecedores', icon: Building2, label: 'Fornecedores' },
]

interface MobileBottomNavProps {
    onNewConta?: () => void
}

export function MobileBottomNav({ onNewConta }: MobileBottomNavProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isPressed, setIsPressed] = useState(false)

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        return pathname.startsWith(href)
    }

    const handleNavClick = (href: string) => {
        router.push(href)
    }

    const handleNewConta = () => {
        if (onNewConta) {
            onNewConta()
        } else {
            // Fallback: navegar para contas com parâmetro para abrir modal
            router.push('/contas?action=new')
        }
    }

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
            aria-label="Navegação principal"
        >
            {/* Background com blur e borda */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t" />

            {/* Safe area padding para iPhones */}
            <div className="relative flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] h-16">
                {/* Primeiro par de itens */}
                {navItems.slice(0, 2).map((item) => (
                    <NavButton
                        key={item.href}
                        item={item}
                        isActive={isActive(item.href)}
                        onClick={() => handleNavClick(item.href)}
                    />
                ))}

                {/* Botão central destacado - Nova Conta */}
                <div className="relative -mt-6">
                    <button
                        onClick={handleNewConta}
                        onTouchStart={() => setIsPressed(true)}
                        onTouchEnd={() => setIsPressed(false)}
                        onMouseDown={() => setIsPressed(true)}
                        onMouseUp={() => setIsPressed(false)}
                        onMouseLeave={() => setIsPressed(false)}
                        className={cn(
                            "relative flex items-center justify-center",
                            "h-14 w-14 rounded-full",
                            "bg-gradient-to-br from-primary to-primary/80",
                            "text-primary-foreground shadow-lg shadow-primary/30",
                            "transition-all duration-200",
                            "active:scale-95",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isPressed && "scale-95"
                        )}
                        aria-label="Criar nova conta"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Icon */}
                        <Plus className={cn(
                            "h-7 w-7 transition-transform duration-200",
                            isPressed && "rotate-90"
                        )} />
                    </button>

                    {/* Label abaixo do botão */}
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">
                        Nova
                    </span>
                </div>

                {/* Segundo par de itens */}
                {navItems.slice(2).map((item) => (
                    <NavButton
                        key={item.href}
                        item={item}
                        isActive={isActive(item.href)}
                        onClick={() => handleNavClick(item.href)}
                    />
                ))}
            </div>
        </nav>
    )
}

interface NavButtonProps {
    item: NavItem
    isActive: boolean
    onClick: () => void
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
    const Icon = item.icon

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "w-16 py-2 rounded-xl",
                "transition-all duration-200",
                "active:scale-95 touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className={cn(
                "relative flex items-center justify-center",
                "h-7 w-7 rounded-lg",
                "transition-all duration-200",
                isActive && "bg-primary/10"
            )}>
                <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "scale-110"
                )} />

                {/* Indicador de ativo */}
                {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
            </div>

            <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive && "font-semibold"
            )}>
                {item.label}
            </span>
        </button>
    )
}
