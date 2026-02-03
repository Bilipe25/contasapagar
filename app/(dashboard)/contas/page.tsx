'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { useAppStore } from '@/lib/store/use-app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { ContasTable } from '@/components/contas/contas-table'
import { ContasCards } from '@/components/contas/contas-cards'
import { ContaFormDialog } from '@/components/contas/conta-form-dialog'
import { ContaDetailDrawer } from '@/components/contas/conta-detail-drawer'
import { ContasStats } from '@/components/contas/contas-stats'
import { ContasFilters } from '@/components/contas/contas-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, parseLocalDate, isVencido } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'

import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/contas/confirm-delete-dialog'

type StatusFilter = 'todos' | 'ativa' | 'quitada' | 'cancelada' | 'vencidas'

export default function ContasPage() {
    const searchParams = useSearchParams()
    const [isMounted, setIsMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingConta, setEditingConta] = useState<string | null>(null)
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
    const [viewingContaId, setViewingContaId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [contaToDelete, setContaToDelete] = useState<{ id: string; descricao: string } | null>(null)

    // Filtro especial para vencidas (não está no store, é local)
    const [filtroVencidas, setFiltroVencidas] = useState(false)

    // Mês selecionado para o picker
    const [mesSelecionadoFiltro, setMesSelecionadoFiltro] = useState<Date | null>(null)

    const {
        filtroStatus,
        filtroFornecedor,
        filtroTipoDespesa,
        filtroEmpresa,
        periodoInicio,
        periodoFim,
        visualizacao,
        setFiltroStatus,
        setFiltroFornecedor,
        setFiltroTipoDespesa,
        setFiltroEmpresa,
        setPeriodoInicio,
        setPeriodoFim,
        setVisualizacao,
        limparFiltros,
    } = useAppStore()

    useEffect(() => {
        setIsMounted(true)

        // Aplicar filtro de fornecedor da URL se presente
        const fornecedorParam = searchParams.get('fornecedor')
        if (fornecedorParam) {
            setFiltroFornecedor(fornecedorParam)
        }

        // Aplicar filtro de status da URL se presente
        const statusParam = searchParams.get('status') as StatusFilter | null
        if (statusParam) {
            if (statusParam === 'vencidas') {
                setFiltroStatus('ativa')
                setFiltroVencidas(true)
            } else if (['ativa', 'quitada', 'cancelada'].includes(statusParam)) {
                setFiltroStatus(statusParam as 'ativa' | 'quitada' | 'cancelada')
                setFiltroVencidas(false)
            }
        }
        // Verificar se deve abrir o formulário (vindo do bottom nav)
        const actionParam = searchParams.get('action')
        if (actionParam === 'new') {
            setIsFormOpen(true)
            // Limpar o parâmetro da URL sem recarregar a página
            const url = new URL(window.location.href)
            url.searchParams.delete('action')
            window.history.replaceState({}, '', url)
        }
    }, [searchParams, setFiltroFornecedor, setFiltroStatus])

    // Fetch data
    const { data: contasData, isLoading } = trpc.contas.list.useQuery({
        status: filtroStatus === 'todos' ? undefined : filtroStatus,
        fornecedorId: filtroFornecedor || undefined,
        tipoDespesaId: filtroTipoDespesa || undefined,
        empresaId: filtroEmpresa || undefined,
        dataInicio: periodoInicio || undefined,
        dataFim: periodoFim || undefined,
    })

    const { data: fornecedores } = trpc.fornecedores.list.useQuery()
    const { data: tiposDespesa } = trpc.tiposDespesa.list.useQuery()
    const { data: empresas } = trpc.empresas.list.useQuery()

    // Calcular estatísticas
    const stats = contasData ? {
        total: contasData.length,
        pendentes: contasData.filter(c => c.status === 'ativa').length,
        valorPendente: contasData
            .filter(c => c.status === 'ativa')
            .reduce((sum, c) => sum + (c.valor_pendente || 0), 0),

        // CORREÇÃO: Usar isVencido para garantir cálculo correto com fuso horário
        vencidas: contasData.filter(c => {
            if (c.status !== 'ativa' || !c.proxima_parcela) return false
            return isVencido(c.proxima_parcela.data_vencimento)
        }).length,

        // CORREÇÃO: Usar isVencido aqui também
        valorVencido: contasData
            .filter(c => {
                if (c.status !== 'ativa' || !c.proxima_parcela) return false
                return isVencido(c.proxima_parcela.data_vencimento)
            })
            .reduce((sum, c) => sum + (c.valor_pendente || 0), 0),

        pagas: contasData.reduce((count, c) => {
            return count + (c.parcelas?.filter((p: any) => p.status === 'pago' && p.data_pagamento && isSameMonth(parseLocalDate(p.data_pagamento), new Date())).length || 0)
        }, 0),
        valorPago: contasData.reduce((sum, c) => {
            return sum + (c.parcelas?.filter((p: any) => p.status === 'pago' && p.data_pagamento && isSameMonth(parseLocalDate(p.data_pagamento), new Date()))
                .reduce((acc: number, p: any) => acc + (p.valor_final || 0), 0) || 0)
        }, 0),
    } : undefined

    const hasActiveFilters = Boolean(
        filtroStatus !== 'todos' ||
        filtroFornecedor ||
        filtroTipoDespesa ||
        filtroEmpresa ||
        periodoInicio ||
        periodoFim
    )

    // Filtrar por busca textual e vencidas localmente
    const contasFiltradas = contasData?.filter(conta => {
        // Filtro de busca textual
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesSearch = (
                conta.descricao?.toLowerCase().includes(query) ||
                conta.fornecedores?.nome?.toLowerCase().includes(query) ||
                conta.tipos_despesa?.nome?.toLowerCase().includes(query)
            )
            if (!matchesSearch) return false
        }

        // Filtro de vencidas (só mostrar se estiver ativa e vencida)
        if (filtroVencidas) {
            if (conta.status !== 'ativa') return false
            if (!conta.proxima_parcela) return false
            return isVencido(conta.proxima_parcela.data_vencimento)
        }

        return true
    }) || []

    const handleEdit = (id: string) => {
        setEditingConta(id)
        setIsFormOpen(true)
    }

    const handleView = (id: string) => {
        setViewingContaId(id)
        setDetailDrawerOpen(true)
    }

    const utils = trpc.useUtils()
    const deleteMutation = trpc.contas.delete.useMutation({
        onSuccess: () => {
            toast.success('Conta excluída com sucesso!')
            utils.contas.list.invalidate()
            setDeleteDialogOpen(false)
            setContaToDelete(null)
        },
        onError: (error) => {
            toast.error('Erro ao excluir conta: ' + error.message)
        },
    })

    const handleDelete = (id: string, descricao: string) => {
        setContaToDelete({ id, descricao })
        setDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (contaToDelete) {
            deleteMutation.mutate(contaToDelete.id)
        }
    }

    if (!isMounted) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-[400px]" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="hidden sm:block lg:hidden">
                    <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
                    <p className="text-muted-foreground">
                        Gerencie suas contas e pagamentos
                    </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)} size="lg" className="hidden sm:flex">
                    <Plus className="mr-2 h-5 w-5" />
                    Nova Conta
                </Button>
            </div>

            {/* Sticky Search Bar - Mobile Only */}
            <div className="sticky top-14 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b sm:hidden">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição, fornecedor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <ContasStats stats={stats} isLoading={isLoading} />

            {/* Filters */}
            <div className="rounded-lg border bg-card p-3 sm:p-4">
                <ContasFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filtroStatus={filtroStatus}
                    onStatusChange={setFiltroStatus}
                    filtroVencidas={filtroVencidas}
                    onVencidasChange={setFiltroVencidas}
                    filtroFornecedor={filtroFornecedor}
                    onFornecedorChange={setFiltroFornecedor}
                    fornecedores={fornecedores}
                    filtroTipoDespesa={filtroTipoDespesa}
                    onTipoDespesaChange={setFiltroTipoDespesa}
                    tiposDespesa={tiposDespesa}
                    filtroEmpresa={filtroEmpresa}
                    onEmpresaChange={setFiltroEmpresa}
                    empresas={empresas}
                    mesSelecionado={mesSelecionadoFiltro}
                    onMesSelecionadoChange={setMesSelecionadoFiltro}
                    onPeriodChange={(start, end) => {
                        setPeriodoInicio(start)
                        setPeriodoFim(end)
                    }}
                    onClearFilters={limparFiltros}
                    totalResults={contasFiltradas.length}
                    hasActiveFilters={hasActiveFilters}
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Table - Desktop Only */}
                    <div className="hidden md:block">
                        <ContasTable
                            contas={contasFiltradas}
                            onEdit={handleEdit}
                            onView={handleView}
                            onDelete={handleDelete}
                        />
                    </div>

                    {/* Cards - Mobile Only */}
                    <div className="md:hidden">
                        <ContasCards
                            contas={contasFiltradas}
                            onEdit={handleEdit}
                            onView={handleView}
                        />
                    </div>
                </>
            )}

            {/* Form Dialog */}
            <ContaFormDialog
                open={isFormOpen}
                onOpenChange={(open: boolean) => {
                    setIsFormOpen(open)
                    if (!open) setEditingConta(null)
                }}
                contaId={editingConta}
            />

            {/* Detail Drawer */}
            <ContaDetailDrawer
                open={detailDrawerOpen}
                onOpenChange={setDetailDrawerOpen}
                contaId={viewingContaId}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setContaToDelete(null)
                }}
                title={`Excluir "${contaToDelete?.descricao}"`}
                description="Esta ação não pode ser desfeita. A conta e todas as suas parcelas serão excluídas permanentemente."
                onConfirm={confirmDelete}
                isLoading={deleteMutation.isPending}
            />
        </div>
    )
}
