'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-destructive/20 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Algo deu errado!
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                    <p className="text-muted-foreground">
                        Encontramos um erro inesperado ao processar sua solicitação.
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-destructive">
                            {error.message}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button
                        variant="default"
                        onClick={() => reset()}
                        className="w-full sm:w-auto gap-2"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Tentar novamente
                    </Button>
                    <Button
                        variant="outline"
                        asChild
                        className="w-full sm:w-auto gap-2"
                    >
                        <Link href="/">
                            <Home className="h-4 w-4" />
                            Voltar ao início
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
