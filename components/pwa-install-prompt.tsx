'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Detectar se é iOS (já que iOS não dispara beforeinstallprompt)
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIosDevice)

        // Capturar evento de instalação (Chrome/Android/Desktop)
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)

            // Mostrar toast APÓS capturar o evento
            setTimeout(() => {
                // Verifica se já foi dispensado recentemente (opcional, aqui simplificado)
                showInstallToast(e)
            }, 3000)
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const showInstallToast = (promptEvent: any) => {
        toast.custom((t) => (
            <div className="bg-background border border-border shadow-lg rounded-lg p-4 flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Download className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Instalar App</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Instale o Contas a Pagar para acesso rápido e offline.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex gap-2 mt-1">
                    <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                            promptEvent.prompt()
                            promptEvent.userChoice.then((choiceResult: any) => {
                                if (choiceResult.outcome === 'accepted') {
                                    console.log('User accepted the install prompt')
                                }
                                setDeferredPrompt(null)
                                toast.dismiss(t)
                            })
                        }}
                    >
                        Instalar Agora
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => toast.dismiss(t)}
                    >
                        Agora não
                    </Button>
                </div>
            </div>
        ), {
            duration: 10000, // Duração maior para dar tempo de ler
            position: 'bottom-right'
        })
    }

    // Opcional: Renderizar algo diferente para iOS se desejar, 
    // ou apenas deixar o toast nativo do navegador cuidar (no iOS é manual via Share menu)

    return null // Este componente não renderiza nada visualmente por si só, apenas dispara o toast
}
