'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Receipt,
    BarChart3,
    Settings,
    Menu,
    Moon,
    Sun,
    LogOut,
    Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav'
import { User } from '@supabase/supabase-js'

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Contas', href: '/contas', icon: Receipt },
    { name: 'Fornecedores', href: '/fornecedores', icon: Building2 },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
]

export function DashboardShell({ children, user }: { children: React.ReactNode; user?: User }) {
    const pathname = usePathname()
    const { setTheme } = useTheme()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        // Forçar recarregamento ao sair também
        window.location.href = '/login'
    }

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === '/'
        }
        return pathname.startsWith(href)
    }

    const userInitials = user?.email
        ?.substring(0, 2)
        .toUpperCase() || 'U'

    const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Usuário'
    const userEmail = user?.email || ''

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                {/* Header */}
                <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Logo e Mobile Menu */}
                        <div className="flex items-center gap-4">
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetTrigger asChild className="lg:hidden">
                                    <Button variant="ghost" size="icon" aria-label="Abrir menu de navegação">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-64 p-0">
                                    <div className="flex flex-col gap-2 p-4">
                                        <div className="mb-4">
                                            <h2 className="text-lg font-semibold">Contas a Pagar</h2>
                                        </div>
                                        {navigation.map((item) => {
                                            const Icon = item.icon
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                                        isActive(item.href)
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'hover:bg-accent hover:text-accent-foreground'
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {item.name}
                                                </Link>
                                            )
                                        })}
                                        {/* Configurações no menu mobile */}
                                        <Link
                                            href="/configuracoes"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                                isActive('/configuracoes')
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <Settings className="h-4 w-4" />
                                            Configurações
                                        </Link>
                                    </div>
                                </SheetContent>
                            </Sheet>

                            <Link href="/" className="flex items-center gap-2">
                                <Receipt className="h-6 w-6" />
                                <span className="font-semibold lg:hidden">
                                    {navigation.find(i => isActive(i.href))?.name || 'Contas a Pagar'}
                                </span>
                                <span className="hidden font-semibold lg:inline-block">
                                    Contas a Pagar
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex lg:gap-1">
                            {navigation.map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            isActive(item.href)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent hover:text-accent-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {/* Theme Toggle */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Alternar tema de cores">
                                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                        <span className="sr-only">Alternar tema</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTheme('light')}>
                                        Claro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                                        Escuro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme('system')}>
                                        Sistema
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Settings */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className={cn(
                                            isActive('/configuracoes') && 'bg-accent'
                                        )}
                                    >
                                        <Link href="/configuracoes">
                                            <Settings className="h-5 w-5" />
                                            <span className="sr-only">Configurações</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Configurações</TooltipContent>
                            </Tooltip>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Menu do usuário">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={user?.user_metadata?.avatar_url} alt={userName} />
                                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                {userInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56" forceMount>
                                    <div className="flex items-center justify-start gap-2 p-2">
                                        <div className="flex flex-col space-y-1 leading-none">
                                            <p className="font-medium">{userName}</p>
                                            <p className="text-xs leading-none text-muted-foreground truncate w-48">
                                                {userEmail}
                                            </p>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sair
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-screen-2xl px-6 py-8 sm:px-8 lg:px-12 pb-24 sm:pb-8">
                    <Breadcrumbs className="mb-4 hidden lg:flex" />
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav />
            </div>
        </TooltipProvider>
    )
}
