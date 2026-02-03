// Função para consultar CNPJ via BrasilAPI
// https://brasilapi.com.br/docs#tag/CNPJ

export interface CNPJResponse {
    razao_social: string
    nome_fantasia: string | null
    cnpj: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    municipio: string
    uf: string
    cep: string
    telefone1: string | null
    telefone2: string | null
    email: string | null
    situacao_cadastral: string | null
    inscricao_estadual: string | null
}

export interface CNPJError {
    message: string
    type: string
    name: string
}

// Remove formatação do CNPJ (pontos, barras, hífens)
export function limparCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
}

// Formata CNPJ para exibição: 00.000.000/0000-00
export function formatarCNPJ(cnpj: string): string {
    const limpo = limparCNPJ(cnpj)
    if (limpo.length !== 14) return cnpj
    return limpo.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    )
}

// Formata CEP para exibição: 00000-000
export function formatarCEP(cep: string): string {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return cep
    return limpo.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

// Formata telefone para exibição: (00) 00000-0000 ou (00) 0000-0000
export function formatarTelefone(telefone: string): string {
    const limpo = telefone.replace(/\D/g, '')
    if (limpo.length === 11) {
        return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    } else if (limpo.length === 10) {
        return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return telefone
}

export async function consultarCNPJ(cnpj: string): Promise<CNPJResponse> {
    const cnpjLimpo = limparCNPJ(cnpj)

    if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos')
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('CNPJ não encontrado')
        }
        if (response.status === 400) {
            throw new Error('CNPJ inválido')
        }
        throw new Error('Erro ao consultar CNPJ')
    }

    const data = await response.json()

    return {
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || null,
        cnpj: formatarCNPJ(data.cnpj),
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: formatarCEP(data.cep || ''),
        telefone1: data.ddd_telefone_1 ? formatarTelefone(data.ddd_telefone_1) : null,
        telefone2: data.ddd_telefone_2 ? formatarTelefone(data.ddd_telefone_2) : null,
        email: data.email || null,
        situacao_cadastral: data.descricao_situacao_cadastral || null,
        inscricao_estadual: data.inscricao_estadual || null,
    }
}
