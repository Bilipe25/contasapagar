'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmpresaDialog } from '@/components/configuracoes/empresa-dialog'
import { Building2, Edit, Plus, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

type SortDirection = 'asc' | 'desc'
type SortColumn = 'nome' | 'cnpj'

export function EmpresasTab() {
    const [search, setSearch] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [sortColumn, setSortColumn] = useState<SortColumn>('nome')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    const utils = trpc.useUtils()
    const { data: empresas, isLoading } = trpc.empresas.list.useQuery()

    const deleteMutation = trpc.empresas.delete.useMutation({
        onSuccess: () => {
            toast.success('Empresa excluída com sucesso!')
            utils.empresas.list.invalidate()
            setDeleteId(null)
        },
        onError: (error) => {
            toast.error('Erro ao excluir empresa', { description: error.message })
        },
    })

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
    }

    const sortedEmpresas = empresas?.slice().sort((a, b) => {
        const aValue = sortColumn === 'nome'
            ? (a.nome_fantasia || a.razao_social).toLowerCase()
            : (a.cnpj || '').replace(/\D/g, '')
        const bValue = sortColumn === 'nome'
            ? (b.nome_fantasia || b.razao_social).toLowerCase()
            : (b.cnpj || '').replace(/\D/g, '')

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    const filteredEmpresas = sortedEmpresas?.filter(e =>
        e.razao_social.toLowerCase().includes(search.toLowerCase()) ||
        e.cnpj?.includes(search) ||
        e.nome_fantasia?.toLowerCase().includes(search.toLowerCase())
    ) || []

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar empresas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => {
                    setEditingId(null)
                    setDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Empresa
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="w-[300px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('nome')}
                            >
                                <div className="flex items-center gap-2">
                                    Empresa
                                    {sortColumn === 'nome' ? (
                                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    ) : (
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('cnpj')}
                            >
                                <div className="flex items-center gap-2">
                                    CNPJ
                                    {sortColumn === 'cnpj' ? (
                                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    ) : (
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredEmpresas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Building2 className="h-8 w-8 mb-2 opacity-20" />
                                        <p>Nenhuma empresa encontrada.</p>
                                        {search && <p className="text-xs">Tente buscar por outro termo.</p>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmpresas.map((empresa) => (
                                <TableRow key={empresa.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                    {getInitials(empresa.nome_fantasia || empresa.razao_social)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {empresa.nome_fantasia || empresa.razao_social}
                                                </span>
                                                {empresa.nome_fantasia && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {empresa.razao_social}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {empresa.cnpj || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingId(empresa.id)
                                                            setDialogOpen(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar empresa</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        onClick={() => setDeleteId(empresa.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Excluir empresa</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <EmpresaDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                empresaId={editingId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
