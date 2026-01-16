'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getAuthErrorMessage } from '@/lib/utils/auth-errors'

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string

        const supabase = createClient()

        // Determinar a URL base dependendo do ambiente
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        })

        if (error) {
            toast.error('Erro ao enviar email', {
                description: getAuthErrorMessage(error.message),
            })
            setIsLoading(false)
        } else {
            setIsSubmitted(true)
            toast.success('Email enviado com sucesso!')
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-xl bg-background/80">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Link
                            href="/login"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para login
                        </Link>
                    </div>
                    <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
                    <CardDescription>
                        Digite seu email e enviaremos um link para você redefinir sua senha.
                    </CardDescription>
                </CardHeader>

                {isSubmitted ? (
                    <CardContent className="space-y-6 flex flex-col items-center text-center py-8">
                        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg">Verifique seu email</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                Enviamos um link de recuperação para o email informado. Verifique também sua caixa de spam.
                            </p>
                        </div>
                        <Button variant="outline" className="mt-4" onClick={() => setIsSubmitted(false)}>
                            Tentar outro email
                        </Button>
                    </CardContent>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email cadastrado</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        required
                                        disabled={isLoading}
                                        className="pl-10"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Enviar Link de Recuperação'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    )
}
