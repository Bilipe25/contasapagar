'use client'

import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

interface BottomSheetContentProps {
    children: React.ReactNode
    className?: string
    title?: string
}

interface BottomSheetActionProps {
    icon: React.ReactNode
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive'
    disabled?: boolean
}

function BottomSheet({ open, onOpenChange, children }: BottomSheetProps) {
    return (
        <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
            {children}
        </SheetPrimitive.Root>
    )
}

function BottomSheetTrigger({
    children,
    asChild = true,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
    return (
        <SheetPrimitive.Trigger asChild={asChild} {...props}>
            {children}
        </SheetPrimitive.Trigger>
    )
}

function BottomSheetContent({
    children,
    className,
    title = 'Ações'
}: BottomSheetContentProps) {
    return (
        <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay
                className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            />
            <SheetPrimitive.Content
                className={cn(
                    'fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-lg',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out',
                    'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                    'data-[state=closed]:duration-300 data-[state=open]:duration-300',
                    'max-h-[85vh] overflow-hidden flex flex-col',
                    className
                )}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div
                        className="w-10 h-1 rounded-full bg-muted-foreground/30"
                        aria-hidden="true"
                    />
                </div>

                {/* Title - visually hidden but accessible */}
                <SheetPrimitive.Title className="sr-only">
                    {title}
                </SheetPrimitive.Title>
                <SheetPrimitive.Description className="sr-only">
                    Selecione uma ação
                </SheetPrimitive.Description>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
                    {children}
                </div>

                {/* Safe area for iOS */}
                <div className="h-[env(safe-area-inset-bottom)]" />
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    )
}

function BottomSheetHeader({
    children,
    className
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('pb-4 border-b mb-2', className)}>
            {children}
        </div>
    )
}

function BottomSheetAction({
    icon,
    label,
    onClick,
    variant = 'default',
    disabled = false
}: BottomSheetActionProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors',
                'text-left text-base font-medium',
                'active:scale-[0.98] touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                variant === 'default' && 'hover:bg-accent active:bg-accent/80 text-foreground',
                variant === 'destructive' && 'hover:bg-red-50 active:bg-red-100 text-red-600 dark:hover:bg-red-950/30 dark:active:bg-red-950/50',
                disabled && 'opacity-50 pointer-events-none'
            )}
        >
            <span className={cn(
                'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                variant === 'default' && 'bg-muted text-foreground',
                variant === 'destructive' && 'bg-red-100 text-red-600 dark:bg-red-950/50'
            )}>
                {icon}
            </span>
            <span>{label}</span>
        </button>
    )
}

function BottomSheetSeparator() {
    return <div className="my-2" />
}

export {
    BottomSheet,
    BottomSheetTrigger,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetAction,
    BottomSheetSeparator
}
