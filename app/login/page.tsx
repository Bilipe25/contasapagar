'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Receipt, Loader2, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { getAuthErrorMessage } from '@/lib/utils/auth-errors'
import { cn } from '@/lib/utils'

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)

    const checkPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 6) strength += 25
        if (password.match(/[A-Z]/)) strength += 25
        if (password.match(/[0-9]/)) strength += 25
        if (password.match(/[^A-Za-z0-9]/)) strength += 25
        setPasswordStrength(strength)
    }

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            toast.error('Erro ao fazer login', {
                description: getAuthErrorMessage(error.message),
            })
            setIsLoading(false)
        } else {
            toast.success('Login realizado com sucesso!')
            // Forçar recarregamento completo para limpar cache de usuário anterior
            window.location.href = '/'
        }
    }

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem')
            setIsLoading(false)
            return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            toast.error('Erro ao criar conta', {
                description: getAuthErrorMessage(error.message),
            })
            setIsLoading(false)
        } else {
            toast.success('Conta criada com sucesso!', {
                description: 'Verifique seu email para confirmar a conta.',
            })
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 p-4">
            <div className="w-full max-w-md relative">
                {/* Background Blobs */}
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl opacity-50 dark:opacity-20 animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl opacity-50 dark:opacity-20 animate-pulse delay-700" />

                {/* Logo & Header */}
                <div className="mb-8 text-center relative z-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-transform duration-300">
                        <Receipt className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Contas a Pagar
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm">
                        Gerencie suas finanças com simplicidade e elegância
                    </p>
                </div>

                {/* Auth Card */}
                <Card className="border-border/50 shadow-xl backdrop-blur-xl bg-background/80 relative z-10">
                    <Tabs defaultValue="login" className="w-full">
                        <CardHeader className="space-y-1 pb-4">
                            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                                <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                                    Entrar
                                </TabsTrigger>
                                <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                                    Nova Conta
                                </TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        {/* Login Tab */}
                        <TabsContent value="login" className="mt-0">
                            <form onSubmit={handleSignIn}>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email">Email</Label>
                                        <Input
                                            id="login-email"
                                            name="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            required
                                            disabled={isLoading}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="login-password">Senha</Label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                                            >
                                                Esqueceu a senha?
                                            </Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="login-password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                required
                                                disabled={isLoading}
                                                className="bg-background/50 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pb-6">
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            'Acessar Conta'
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </TabsContent>

                        {/* Register Tab */}
                        <TabsContent value="register" className="mt-0">
                            <form onSubmit={handleSignUp}>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="register-email">Email</Label>
                                        <Input
                                            id="register-email"
                                            name="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            required
                                            disabled={isLoading}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">Senha</Label>
                                        <div className="relative">
                                            <Input
                                                id="register-password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                required
                                                disabled={isLoading}
                                                minLength={6}
                                                onChange={(e) => checkPasswordStrength(e.target.value)}
                                                className="bg-background/50 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {/* Password Strength Indicator */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-500",
                                                        passwordStrength <= 25 && "bg-red-500",
                                                        passwordStrength > 25 && passwordStrength <= 50 && "bg-orange-500",
                                                        passwordStrength > 50 && passwordStrength <= 75 && "bg-yellow-500",
                                                        passwordStrength > 75 && "bg-green-500"
                                                    )}
                                                    style={{ width: `${passwordStrength}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                                <span>Fraca</span>
                                                <span className={cn(passwordStrength > 50 && "text-foreground font-medium")}>Média</span>
                                                <span className={cn(passwordStrength > 75 && "text-green-600 font-medium")}>Forte</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-confirm-password">
                                            Confirmar Senha
                                        </Label>
                                        <Input
                                            id="register-confirm-password"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            disabled={isLoading}
                                            minLength={6}
                                            className="bg-background/50"
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="pb-6">
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            'Criar Conta Gratuita'
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </TabsContent>
                    </Tabs>
                </Card>

                {/* Footer */}
                <div className="mt-8 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Seus dados são criptografados e seguros</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
