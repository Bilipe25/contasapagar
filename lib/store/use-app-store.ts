'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
    // Filtros
    filtroStatus: 'todos' | 'ativa' | 'quitada' | 'cancelada'
    filtroFornecedor: string | null
    filtroTipoDespesa: string | null
    filtroEmpresa: string | null
    filtroBanco: string | null
    periodoInicio: string | null
    periodoFim: string | null

    // UI
    tema: 'light' | 'dark' | 'system'
    visualizacao: 'lista' | 'cards'
    mesSelecionado: string // YYYY-MM

    // Actions
    setFiltroStatus: (status: AppState['filtroStatus']) => void
    setFiltroFornecedor: (id: string | null) => void
    setFiltroTipoDespesa: (id: string | null) => void
    setFiltroEmpresa: (id: string | null) => void
    setFiltroBanco: (id: string | null) => void
    setPeriodoInicio: (inicio: string | null) => void
    setPeriodoFim: (fim: string | null) => void
    setPeriodo: (inicio: string | null, fim: string | null) => void
    setTema: (tema: AppState['tema']) => void
    setVisualizacao: (visualizacao: AppState['visualizacao']) => void
    setMesSelecionado: (mes: string) => void
    limparFiltros: () => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Estado inicial
            filtroStatus: 'todos',
            filtroFornecedor: null,
            filtroTipoDespesa: null,
            filtroEmpresa: null,
            filtroBanco: null,
            periodoInicio: null,
            periodoFim: null,
            tema: 'system',
            visualizacao: 'cards',
            mesSelecionado: new Date().toISOString().substring(0, 7),

            // Actions
            setFiltroStatus: (status) => set({ filtroStatus: status }),
            setFiltroFornecedor: (id) => set({ filtroFornecedor: id }),
            setFiltroTipoDespesa: (id) => set({ filtroTipoDespesa: id }),
            setFiltroEmpresa: (id) => set({ filtroEmpresa: id }),
            setFiltroBanco: (id) => set({ filtroBanco: id }),
            setPeriodoInicio: (inicio) => set({ periodoInicio: inicio }),
            setPeriodoFim: (fim) => set({ periodoFim: fim }),
            setPeriodo: (inicio, fim) => set({ periodoInicio: inicio, periodoFim: fim }),
            setTema: (tema) => set({ tema }),
            setVisualizacao: (visualizacao) => set({ visualizacao }),
            setMesSelecionado: (mes) => set({ mesSelecionado: mes }),
            limparFiltros: () =>
                set({
                    filtroStatus: 'todos',
                    filtroFornecedor: null,
                    filtroTipoDespesa: null,
                    filtroEmpresa: null,
                    filtroBanco: null,
                    periodoInicio: null,
                    periodoFim: null,
                }),
        }),
        {
            name: 'contas-app-storage',
        }
    )
)
