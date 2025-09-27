"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Shield, Trash2, Menu, Terminal, FileText, GripVertical, Download, Globe, Edit } from "lucide-react"

interface Methodology {
  id: number
  name: string
  description?: string
  commands: string[]
  target?: string
  targetIP?: string
}

const apiBase = "http://127.0.0.1:5000"

async function fetchJSON(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`${res.status} ${res.statusText} - ${t}`)
    }
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

export default function PentestMethodologies() {
  const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [selectedMethodology, setSelectedMethodology] = useState<Methodology | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // add new
  const [newMethodologyName, setNewMethodologyName] = useState("")
  const [newMethodologyDescription, setNewMethodologyDescription] = useState("")
  const [newMethodologyCommands, setNewMethodologyCommands] = useState("")

  // command manipulation
  const [newCommand, setNewCommand] = useState("")
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null)
  const [editingCommandText, setEditingCommandText] = useState("")

  // terminal output
  const [terminalOutput, setTerminalOutput] = useState<
    { command: string; output: string; status: "success" | "failed" | "running" }[]
  >([])

  const [isRunningAll, setIsRunningAll] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    loadMethodologies()
  }, [])

  async function loadMethodologies() {
    try {
      const data = await fetchJSON(`${apiBase}/methodologies`)
      setMethodologies(data || [])
    } catch (e) {
      console.error("Failed to load methodologies", e)
    }
  }

  // create new methodology (persist)
  async function addMethodology() {
    if (!newMethodologyName.trim()) return
    const commandsArray = newMethodologyCommands
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean)
    // create with a temporary id if backend returns nothing
    const payload = {
      id: Date.now(),
      name: newMethodologyName.trim(),
      description: newMethodologyDescription.trim(),
      commands: commandsArray,
    }
    try {
      const res = await fetchJSON(`${apiBase}/methodologies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const created = res.methodology || payload
      setMethodologies((prev) => [...prev, created])
      setNewMethodologyName("")
      setNewMethodologyDescription("")
      setNewMethodologyCommands("")
    } catch (e) {
      console.error("Add methodology failed", e)
    }
  }

  async function deleteMethodology(id: number) {
    try {
      await fetchJSON(`${apiBase}/methodologies/${id}`, { method: "DELETE" })
      setMethodologies((prev) => prev.filter((m) => m.id !== id))
      if (selectedMethodology?.id === id) setSelectedMethodology(null)
    } catch (e) {
      console.error("Delete failed", e)
    }
  }

  async function updateMethodologyOnServer(m: Methodology) {
    try {
      await fetchJSON(`${apiBase}/methodologies/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      })
    } catch (e) {
      console.error("Update methodology on server failed", e)
    }
  }

  // run a command one-shot (non-streaming)
  async function runCommand(command: string) {
    if (!command) return
    setTerminalOutput((p) => [...p, { command, output: "Running...", status: "running" }])

    try {
      const res = await fetchJSON(`${apiBase}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, timeout_sec: 120 }),
      })
      const stdout = res.stdout ?? res.stdout ?? ""
      const rc = res.returncode ?? 0
      setTerminalOutput((prev) => {
        const newArr = [...prev]
        // replace last running for this command
        const idx = newArr.findIndex((x) => x.command === command && x.status === "running")
        const outItem = { command, output: stdout || "[no output]", status: rc === 0 ? "success" : "failed" }
        if (idx >= 0) newArr[idx] = outItem
        else newArr.push(outItem)
        return newArr
      })
      return { returncode: rc, stdout }
    } catch (e: any) {
      setTerminalOutput((prev) => {
        const newArr = [...prev]
        const idx = newArr.findIndex((x) => x.command === command && x.status === "running")
        const outItem = { command, output: `[ERROR] ${e?.message || String(e)}`, status: "failed" as const }
        if (idx >= 0) newArr[idx] = outItem
        else newArr.push(outItem)
        return newArr
      })
      return { returncode: -1, stdout: "" }
    }
  }

  // run all commands sequentially (await each)
  async function runAllCommands() {
    if (!selectedMethodology) return
    if (selectedMethodology.commands.length === 0) return
    setIsRunningAll(true)
    setTerminalOutput([])

    for (let i = 0; i < selectedMethodology.commands.length; i++) {
      const cmd = selectedMethodology.commands[i]
      // mark running
      setTerminalOutput((p) => [...p, { command: cmd, output: "Running...", status: "running" }])
      // run and wait
      await runCommand(cmd)
      // small pause so UI updates
      await new Promise((r) => setTimeout(r, 200))
    }

    setIsRunningAll(false)
  }

  // optionally: use streaming via /exec-stream to get live incremental output
  // Example helper (not used by default). Keeps SSE connection and appends lines.
  function runCommandWithStream(command: string) {
    const evtSource = new EventSource(`${apiBase}/exec-stream`) // note: not passing JSON body; would require a GET variant or custom wrapper
    // If you want to use SSE with POST you need a small proxy or use fetch + ReadableStream
    // For simplicity we'll use the one-shot /exec in this version.
    evtSource.onmessage = (e) => {
      setTerminalOutput((prev) => {
        const idx = prev.findIndex((x) => x.command === command)
        if (idx >= 0) {
          const copy = [...prev]
          const next = { ...copy[idx], output: (copy[idx].output || "") + "\n" + e.data }
          copy[idx] = next
          return copy
        }
        return [...prev, { command, output: e.data, status: "running" }]
      })
    }
    evtSource.onerror = () => evtSource.close()
  }

  // add a command to the selected methodology and persist
  async function addCommandToMethodology() {
    if (!selectedMethodology || !newCommand.trim()) return
    const updated: Methodology = { ...selectedMethodology, commands: [...selectedMethodology.commands, newCommand.trim()] }
    // update local state
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setNewCommand("")
    // persist
    await updateMethodologyOnServer(updated)
  }

  // delete a command locally + persist
  async function deleteCommand(methodologyId: number, commandIndex: number) {
    const m = methodologies.find((x) => x.id === methodologyId)
    if (!m) return
    const updated = { ...m, commands: m.commands.filter((_, i) => i !== commandIndex) }
    setMethodologies((prev) => prev.map((mm) => (mm.id === m.id ? updated : mm)))
    if (selectedMethodology?.id === m.id) setSelectedMethodology(updated)
    await updateMethodologyOnServer(updated)
  }

  // edit command
  function startEditCommand(index: number, command: string) {
    setEditingCommandIndex(index)
    setEditingCommandText(command)
  }

  async function saveEditCommand() {
    if (!selectedMethodology || editingCommandIndex === null) return
    const updatedCommands = [...selectedMethodology.commands]
    updatedCommands[editingCommandIndex] = editingCommandText.trim()
    const updated: Methodology = { ...selectedMethodology, commands: updatedCommands }
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setEditingCommandIndex(null)
    setEditingCommandText("")
    await updateMethodologyOnServer(updated)
  }

  function cancelEditCommand() {
    setEditingCommandIndex(null)
    setEditingCommandText("")
  }

  // drag and drop reordering
  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
  }
  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    if (draggedIndex === null || !selectedMethodology) return
    if (draggedIndex === dropIndex) return
    const cmds = [...selectedMethodology.commands]
    const [moved] = cmds.splice(draggedIndex, 1)
    cmds.splice(dropIndex, 0, moved)
    const updated: Methodology = { ...selectedMethodology, commands: cmds }
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setDraggedIndex(null)
    await updateMethodologyOnServer(updated)
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function exportToJSON() {
    const exportData = {
      methodologies,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }
    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pentest-methodologies.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function resolveIP() {
    if (!selectedMethodology || !selectedMethodology.target) return
    // naive local mock: resolve using fetch to a public DNS service would be possible; for now generate mock
    const mock = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    const updated = { ...selectedMethodology, targetIP: mock }
    setSelectedMethodology(updated)
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    await updateMethodologyOnServer(updated)
  }

  function clearTerminalOutput() {
    setTerminalOutput([])
  }

  // update methodology metadata on save
  async function saveMethodologyChanges(m: Methodology) {
    setMethodologies((prev) => prev.map((x) => (x.id === m.id ? m : x)))
    await updateMethodologyOnServer(m)
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`fixed lg:static lg:h-screen inset-y-0 left-0 z-50 w-96 bg-white border-r transform transition-transform duration-200 ease-in-out overflow-hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-gray-800" />
              <h2 className="text-xl font-bold text-gray-800">Methodologies</h2>
            </div>
            <p className="text-sm text-gray-600">Manage your pentest workflows</p>
          </div>
           <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
              <CardHeader className="pb-3"><CardTitle className="text-sm text-gray-800">Methodologies ({methodologies.length})</CardTitle></CardHeader>
              <CardContent>
                {methodologies.length === 0 ? (
                  <div className="text-center py-6 text-gray-500"><Shield className="h-8 w-8 mx-auto mb-3 opacity-50" /><p className="text-sm">No methodologies yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {methodologies.map((methodology) => (
                      <div key={methodology.id} className={`border rounded-lg p-3 transition-colors cursor-pointer ${selectedMethodology?.id === methodology.id ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200 hover:bg-gray-50"}`} onClick={() => setSelectedMethodology(methodology)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Shield className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            <h3 className="text-sm font-semibold truncate text-gray-800">{methodology.name}</h3>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMethodology(methodology.id) }} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

        

          <div className="p-4 border-t border-gray-200"><div className="text-xs text-gray-500 text-center">Total: {methodologies.length} methodologies</div></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
          <h1 className="font-semibold">Pentest Dashboard</h1>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {selectedMethodology ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <Button variant="outline" size="sm" onClick={() => setSelectedMethodology(null)} className="flex items-center gap-2"><Shield className="h-4 w-4" />Back to Dashboard</Button>
                  <div className="flex gap-2">
                    <Button onClick={exportToJSON} size="sm" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"><Download className="h-4 w-4" />Export JSON</Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">{selectedMethodology.name}</h1>
                    <div className="text-sm text-muted-foreground mt-1">{selectedMethodology.description}</div>
                  </div>
                </div>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Target</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      <Input placeholder="Enter target (e.g., google.com)" value={selectedMethodology.target || ""} onChange={(e) => { const updated = { ...selectedMethodology, target: e.target.value }; setSelectedMethodology(updated); setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m))) }} className="flex-1" />
                      <Button onClick={resolveIP} disabled={!selectedMethodology.target} size="sm" className="bg-cyan-600 hover:bg-cyan-700">Resolve IP</Button>
                    </div>
                    {selectedMethodology.targetIP && <p className="text-sm text-muted-foreground">Resolved IP: <code className="bg-muted px-2 py-1 rounded">{selectedMethodology.targetIP}</code></p>}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => saveMethodologyChanges(selectedMethodology)} className="bg-green-600 hover:bg-green-700">Save</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Description</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{selectedMethodology.description || "No description provided."}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader><CardTitle className="flex items-center gap-2">
  <Terminal className="h-5 w-5" />
  Commands ({selectedMethodology?.commands?.length ?? 0})
</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-b pb-4">
                      <div className="flex gap-2 mb-3">
                        <Input placeholder="Enter new command, use {{TARGET}} {{TARGET_IP}} {{USERNAME}} {{PASSWORD}}" value={newCommand} onChange={(e) => setNewCommand(e.target.value)} className="font-mono text-sm flex-1" />
                        <Button onClick={addCommandToMethodology} disabled={!newCommand.trim()} size="sm" className="bg-cyan-600 hover:bg-cyan-700">Add Command</Button>
                      </div>

                      {selectedMethodology?.commands?.length > 0 && (
                        <Button onClick={runAllCommands} disabled={isRunningAll} className="bg-cyan-600 hover:bg-cyan-700 mb-3">{isRunningAll ? "Running..." : "Run All Commands Step-by-Step"}</Button>
                      )}
                      <p className="text-xs text-muted-foreground">Press Ctrl+Enter to add quickly</p>
                    </div>

                    {selectedMethodology?.commands?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMethodology.commands.map((command, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)}>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            {editingCommandIndex === index ? (
                              <div className="flex-1 flex gap-2">
                                <Input value={editingCommandText} onChange={(e) => setEditingCommandText(e.target.value)} className="font-mono text-sm" onKeyDown={(e) => { if (e.key === "Enter") saveEditCommand(); if (e.key === "Escape") cancelEditCommand() }} />
                                <Button size="sm" onClick={saveEditCommand} className="bg-green-600 hover:bg-green-700">Save</Button>
                                <Button size="sm" variant="outline" onClick={cancelEditCommand}>Cancel</Button>
                              </div>
                            ) : (
                              <>
                                <code className="flex-1 text-sm font-mono">{command}</code>
                                <Button size="sm" onClick={() => runCommand(command)} className="flex-shrink-0 bg-black hover:bg-green-600 text-white">Run</Button>
                                <Button size="sm" onClick={() => startEditCommand(index, command)} className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white"><Edit className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteCommand(selectedMethodology.id, index)} className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white"><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No commands added yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Terminal Results</CardTitle>
                      {terminalOutput.length > 0 && <Button size="sm" variant="outline" onClick={clearTerminalOutput}>Clear</Button>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto border border-cyan-500/30">
                      {terminalOutput.length > 0 ? (
                        terminalOutput.map((result, idx) => (
                          <div key={idx} className="mb-3 border-b border-gray-700 pb-2 last:border-b-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${result.status === "success" ? "bg-green-400" : result.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                              <span className="text-cyan-400">{result.command}</span>
                              <span className="ml-auto text-xs text-gray-400 animate-pulse">{result.status === "success" ? "Success" : result.status === "failed" ? "Failed" : "Running"}</span>
                            </div>
                            <div className="text-gray-300 ml-4 text-xs whitespace-pre-wrap">{result.output}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-center py-8">
                          <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No commands executed yet</p>
                          <p className="text-xs mt-1">Command results will appear here</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold mb-2">Pentest Methodology Builder</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">A collaborative platform for designing and executing penetration testing workflows.</p>
                
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-gray-800"><Plus className="h-4 w-4" />Add New Methodology</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Methodology name..." value={newMethodologyName} onChange={(e) => setNewMethodologyName(e.target.value)} className="text-sm bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500" />
                <Textarea placeholder="Description..." value={newMethodologyDescription} onChange={(e) => setNewMethodologyDescription(e.target.value)} className="text-sm min-h-[60px] resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500" />
                <Textarea placeholder="Commands (one per line)" value={newMethodologyCommands} onChange={(e) => setNewMethodologyCommands(e.target.value)} className="text-sm min-h-[80px] font-mono resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500" />
                <Button onClick={addMethodology} disabled={!newMethodologyName.trim()} size="sm" className="w-full bg-gray-600 hover:bg-gray-700 text-white"><Plus className="h-3 w-3 mr-2" />Add Methodology</Button>
                <p className="text-xs text-gray-500">Press Ctrl+Enter to add quickly</p>
              </CardContent>
            </Card>

            <div className="mt-8"><p className="text-muted-foreground">Select a methodology from the sidebar to view its details and commands.</p></div>

            <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
              <CardHeader className="pb-3"><CardTitle className="text-sm text-gray-800">Methodologies ({methodologies.length})</CardTitle></CardHeader>
              <CardContent>
                {methodologies.length === 0 ? (
                  <div className="text-center py-6 text-gray-500"><Shield className="h-8 w-8 mx-auto mb-3 opacity-50" /><p className="text-sm">No methodologies yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {methodologies.map((methodology) => (
                      <div key={methodology.id} className={`border rounded-lg p-3 transition-colors cursor-pointer ${selectedMethodology?.id === methodology.id ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200 hover:bg-gray-50"}`} onClick={() => setSelectedMethodology(methodology)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Shield className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            <h3 className="text-sm font-semibold truncate text-gray-800">{methodology.name}</h3>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMethodology(methodology.id) }} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
