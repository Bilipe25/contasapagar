'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, addMonths, subMonths, setMonth, setYear, startOfMonth, endOfMonth, isBefore, isAfter, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface MonthYearPickerProps {
    value: Date | null
    onChange: (date: Date | null) => void
    onPeriodChange?: (start: string | null, end: string | null) => void
    className?: string
}

type SelectionMode = 'single' | 'range'

export function MonthYearPicker({
    value,
    onChange,
    onPeriodChange,
    className
}: MonthYearPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<SelectionMode>('single')
    const [rangeStart, setRangeStart] = useState<Date | null>(null)
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
    const [hoverMonth, setHoverMonth] = useState<Date | null>(null)

    const currentDate = value || new Date()
    const [viewYear, setViewYear] = useState(currentDate.getFullYear())

    // Sync viewYear with value
    useEffect(() => {
        if (value) {
            setViewYear(value.getFullYear())
        }
    }, [value])

    const isCurrentMonth = value &&
        value.getMonth() === new Date().getMonth() &&
        value.getFullYear() === new Date().getFullYear()

    const handlePrevMonth = () => {
        const newDate = subMonths(currentDate, 1)
        onChange(newDate)
        updatePeriod(newDate)
        setRangeStart(null)
        setRangeEnd(null)
    }

    const handleNextMonth = () => {
        const newDate = addMonths(currentDate, 1)
        onChange(newDate)
        updatePeriod(newDate)
        setRangeStart(null)
        setRangeEnd(null)
    }

    const handleMonthSelect = (monthIndex: number) => {
        const selectedDate = setMonth(setYear(new Date(), viewYear), monthIndex)

        if (mode === 'single') {
            onChange(selectedDate)
            updatePeriod(selectedDate)
            setIsOpen(false)
        } else {
            // Range mode
            if (!rangeStart || (rangeStart && rangeEnd)) {
                // Start new range
                setRangeStart(selectedDate)
                setRangeEnd(null)
            } else {
                // Complete the range
                if (isBefore(selectedDate, rangeStart)) {
                    setRangeEnd(rangeStart)
                    setRangeStart(selectedDate)
                } else {
                    setRangeEnd(selectedDate)
                }
            }
        }
    }

    const handleApplyRange = () => {
        if (rangeStart && rangeEnd) {
            onChange(rangeStart)
            if (onPeriodChange) {
                const start = startOfMonth(rangeStart)
                const end = endOfMonth(rangeEnd)
                onPeriodChange(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                )
            }
            setIsOpen(false)
        } else if (rangeStart) {
            // If only start selected, use it as single month
            onChange(rangeStart)
            updatePeriod(rangeStart)
            setIsOpen(false)
        }
    }

    const handleYearChange = (delta: number) => {
        setViewYear(prev => prev + delta)
    }

    const handleThisMonth = () => {
        const now = new Date()
        onChange(now)
        updatePeriod(now)
        setRangeStart(null)
        setRangeEnd(null)
        setMode('single')
    }

    const handleClearPeriod = () => {
        onChange(null)
        setRangeStart(null)
        setRangeEnd(null)
        if (onPeriodChange) {
            onPeriodChange(null, null)
        }
    }

    const updatePeriod = (date: Date) => {
        if (onPeriodChange) {
            const start = startOfMonth(date)
            const end = endOfMonth(date)
            onPeriodChange(
                format(start, 'yyyy-MM-dd'),
                format(end, 'yyyy-MM-dd')
            )
        }
    }

    const isInRange = (monthIndex: number) => {
        if (!rangeStart) return false
        const monthDate = setMonth(setYear(new Date(), viewYear), monthIndex)

        if (rangeEnd) {
            return (
                (isSameMonth(monthDate, rangeStart) || isAfter(monthDate, rangeStart)) &&
                (isSameMonth(monthDate, rangeEnd) || isBefore(monthDate, rangeEnd))
            )
        } else if (hoverMonth && mode === 'range') {
            const tempEnd = isBefore(hoverMonth, rangeStart) ? rangeStart : hoverMonth
            const tempStart = isBefore(hoverMonth, rangeStart) ? hoverMonth : rangeStart
            return (
                (isSameMonth(monthDate, tempStart) || isAfter(monthDate, tempStart)) &&
                (isSameMonth(monthDate, tempEnd) || isBefore(monthDate, tempEnd))
            )
        }
        return false
    }

    const isRangeStart = (monthIndex: number) => {
        if (!rangeStart) return false
        return monthIndex === rangeStart.getMonth() && viewYear === rangeStart.getFullYear()
    }

    const isRangeEnd = (monthIndex: number) => {
        if (!rangeEnd) return false
        return monthIndex === rangeEnd.getMonth() && viewYear === rangeEnd.getFullYear()
    }

    // Format display text
    let displayText = 'Todos os períodos'
    if (rangeStart && rangeEnd && mode === 'range') {
        const startStr = format(rangeStart, 'MMM yyyy', { locale: ptBR })
        const endStr = format(rangeEnd, 'MMM yyyy', { locale: ptBR })
        displayText = `${startStr} - ${endStr}`
    } else if (value) {
        displayText = format(value, "MMMM 'de' yyyy", { locale: ptBR })
    }

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {/* Previous Month Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Month/Year Selector */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "min-w-[180px] justify-center font-medium gap-2",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <Calendar className="h-4 w-4" />
                        <span className="capitalize truncate">{displayText}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="center">
                    {/* Mode Toggle */}
                    <div className="flex border-b">
                        <button
                            className={cn(
                                "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                                mode === 'single'
                                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => {
                                setMode('single')
                                setRangeStart(null)
                                setRangeEnd(null)
                            }}
                        >
                            Mês único
                        </button>
                        <button
                            className={cn(
                                "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                                mode === 'range'
                                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => {
                                setMode('range')
                                setRangeStart(null)
                                setRangeEnd(null)
                            }}
                        >
                            Período
                        </button>
                    </div>

                    <div className="p-3">
                        {/* Year Navigation */}
                        <div className="flex items-center justify-between mb-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleYearChange(-1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold text-lg">{viewYear}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleYearChange(1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Range Selection Helper */}
                        {mode === 'range' && (
                            <div className="mb-3 p-2 rounded-lg bg-muted/50 text-center text-xs text-muted-foreground">
                                {!rangeStart && "Selecione o mês inicial"}
                                {rangeStart && !rangeEnd && (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="font-medium text-foreground">
                                            {format(rangeStart, 'MMM yyyy', { locale: ptBR })}
                                        </span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span>Selecione o mês final</span>
                                    </span>
                                )}
                                {rangeStart && rangeEnd && (
                                    <span className="flex items-center justify-center gap-2 text-foreground font-medium">
                                        {format(rangeStart, 'MMM yyyy', { locale: ptBR })}
                                        <ArrowRight className="h-3 w-3" />
                                        {format(rangeEnd, 'MMM yyyy', { locale: ptBR })}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Month Grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                            {months.map((month, index) => {
                                const monthDate = setMonth(setYear(new Date(), viewYear), index)
                                const isSelected = mode === 'single' && value &&
                                    index === value.getMonth() &&
                                    viewYear === value.getFullYear()
                                const isNow = index === new Date().getMonth() &&
                                    viewYear === new Date().getFullYear()
                                const inRange = mode === 'range' && isInRange(index)
                                const isStart = mode === 'range' && isRangeStart(index)
                                const isEnd = mode === 'range' && isRangeEnd(index)

                                return (
                                    <Button
                                        key={month}
                                        variant={isSelected || isStart || isEnd ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-9 text-sm relative",
                                            isNow && !isSelected && !isStart && !isEnd && "border border-primary text-primary",
                                            inRange && !isStart && !isEnd && "bg-primary/20 text-primary hover:bg-primary/30",
                                            isStart && "rounded-r-none",
                                            isEnd && "rounded-l-none",
                                            inRange && !isStart && !isEnd && "rounded-none"
                                        )}
                                        onClick={() => handleMonthSelect(index)}
                                        onMouseEnter={() => mode === 'range' && rangeStart && !rangeEnd && setHoverMonth(monthDate)}
                                        onMouseLeave={() => setHoverMonth(null)}
                                    >
                                        {month.substring(0, 3)}
                                    </Button>
                                )
                            })}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                            {mode === 'range' && rangeStart ? (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleApplyRange}
                                    disabled={!rangeStart}
                                >
                                    Aplicar
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        handleThisMonth()
                                        setIsOpen(false)
                                    }}
                                >
                                    Este mês
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    handleClearPeriod()
                                    setIsOpen(false)
                                }}
                            >
                                Limpar
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Next Month Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Quick Actions */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l">
                <Button
                    variant={isCurrentMonth ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleThisMonth}
                >
                    Hoje
                </Button>
                {(value || (rangeStart && rangeEnd)) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleClearPeriod}
                        aria-label="Limpar período"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
