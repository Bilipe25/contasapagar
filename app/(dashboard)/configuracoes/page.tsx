'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Landmark, Tags } from 'lucide-react'
import { CategoriasTab } from '@/components/configuracoes/tabs/categorias-tab'
import { EmpresasTab } from '@/components/configuracoes/tabs/empresas-tab'
import { BancosTab } from '@/components/configuracoes/tabs/bancos-tab'

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground">
                    Gerencie categorias, empresas e preferências do sistema
                </p>
            </div>

            <Tabs defaultValue="categorias" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="categorias" className="flex items-center gap-2">
                        <Tags className="h-4 w-4" />
                        Categorias
                    </TabsTrigger>
                    <TabsTrigger value="empresas" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Empresas
                    </TabsTrigger>
                    <TabsTrigger value="bancos" className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        Bancos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categorias">
                    <Card>
                        <CardHeader>
                            <CardTitle>Categorias de Despesa</CardTitle>
                            <CardDescription>
                                Organize suas contas por tipo de gasto
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CategoriasTab />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="empresas">
                    <Card>
                        <CardHeader>
                            <CardTitle>Empresas</CardTitle>
                            <CardDescription>
                                Cadastre empresas para associar às suas contas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmpresasTab />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bancos">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bancos</CardTitle>
                            <CardDescription>
                                Cadastre bancos para suas contas e empresas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BancosTab />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

