import { z } from 'zod'
import { router, protectedProcedure } from '../init'

export const fornecedoresRouter = router({
    // Consultar CNPJ (Backend Proxy que consulta ReceitaWS e fallback para BrasilAPI)
    consultarCNPJ: protectedProcedure
        .input(z.string().transform(v => v.replace(/\D/g, '')))
        .mutation(async ({ input }) => {
            if (input.length !== 14) {
                throw new Error('CNPJ deve ter 14 dígitos')
            }

            // Tentar ReceitaWS (tem email)
            try {
                const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${input}`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.status !== 'ERROR') {
                        return {
                            razao_social: data.nome,
                            nome_fantasia: data.fantasia,
                            cnpj: input.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
                            logradouro: data.logradouro,
                            numero: data.numero,
                            complemento: data.complemento,
                            bairro: data.bairro,
                            municipio: data.municipio,
                            uf: data.uf,
                            cep: data.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
                            telefone1: data.telefone,
                            email: data.email,
                            situacao_cadastral: data.situacao,
                            inscricao_estadual: null // ReceitaWS não retorna IE
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao consultar ReceitaWS:', error)
            }

            // Fallback BrasilAPI (mais rápido, sem rate limit, mas as vezes sem email)
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${input}`)
            if (!response.ok) {
                throw new Error('Falha ao consultar CNPJ em todas as fontes')
            }

            const data = await response.json()
            return {
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia,
                cnpj: data.cnpj, // Já vem formatado da BrasilAPI? Não, vem limpo geralmente ou formatado?
                // BrasilAPI v1 retorna formatted se não me engano? Não, retorna limpo ou mixed.
                // Mas vamos formatar por segurança
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                municipio: data.municipio,
                uf: data.uf,
                cep: data.cep, // Formatamos no front se precisar
                telefone1: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone1 || ''}` : null,
                email: data.email,
                situacao_cadastral: data.descricao_situacao_cadastral,
                inscricao_estadual: null
            }
        }),

    // Listar todos os fornecedores do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
        const { data, error } = await ctx.supabase
            .from('fornecedores')
            .select('*')
            .eq('user_id', ctx.user.id)
            .order('nome', { ascending: true })

        if (error) throw error
        return data || []
    }),

    // Buscar fornecedor por ID
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .select('*')
                .eq('id', input)
                .eq('user_id', ctx.user.id)
                .single()

            if (error) throw error
            return data
        }),

    // Criar fornecedor
    create: protectedProcedure
        .input(
            z.object({
                nome: z.string().min(1, 'Nome é obrigatório'),
                cnpj_cpf: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                telefone: z.string().optional(),
                observacoes: z.string().optional(),
                // Campos de endereço
                logradouro: z.string().optional(),
                numero: z.string().optional(),
                complemento: z.string().optional(),
                bairro: z.string().optional(),
                cidade: z.string().optional(),
                uf: z.string().optional(),
                cep: z.string().optional(),
                // Campos adicionais
                inscricao_estadual: z.string().optional(),
                situacao_cadastral: z.string().optional(),
                empresa_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
                tipo_despesa_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .insert({
                    ...input,
                    email: input.email || null,
                    user_id: ctx.user.id,
                })
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Atualizar fornecedor
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                nome: z.string().min(1, 'Nome é obrigatório'),
                cnpj_cpf: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                telefone: z.string().optional(),
                observacoes: z.string().optional(),
                // Campos de endereço
                logradouro: z.string().optional(),
                numero: z.string().optional(),
                complemento: z.string().optional(),
                bairro: z.string().optional(),
                cidade: z.string().optional(),
                uf: z.string().optional(),
                cep: z.string().optional(),
                // Campos adicionais
                inscricao_estadual: z.string().optional(),
                situacao_cadastral: z.string().optional(),
                empresa_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
                tipo_despesa_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const { data, error } = await ctx.supabase
                .from('fornecedores')
                .update({
                    ...updateData,
                    email: updateData.email || null,
                })
                .eq('id', id)
                .eq('user_id', ctx.user.id)
                .select()
                .single()

            if (error) throw error
            return data
        }),

    // Excluir fornecedor
    delete: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ ctx, input }) => {
            const { error } = await ctx.supabase
                .from('fornecedores')
                .delete()
                .eq('id', input)
                .eq('user_id', ctx.user.id)

            if (error) throw error
            return { success: true }
        }),

    // Estatísticas de contas por fornecedor
    stats: protectedProcedure
        .input(z.string().uuid().optional())
        .query(async ({ ctx, input }) => {
            let query = ctx.supabase
                .from('parcelas')
                .select(`
                    id,
                    valor_final,
                    status,
                    data_vencimento,
                    data_pagamento,
                    contas!inner(
                        fornecedor_id,
                        user_id
                    )
                `)
                .eq('contas.user_id', ctx.user.id)

            if (input) {
                query = query.eq('contas.fornecedor_id', input)
            }

            const { data: parcelas, error } = await query

            if (error) throw error



            // Agrupar por fornecedor com breakdown por status
            const statsByFornecedor = (parcelas || []).reduce((acc, parcela) => {
                const item = parcela as unknown as { contas: { fornecedor_id: string | null }[] | { fornecedor_id: string | null } | null };
                const conta = Array.isArray(item.contas) ? item.contas[0] : item.contas;
                const fornecedorId = conta?.fornecedor_id || 'sem_fornecedor'

                if (!acc[fornecedorId]) {
                    acc[fornecedorId] = {
                        totalContas: 0,
                        valorTotal: 0,
                        aVencer: { quantidade: 0, valor: 0 },
                        vencidas: { quantidade: 0, valor: 0 },
                        quitadas: { quantidade: 0, valor: 0 },
                        ultimaCompra: null as string | null,
                    }
                }

                // Ignorar parcelas canceladas
                if (parcela.status === 'cancelado') return acc

                acc[fornecedorId].totalContas += 1
                acc[fornecedorId].valorTotal += parcela.valor_final || 0

                const valor = parcela.valor_final || 0
                const hoje = new Date()
                hoje.setHours(0, 0, 0, 0)
                const dataVencimento = new Date(parcela.data_vencimento)
                dataVencimento.setHours(0, 0, 0, 0)

                if (parcela.status === 'pago') {
                    acc[fornecedorId].quitadas.quantidade += 1
                    acc[fornecedorId].quitadas.valor += valor

                    // Atualizar última compra (data do pagamento ou vencimento)
                    const dataPagamento = parcela.data_pagamento || parcela.data_vencimento
                    if (!acc[fornecedorId].ultimaCompra || dataPagamento > acc[fornecedorId].ultimaCompra) {
                        acc[fornecedorId].ultimaCompra = dataPagamento
                    }
                } else if (parcela.status === 'atrasado' || (parcela.status === 'pendente' && dataVencimento < hoje)) {
                    // Vencida: explicitamente atrasada ou pendente com data passada
                    acc[fornecedorId].vencidas.quantidade += 1
                    acc[fornecedorId].vencidas.valor += valor
                } else if (parcela.status === 'pendente') {
                    // A Vencer: pendente e data futura/hoje
                    acc[fornecedorId].aVencer.quantidade += 1
                    acc[fornecedorId].aVencer.valor += valor
                }

                return acc
            }, {} as Record<string, {
                totalContas: number
                valorTotal: number
                aVencer: { quantidade: number; valor: number }
                vencidas: { quantidade: number; valor: number }
                quitadas: { quantidade: number; valor: number }
                ultimaCompra: string | null
            }>)

            return statsByFornecedor
        }),

    // Dados analíticos do fornecedor
    analytics: protectedProcedure
        .input(z.object({
            fornecedorId: z.string().uuid(),
            range: z.number().default(12) // Meses atrás
        }))
        .query(async ({ ctx, input }) => {
            const startDate = new Date()
            startDate.setDate(1) // Evitar overflow de mês (ex: 31 Jan -> Set Fev)
            startDate.setMonth(startDate.getMonth() - input.range)
            startDate.setHours(0, 0, 0, 0)

            try {
                const { data: contas, error } = await ctx.supabase
                    .from('contas')
                    .select('id,data_emissao,created_at,tipos_despesa(id,nome,cor),parcelas(id,valor_final,data_pagamento,data_vencimento,status)')
                    .eq('fornecedor_id', input.fornecedorId)
                    .eq('user_id', ctx.user.id)
                    .order('created_at', { ascending: false })
                    .limit(500) // Limite de segurança

                if (error) {
                    console.error('Supabase Error in analytics:', error)
                    throw error
                }

                // Processar dados
                const monthlyData: Record<string, { month: string, amount: number, count: number }> = {}
                const categoryData: Record<string, { name: string, color: string, value: number }> = {}

                // Status Stats
                let totalPaid = 0
                let totalPending = 0
                let totalOverdue = 0

                let totalAmount = 0
                let maxBillAmount = 0
                const uniqueCategories = new Set<string>()

                // Inicializar meses vazios
                for (let i = 0; i < input.range; i++) {
                    const d = new Date()
                    d.setDate(1) // Segurança
                    d.setMonth(d.getMonth() - i)
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    monthlyData[key] = { month: key, amount: 0, count: 0 }
                }

                let validContasCount = 0

                contas?.forEach(conta => {
                    // Determine best date: emissao -> created_at -> today
                    const dateStr = conta.data_emissao || conta.created_at
                    const date = new Date(dateStr)

                    // Skip invalid dates
                    if (isNaN(date.getTime())) return

                    // Check if within range
                    if (date < startDate) return

                    validContasCount++

                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                    const parcelas = (conta.parcelas as any[]) || []

                    // Somar valor total da conta e processar status
                    let contaValor = 0
                    parcelas.forEach(p => {
                        const val = p.valor_final || 0
                        contaValor += val

                        // Status aggregation
                        if (p.status === 'pago') totalPaid += val
                        else if (p.status === 'atrasado') totalOverdue += val
                        else totalPending += val // pendente (or others treated as pending financial liability)
                    })

                    // Monthly
                    // Se a chave não existe (futuro ou fora do range inicial), criar se for >= startDate
                    if (!monthlyData[key] && date >= startDate) {
                        monthlyData[key] = { month: key, amount: 0, count: 0 }
                    }

                    if (monthlyData[key]) {
                        monthlyData[key].amount += contaValor
                        monthlyData[key].count += 1
                    }

                    // Category
                    // Handle potential array response for joins
                    const tipoDespesaRaw = conta.tipos_despesa as any
                    const tipoDespesa = Array.isArray(tipoDespesaRaw) ? tipoDespesaRaw[0] : tipoDespesaRaw

                    const catName = tipoDespesa?.nome || 'Sem Categoria'
                    const catColor = tipoDespesa?.cor || '#94a3b8' // slate-400

                    if (!categoryData[catName]) {
                        categoryData[catName] = { name: catName, color: catColor, value: 0 }
                    }
                    categoryData[catName].value += contaValor
                    uniqueCategories.add(catName)

                    // Totals
                    totalAmount += contaValor
                    if (contaValor > maxBillAmount) maxBillAmount = contaValor
                })

                // Converter para arrays
                const monthlyHistory = Object.values(monthlyData)
                    .sort((a, b) => a.month.localeCompare(b.month)) // Ordenar cronologicamente

                const categoryDistribution = Object.values(categoryData)
                    .sort((a, b) => b.value - a.value) // Maior gasto primeiro

                const averageTicket = validContasCount ? totalAmount / validContasCount : 0

                return {
                    monthlyHistory,
                    categoryDistribution,
                    kpis: {
                        totalAmount,
                        averageTicket,
                        maxBillAmount,
                        totalContas: validContasCount,
                        uniqueCategories: uniqueCategories.size,
                        statusBreakdown: {
                            paid: totalPaid,
                            pending: totalPending,
                            overdue: totalOverdue
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching supplier analytics:', err)
                throw new Error('Falha ao buscar análises do fornecedor') // Better error for client
            }
        }),
})
