'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateRelative, isOverdue } from '@/lib/utils'
import { Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PagarParcelaDialog } from '@/components/contas/pagar-parcela-dialog'

interface UpcomingBillsProps {
    contas: Array<{
        id: string
        conta_id: string
        parcela_id: string
        numero_parcela: number
        descricao: string
        valor_final: number
        data_vencimento: string
        status: string
        fornecedores: { nome: string } | null
        tipos_despesa: { nome: string; cor?: string } | null
    }>
}

export function UpcomingBills({ contas }: UpcomingBillsProps) {
    const [parcelaSelecionada, setParcelaSelecionada] = useState<{
        id: string
        numero_parcela: number
        valor_final: number
        data_vencimento: string
    } | null>(null)
    const [contaId, setContaId] = useState<string>('')
    const [contaDescricao, setContaDescricao] = useState<string>('')

    const handlePagar = (conta: typeof contas[0]) => {
        // Usar diretamente os dados da parcela retornados pelo dashboard
        setParcelaSelecionada({
            id: conta.parcela_id,
            numero_parcela: conta.numero_parcela,
            valor_final: conta.valor_final,
            data_vencimento: conta.data_vencimento,
        })
        setContaId(conta.conta_id)
        setContaDescricao(conta.descricao)
    }

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setParcelaSelecionada(null)
            setContaId('')
            setContaDescricao('')
        }
    }

    return (
        <>
            <Card className="flex flex-col h-full">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Próximos Vencimentos</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Contas a vencer nos próximos 7 dias
                            </p>
                        </div>
                        {contas.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                    {contas.length === 0 ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <Calendar className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="mt-3 text-sm font-medium">
                                    Tudo em dia!
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Nenhuma conta a vencer nos próximos dias
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-[250px] sm:h-[300px] pr-4">
                            <div className="space-y-2 sm:space-y-3">
                                {contas.map((conta) => {
                                    const vencida = isOverdue(conta.data_vencimento)
                                    return (
                                        <div
                                            key={conta.id}
                                            className={cn(
                                                "flex items-start justify-between gap-3 rounded-lg border p-3 transition-all hover:shadow-sm",
                                                vencida && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                                            )}
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {vencida && (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                    )}
                                                    <p className="font-medium leading-none text-sm sm:text-base">
                                                        {conta.descricao || conta.fornecedores?.nome || 'Conta sem descrição'}
                                                    </p>
                                                    {conta.tipos_despesa && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] h-5 px-1.5"
                                                            style={{
                                                                borderColor: conta.tipos_despesa.cor || '#6366f1',
                                                                color: conta.tipos_despesa.cor || '#6366f1',
                                                            }}
                                                        >
                                                            {conta.tipos_despesa.nome}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {conta.fornecedores && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                                                        {conta.fornecedores.nome}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs sm:text-sm pt-1">
                                                    <div className={cn(
                                                        "flex items-center gap-1",
                                                        vencida ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
                                                    )}>
                                                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        {formatDateRelative(conta.data_vencimento)}
                                                    </div>
                                                    <div className="flex items-center gap-1 font-semibold">
                                                        <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        {formatCurrency(conta.valor_final)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={vencida ? "destructive" : "outline"}
                                                className="shrink-0 h-8 text-xs px-2 sm:px-3"
                                                onClick={() => handlePagar(conta)}
                                            >
                                                Pagar
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de Confirmar Pagamento */}
            <PagarParcelaDialog
                open={!!parcelaSelecionada}
                onOpenChange={handleDialogClose}
                parcela={parcelaSelecionada}
                contaId={contaId}
                contaDescricao={contaDescricao}
            />
        </>
    )
}

