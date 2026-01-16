'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Tags, Trash2, Edit, Search } from 'lucide-react'
import { toast } from 'sonner'
import { TipoDespesaDialog } from '@/components/configuracoes/tipo-despesa-dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function ConfiguracoesPage() {
    const [tipoDespesaDialogOpen, setTipoDespesaDialogOpen] = useState(false)
    const [editingTipoDespesa, setEditingTipoDespesa] = useState<string | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
    const [searchCategoria, setSearchCategoria] = useState('')

    const utils = trpc.useUtils()
    const { data: tiposDespesa, isLoading: loadingCategorias } = trpc.tiposDespesa.list.useQuery()

    const deleteTipoDespesa = trpc.tiposDespesa.delete.useMutation({
        onSuccess: () => {
            toast.success('Categoria excluída!')
            utils.tiposDespesa.list.invalidate()
        },
        onError: (error) => {
            toast.error('Erro ao excluir', { description: error.message })
        },
    })

    const handleDelete = () => {
        if (!deleteTarget) return
        deleteTipoDespesa.mutate(deleteTarget.id)
        setDeleteConfirmOpen(false)
        setDeleteTarget(null)
    }

    const confirmDelete = (id: string, nome: string) => {
        setDeleteTarget({ id, nome })
        setDeleteConfirmOpen(true)
    }

    const filteredCategorias = tiposDespesa?.filter(t =>
        t.nome.toLowerCase().includes(searchCategoria.toLowerCase())
    ) || []

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - Desktop only, hidden on lg+ where breadcrumbs are visible */}
            <div className="hidden sm:block lg:hidden">
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground">
                    Gerencie categorias de despesa e preferências do sistema
                </p>
            </div>

            {/* Categorias de Despesa */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Tags className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                            <span className="truncate">Categorias de Despesa</span>
                            {tiposDespesa && <Badge variant="secondary" className="text-xs">{tiposDespesa.length}</Badge>}
                        </CardTitle>
                        <CardDescription className="mt-0.5 sm:mt-1 text-xs sm:text-sm">
                            Organize suas contas por tipo de gasto
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingTipoDespesa(null)
                            setTipoDespesaDialogOpen(true)
                        }}
                        size="sm"
                        className="w-full sm:w-auto"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Nova Categoria
                    </Button>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    {/* Search */}
                    <div className="relative mb-3 sm:mb-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar categoria..."
                            value={searchCategoria}
                            onChange={(e) => setSearchCategoria(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* List */}
                    {loadingCategorias ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-14" />)}
                        </div>
                    ) : filteredCategorias.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                            {searchCategoria ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
                        </div>
                    ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                            {filteredCategorias.map((tipo) => (
                                <div
                                    key={tipo.id}
                                    className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                        <div
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${tipo.cor || '#6366f1'}20` }}
                                        >
                                            <div
                                                className="h-4 w-4 sm:h-5 sm:w-5 rounded-full"
                                                style={{ backgroundColor: tipo.cor || '#6366f1' }}
                                            />
                                        </div>
                                        <p className="font-medium text-sm sm:text-base truncate">{tipo.nome}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                                setEditingTipoDespesa(tipo.id)
                                                setTipoDespesaDialogOpen(true)
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:text-red-700"
                                            onClick={() => confirmDelete(tipo.id, tipo.nome)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog */}
            <TipoDespesaDialog
                open={tipoDespesaDialogOpen}
                onOpenChange={setTipoDespesaDialogOpen}
                tipoDespesaId={editingTipoDespesa}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a categoria "{deleteTarget?.nome}"?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
