export const getAuthErrorMessage = (error: string): string => {
    // Mapeamento de erros comuns do Supabase/GoTrue
    const errorMessages: Record<string, string> = {
        'Invalid login credentials': 'Email ou senha incorretos',
        'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
        'User already registered': 'Este email já está cadastrado',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
        'To signup, please provide your email': 'Para cadastrar, por favor forneça seu email',
        'Signup requires a valid password': 'Cadastro requer uma senha válida',
        'User not found': 'Usuário não encontrado',
        'Invalid email or password': 'Email ou senha inválidos',
        'Email link is invalid or has expired': 'Link de verificação inválido ou expirado',
        'Token has expired or is invalid': 'Token expirado ou inválido',
        'Auth session missing!': 'Sessão de autenticação não encontrada',
        'Rate limit exceeded': 'Muitas tentativas. Tente novamente em alguns segundos.',
    }

    // Tentar encontrar uma mensagem exata
    if (errorMessages[error]) return errorMessages[error]

    // Tentar matching parcial para casos mais genéricos
    if (error.includes('already registered')) return 'Este email já está cadastrado'
    if (error.includes('Invalid login')) return 'Email ou senha incorretos'
    if (error.includes('not confirmed')) return 'Email não confirmado'
    if (error.includes('weak_password')) return 'A senha é muito fraca. Tente uma senha mais complexa.'

    // Retornar erro original se não houver tradução (fallback)
    return error
}
