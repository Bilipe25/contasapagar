'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import {
    Building2,
    Mail,
    Phone,
    FileText,
    Edit,
    Receipt,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

interface FornecedorDetailDrawerProps {
    fornecedorId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (id: string) => void
}

export function FornecedorDetailDrawer({
    fornecedorId,
    open,
    onOpenChange,
    onEdit,
}: FornecedorDetailDrawerProps) {
    const { data: fornecedores, isLoading: loadingFornecedor } = trpc.fornecedores.list.useQuery(undefined, {
        enabled: !!fornecedorId,
    })
    const { data: stats, isLoading: loadingStats } = trpc.fornecedores.stats.useQuery()

    const fornecedor = fornecedores?.find(f => f.id === fornecedorId)
    const fornecedorStats = fornecedorId && stats?.[fornecedorId]

    const isLoading = loadingFornecedor || loadingStats

    if (!fornecedorId) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                    </div>
                ) : fornecedor ? (
                    <>
                        <SheetHeader>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="rounded-full bg-primary/10 p-2 sm:p-3">
                                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <SheetTitle className="text-lg sm:text-2xl truncate">{fornecedor.nome}</SheetTitle>
                                    {fornecedor.cnpj_cpf && (
                                        <SheetDescription className="text-sm sm:text-base">
                                            {fornecedor.cnpj_cpf}
                                        </SheetDescription>
                                    )}
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="mt-6 space-y-6">
                            {/* Status Badge */}
                            {fornecedorStats && fornecedorStats.totalContas > 0 && (
                                <div>
                                    {fornecedorStats.vencidas.quantidade > 0 ? (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {fornecedorStats.vencidas.quantidade} conta{fornecedorStats.vencidas.quantidade > 1 ? 's' : ''} vencida{fornecedorStats.vencidas.quantidade > 1 ? 's' : ''}
                                        </Badge>
                                    ) : fornecedorStats.aVencer.quantidade === 0 ? (
                                        <Badge variant="outline" className="gap-1 border-green-600 text-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Todas as contas quitadas
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1">
                                            <Clock className="h-3 w-3" />
                                            {fornecedorStats.aVencer.quantidade} conta{fornecedorStats.aVencer.quantidade > 1 ? 's' : ''} pendente{fornecedorStats.aVencer.quantidade > 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                </div>
                            )}

                            {/* Informações de Contato */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Informações de Contato
                                </h3>
                                <div className="space-y-2">
                                    {fornecedor.email ? (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <a
                                                href={`mailto:${fornecedor.email}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {fornecedor.email}
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Email não cadastrado</p>
                                    )}
                                    {fornecedor.telefone ? (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <a
                                                href={`tel:${fornecedor.telefone}`}
                                                className="text-green-600 hover:underline"
                                            >
                                                {fornecedor.telefone}
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Telefone não cadastrado</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Estatísticas de Contas */}
                            {fornecedorStats && fornecedorStats.totalContas > 0 ? (
                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Receipt className="h-4 w-4" />
                                        Resumo de Contas
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        {/* Total */}
                                        <Card>
                                            <CardContent className="p-3 sm:pt-4 sm:pb-4">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total de Contas</p>
                                                <p className="text-xl sm:text-2xl font-bold">{fornecedorStats.totalContas}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-3 sm:pt-4 sm:pb-4">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Valor Total</p>
                                                <p className="text-base sm:text-lg font-bold truncate">{formatCurrency(fornecedorStats.valorTotal)}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Breakdown por Status */}
                                    <div className="mt-3 space-y-2">
                                        {/* A Vencer */}
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">A Vencer</p>
                                                    <p className="text-xs text-blue-600">{fornecedorStats.aVencer.quantidade} conta{fornecedorStats.aVencer.quantidade !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <p className="font-semibold text-blue-600">{formatCurrency(fornecedorStats.aVencer.valor)}</p>
                                        </div>

                                        {/* Vencidas */}
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Vencidas</p>
                                                    <p className="text-xs text-red-600">{fornecedorStats.vencidas.quantidade} conta{fornecedorStats.vencidas.quantidade !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <p className="font-semibold text-red-600">{formatCurrency(fornecedorStats.vencidas.valor)}</p>
                                        </div>

                                        {/* Quitadas */}
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-green-900 dark:text-green-100">Quitadas</p>
                                                    <p className="text-xs text-green-600">{fornecedorStats.quitadas.quantidade} conta{fornecedorStats.quitadas.quantidade !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <p className="font-semibold text-green-600">{formatCurrency(fornecedorStats.quitadas.valor)}</p>
                                        </div>
                                    </div>

                                    {/* Botão Ver Contas */}
                                    <Button asChild className="w-full mt-4" variant="outline">
                                        <Link href={`/contas?fornecedor=${fornecedor.id}`}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Ver Todas as Contas
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
                                        <Receipt className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma conta cadastrada para este fornecedor
                                    </p>
                                </div>
                            )}

                            {/* Observações */}
                            {fornecedor.observacoes && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Observações
                                        </h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {fornecedor.observacoes}
                                        </p>
                                    </div>
                                </>
                            )}

                            <Separator />

                            {/* Ações */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        onEdit?.(fornecedor.id)
                                        onOpenChange(false)
                                    }}
                                    className="flex-1"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Fornecedor
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Fornecedor não encontrado</p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
