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
import { TipoDespesaDialog } from '@/components/configuracoes/tipo-despesa-dialog'
import { Tags, Edit, Plus, Search, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Folder } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

type SortDirection = 'asc' | 'desc'
type SortColumn = 'nome'

export function CategoriasTab() {
    const [search, setSearch] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    const utils = trpc.useUtils()
    const { data: categorias, isLoading } = trpc.tiposDespesa.list.useQuery()

    const deleteMutation = trpc.tiposDespesa.delete.useMutation({
        onSuccess: () => {
            toast.success('Categoria excluída com sucesso!')
            utils.tiposDespesa.list.invalidate()
            setDeleteId(null)
        },
        onError: (error) => {
            toast.error('Erro ao excluir categoria', { description: error.message })
        },
    })

    const handleSort = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    }

    const sortedCategorias = categorias?.slice().sort((a, b) => {
        const aValue = a.nome.toLowerCase()
        const bValue = b.nome.toLowerCase()

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    const filteredCategorias = sortedCategorias?.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase())
    ) || []

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar categorias..."
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
                    Nova Categoria
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Cor</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={handleSort}
                            >
                                <div className="flex items-center gap-2">
                                    Nome
                                    {sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                </div>
                            </TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredCategorias.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Tags className="h-8 w-8 mb-2 opacity-20" />
                                        <p>Nenhuma categoria encontrada.</p>
                                        {search && <p className="text-xs">Tente buscar por outro termo.</p>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCategorias.map((categoria) => (
                                <TableRow key={categoria.id}>
                                    <TableCell>
                                        <div
                                            className="h-6 w-6 rounded-full border shadow-sm ring-1 ring-inset ring-black/10"
                                            style={{ backgroundColor: categoria.cor || '#6366f1' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{categoria.nome}</span>
                                            {categoria.plano_contas && (
                                                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                                    <Folder className="h-3 w-3" />
                                                    <span className="text-xs font-mono">
                                                        {categoria.plano_contas.codigo} - {categoria.plano_contas.descricao}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingId(categoria.id)
                                                            setDialogOpen(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar categoria</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        onClick={() => setDeleteId(categoria.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Excluir categoria</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TipoDespesaDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                tipoDespesaId={editingId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
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
