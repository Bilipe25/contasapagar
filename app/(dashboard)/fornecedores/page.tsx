'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus,
    Building2,
    Trash2,
    Edit,
    Search,
    Mail,
    Phone,
    MoreHorizontal,
    ArrowUpDown,
    Receipt,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { FornecedorDialog } from '@/components/configuracoes/fornecedor-dialog'
import { FornecedorDetailDrawer } from '@/components/fornecedores/fornecedor-detail-drawer'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function FornecedoresPage() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
    const [search, setSearch] = useState('')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [filtroStatus, setFiltroStatus] = useState<'todos' | 'com_vencidas' | 'todas_quitadas' | 'com_pendentes'>('todos')
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
    const [viewingFornecedorId, setViewingFornecedorId] = useState<string | null>(null)

    const utils = trpc.useUtils()
    const { data: fornecedores, isLoading } = trpc.fornecedores.list.useQuery()
    const { data: stats } = trpc.fornecedores.stats.useQuery()

    // Debug de Diagnóstico de IDs
    if (stats && fornecedores && fornecedores.length > 0) {
        const primeiroFornecedor = fornecedores[0]
        const idPrimeiro = primeiroFornecedor.id
        const temDados = stats[idPrimeiro]

        console.log('🕵️‍♂️ DIAGNÓSTICO DE IDS:')
        console.log(`🔹 ID do fornecedor (Tabela): "${idPrimeiro}" (Tipo: ${typeof idPrimeiro})`)
        console.log(`🔹 Chaves disponíveis no stats:`, Object.keys(stats).slice(0, 3))
        console.log(`🔹 Match direto?`, !!temDados)
        if (!temDados) {
            // Tenta encontrar se existe algum ID parecido
            const matchAproximado = Object.keys(stats).find(key => key.includes(idPrimeiro) || idPrimeiro.includes(key))
            console.log(`🔹 Match aproximado encontrado?`, matchAproximado || 'Não')
        }
    }

    const deleteMutation = trpc.fornecedores.delete.useMutation({
        onSuccess: () => {
            toast.success('Fornecedor excluído com sucesso!')
            utils.fornecedores.list.invalidate()
            utils.fornecedores.stats.invalidate()
        },
        onError: (error) => {
            toast.error('Erro ao excluir fornecedor', { description: error.message })
        },
    })

    const handleDelete = () => {
        if (!deleteTarget) return
        deleteMutation.mutate(deleteTarget.id)
        setDeleteConfirmOpen(false)
        setDeleteTarget(null)
    }

    const confirmDelete = (id: string, nome: string) => {
        setDeleteTarget({ id, nome })
        setDeleteConfirmOpen(true)
    }

    const handleEdit = (id: string) => {
        setEditingId(id)
        setDialogOpen(true)
    }

    const handleNew = () => {
        setEditingId(null)
        setDialogOpen(true)
    }

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    }

    // Filtrar e ordenar
    const filtered = fornecedores
        ?.filter(f => {
            // Busca
            const matchSearch = f.nome.toLowerCase().includes(search.toLowerCase()) ||
                f.cnpj_cpf?.toLowerCase().includes(search.toLowerCase()) ||
                f.email?.toLowerCase().includes(search.toLowerCase())

            if (!matchSearch) return false

            // Filtro de status
            const fornecedorStats = stats?.[f.id]
            if (!fornecedorStats) return filtroStatus === 'todos'

            if (filtroStatus === 'com_vencidas') {
                return fornecedorStats.vencidas.quantidade > 0
            } else if (filtroStatus === 'todas_quitadas') {
                return fornecedorStats.aVencer.quantidade === 0 && fornecedorStats.vencidas.quantidade === 0
            } else if (filtroStatus === 'com_pendentes') {
                return fornecedorStats.aVencer.quantidade > 0 || fornecedorStats.vencidas.quantidade > 0
            }

            return true
        })
        .sort((a, b) => {
            const comparison = a.nome.localeCompare(b.nome)
            return sortOrder === 'asc' ? comparison : -comparison
        }) || []

    // Calcular totais gerais
    const totalContas = Object.values(stats || {}).reduce((sum, s) => sum + (s?.totalContas || 0), 0)
    const valorTotalGeral = Object.values(stats || {}).reduce((sum, s) => sum + (s?.valorTotal || 0), 0)
    const totalVencidas = Object.values(stats || {}).reduce((sum, s) => sum + (s?.vencidas?.quantidade || 0), 0)
    const totalQuitadas = Object.values(stats || {}).reduce((sum, s) => sum + (s?.quitadas?.quantidade || 0), 0)

    // Função para determinar badge de status
    const getStatusBadge = (fornecedorId: string) => {
        const fornecedorStats = stats?.[fornecedorId]
        if (!fornecedorStats || fornecedorStats.totalContas === 0) return null

        if (fornecedorStats.vencidas.quantidade > 0) {
            return (
                <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {fornecedorStats.vencidas.quantidade} vencida{fornecedorStats.vencidas.quantidade > 1 ? 's' : ''}
                </Badge>
            )
        }

        if (fornecedorStats.aVencer.quantidade === 0 && fornecedorStats.vencidas.quantidade === 0) {
            return (
                <Badge variant="outline" className="gap-1 border-green-600 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Quitado
                </Badge>
            )
        }

        return (
            <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {fornecedorStats.aVencer.quantidade} pendente{fornecedorStats.aVencer.quantidade > 1 ? 's' : ''}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden sm:block lg:hidden">
                    <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
                    <p className="text-muted-foreground">
                        Gerencie empresas e pessoas para quem você paga contas
                    </p>
                </div>
                <Button onClick={handleNew} size="lg" className="hidden sm:flex">
                    <Plus className="mr-2 h-5 w-5" />
                    Novo Fornecedor
                </Button>
            </div>

            {/* FAB Mobile - positioned above bottom nav */}
            <Button
                onClick={handleNew}
                className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden z-50 p-0"
                size="icon"
                aria-label="Adicionar novo fornecedor"
            >
                <Plus className="h-6 w-6" />
            </Button>

            {/* Stats */}
            <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-3 sm:pt-6 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Fornecedores</p>
                                <p className="text-lg sm:text-2xl font-bold">{fornecedores?.length || 0}</p>
                            </div>
                            <div className="rounded-full bg-primary/10 p-2 sm:p-3 hidden sm:block">
                                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:pt-6 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Vencidas</p>
                                <p className="text-lg sm:text-2xl font-bold text-red-600">{totalVencidas}</p>
                            </div>
                            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 hidden sm:block">
                                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:pt-6 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Quitadas</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600">{totalQuitadas}</p>
                            </div>
                            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 hidden sm:block">
                                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:pt-6 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Valor Total</p>
                                <p className="text-base sm:text-2xl font-bold truncate">{formatCurrency(valorTotalGeral)}</p>
                            </div>
                            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 hidden sm:block">
                                <span className="text-lg sm:text-xl font-bold text-blue-600">R$</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sticky Search Bar - Mobile Only */}
            <div className="sticky top-14 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b sm:hidden">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar fornecedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50"
                    />
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Search - Desktop Only */}
                <div className="relative flex-1 max-w-md hidden sm:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, CNPJ/CPF ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="com_vencidas">Com vencidas</SelectItem>
                        <SelectItem value="com_pendentes">Com pendentes</SelectItem>
                        <SelectItem value="todas_quitadas">Todas quitadas</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">
                            {search || filtroStatus !== 'todos' ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                        </h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                            {search || filtroStatus !== 'todos'
                                ? 'Tente ajustar os filtros'
                                : 'Adicione fornecedores para organizar suas contas a pagar'
                            }
                        </p>
                        {!search && filtroStatus === 'todos' && (
                            <Button onClick={handleNew}>
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Fornecedor
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8"
                                                onClick={toggleSort}
                                            >
                                                Nome
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">A Vencer</TableHead>
                                        <TableHead className="text-center">Vencidas</TableHead>
                                        <TableHead className="text-center">Quitadas</TableHead>
                                        <TableHead className="text-right">Valor Total</TableHead>
                                        <TableHead className="w-[80px] text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((fornecedor) => {
                                        const fornecedorStats = stats?.[fornecedor.id] || {
                                            totalContas: 0,
                                            valorTotal: 0,
                                            aVencer: { quantidade: 0, valor: 0 },
                                            vencidas: { quantidade: 0, valor: 0 },
                                            quitadas: { quantidade: 0, valor: 0 }
                                        }

                                        return (
                                            <TableRow
                                                key={fornecedor.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onDoubleClick={() => {
                                                    setViewingFornecedorId(fornecedor.id)
                                                    setDetailDrawerOpen(true)
                                                }}
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="rounded-full bg-primary/10 p-2">
                                                                <Building2 className="h-4 w-4 text-primary" />
                                                            </div>
                                                            {fornecedor.nome}
                                                        </div>
                                                        {(fornecedor.email || fornecedor.telefone) && (
                                                            <div className="flex gap-2 ml-11 text-xs text-muted-foreground">
                                                                {fornecedor.email && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Mail className="h-3 w-3" />
                                                                        {fornecedor.email}
                                                                    </span>
                                                                )}
                                                                {fornecedor.telefone && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Phone className="h-3 w-3" />
                                                                        {fornecedor.telefone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(fornecedor.id)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {fornecedorStats.aVencer.quantidade > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                                                                {fornecedorStats.aVencer.quantidade}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground mt-1">
                                                                {formatCurrency(fornecedorStats.aVencer.valor)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {fornecedorStats.vencidas.quantidade > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <Badge variant="destructive">
                                                                {fornecedorStats.vencidas.quantidade}
                                                            </Badge>
                                                            <span className="text-xs text-red-600 mt-1">
                                                                {formatCurrency(fornecedorStats.vencidas.valor)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {fornecedorStats.quitadas.quantidade > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <Badge variant="outline" className="border-green-600 text-green-600">
                                                                {fornecedorStats.quitadas.quantidade}
                                                            </Badge>
                                                            <span className="text-xs text-green-600 mt-1">
                                                                {formatCurrency(fornecedorStats.quitadas.valor)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {fornecedorStats.valorTotal > 0
                                                        ? formatCurrency(fornecedorStats.valorTotal)
                                                        : <span className="text-muted-foreground">-</span>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {fornecedorStats.totalContas > 0 && (
                                                                <>
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/contas?fornecedor=${fornecedor.id}`}>
                                                                            <Receipt className="mr-2 h-4 w-4" />
                                                                            Ver Contas
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                </>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleEdit(fornecedor.id)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => confirmDelete(fornecedor.id, fornecedor.nome)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* Mobile Cards - Ultra Compact */}
                    <div className="md:hidden space-y-2">
                        {filtered.map((fornecedor) => {
                            const fornecedorStats = stats?.[fornecedor.id] || {
                                totalContas: 0,
                                valorTotal: 0,
                                aVencer: { quantidade: 0, valor: 0 },
                                vencidas: { quantidade: 0, valor: 0 },
                                quitadas: { quantidade: 0, valor: 0 }
                            }

                            const hasVencidas = fornecedorStats.vencidas.quantidade > 0
                            const isQuitado = fornecedorStats.totalContas > 0 &&
                                fornecedorStats.aVencer.quantidade === 0 &&
                                fornecedorStats.vencidas.quantidade === 0

                            return (
                                <div
                                    key={fornecedor.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all active:scale-[0.99] hover:shadow-sm",
                                        hasVencidas && "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
                                        isQuitado && "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
                                        !hasVencidas && !isQuitado && fornecedorStats.totalContas > 0 && "border-l-4 border-l-amber-500"
                                    )}
                                    onClick={() => {
                                        setViewingFornecedorId(fornecedor.id)
                                        setDetailDrawerOpen(true)
                                    }}
                                >
                                    {/* Left content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Title row */}
                                        <div className="flex items-center gap-1.5">
                                            {hasVencidas && (
                                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                            )}
                                            <span className={cn(
                                                "font-medium text-sm truncate",
                                                hasVencidas && "text-red-700 dark:text-red-400"
                                            )}>
                                                {fornecedor.nome}
                                            </span>
                                        </div>

                                        {/* Info row */}
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {fornecedorStats.totalContas > 0 && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {fornecedorStats.totalContas} conta{fornecedorStats.totalContas > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {fornecedorStats.aVencer.quantidade > 0 && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">
                                                    {fornecedorStats.aVencer.quantidade} pendente{fornecedorStats.aVencer.quantidade > 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            {hasVencidas && (
                                                <Badge variant="destructive" className="text-[9px] h-4 px-1 py-0">
                                                    {fornecedorStats.vencidas.quantidade} vencida{fornecedorStats.vencidas.quantidade > 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            {isQuitado && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-emerald-600 text-emerald-600">
                                                    Quitado
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right content - Value and actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {fornecedorStats.valorTotal > 0 && (
                                            <span className={cn(
                                                "text-sm font-bold",
                                                isQuitado && "text-emerald-600 dark:text-emerald-400",
                                                hasVencidas && "text-red-600 dark:text-red-400"
                                            )}>
                                                {formatCurrency(fornecedorStats.valorTotal)}
                                            </span>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {fornecedorStats.totalContas > 0 && (
                                                    <>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/contas?fornecedor=${fornecedor.id}`}>
                                                                <Receipt className="mr-2 h-4 w-4" />
                                                                Ver Contas
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                    </>
                                                )}
                                                <DropdownMenuItem onClick={() => handleEdit(fornecedor.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => confirmDelete(fornecedor.id, fornecedor.nome)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Dialog */}
            <FornecedorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                fornecedorId={editingId}
            />

            {/* Detail Drawer */}
            <FornecedorDetailDrawer
                fornecedorId={viewingFornecedorId}
                open={detailDrawerOpen}
                onOpenChange={setDetailDrawerOpen}
                onEdit={(id) => {
                    setEditingId(id)
                    setDialogOpen(true)
                }}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o fornecedor "{deleteTarget?.nome}"?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
