'use client'

import { useEffect, useCallback } from 'react'

type KeyboardShortcut = {
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    action: () => void
    description?: string
}

interface UseKeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[]
    enabled?: boolean
}

/**
 * Hook para gerenciar atalhos de teclado globais.
 * 
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'n', ctrl: true, action: () => openNewForm(), description: 'Nova conta' },
 *     { key: 'f', ctrl: true, action: () => focusSearch(), description: 'Buscar' },
 *   ]
 * })
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignorar se estiver em um campo de input
        const target = event.target as HTMLElement
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable
        ) {
            return
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
            const altMatch = shortcut.alt ? event.altKey : !event.altKey

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                event.preventDefault()
                shortcut.action()
                return
            }
        }
    }, [shortcuts])

    useEffect(() => {
        if (!enabled) return

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown, enabled])

    return { shortcuts }
}
