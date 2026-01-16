# Correção de Estatísticas de Fornecedores

## Problema
Os contadores de "Vencidas", "A Vencer" e "Quitadas" na página de Fornecedores estavam zerados, incorretamente.

## Causa
A procedure `stats` no backend (`lib/trpc/routers/fornecedores.ts`) estava tentando classificar parcelas usando os status `ativa` e `quitada`.
No entanto, a tabela `parcelas` no banco de dados utiliza os status `pendente` e `pago`. Os status `ativa`/`quitada` pertencem à tabela pai `contas`.

Consequentemente, nenhuma parcela atendia às condições dos `if`s, resultando em contagens zeradas.

## Solução Aplicada
A lógica de classificação foi corrigida para:
1.  **Quitadas**: `parcela.status === 'pago'`
2.  **Vencidas**: 
    *   `parcela.status === 'atrasado'` OU
    *   `parcela.status === 'pendente'` E `data_vencimento < hoje`
3.  **A Vencer**: `parcela.status === 'pendente'` (e data futura/hoje)
4.  **Canceladas**: Parcelas com status `cancelado` são ignoradas.

## Resultado
Agora o sistema deve refletir corretamente os valores e quantidades de parcelas por fornecedor, corrigindo os badges e totais na página.

## Observação
Um log de debug (`DIAGNÓSTICO DE IDS`) pode ter permanecido ativo no console do navegador, mas não afeta o funcionamento e ajudará caso algum outro problema de ID apareça.
