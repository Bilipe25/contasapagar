'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, addMonths, subMonths, setMonth, setYear, startOfMonth, endOfMonth } from 'date-fns'
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

export function MonthYearPicker({
    value,
    onChange,
    onPeriodChange,
    className
}: MonthYearPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const currentDate = value || new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const isCurrentMonth = value &&
        value.getMonth() === new Date().getMonth() &&
        value.getFullYear() === new Date().getFullYear()

    const handlePrevMonth = () => {
        const newDate = subMonths(currentDate, 1)
        onChange(newDate)
        updatePeriod(newDate)
    }

    const handleNextMonth = () => {
        const newDate = addMonths(currentDate, 1)
        onChange(newDate)
        updatePeriod(newDate)
    }

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = setMonth(currentDate, monthIndex)
        onChange(newDate)
        updatePeriod(newDate)
        setIsOpen(false)
    }

    const handleYearChange = (delta: number) => {
        const newDate = setYear(currentDate, currentYear + delta)
        onChange(newDate)
        updatePeriod(newDate)
    }

    const handleThisMonth = () => {
        const now = new Date()
        onChange(now)
        updatePeriod(now)
    }

    const handleClearPeriod = () => {
        onChange(null)
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

    const displayText = value
        ? format(value, "MMMM 'de' yyyy", { locale: ptBR })
        : 'Todos os períodos'

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
                            "min-w-[160px] justify-center font-medium gap-2",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <Calendar className="h-4 w-4" />
                        <span className="capitalize">{displayText}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3" align="center">
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
                        <span className="font-semibold text-lg">{currentYear}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleYearChange(1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((month, index) => {
                            const isSelected = value &&
                                index === currentMonth &&
                                currentYear === value.getFullYear()
                            const isNow = index === new Date().getMonth() &&
                                currentYear === new Date().getFullYear()

                            return (
                                <Button
                                    key={month}
                                    variant={isSelected ? "default" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "h-9 text-sm",
                                        isNow && !isSelected && "border border-primary text-primary"
                                    )}
                                    onClick={() => handleMonthSelect(index)}
                                >
                                    {month.substring(0, 3)}
                                </Button>
                            )
                        })}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
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
                {value && (
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
