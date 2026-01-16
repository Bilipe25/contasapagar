'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'
import Link from 'next/link'
import { getAuthErrorMessage } from '@/lib/utils/auth-errors'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
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

    const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem')
            setIsLoading(false)
            return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
            password,
        })

        if (error) {
            toast.error('Erro ao atualizar senha', {
                description: getAuthErrorMessage(error.message),
            })
            setIsLoading(false)
        } else {
            toast.success('Senha atualizada com sucesso!', {
                description: 'Você já pode fazer login com sua nova senha.',
            })
            router.push('/')
            router.refresh()
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
                    <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
                    <CardDescription>
                        Crie uma nova senha segura para sua conta.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleUpdatePassword}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                    className="pl-10 pr-10"
                                    onChange={(e) => checkPasswordStrength(e.target.value)}
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                    className="pl-10"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                                'Redefinir Senha'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
