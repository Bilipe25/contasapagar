'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { CategoriasTab } from '@/components/configuracoes/tabs/categorias-tab'
import { EmpresasTab } from '@/components/configuracoes/tabs/empresas-tab'
import { BancosTab } from '@/components/configuracoes/tabs/bancos-tab'
import { PlanoContasTab } from '@/components/configuracoes/tabs/plano-contas-tab'

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-muted-foreground">
                    Gerencie as configurações gerais do sistema.
                </p>
            </div>

            <Tabs defaultValue="categorias" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="categorias">Categorias</TabsTrigger>
                    <TabsTrigger value="empresas">Empresas</TabsTrigger>
                    <TabsTrigger value="bancos">Bancos</TabsTrigger>
                    <TabsTrigger value="plano-contas">Plano de Contas</TabsTrigger>
                </TabsList>
                <TabsContent value="categorias" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <CategoriasTab />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="empresas" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <EmpresasTab />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bancos" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <BancosTab />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="plano-contas" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <PlanoContasTab />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
