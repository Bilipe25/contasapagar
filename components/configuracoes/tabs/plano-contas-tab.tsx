'use client'

import { useState, useEffect } from 'react'
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
import { PlanoContasDialog } from '@/components/configuracoes/plano-contas-dialog'
import { Edit, Plus, Search, Trash2, FolderTree, Folder, FolderOpen, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PlanoContasTab() {
    const [search, setSearch] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const utils = trpc.useUtils()
    const { data: contas, isLoading } = trpc.planoContas.list.useQuery()

    // Efeito para expandir tudo inicialmente
    useEffect(() => {
        if (contas && expandedIds.size === 0) {
            const initialIds = new Set(
                contas
                    .filter((c: any) => c.modo === 'SINTETICA')
                    .map((c: any) => c.id)
            )
            setExpandedIds(initialIds)
        }
    }, [contas])

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedIds(newExpanded)
    }

    // Verificar visibilidade baseado na árvore
    const isVisible = (conta: any) => {
        if (!conta.conta_superior_id) return true
        let current = conta
        while (current.conta_superior_id) {
            if (!expandedIds.has(current.conta_superior_id)) return false
            current = contas?.find((c: any) => c.id === current.conta_superior_id)
            if (!current) break
        }
        return true
    }

    const deleteMutation = trpc.planoContas.delete.useMutation({
        onSuccess: () => {
            toast.success('Conta excluída com sucesso!')
            utils.planoContas.list.invalidate()
            setDeleteId(null)
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir conta', { description: error.message })
        },
    })

    const filteredContas = contas?.filter((c: any) => {
        const matchesSearch = c.descricao.toLowerCase().includes(search.toLowerCase()) ||
            c.codigo.includes(search)

        if (search) return matchesSearch
        return isVisible(c)
    }) || []

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar conta ou código..."
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
                    Nova Conta
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[100px]">Nível</TableHead>
                            <TableHead className="w-[120px]">Tipo</TableHead>
                            <TableHead className="w-[120px]">Modo</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredContas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <FolderTree className="h-8 w-8 mb-2 opacity-20" />
                                        <p>Nenhuma conta encontrada.</p>
                                        {search && <p className="text-xs">Tente buscar por outro termo.</p>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredContas.map((conta: any) => (
                                <TableRow key={conta.id} className={cn(
                                    conta.modo === 'SINTETICA' && "bg-muted/30 font-medium",
                                    "hover:bg-muted/50 transition-colors"
                                )}>
                                    <TableCell className="font-mono p-0">
                                        <div
                                            className="flex items-center py-2 relative"
                                            style={{ paddingLeft: `${(conta.nivel - 1) * 1.5 + 1}rem` }}
                                        >
                                            {conta.modo === 'SINTETICA' && !search ? (
                                                <button
                                                    onClick={() => toggleExpand(conta.id)}
                                                    className="mr-2 p-0.5 hover:bg-muted rounded-sm transition-colors"
                                                >
                                                    {expandedIds.has(conta.id) ? (
                                                        <FolderOpen className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                                                    )}
                                                </button>
                                            ) : (
                                                <FileText className="h-4 w-4 mr-2 text-muted-foreground opacity-50" />
                                            )}
                                            <span className={cn(conta.modo === 'SINTETICA' && "font-semibold")}>
                                                {conta.codigo}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            conta.modo === 'SINTETICA' ? "font-medium text-foreground" : "text-muted-foreground"
                                        )}>
                                            {conta.descricao}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">{conta.nivel}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] uppercase",
                                            conta.tipo === 'RECEITA' && "border-green-500/30 text-green-600 bg-green-50 dark:bg-green-950/20",
                                            conta.tipo === 'DESPESA' && "border-red-500/30 text-red-600 bg-red-50 dark:bg-red-950/20",
                                            conta.tipo === 'APLICACAO' && "border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
                                            conta.tipo === 'OUTROS_CUSTOS' && "border-orange-500/30 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
                                        )}>
                                            {conta.tipo}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {conta.modo}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingId(conta.id)
                                                            setDialogOpen(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar conta</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        onClick={() => setDeleteId(conta.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Excluir conta</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <PlanoContasDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                contaId={editingId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
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
