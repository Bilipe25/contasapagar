'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    X,
    Trash2,
    Building2,
    Landmark,
    Tag,
    Loader2
} from 'lucide-react'

interface BulkActionsBarProps {
    selectedCount: number
    onClearSelection: () => void
    onEditEmpresa: () => void
    onEditBanco: () => void
    onEditCategoria: () => void
    onDelete: () => void
    isDeleting?: boolean
}

export function BulkActionsBar({
    selectedCount,
    onClearSelection,
    onEditEmpresa,
    onEditBanco,
    onEditCategoria,
    onDelete,
    isDeleting
}: BulkActionsBarProps) {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4"
                >
                    <div className="bg-foreground/95 backdrop-blur-md text-background rounded-xl shadow-2xl p-2 flex items-center justify-between gap-2 overflow-x-auto border border-white/10">

                        {/* Selection Info */}
                        <div className="flex items-center gap-3 pl-3 pr-2 shrink-0">
                            <div className="flex items-center justify-center bg-primary text-primary-foreground font-bold h-6 w-6 rounded-full text-xs">
                                {selectedCount}
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap">
                                selecionados
                            </span>
                            <Separator orientation="vertical" className="h-6 bg-background/20" />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-1 justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEditEmpresa}
                                className="text-background hover:bg-background/20 hover:text-background flex-col h-auto py-1.5 px-3 gap-1"
                            >
                                <Building2 className="h-4 w-4" />
                                <span className="text-[10px] font-medium">Empresa</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEditBanco}
                                className="text-background hover:bg-background/20 hover:text-background flex-col h-auto py-1.5 px-3 gap-1"
                            >
                                <Landmark className="h-4 w-4" />
                                <span className="text-[10px] font-medium">Banco</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEditCategoria}
                                className="text-background hover:bg-background/20 hover:text-background flex-col h-auto py-1.5 px-3 gap-1"
                            >
                                <Tag className="h-4 w-4" />
                                <span className="text-[10px] font-medium">Categoria</span>
                            </Button>
                        </div>

                        {/* Destructive Actions */}
                        <div className="flex items-center gap-2 pl-2 border-l border-background/20 shrink-0">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="h-8 gap-2"
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Excluir</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClearSelection}
                                className="text-background/50 hover:text-background hover:bg-background/20 h-8 w-8 rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
