'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Erro no Dashboard</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Não foi possível carregar este painel. Tente atualizar a página.
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs font-mono text-destructive bg-destructive/5 p-2 rounded max-w-md mx-auto overflow-auto">
                        {error.message}
                    </p>
                )}
            </div>
            <Button onClick={() => reset()} variant="default" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
            </Button>
        </div>
    )
}
