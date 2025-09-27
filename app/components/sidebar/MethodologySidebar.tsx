"use client"


import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Trash2 } from "lucide-react"
import { Methodology } from "@types/methodology"


interface Props {
methodologies: Methodology[]
selectedId: number | null
onSelect: (m: Methodology) => void
onDelete: (id: number) => void
onOpenSidebar?: () => void
}


export default function MethodologySidebar({ methodologies, selectedId, onSelect, onDelete }: Props) {
return (
<div className={`fixed lg:static lg:h-screen inset-y-0 left-0 z-50 w-96 bg-white border-r transform transition-transform duration-200 ease-in-out overflow-hidden`}>
<div className="flex flex-col h-full">
<div className="p-6 border-b border-gray-200">
<div className="flex items-center gap-2 mb-2">
<Shield className="h-6 w-6 text-gray-800" />
<h2 className="text-xl font-bold text-gray-800">Methodologies</h2>
</div>
<p className="text-sm text-gray-600">Manage your pentest workflows</p>
</div>


<div className="p-4">
<Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
<CardHeader className="pb-3">
<CardTitle className="text-sm text-gray-800">Methodologies ({methodologies.length})</CardTitle>
</CardHeader>
<CardContent>
{methodologies.length === 0 ? (
<div className="text-center py-6 text-gray-500"><Shield className="h-8 w-8 mx-auto mb-3 opacity-50" /><p className="text-sm">No methodologies yet</p></div>
}