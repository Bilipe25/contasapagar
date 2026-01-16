'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ScrollFadeProps {
    children: React.ReactNode
    className?: string
}

/**
 * Componente que adiciona indicadores visuais de fade nas bordas
 * quando há conteúdo rolável horizontalmente.
 */
export function ScrollFade({ children, className }: ScrollFadeProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [scrollState, setScrollState] = React.useState({
        atStart: true,
        atEnd: true
    })

    const updateScrollState = React.useCallback(() => {
        const el = scrollRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el
        const atStart = scrollLeft <= 0
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 1

        setScrollState(prev => {
            if (prev.atStart === atStart && prev.atEnd === atEnd) return prev
            return { atStart, atEnd }
        })
    }, [])

    React.useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        updateScrollState()
        el.addEventListener('scroll', updateScrollState, { passive: true })

        // Observar mudanças de tamanho
        const resizeObserver = new ResizeObserver(updateScrollState)
        resizeObserver.observe(el)

        return () => {
            el.removeEventListener('scroll', updateScrollState)
            resizeObserver.disconnect()
        }
    }, [updateScrollState])

    return (
        <div
            className={cn(
                'relative',
                className
            )}
        >
            {/* Fade esquerdo */}
            <div
                className={cn(
                    'absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent pointer-events-none z-10 transition-opacity duration-200',
                    scrollState.atStart ? 'opacity-0' : 'opacity-100'
                )}
                aria-hidden="true"
            />

            {/* Conteúdo rolável */}
            <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide"
            >
                {children}
            </div>

            {/* Fade direito */}
            <div
                className={cn(
                    'absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 transition-opacity duration-200',
                    scrollState.atEnd ? 'opacity-0' : 'opacity-100'
                )}
                aria-hidden="true"
            />
        </div>
    )
}
