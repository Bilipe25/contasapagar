
interface SupplierAccountsListProps {
  fornecedorId: string
}

// 1. Fetch accounts filtered by fornecedorId
// 2. Display simplified list/table:
//    - Descrição
//    - Valor total/pendente
//    - Próximo vencimento/status
//    - Badge de status
// 3. Link to detailed view or open current account drawer? (Maybe verify if this can open existing account drawer)
