'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    const showInstallToast = useCallback((promptEvent: BeforeInstallPromptEvent) => {
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
                        onClick={async () => {
                            try {
                                await promptEvent.prompt()
                                const choiceResult = await promptEvent.userChoice
                                if (choiceResult.outcome === 'accepted') {
                                    console.log('User accepted the install prompt')
                                    setIsInstalled(true)
                                }
                                setDeferredPrompt(null)
                                toast.dismiss(t)
                            } catch (err) {
                                console.error('Install prompt error:', err)
                            }
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
            duration: 15000,
            position: 'bottom-right',
            id: 'pwa-install-prompt'
        })
    }, [])

    const showIOSInstallToast = useCallback(() => {
        toast.custom((t) => (
            <div className="bg-background border border-border shadow-lg rounded-lg p-4 flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Instalar no iPhone/iPad</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Toque em <strong>Compartilhar</strong> e depois em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
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
            </div>
        ), {
            duration: 10000,
            position: 'bottom-right',
            id: 'ios-install-prompt'
        })
    }, [])

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('SW registered:', registration.scope)

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        console.log('SW update found')
                    })
                })
                .catch((err) => console.error('SW registration failed:', err))
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !('standalone' in window.navigator)
        setIsIOS(isIosDevice)

        // Handle beforeinstallprompt event
        const handler = (e: Event) => {
            e.preventDefault()
            const promptEvent = e as BeforeInstallPromptEvent
            setDeferredPrompt(promptEvent)
            console.log('beforeinstallprompt event captured')

            // Show toast after a short delay
            setTimeout(() => {
                showInstallToast(promptEvent)
            }, 2000)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Handle app installed event
        const installedHandler = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
            console.log('App was installed')
        }

        window.addEventListener('appinstalled', installedHandler)

        // Show iOS prompt after delay if on iOS and not installed
        if (isIosDevice) {
            const timer = setTimeout(() => {
                showIOSInstallToast()
            }, 5000)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handler)
                window.removeEventListener('appinstalled', installedHandler)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('appinstalled', installedHandler)
        }
    }, [showInstallToast, showIOSInstallToast])

    return null
}
