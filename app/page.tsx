"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Shield, Trash2, Menu, Terminal, FileText, GripVertical, Download, Globe, Edit, FolderOpen, ChevronDown, Upload, X, Save, ArrowUp, ArrowDown } from "lucide-react"

import { ManualStepModal } from "./components/ManualStepModal"
import { ProjectSelector } from "./components/ProjectSelector"
import Link from "next/link"
import ReportsPage from "./reports/page"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MethodologyStep {
  id: string
  type: "command" | "manual"
  content: string
  requiresUpload: boolean
  completed: boolean
  evidence?: string[]
}

interface Methodology {
  id: number
  name: string
  description?: string
  commands: string[]
  steps: MethodologyStep[]
  target?: string
  targetIP?: string
}

interface Project {
  id: number
  name: string
  target: string
  targetIP?: string
  createdAt: string
  status: "active" | "completed"
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
  const shouldStopRef = useRef(false);

  const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [selectedMethodology, setSelectedMethodology] = useState<Methodology | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  // Add new methodology
  const [newMethodologyName, setNewMethodologyName] = useState("")
  const [newMethodologyDescription, setNewMethodologyDescription] = useState("")
  const [newMethodologyCommands, setNewMethodologyCommands] = useState("")

  // Command manipulation
  const [newCommand, setNewCommand] = useState("")
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepContent, setEditingStepContent] = useState("")

  // Terminal output
  const [terminalOutput, setTerminalOutput] = useState<
    { command: string; output: string; status: "success" | "failed" | "running" }[]
  >([])

  const [isRunningAll, setIsRunningAll] = useState(false)
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)

  const [manualStepModal, setManualStepModal] = useState<{
    open: boolean;
    step: MethodologyStep | null;
  }>({ open: false, step: null })
  const [executionState, setExecutionState] = useState<{
    isRunning: boolean;
    currentStepIndex: number;
    shouldStop: boolean;
  }>({ isRunning: false, currentStepIndex: 0, shouldStop: false })

  // Manual step type
  const [newStepType, setNewStepType] = useState<"command" | "manual">("command")
  const [newStepContent, setNewStepContent] = useState("")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    loadMethodologies()
    loadProjects()
  }, [])

  async function loadMethodologies() {
    try {
      const data = await fetchJSON(`${apiBase}/methodologies`)
      setMethodologies(data || [])
    } catch (e) {
      console.error("Failed to load methodologies", e)
    }
  }

  async function loadProjects() {
    try {
      const data = await fetchJSON(`${apiBase}/projects`)
      setProjects(data || [])
    } catch (error) {
      console.error("Failed to load projects", error)
    }
  }

  // Create new methodology
  async function addMethodology() {
    if (!newMethodologyName.trim()) return

    const steps: MethodologyStep[] = newMethodologyCommands
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((command, index) => ({
        id: `step-${Date.now()}-${index}`,
        type: "command" as const,
        content: command,
        requiresUpload: false,
        completed: false
      }))

    const payload = {
      id: Date.now(),
      name: newMethodologyName.trim(),
      description: newMethodologyDescription.trim(),
      steps: steps,
      commands: steps.filter(s => s.type === "command").map(s => s.content)
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
    // Clear form fields
    setNewMethodologyName("");
    setNewMethodologyDescription("");
    setNewMethodologyCommands("");
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
  //  helper function for variable substitution
  function substituteVariables(command: string, project: Project | null): string {
    if (!project) return command;

    return command
      .replace(/\{\{target\}\}/g, project.target)
      .replace(/\{\{targetIP\}\}/g, project.targetIP || project.target)
      .replace(/\{\{project\}\}/g, project.name);
  }
  // Run command with project context// Run command with project context
  async function runCommand(command: string) {
    if (!command || !currentProject) {
      alert("Please select a project first")
      return
    }

    // Substitute variables
    const substitutedCommand = substituteVariables(command, currentProject);
    setTerminalOutput((p) => [...p, { command: substitutedCommand, output: "Running...", status: "running" }])

    try {
      const res = await fetchJSON(`${apiBase}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: substitutedCommand,
          timeout_sec: 120,
          project_id: currentProject.id,
          methodology_id: selectedMethodology?.id
        }),
      })

      const stdout = res.stdout ?? ""
      const rc = res.returncode ?? 0

      setTerminalOutput((prev) => {
        const newArr = [...prev]
        const idx = newArr.findIndex((x) => x.command === command && x.status === "running")
        const outItem = { command, output: stdout || "[no output]", status: rc === 0 ? "success" : "failed" }
        if (idx >= 0) newArr[idx] = outItem
        else newArr.push(outItem)
        return newArr
      })

      // Save successful execution to history
      const executionRecord = {
        command: substitutedCommand,
        output: stdout || "[no output]",
        status: rc === 0 ? "success" : "failed",
        timestamp: new Date().toISOString(),
        project_id: currentProject?.id,
        methodology_id: selectedMethodology?.id
      }

      const savedHistory = JSON.parse(localStorage.getItem('commandHistory') || '[]')
      savedHistory.push(executionRecord)
      localStorage.setItem('commandHistory', JSON.stringify(savedHistory))

      return { returncode: rc, stdout }
    } catch (e: any) {
      const errorMessage = `[ERROR] ${e?.message || String(e)}`

      setTerminalOutput((prev) => {
        const newArr = [...prev]
        const idx = newArr.findIndex((x) => x.command === command && x.status === "running")
        const outItem = { command, output: errorMessage, status: "failed" as const }
        if (idx >= 0) newArr[idx] = outItem
        else newArr.push(outItem)
        return newArr
      })

      // Save failed execution to history
      const executionRecord = {
        command: substitutedCommand,
        output: errorMessage,
        status: "failed",
        timestamp: new Date().toISOString(),
        project_id: currentProject?.id,
        methodology_id: selectedMethodology?.id
      }

      const savedHistory = JSON.parse(localStorage.getItem('commandHistory') || '[]')
      savedHistory.push(executionRecord)
      localStorage.setItem('commandHistory', JSON.stringify(savedHistory))

      return { returncode: -1, stdout: "" }
    }
  }

  // Edit step functionality
  function startEditStep(stepId: string, content: string) {
    setEditingStepId(stepId)
    setEditingStepContent(content)
  }

  async function saveEditStep() {
    if (!selectedMethodology || !editingStepId) return

    const updatedSteps = selectedMethodology.steps.map(step =>
      step.id === editingStepId
        ? { ...step, content: editingStepContent.trim() }
        : step
    )

    const updated: Methodology = {
      ...selectedMethodology,
      steps: updatedSteps,
      commands: updatedSteps
        .filter(step => step.type === "command")
        .map(step => step.content)
    }

    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setEditingStepId(null)
    setEditingStepContent("")
    await updateMethodologyOnServer(updated)
  }

  function cancelEditStep() {
    setEditingStepId(null)
    setEditingStepContent("")
  }

  // Drag and drop reordering for steps
  function handleDragStart(e: React.DragEvent, stepId: string) {
    setDraggedStepId(stepId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  async function handleDrop(e: React.DragEvent, dropStepId: string) {
    e.preventDefault()
    if (!draggedStepId || !selectedMethodology || draggedStepId === dropStepId) return

    const steps = [...selectedMethodology.steps]
    const draggedIndex = steps.findIndex(step => step.id === draggedStepId)
    const dropIndex = steps.findIndex(step => step.id === dropStepId)

    if (draggedIndex === -1 || dropIndex === -1) return

    const [movedStep] = steps.splice(draggedIndex, 1)
    steps.splice(dropIndex, 0, movedStep)

    const updated: Methodology = { ...selectedMethodology, steps }
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setDraggedStepId(null)
    await updateMethodologyOnServer(updated)
  }

  // Move step up/down
  async function moveStep(stepId: string, direction: 'up' | 'down') {
    if (!selectedMethodology) return

    const steps = [...selectedMethodology.steps]
    const currentIndex = steps.findIndex(step => step.id === stepId)

    if (direction === 'up' && currentIndex > 0) {
      [steps[currentIndex], steps[currentIndex - 1]] = [steps[currentIndex - 1], steps[currentIndex]]
    } else if (direction === 'down' && currentIndex < steps.length - 1) {
      [steps[currentIndex], steps[currentIndex + 1]] = [steps[currentIndex + 1], steps[currentIndex]]
    } else {
      return
    }

    const updated: Methodology = { ...selectedMethodology, steps }
    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    await updateMethodologyOnServer(updated)
  }




  async function runAllSteps() {
    if (!selectedMethodology || !currentProject) {
      alert("Please select both a project and a methodology")
      return
    }

    // Reset the stop flag
    shouldStopRef.current = false;
    setExecutionState({ isRunning: true, currentStepIndex: 0, shouldStop: false })
    setTerminalOutput([])

    for (let i = 0; i < selectedMethodology.steps.length; i++) {
      // Check the ref instead of state
      if (shouldStopRef.current) {
        setTerminalOutput(prev => [...prev, {
          command: "Execution stopped by user",
          output: "Process was manually stopped",
          status: "failed"
        }])
        break
      }

      setExecutionState(prev => ({ ...prev, currentStepIndex: i }))
      const step = selectedMethodology.steps[i]

      if (step.type === "manual") {
        setTerminalOutput(prev => [...prev, {
          command: `MANUAL STEP: ${step.content}`,
          output: "Waiting for manual completion...",
          status: "running"
        }])

        await new Promise<void>(resolve => {
          setManualStepModal({ open: true, step })
          const checkCompletion = setInterval(() => {
            const updatedStep = selectedMethodology.steps.find(s => s.id === step.id)
            if (updatedStep?.completed || shouldStopRef.current) {
              clearInterval(checkCompletion)
              resolve()
            }
          }, 500)
        })

        if (shouldStopRef.current) {
          setTerminalOutput(prev => [...prev, {
            command: `MANUAL STEP CANCELLED: ${step.content}`,
            output: "Execution was stopped",
            status: "failed"
          }])
          break
        }

        setTerminalOutput(prev => [...prev, {
          command: `MANUAL STEP COMPLETED: ${step.content}`,
          output: "Manual step evidence uploaded",
          status: "success"
        }])
      } else {
        setTerminalOutput(prev => [...prev, {
          command: step.content,
          output: "Running...",
          status: "running"
        }])

        await runCommand(step.content)
      }

      if (shouldStopRef.current) break;

      await new Promise(r => setTimeout(r, 500))
    }

    setExecutionState({ isRunning: false, currentStepIndex: 0, shouldStop: false })
    shouldStopRef.current = false;
  }

  function stopExecution() {
    shouldStopRef.current = true;
    setExecutionState(prev => ({ ...prev, shouldStop: true, isRunning: false }))
    setIsRunningAll(false)

    setTerminalOutput(prev => [...prev, {
      command: "STOP SIGNAL SENT",
      output: "Stopping execution after current step completes...",
      status: "failed"
    }])
  }

  // Manual step completion handler
  function handleManualStepComplete(stepId: string, evidencePath: string) {
    setMethodologies(prev => prev.map(methodology => {
      if (methodology.id === selectedMethodology?.id) {
        return {
          ...methodology,
          steps: methodology.steps.map(step =>
            step.id === stepId
              ? { ...step, completed: true, evidence: [...(step.evidence || []), evidencePath] }
              : step
          )
        }
      }
      return methodology
    }))

    setSelectedMethodology(prev => prev ? {
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? { ...step, completed: true, evidence: [...(step.evidence || []), evidencePath] }
          : step
      )
    } : null)

    setManualStepModal({ open: false, step: null })
  }

  // Add step to methodology
  async function addStepToMethodology() {
    if (!selectedMethodology || !newStepContent.trim()) return

    const newStep: MethodologyStep = {
      id: `step-${Date.now()}`,
      type: newStepType,
      content: newStepContent.trim(),
      requiresUpload: newStepType === "manual",
      completed: false
    }

    const updated: Methodology = {
      ...selectedMethodology,
      steps: [...selectedMethodology.steps, newStep]
    }

    if (newStepType === "command") {
      updated.commands = [...selectedMethodology.commands, newStepContent.trim()]
    }

    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    setNewStepContent("")
    setNewStepType("command")

    await updateMethodologyOnServer(updated)
  }

  // Delete step
  async function deleteStep(stepId: string) {
    if (!selectedMethodology) return

    const stepToDelete = selectedMethodology.steps.find(s => s.id === stepId)
    const updatedSteps = selectedMethodology.steps.filter(s => s.id !== stepId)

    const updated: Methodology = {
      ...selectedMethodology,
      steps: updatedSteps
    }

    if (stepToDelete?.type === "command") {
      updated.commands = selectedMethodology.commands.filter(cmd => cmd !== stepToDelete.content)
    }

    setMethodologies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setSelectedMethodology(updated)
    await updateMethodologyOnServer(updated)
  }

  // Project creation handler
  async function handleProjectCreate(projectData: { name: string; target: string }) {
    try {
      const project = {
        ...projectData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        status: "active" as const,
        client: "", // Add required fields for backend
        scope: "",  // Add required fields for backend
        targetIP: "" // Initialize targetIP
      }

      const response = await fetchJSON(`${apiBase}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project)
      })

      const createdProject = response.project || project
      setProjects(prev => [...prev, createdProject])
      setCurrentProject(createdProject)
      setShowProjectSelector(false)

    } catch (error) {
      console.error("Project creation failed", error)
      alert("Failed to create project. Check the console for details.")
    }
  }

  // Project selection handler
  function handleProjectSelect(project: Project) {
    setCurrentProject(project)
    setShowProjectSelector(false)
  }

  // Update project target
  async function updateProjectTarget(projectId: number, target: string) {
    try {
      const updatedProject = { ...currentProject, target }
      setCurrentProject(updatedProject)
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p))

      await fetchJSON(`${apiBase}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProject)
      })
    } catch (error) {
      console.error("Failed to update project target", error)
    }
  }

  function clearTerminalOutput() {
    setTerminalOutput([])
  }

  async function saveMethodologyChanges(m: Methodology) {
    setMethodologies((prev) => prev.map((x) => (x.id === m.id ? m : x)))
    await updateMethodologyOnServer(m)
  }

  async function exportToJSON() {
    if (!selectedMethodology) return

    const data = {
      methodology: selectedMethodology,
      project: currentProject,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedMethodology.name.replace(/\s+/g, '_')}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (


    <div className="h-screen bg-background flex overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed lg:static lg:h-screen inset-y-0 left-0 z-50 w-96 bg-white border-r transform transition-transform duration-200 ease-in-out overflow-hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-gray-800" />
              <h2 className="text-xl font-bold text-gray-800">Methodologies</h2>
            </div>
            <p className="text-sm text-gray-600">Manage your pentest workflows</p>
          </div>

          {/* Current Project Display */}
          {currentProject && (
            <Card className="m-4 shadow-lg border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold text-green-800">Current Project</h3>
                </div>
                <p className="text-sm font-medium text-green-700">{currentProject.name}</p>
                <p className="text-xs text-green-600">Target: {currentProject.target}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => setShowProjectSelector(true)}
                >
                  Change Project
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Methodologies List */}
          <Card className="mx-4 shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-800">Methodologies ({methodologies.length})</CardTitle>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  size="sm"
                  className="bg-gray-600 hover:bg-gray-700 text-white h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {methodologies.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No methodologies yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {methodologies.map((methodology) => (
                    <div
                      key={methodology.id}
                      className={`border rounded-lg p-3 transition-colors cursor-pointer ${selectedMethodology?.id === methodology.id
                        ? "bg-gray-100 border-gray-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => setSelectedMethodology(methodology)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Shield className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          <h3 className="text-sm font-semibold truncate text-gray-800">{methodology.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteMethodology(methodology.id) }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Methodology Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Methodology
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="methodology-name" className="text-sm font-medium">
                    Methodology Name
                  </Label>
                  <Input
                    id="methodology-name"
                    placeholder="Enter methodology name..."
                    value={newMethodologyName}
                    onChange={(e) => setNewMethodologyName(e.target.value)}
                    className="text-sm bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodology-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="methodology-description"
                    placeholder="Enter description..."
                    value={newMethodologyDescription}
                    onChange={(e) => setNewMethodologyDescription(e.target.value)}
                    className="text-sm min-h-[60px] resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodology-commands" className="text-sm font-medium">
                    Commands (one per line)
                  </Label>
                  <Textarea
                    id="methodology-commands"
                    placeholder="Enter commands, one per line..."
                    value={newMethodologyCommands}
                    onChange={(e) => setNewMethodologyCommands(e.target.value)}
                    className="text-sm min-h-[80px] font-mono resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    addMethodology();
                    setIsAddDialogOpen(false);
                  }}
                  disabled={!newMethodologyName.trim()}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Add Methodology
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">Total: {methodologies.length} methodologies</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Pentest Dashboard</h1>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {!currentProject ? (
              // Project Selection View
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <FolderOpen className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold mb-2">Select a Project</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Choose an existing project or create a new one to start your penetration testing workflow.
                </p>

                <ProjectSelector
                  currentProject={currentProject}
                  onProjectSelect={handleProjectSelect}
                  onProjectCreate={handleProjectCreate}
                />
              </div>
            ) : selectedMethodology ? (
              // Methodology Execution View
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <Button variant="outline" size="sm" onClick={() => setSelectedMethodology(null)}>
                    <Shield className="h-4 w-4" />Back to Dashboard
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Project: <span className="font-semibold text-green-600">{currentProject.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProjectSelector(true)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>

                  <div className="flex gap-2">

                    <Link href="/reports">
                      <FileText className="h-4 w-4" />
                      Reports
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToJSON} size="sm">
                      <Download className="h-4 w-4" />Export JSON
                    </Button>
                  </div>

                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">{selectedMethodology.name}</h1>
                    <div className="text-sm text-muted-foreground mt-1">{selectedMethodology.description}</div>
                  </div>
                </div>

                {/* Project Target */}
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Project Target
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter target (e.g., google.com)"
                        value={currentProject.target}
                        onChange={(e) => updateProjectTarget(currentProject.id, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {currentProject.targetIP && (
                      <p className="text-sm text-muted-foreground">
                        Resolved IP: <code className="bg-muted px-2 py-1 rounded">{currentProject.targetIP}</code>
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Steps Management */}
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      Steps ({selectedMethodology.steps?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Step Form */}
                    <div className="border-b pb-4">
                      <div className="flex gap-2 mb-3">
                        <select
                          value={newStepType}
                          onChange={(e) => setNewStepType(e.target.value as "command" | "manual")}
                          className="border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="command">Command</option>
                          <option value="manual">Manual Step</option>
                        </select>
                        <Input
                          placeholder={
                            newStepType === "command"
                              ? "Enter command..."
                              : "Describe manual step..."
                          }
                          value={newStepContent}
                          onChange={(e) => setNewStepContent(e.target.value)}
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          onClick={addStepToMethodology}
                          disabled={!newStepContent.trim()}
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          Add Step
                        </Button>
                      </div>

                      {/* Execution Controls */}
                      {selectedMethodology.steps?.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          <Button
                            onClick={runAllSteps}
                            disabled={executionState.isRunning}
                            className="bg-cyan-600 hover:bg-cyan-700"
                          >
                            {executionState.isRunning ? "Running..." : "Run All Steps"}
                          </Button>
                          {executionState.isRunning && (
                            <Button
                              onClick={stopExecution}
                              variant="outline"
                              className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                            >
                              ⏹️ Stop Execution
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Steps List */}
                    {selectedMethodology.steps?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMethodology.steps.map((step, index) => (
                          <div
                            key={step.id}
                            className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border transition-colors ${draggedStepId === step.id ? 'bg-blue-50 border-blue-300' : ''
                              }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, step.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, step.id)}
                          >
                            {/* Drag Handle */}
                            <div className="cursor-move text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-4 w-4" />
                            </div>

                            {/* Completion Indicator */}
                            <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-1 rounded ${step.type === 'command'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                                  }`}>
                                  {step.type}
                                </span>

                                {editingStepId === step.id ? (
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      value={editingStepContent}
                                      onChange={(e) => setEditingStepContent(e.target.value)}
                                      className="font-mono text-sm flex-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditStep()
                                        if (e.key === 'Escape') cancelEditStep()
                                      }}
                                    />
                                    <Button size="sm" onClick={saveEditStep} className="bg-green-600 hover:bg-green-700">
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditStep}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <code className="text-sm font-mono flex-1">{step.content}</code>
                                )}
                              </div>
                              {step.evidence && step.evidence.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  Evidence: {step.evidence.join(', ')}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {/* Move Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveStep(step.id, 'up')}
                                disabled={index === 0}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveStep(step.id, 'down')}
                                disabled={index === selectedMethodology.steps.length - 1}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>

                              {/* Edit Button */}
                              {editingStepId !== step.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditStep(step.id, step.content)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}

                              {/* Run Button (for commands) */}
                              {step.type === "command" && editingStepId !== step.id && (
                                <Button
                                  size="sm"
                                  onClick={() => runCommand(step.content)}
                                  className="flex-shrink-0 bg-black hover:bg-green-600 text-white h-8"
                                >
                                  Run
                                </Button>
                              )}

                              {/* Delete Button */}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteStep(step.id)}
                                className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No steps added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Terminal Results */}
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Terminal Results
                      </CardTitle>
                      {terminalOutput.length > 0 && (
                        <Button size="sm" variant="outline" onClick={clearTerminalOutput}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto border border-cyan-500/30">
                      {terminalOutput.length > 0 ? (
                        terminalOutput.map((result, idx) => (
                          <div key={idx} className="mb-3 border-b border-gray-700 pb-2 last:border-b-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${result.status === "success" ? "bg-green-400" :
                                result.status === "failed" ? "bg-red-400" : "bg-yellow-400"
                                }`} />
                              <span className="text-cyan-400">{result.command}</span>
                              <span className="ml-auto text-xs text-gray-400 animate-pulse">
                                {result.status === "success" ? "Success" :
                                  result.status === "failed" ? "Failed" : "Running"}
                              </span>
                            </div>
                            <div className="text-gray-300 ml-4 text-xs whitespace-pre-wrap">
                              {result.output}
                            </div>
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
              // Dashboard View (Project selected, no methodology)
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold mb-2">Pentest Methodology Builder</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Select a methodology from the sidebar to start your penetration testing workflow for project:
                  <span className="font-semibold text-green-600 ml-2">{currentProject.name}</span>
                </p>
                <ReportsPage />

                {/* Add New Methodology Card */}
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-800">
                      <Plus className="h-4 w-4" />Add New Methodology
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Methodology name..."
                      value={newMethodologyName}
                      onChange={(e) => setNewMethodologyName(e.target.value)}
                      className="text-sm bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                    />
                    <Textarea
                      placeholder="Description..."
                      value={newMethodologyDescription}
                      onChange={(e) => setNewMethodologyDescription(e.target.value)}
                      className="text-sm min-h-[60px] resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                    />
                    <Textarea
                      placeholder="Commands (one per line)"
                      value={newMethodologyCommands}
                      onChange={(e) => setNewMethodologyCommands(e.target.value)}
                      className="text-sm min-h-[80px] font-mono resize-none bg-gray-50 focus:ring-2 focus:ring-cyan-500 text-gray-800 placeholder-gray-500"
                    />
                    <Button
                      onClick={addMethodology}
                      disabled={!newMethodologyName.trim()}
                      size="sm"
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Add Methodology
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <ProjectSelector
          currentProject={currentProject}
          onProjectSelect={handleProjectSelect}
          onProjectCreate={handleProjectCreate}
          onClose={() => setShowProjectSelector(false)}
        />
      )}

      {/* Manual Step Modal */}
      <ManualStepModal
        isOpen={manualStepModal.open}
        onClose={() => setManualStepModal({ open: false, step: null })}
        step={manualStepModal.step}
        projectId={currentProject?.id}
        methodologyId={selectedMethodology?.id}
        onEvidenceUploaded={handleManualStepComplete}
      />
    </div>
  )
}