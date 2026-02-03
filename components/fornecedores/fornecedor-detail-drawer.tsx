'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Building2,
    Mail,
    Phone,
    FileText,
    Edit,
    ShoppingCart,
    DollarSign,
    Calendar,
    MapPin,
    Hash,
    ExternalLink,
    TrendingUp,
    Receipt,
    Copy,
    CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FornecedorDetailDrawerProps {
    fornecedorId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (id: string) => void
}

function StatCard({
    icon: Icon,
    label,
    value,
    iconColor = 'text-muted-foreground'
}: {
    icon: React.ElementType
    label: string
    value: string | number
    iconColor?: string
}) {
    return (
        <div className="flex-1 p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <span className="font-semibold text-lg">{value}</span>
            </div>
        </div>
    )
}

function InfoRow({
    icon: Icon,
    label,
    value,
    href,
    copyable = false,
}: {
    icon: React.ElementType
    label: string
    value?: string | null
    href?: string
    copyable?: boolean
}) {
    const [copied, setCopied] = useState(false)

    if (!value) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success('Copiado!')
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex items-start py-3 border-b last:border-0">
            <div className="flex items-center gap-2 w-28 shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
                {href ? (
                    <a
                        href={href}
                        className="text-sm text-primary hover:underline"
                    >
                        {value}
                    </a>
                ) : copyable ? (
                    <button
                        onClick={handleCopy}
                        className="text-sm font-mono px-2 py-0.5 rounded border bg-muted/50 hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                        {value}
                        {copied ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                    </button>
                ) : (
                    <span className="text-sm">{value}</span>
                )}
            </div>
        </div>
    )
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
    const rawStats = fornecedorId && stats?.[fornecedorId]
    const fornecedorStats = rawStats && typeof rawStats === 'object' ? rawStats : null

    const isLoading = loadingFornecedor || loadingStats

    // Montar endereço completo
    const enderecoCompleto = fornecedor ? [
        fornecedor.logradouro && fornecedor.numero
            ? `${fornecedor.logradouro}, ${fornecedor.numero}`
            : fornecedor.logradouro,
        fornecedor.complemento,
        fornecedor.bairro,
        fornecedor.cidade && fornecedor.uf
            ? `${fornecedor.cidade} - ${fornecedor.uf}`
            : fornecedor.cidade || fornecedor.uf,
        fornecedor.cep ? `CEP: ${fornecedor.cep}` : null,
    ].filter(Boolean).join(', ') : null

    // Calcular última compra (última parcela paga)
    const ultimaCompra = fornecedorStats?.ultimaCompra

    if (!fornecedorId) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md p-0 flex flex-col">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-8 w-64" />
                        <div className="flex gap-2">
                            <Skeleton className="h-20 flex-1" />
                            <Skeleton className="h-20 flex-1" />
                            <Skeleton className="h-20 flex-1" />
                        </div>
                        <Skeleton className="h-40" />
                    </div>
                ) : fornecedor ? (
                    <>
                        {/* Header */}
                        <SheetHeader className="px-6 py-4 border-b">
                            <div className="flex items-center gap-3">
                                <SheetTitle className="text-base font-medium">
                                    Detalhes do Fornecedor
                                </SheetTitle>
                                {fornecedor.situacao_cadastral && (
                                    <Badge
                                        variant={fornecedor.situacao_cadastral.toLowerCase() === 'ativa' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {fornecedor.situacao_cadastral}
                                    </Badge>
                                )}
                            </div>
                        </SheetHeader>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Supplier Name */}
                            <div className="px-6 py-4">
                                <h2 className="text-xl font-bold tracking-tight">
                                    {fornecedor.nome}
                                </h2>
                            </div>

                            {/* Stats Cards */}
                            <div className="px-6 pb-4">
                                <div className="flex gap-2">
                                    <StatCard
                                        icon={ShoppingCart}
                                        label="Compras"
                                        value={fornecedorStats?.totalContas || 0}
                                        iconColor="text-blue-500"
                                    />
                                    <StatCard
                                        icon={DollarSign}
                                        label="Valor Total"
                                        value={formatCurrency(fornecedorStats?.valorTotal || 0)}
                                        iconColor="text-green-500"
                                    />
                                    <StatCard
                                        icon={Calendar}
                                        label="Última Compra"
                                        value={ultimaCompra
                                            ? format(parseISO(ultimaCompra), 'dd/MM/yyyy')
                                            : '-'
                                        }
                                        iconColor="text-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Tabs */}
                            <Tabs defaultValue="geral" className="flex-1">
                                <div className="px-6 border-b">
                                    <TabsList className="h-10 w-full justify-start gap-4 bg-transparent p-0">
                                        <TabsTrigger
                                            value="geral"
                                            className="px-0 pb-3 pt-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none bg-transparent"
                                        >
                                            <FileText className="h-4 w-4 mr-1.5" />
                                            Visão Geral
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="contas"
                                            className="px-0 pb-3 pt-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none bg-transparent"
                                        >
                                            <Receipt className="h-4 w-4 mr-1.5" />
                                            Contas
                                            {fornecedorStats && fornecedorStats.totalContas > 0 && (
                                                <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                                                    {fornecedorStats.totalContas}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="historico"
                                            className="px-0 pb-3 pt-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none bg-transparent"
                                        >
                                            <TrendingUp className="h-4 w-4 mr-1.5" />
                                            Análises
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tab: Visão Geral */}
                                <TabsContent value="geral" className="mt-0 px-6 py-4">
                                    <div className="space-y-0">
                                        <InfoRow
                                            icon={Hash}
                                            label="CNPJ"
                                            value={fornecedor.cnpj_cpf}
                                            copyable
                                        />
                                        {fornecedor.inscricao_estadual && (
                                            <InfoRow
                                                icon={Hash}
                                                label="IE"
                                                value={fornecedor.inscricao_estadual}
                                                copyable
                                            />
                                        )}
                                        <InfoRow
                                            icon={Phone}
                                            label="Telefone"
                                            value={fornecedor.telefone}
                                            href={fornecedor.telefone ? `tel:${fornecedor.telefone}` : undefined}
                                        />
                                        <InfoRow
                                            icon={Mail}
                                            label="E-mail"
                                            value={fornecedor.email}
                                            href={fornecedor.email ? `mailto:${fornecedor.email}` : undefined}
                                        />
                                        <InfoRow
                                            icon={MapPin}
                                            label="Endereço"
                                            value={enderecoCompleto}
                                        />
                                        {fornecedor.observacoes && (
                                            <InfoRow
                                                icon={FileText}
                                                label="Obs"
                                                value={fornecedor.observacoes}
                                            />
                                        )}
                                    </div>

                                    {/* Google Maps Link */}
                                    {enderecoCompleto && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Abrir no Google Maps
                                        </a>
                                    )}
                                </TabsContent>

                                {/* Tab: Contas */}
                                <TabsContent value="contas" className="mt-0 px-6 py-4">
                                    {fornecedorStats && fornecedorStats.totalContas > 0 ? (
                                        <div className="space-y-4">
                                            {/* Resumo */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                                                    <p className="text-xs text-blue-600 mb-1">A Vencer</p>
                                                    <p className="text-sm font-semibold text-blue-700">
                                                        {fornecedorStats.aVencer.quantidade} conta{fornecedorStats.aVencer.quantidade !== 1 ? 's' : ''}
                                                    </p>
                                                    <p className="text-xs text-blue-600">
                                                        {formatCurrency(fornecedorStats.aVencer.valor)}
                                                    </p>
                                                </div>
                                                {fornecedorStats.vencidas.quantidade > 0 && (
                                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                                                        <p className="text-xs text-red-600 mb-1">Vencidas</p>
                                                        <p className="text-sm font-semibold text-red-700">
                                                            {fornecedorStats.vencidas.quantidade} conta{fornecedorStats.vencidas.quantidade !== 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-red-600">
                                                            {formatCurrency(fornecedorStats.vencidas.valor)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                                                    <p className="text-xs text-green-600 mb-1">Quitadas</p>
                                                    <p className="text-sm font-semibold text-green-700">
                                                        {fornecedorStats.quitadas.quantidade} conta{fornecedorStats.quitadas.quantidade !== 1 ? 's' : ''}
                                                    </p>
                                                    <p className="text-xs text-green-600">
                                                        {formatCurrency(fornecedorStats.quitadas.valor)}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button asChild className="w-full" variant="outline">
                                                <Link href={`/contas?fornecedor=${fornecedor.id}`}>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Ver Todas as Contas
                                                </Link>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                Nenhuma conta registrada
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Tab: Análises */}
                                <TabsContent value="historico" className="mt-0 px-6 py-4">
                                    <div className="text-center py-8">
                                        <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            Análises em breve
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Histórico de pagamentos e tendências
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t mt-auto">
                            <Button
                                onClick={() => {
                                    onEdit?.(fornecedor.id)
                                    onOpenChange(false)
                                }}
                                className="w-full"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Fornecedor
                            </Button>
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
