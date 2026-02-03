'use client'

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
    MapPin,
    Hash,
    ShieldCheck,
    Copy,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface FornecedorDetailDrawerProps {
    fornecedorId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (id: string) => void
}

function InfoItem({
    icon: Icon,
    label,
    value,
    href,
    copyable = false,
    colorClass = 'text-muted-foreground'
}: {
    icon?: React.ElementType
    label: string
    value?: string | null
    href?: string
    copyable?: boolean
    colorClass?: string
}) {
    if (!value) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(value)
        toast.success('Copiado para a área de transferência')
    }

    return (
        <div className="flex items-start gap-3 py-2">
            {Icon && <Icon className={`h-4 w-4 mt-0.5 ${colorClass}`} />}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {href ? (
                    <a
                        href={href}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    <p className="text-sm font-medium truncate">{value}</p>
                )}
            </div>
            {copyable && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                >
                    <Copy className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </h3>
            {children}
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
    const fornecedorStats = fornecedorId && stats?.[fornecedorId]

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
        fornecedor.cep,
    ].filter(Boolean).join(', ') : null

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
                        {/* Header */}
                        <SheetHeader className="pb-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 shadow-sm">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <SheetTitle className="text-xl truncate">{fornecedor.nome}</SheetTitle>
                                    {fornecedor.cnpj_cpf && (
                                        <SheetDescription className="text-sm font-mono">
                                            {fornecedor.cnpj_cpf}
                                        </SheetDescription>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {fornecedor.situacao_cadastral && (
                                    <Badge
                                        variant={fornecedor.situacao_cadastral.toLowerCase() === 'ativa' ? 'default' : 'secondary'}
                                        className="gap-1"
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        {fornecedor.situacao_cadastral}
                                    </Badge>
                                )}
                                {fornecedorStats && fornecedorStats.totalContas > 0 && (
                                    <>
                                        {fornecedorStats.vencidas.quantidade > 0 ? (
                                            <Badge variant="destructive" className="gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                {fornecedorStats.vencidas.quantidade} vencida{fornecedorStats.vencidas.quantidade > 1 ? 's' : ''}
                                            </Badge>
                                        ) : fornecedorStats.aVencer.quantidade === 0 ? (
                                            <Badge variant="outline" className="gap-1 border-green-600 text-green-600">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Quitado
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <Clock className="h-3 w-3" />
                                                {fornecedorStats.aVencer.quantidade} pendente{fornecedorStats.aVencer.quantidade > 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </div>
                        </SheetHeader>

                        <div className="space-y-5">
                            {/* Dados Cadastrais */}
                            <Section title="Dados Cadastrais" icon={FileText}>
                                <Card>
                                    <CardContent className="p-3 space-y-0 divide-y">
                                        <InfoItem
                                            icon={Hash}
                                            label="CNPJ/CPF"
                                            value={fornecedor.cnpj_cpf}
                                            copyable
                                        />
                                        <InfoItem
                                            icon={Hash}
                                            label="Inscrição Estadual"
                                            value={fornecedor.inscricao_estadual}
                                            copyable
                                        />
                                    </CardContent>
                                </Card>
                            </Section>

                            <Separator />

                            {/* Contato */}
                            <Section title="Contato" icon={Phone}>
                                <Card>
                                    <CardContent className="p-3 space-y-0 divide-y">
                                        <InfoItem
                                            icon={Phone}
                                            label="Telefone"
                                            value={fornecedor.telefone}
                                            href={fornecedor.telefone ? `tel:${fornecedor.telefone}` : undefined}
                                            colorClass="text-green-600"
                                        />
                                        <InfoItem
                                            icon={Mail}
                                            label="Email"
                                            value={fornecedor.email}
                                            href={fornecedor.email ? `mailto:${fornecedor.email}` : undefined}
                                            colorClass="text-blue-600"
                                        />
                                        {!fornecedor.telefone && !fornecedor.email && (
                                            <p className="text-sm text-muted-foreground py-3 text-center">
                                                Nenhum contato cadastrado
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </Section>

                            <Separator />

                            {/* Endereço */}
                            <Section title="Endereço" icon={MapPin}>
                                <Card>
                                    <CardContent className="p-3">
                                        {enderecoCompleto ? (
                                            <div className="flex items-start gap-3">
                                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="text-sm">{enderecoCompleto}</p>
                                                    {fornecedor.cep && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                                                        >
                                                            Ver no mapa
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-2">
                                                Endereço não cadastrado
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </Section>

                            <Separator />

                            {/* Estatísticas de Contas */}
                            {fornecedorStats && fornecedorStats.totalContas > 0 ? (
                                <Section title="Resumo de Contas" icon={Receipt}>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Card className="bg-muted/50">
                                            <CardContent className="p-3 text-center">
                                                <p className="text-xs text-muted-foreground">Total</p>
                                                <p className="text-2xl font-bold">{fornecedorStats.totalContas}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/50">
                                            <CardContent className="p-3 text-center">
                                                <p className="text-xs text-muted-foreground">Valor Total</p>
                                                <p className="text-lg font-bold truncate">{formatCurrency(fornecedorStats.valorTotal)}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

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
                                        {fornecedorStats.vencidas.quantidade > 0 && (
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
                                        )}

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

                                    <Button asChild className="w-full mt-4" variant="outline">
                                        <Link href={`/contas?fornecedor=${fornecedor.id}`}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Ver Todas as Contas
                                        </Link>
                                    </Button>
                                </Section>
                            ) : (
                                <Section title="Resumo de Contas" icon={Receipt}>
                                    <div className="text-center py-6">
                                        <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
                                            <Receipt className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Nenhuma conta cadastrada
                                        </p>
                                    </div>
                                </Section>
                            )}

                            {/* Observações */}
                            {fornecedor.observacoes && (
                                <>
                                    <Separator />
                                    <Section title="Observações" icon={FileText}>
                                        <Card>
                                            <CardContent className="p-3">
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {fornecedor.observacoes}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Section>
                                </>
                            )}

                            <Separator />

                            {/* Ações */}
                            <div className="flex gap-2 pb-4">
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
