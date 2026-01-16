'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useAppStore } from '@/lib/store/use-app-store'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { UpcomingBills } from '@/components/dashboard/upcoming-bills'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ContaFormDialog } from '@/components/contas/conta-form-dialog'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'

export default function DashboardPage() {
    const mesSelecionado = useAppStore((state) => state.mesSelecionado)
    const [isFormOpen, setIsFormOpen] = useState(false)

    const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery({
        mes: mesSelecionado,
    })

    const { data: graficoData, isLoading: graficoLoading } =
        trpc.dashboard.graficoMensal.useQuery()

    const { data: vencimentosProximos, isLoading: vencimentosLoading } =
        trpc.dashboard.vencimentosProximos.useQuery()

    // Atalhos de teclado
    useKeyboardShortcuts({
        shortcuts: [
            { key: 'n', action: () => setIsFormOpen(true), description: 'Nova conta' },
        ]
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="hidden sm:block lg:hidden">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Visão geral das suas contas a pagar
                    </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)} className="hidden sm:flex">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                </Button>
            </div>

            {/* FAB Mobile */}
            <Button
                onClick={() => setIsFormOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden z-50 p-0"
                size="icon"
                aria-label="Adicionar nova conta"
            >
                <Plus className="h-6 w-6" />
            </Button>

            {/* Stats Cards */}
            {statsLoading ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            ) : (
                <StatsCards stats={stats} />
            )}

            {/* Charts and Upcoming Bills */}
            <div className="grid gap-6 grid-cols-1 xl:grid-cols-7">
                {/* Monthly Chart */}
                <div className="xl:col-span-4">
                    {graficoLoading ? (
                        <Skeleton className="h-[400px]" />
                    ) : (
                        <MonthlyChart data={graficoData || []} />
                    )}
                </div>

                {/* Upcoming Bills */}
                <div className="xl:col-span-3">
                    {vencimentosLoading ? (
                        <Skeleton className="h-[400px]" />
                    ) : (
                        <UpcomingBills contas={vencimentosProximos || []} />
                    )}
                </div>
            </div>

            {/* Form Dialog */}
            <ContaFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                contaId={null}
            />
        </div>
    )
}

