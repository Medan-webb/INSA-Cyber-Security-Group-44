"use client"


import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GripVertical, Edit, Trash2 } from "lucide-react"
import { Methodology } from "@/types/methodology"


interface Props {
methodology: Methodology
newCommand: string
setNewCommand: (v: string) => void
addCommandToMethodology: () => Promise<void>
runAllCommands: () => Promise<void>
runCommand: (cmd: string) => Promise<any>
editingCommandIndex: number | null
editingCommandText: string
setEditingCommandText: (s: string) => void
saveEditCommand: () => Promise<void>
cancelEditCommand: () => void
startEditCommand: (index: number, command: string) => void
deleteCommand: (methodologyId: number, index: number) => Promise<void>
handleDragStart: (e: React.DragEvent, index: number) => void
handleDrop: (e: React.DragEvent, index: number) => Promise<void>
handleDragOver: (e: React.DragEvent) => void
isRunningAll: boolean
}


export default function CommandsPanel(props: Props) {
const {
methodology,
newCommand,
setNewCommand,
addCommandToMethodology,
runAllCommands,
runCommand,
editingCommandIndex,
editingCommandText,
setEditingCommandText,
saveEditCommand,
cancelEditCommand,
startEditCommand,
deleteCommand,
handleDragStart,
handleDrop,
handleDragOver,
isRunningAll,
} = props


return (
<div>
<div className="border-b pb-4">
<div className="flex gap-2 mb-3">
<Input placeholder="Enter new command, use {{TARGET}} {{TARGET_IP}} {{USERNAME}} {{PASSWORD}}" value={newCommand} onChange={(e) => setNewCommand(e.target.value)} className="font-mono text-sm flex-1" />
<Button onClick={addCommandToMethodology} disabled={!newCommand.trim()} size="sm" className="bg-cyan-600 hover:bg-cyan-700">Add Command</Button>
</div>
</div>
</div>
}