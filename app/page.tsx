"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Shield, Trash2, Menu, Terminal, FileText, GripVertical, Download, Globe, Edit, FolderOpen, ChevronDown, Upload, X, Save, ArrowUp, ArrowDown, Brain, Home, Activity, Users, Rocket, Star, ArrowRight } from "lucide-react"

import { ManualStepModal } from "./components/ManualStepModal"
import { ProjectSelector } from "./components/ProjectSelector"
import Link from "next/link"
import ReportsPage from "./reports/page"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


import { scanTargetWithExternalServices, ExternalScanResult } from "@/lib/external-apis"
import { Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react"


import {
  getCommandSuggestions,
  explainCommand,
  type CommandSuggestion,
  type CommandExplanation,
  type AISuggestionsRequest
} from "@/lib/ai-command-suggestions"
import { Lightbulb, HelpCircle, Sparkles, Bot, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

  const [externalScanResults, setExternalScanResults] = useState<ExternalScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showScanResults, setShowScanResults] = useState(false)


  const [aiSuggestions, setAiSuggestions] = useState<CommandSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [commandExplanation, setCommandExplanation] = useState<CommandExplanation | null>(null)
  const [explainingCommand, setExplainingCommand] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<"local" | "online">("online")
  const [onlineProvider, setOnlineProvider] = useState<"gemini" | "gpt">("gemini")


  const [activeSection, setActiveSection] = useState<"home" | "methodologies">("home");


  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');

  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

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

        // await new Promise<void>(resolve => {
        //   setManualStepModal({ open: true, step })
        //   const checkCompletion = setInterval(() => {
        //     const updatedStep = selectedMethodology.steps.find(s => s.id === step.id)
        //     if (updatedStep?.completed || shouldStopRef.current) {
        //       clearInterval(checkCompletion)
        //       resolve()
        //     }
        //   }, 500)
        // })

        // Create a promise that resolves when the manual step is completed
        const manualStepCompleted = new Promise<void>((resolve) => {
          const checkCompletion = () => {
            // Check if the step is completed in the current methodology state
            const currentStep = selectedMethodology.steps.find(s => s.id === step.id)
            if (currentStep?.completed) {
              resolve()
            } else if (shouldStopRef.current) {
              resolve() // Resolve even if stopped to continue the loop
            } else {
              // Check again after a delay
              setTimeout(checkCompletion, 1000)
            }
          }
          checkCompletion()
        })

        // Show the manual step modal
        setManualStepModal({ open: true, step })

        // Wait for the step to be completed or stopped
        await manualStepCompleted

        // Close the modal
        setManualStepModal({ open: false, step: null })

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
    // Update the methodologies state
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

    // Update the selected methodology
    setSelectedMethodology(prev => prev ? {
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? { ...step, completed: true, evidence: [...(step.evidence || []), evidencePath] }
          : step
      )
    } : null)

    // Don't close the modal here - let the runAllSteps function handle it
    console.log(`✅ Manual step ${stepId} marked as completed`)
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
  // Add this function to your component
  async function runExternalScan() {
    if (!currentProject?.target) {
      alert("Please set a project target first")
      return
    }

    setIsScanning(true)
    setExternalScanResults(null)
    setShowScanResults(true)

    try {
      const results = await scanTargetWithExternalServices(currentProject.target)
      setExternalScanResults(results)
    } catch (error) {
      console.error("External scan failed:", error)
      setExternalScanResults({ error: "Scan failed" })
    } finally {
      setIsScanning(false)
    }
  }
  // AI Suggestion Function
  async function fetchAISuggestions() {
    if (!selectedMethodology || !currentProject) {
      alert("Please select a methodology and project first");
      return;
    }

    setIsLoadingSuggestions(true);
    setShowSuggestions(true);

    try {
      const request: AISuggestionsRequest = {
        current_methodology: {
          name: selectedMethodology.name,
          description: selectedMethodology.description,
          steps: selectedMethodology.steps || []
        },
        project_target: currentProject.target,
        completed_steps: selectedMethodology.steps
          ?.filter(step => step.completed)
          .map(step => step.content) || [],
        use_online: aiProvider === "online",
        provider: onlineProvider
      };

      console.log("🤖 Fetching AI command suggestions...", request);
      const suggestions = await getCommandSuggestions(request);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
      alert("Failed to get AI suggestions. Using fallback suggestions.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  // Command Explanation Function
  async function explainSelectedCommand(command: string) {
    if (!currentProject || !selectedMethodology) return;

    setExplainingCommand(command);
    setCommandExplanation(null);

    try {
      console.log("🤖 Explaining command:", command);
      const explanation = await explainCommand(command, {
        target: currentProject.target,
        methodology: selectedMethodology.name,
        use_online: aiProvider === "online",
        provider: onlineProvider
      });
      setCommandExplanation(explanation);
    } catch (error) {
      console.error("Failed to explain command:", error);
    } finally {
      setExplainingCommand(null);
    }
  }
  // Quick action to add suggested command
  function addSuggestedCommand(command: string) {
    if (!selectedMethodology) return;

    setNewStepType("command");
    setNewStepContent(command);
    // Auto-focus the input field
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="command"]') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }

  const getHomeStats = () => {
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === "active").length,
      totalMethodologies: methodologies.length,
      completedSteps: selectedMethodology?.steps?.filter(s => s.completed).length || 0,
      totalSteps: selectedMethodology?.steps?.length || 0
    }
  }

  async function importFromJSON() {
    if (!importData.trim()) {
      setImportError('Please paste JSON data to import');
      return;
    }

    try {
      const parsedData = JSON.parse(importData);

      // Validate the imported data structure
      if (!parsedData.methodology || !parsedData.methodology.name) {
        setImportError('Invalid methodology data structure');
        return;
      }

      // Show success modal instead of alert
      setSuccessModal({
        isOpen: true,
        title: 'Import Successful!',
        message: `Methodology "${parsedData.methodology.name}" has been imported successfully and is now available in your methodologies list.`
      });

      // Reset and close
      setImportData('');
      setImportError('');
      setImportModalOpen(false);

      // Optionally reload methodologies to show the new imported one
      loadMethodologies();

    } catch (error) {
      setImportError('Invalid JSON format: ' + error.message);
    }
  }
  const ImportModal = ({ isOpen, onClose, onImport, data, setData, error }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">Import Methodology</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste JSON Data
              </label>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Paste your exported methodology JSON here..."
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Expected JSON Format:</h4>
              <pre className="text-xs text-blue-700 overflow-x-auto">
                {`{
  "methodology": {
    "name": "Methodology Name",
    "description": "Description...",
    "steps": [...],
    "commands": [...]
  },
  "exportDate": "2024-01-01T00:00:00.000Z"
}`}
              </pre>
            </div>
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import Methodology
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add this file input import function for file uploads
  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          setImportData(content);
          setImportModalOpen(true);
          setImportError('');
        }
      } catch (error) {
        setImportError('Failed to read file: ' + error.message);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read the file');
    };

    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  }

  const SuccessModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 transform animate-scale-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all duration-200 font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (


    <div className="h-screen bg-background flex overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed lg:static lg:h-screen inset-y-0 left-0 z-50 w-96 bg-white border-r transform transition-transform duration-200 ease-in-out overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-gray-800" />
              <h2 className="text-xl font-bold text-gray-800">PentestFlow</h2>
            </div>
            <p className="text-sm text-gray-600">Professional penetration testing orchestrator</p>
          </div>



          {/* Navigation Menu */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-2">
              <Button
                variant={activeSection === "home" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("home")}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant={activeSection === "methodologies" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("methodologies")}
              >
                <Shield className="h-4 w-4 mr-2" />
                Methodologies
              </Button>
              <Link href="/reports" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </Link>
              <Link href="/share" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Community
                </Button>
              </Link>
            </div>
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
          {activeSection === "methodologies" && (
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
          )}

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
          <h1 className="font-semibold">
            {activeSection === "home" ? "Dashboard" : "Pentest Methodologies"}
          </h1>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === "home" ? (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Shield className="h-12 w-12 text-primary" />
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                    PentestFlow
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Professional penetration testing orchestrator with AI-powered workflows and automated methodologies
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-lg border-2 border-blue-200/80 backdrop-blur-sm bg-white/95">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Projects</p>
                        <p className="text-3xl font-bold text-gray-800">{getHomeStats().totalProjects}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <FolderOpen className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-green-200/80 backdrop-blur-sm bg-white/95">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Projects</p>
                        <p className="text-3xl font-bold text-gray-800">{getHomeStats().activeProjects}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Activity className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-purple-200/80 backdrop-blur-sm bg-white/95">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Methodologies</p>
                        <p className="text-3xl font-bold text-gray-800">{getHomeStats().totalMethodologies}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <Shield className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-orange-200/80 backdrop-blur-sm bg-white/95">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-3xl font-bold text-gray-800">
                          {getHomeStats().totalSteps > 0
                            ? `${Math.round((getHomeStats().completedSteps / getHomeStats().totalSteps) * 100)}%`
                            : "0%"
                          }
                        </p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-full">
                        <Star className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="h-5 w-5" />
                      Quick Start
                    </CardTitle>
                    <CardDescription>
                      Start a new penetration testing project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!currentProject ? (
                      <div className="text-center space-y-4">
                        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-gray-600">No active project</p>
                        <Button
                          onClick={() => setShowProjectSelector(true)}
                          className="bg-gray-800 hover:bg-gray-900 text-white"
                        >
                          Select or Create Project
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-8 w-8 text-green-600" />
                            <div>
                              <h3 className="font-semibold text-green-800">{currentProject.name}</h3>
                              <p className="text-sm text-green-600">Target: {currentProject.target}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => setActiveSection("methodologies")}
                            className="bg-gray-800 hover:bg-gray-900 text-white"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Methodologies
                          </Button>
                          <Link href="/reports" className="w-full">
                            <Button variant="outline" className="w-full">
                              <FileText className="h-4 w-4 mr-2" />
                              View Reports
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Community & Resources
                    </CardTitle>
                    <CardDescription>
                      Explore shared methodologies and resources
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Link href="/share">
                        <Button variant="outline" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Community Methodologies
                          </div>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          AI Command Suggestions
                        </div>
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documentation
                        </div>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2">Pro Tip</h4>
                      <p className="text-blue-700 text-sm">
                        Use AI-powered command suggestions to enhance your methodologies with expert-level commands and explanations.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {methodologies.length > 0 && (
                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Recent Methodologies
                    </CardTitle>
                    <CardDescription>
                      Your recently used testing methodologies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {methodologies.slice(0, 3).map((methodology) => (
                        <div
                          key={methodology.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedMethodology(methodology)
                            setActiveSection("methodologies")
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-gray-600" />
                            <div>
                              <h3 className="font-semibold text-sm">{methodology.name}</h3>
                              <p className="text-xs text-gray-600">
                                {methodology.steps?.length || 0} steps
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {!currentProject ? (
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
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" />
                          Reports
                        </Button>
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={exportToJSON} size="sm">
                        <Download className="h-4 w-4" />Export JSON
                      </Button>

                      <Button
                        onClick={() => setImportModalOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import
                      </Button>

                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                        id="import-file"
                      />
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => document.getElementById('import-file')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Import from File
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

                  <Card className="shadow-lg border-2 border-blue-200/80 backdrop-blur-sm bg-white/95">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        External Services Scan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={runExternalScan}
                          disabled={isScanning || !currentProject?.target}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isScanning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Scan with Shodan & VirusTotal
                            </>
                          )}
                        </Button>

                        {externalScanResults && (
                          <Button
                            variant="outline"
                            onClick={() => setShowScanResults(!showScanResults)}
                          >
                            {showScanResults ? "Hide Results" : "Show Results"}
                          </Button>
                        )}
                      </div>

                      {showScanResults && externalScanResults && (
                        <div className="space-y-4">
                          {externalScanResults.shodan && (
                            <div className="border rounded-lg p-4 bg-blue-50">
                              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Shodan Results
                              </h3>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">IP:</span> {externalScanResults.shodan.ip}
                                </div>
                                <div>
                                  <span className="font-medium">Organization:</span> {externalScanResults.shodan.org}
                                </div>
                                <div>
                                  <span className="font-medium">Open Ports:</span> {externalScanResults.shodan.ports?.join(", ") || "None"}
                                </div>
                                <div>
                                  <span className="font-medium">Hostnames:</span> {externalScanResults.shodan.hostnames?.join(", ") || "None"}
                                </div>
                              </div>

                              {externalScanResults.shodan.data && externalScanResults.shodan.data.length > 0 && (
                                <div className="mt-3">
                                  <h4 className="font-medium text-blue-700 mb-2">Service Details:</h4>
                                  <div className="space-y-2">
                                    {externalScanResults.shodan.data.map((service, index) => (
                                      <div key={index} className="bg-white p-2 rounded border text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Port {service.port}/{service.transport}</span>
                                          {service.product && (
                                            <span>{service.product} {service.version}</span>
                                          )}
                                        </div>
                                        {service.banner && (
                                          <div className="mt-1 font-mono text-gray-600 truncate">
                                            {service.banner}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {externalScanResults.virusTotal && (
                            <div className="border rounded-lg p-4 bg-green-50">
                              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                VirusTotal Results
                              </h3>

                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    {externalScanResults.virusTotal.data.attributes.last_analysis_stats.malicious > 0 ? (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    ) : externalScanResults.virusTotal.data.attributes.last_analysis_stats.suspicious > 0 ? (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    )}
                                    <span className="font-medium">
                                      Security Status:{" "}
                                      {externalScanResults.virusTotal.data.attributes.last_analysis_stats.malicious > 0 ? "Malicious" :
                                        externalScanResults.virusTotal.data.attributes.last_analysis_stats.suspicious > 0 ? "Suspicious" : "Clean"}
                                    </span>
                                  </div>

                                  <div className="text-sm text-gray-600">
                                    {externalScanResults.virusTotal.data.attributes.last_analysis_stats.malicious} malicious /
                                    {externalScanResults.virusTotal.data.attributes.last_analysis_stats.suspicious} suspicious /
                                    {externalScanResults.virusTotal.data.attributes.last_analysis_stats.harmless +
                                      externalScanResults.virusTotal.data.attributes.last_analysis_stats.malicious +
                                      externalScanResults.virusTotal.data.attributes.last_analysis_stats.suspicious} total engines
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Reputation:</span>{" "}
                                    {externalScanResults.virusTotal.data.attributes.reputation || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Tags:</span>{" "}
                                    {externalScanResults.virusTotal.data.attributes.tags?.join(", ") || "None"}
                                  </div>
                                </div>

                                {externalScanResults.virusTotal.data.attributes.last_analysis_stats.malicious > 0 && (
                                  <div className="mt-2">
                                    <h4 className="font-medium text-red-700 mb-2">Threat Detections:</h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {Object.entries(externalScanResults.virusTotal.data.attributes.last_analysis_results)
                                        .filter(([_, result]) => result.category === "malicious")
                                        .map(([engine, result]) => (
                                          <div key={engine} className="flex justify-between text-xs bg-red-100 p-1 rounded">
                                            <span className="font-medium">{engine}</span>
                                            <span className="text-red-700">{result.result}</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {externalScanResults.error && (
                            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                              <div className="flex items-center gap-2 text-red-800">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Scan failed: {externalScanResults.error}</span>
                              </div>
                              <p className="text-sm text-red-600 mt-1">
                                Please check your API keys and target configuration.
                              </p>
                            </div>
                          )}

                          {!externalScanResults.shodan && !externalScanResults.virusTotal && !externalScanResults.error && (
                            <div className="text-center py-4 text-gray-500">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No external scan data available for this target.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Steps ({selectedMethodology.steps?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      
                      {selectedMethodology.steps?.map((step, index) => (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border transition-colors ${draggedStepId === step.id ? 'bg-blue-50 border-blue-300' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, step.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, step.id)}
                        >
                          <div className="cursor-move text-gray-400 hover:text-gray-600">
                            <GripVertical className="h-4 w-4" />
                          </div>

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
                                <div
                                  className={`flex-1 cursor-pointer ${step.type === 'manual' ? 'hover:bg-gray-100 rounded px-2 py-1' : ''}`}
                                  onClick={() => {
                                    if (step.type === 'manual') {
                                      setManualStepModal({ open: true, step })
                                    }
                                  }}
                                >
                                  <code className="text-sm font-mono">{step.content}</code>
                                </div>
                              )}
                            </div>
                            {step.evidence && step.evidence.length > 0 && (
                              <div className="text-xs text-gray-600">
                                Evidence: {step.evidence.length} file(s) uploaded
                              </div>
                            )}
                            {step.completed && (
                              <div className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
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

                            {step.type === "command" && editingStepId !== step.id && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => runCommand(step.content)}
                                  className="flex-shrink-0 bg-black hover:bg-green-600 text-white h-8"
                                >
                                  Run
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => explainSelectedCommand(step.content)}
                                  disabled={explainingCommand === step.content}
                                  className="flex-shrink-0 h-8"
                                >
                                  {explainingCommand === step.content ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                                  ) : (
                                    <HelpCircle className="h-3 w-3" />
                                  )}
                                </Button>
                              </>
                            )}

                            {/* Manual Step Actions */}
                            {step.type === "manual" && editingStepId !== step.id && (
                              <Button
                                size="sm"
                                onClick={() => setManualStepModal({ open: true, step })}
                                className="flex-shrink-0 bg-black hover:bg-green-600 text-white h-8"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            )}

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
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-2 border-purple-200/80 backdrop-blur-sm bg-white/95">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600" />
                          AI Command Suggestions
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <select
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value as "local" | "online")}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="local">Local AI</option>
                            <option value="online">Online AI</option>
                          </select>

                          {aiProvider === "online" && (
                            <select
                              value={onlineProvider}
                              onChange={(e) => setOnlineProvider(e.target.value as "gemini" | "gpt")}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="gemini">Gemini</option>
                              <option value="gpt">GPT</option>
                            </select>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Get AI-powered command suggestions based on your current methodology and target
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={fetchAISuggestions}
                          disabled={isLoadingSuggestions || !selectedMethodology || !currentProject}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {isLoadingSuggestions ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Suggest Commands
                            </>
                          )}
                        </Button>

                        {showSuggestions && (
                          <Button
                            variant="outline"
                            onClick={() => setShowSuggestions(false)}
                          >
                            Hide Suggestions
                          </Button>
                        )}
                      </div>

                      {showSuggestions && (
                        <div className="space-y-3">
                          {isLoadingSuggestions ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                              <p className="text-sm text-gray-600 mt-2">AI is analyzing your methodology...</p>
                            </div>
                          ) : aiSuggestions.length > 0 ? (
                            aiSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <code className="text-sm font-mono bg-black text-green-400 px-2 py-1 rounded flex-1">
                                        {suggestion.command.replace(/\{\{target\}\}/g, currentProject?.target || '{{target}}')}
                                      </code>
                                      <Badge
                                        className={`
                                    ${suggestion.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                                            suggestion.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'}
                                  `}
                                      >
                                        {suggestion.risk_level.toUpperCase()} RISK
                                      </Badge>
                                    </div>

                                    <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>

                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {suggestion.category}
                                      </span>
                                      {suggestion.prerequisites && suggestion.prerequisites.length > 0 && (
                                        <span>Requires: {suggestion.prerequisites.join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => addSuggestedCommand(suggestion.command)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add to Methodology
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => explainSelectedCommand(suggestion.command)}
                                    disabled={explainingCommand === suggestion.command}
                                  >
                                    {explainingCommand === suggestion.command ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1" />
                                    ) : (
                                      <HelpCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Explain
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => runCommand(suggestion.command)}
                                    className="ml-auto"
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Run Now
                                  </Button>
                                </div>

                                {commandExplanation && explainingCommand === suggestion.command && (
                                  <div className="mt-3 p-3 bg-white border rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                      <Bot className="h-4 w-4 text-blue-600" />
                                      AI Explanation
                                    </h4>

                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="font-medium">Purpose:</span>
                                        <p className="text-gray-700">{commandExplanation.purpose}</p>
                                      </div>

                                      <div>
                                        <span className="font-medium">Explanation:</span>
                                        <p className="text-gray-700">{commandExplanation.explanation}</p>
                                      </div>

                                      {commandExplanation.risks.length > 0 && (
                                        <div>
                                          <span className="font-medium text-red-600">Risks:</span>
                                          <ul className="list-disc list-inside text-gray-700">
                                            {commandExplanation.risks.map((risk, i) => (
                                              <li key={i}>{risk}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {commandExplanation.best_practices.length > 0 && (
                                        <div>
                                          <span className="font-medium text-green-600">Best Practices:</span>
                                          <ul className="list-disc list-inside text-gray-700">
                                            {commandExplanation.best_practices.map((practice, i) => (
                                              <li key={i}>{practice}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No suggestions available. Try generating suggestions with AI.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Shield className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-4xl font-bold mb-2">Pentest Methodology Builder</h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Select a methodology from the sidebar to start your penetration testing workflow for project:
                    <span className="font-semibold text-green-600 ml-2">{currentProject.name}</span>
                    or find one in the
                    <Link href="/share" className="text-gray-700 hover:text-blue-600">
                      Community
                    </Link>
                  </p>
                  <ReportsPage />

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
          )}
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
      {/* Add this with your other modals */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportData('');
          setImportError('');
        }}
        onImport={importFromJSON}
        data={importData}
        setData={setImportData}
        error={importError}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>


  )
}