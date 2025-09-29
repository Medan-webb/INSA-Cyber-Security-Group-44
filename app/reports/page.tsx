"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Terminal, FileText, Download, Calendar, Search, Filter, FolderOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface CommandExecution {
  command: string
  output: string
  status: "success" | "failed" | "running"
  timestamp?: string
  project_id?: number
  methodology_id?: number
}

interface ManualEvidence {
  id: number
  project_id: number
  methodology_id: number
  step_id: string
  filename: string
  saved_path: string
  description: string
  notes: string
  uploaded_at: number
  type: string
}

interface Project {
  id: number
  name: string
  target: string
  targetIP?: string
  createdAt: string
  status: "active" | "completed"
}

interface Methodology {
  id: number
  name: string
  description?: string
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

export default function ReportsPage() {
  const [commandHistory, setCommandHistory] = useState<CommandExecution[]>([])
  const [manualEvidence, setManualEvidence] = useState<ManualEvidence[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [selectedProject, setSelectedProject] = useState<number | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportsData()
  }, [])

  async function loadReportsData() {
    try {
      setLoading(true)
      
      // Load projects and methodologies for filtering
      const [projectsData, methodologiesData] = await Promise.all([
        fetchJSON(`${apiBase}/projects`),
        fetchJSON(`${apiBase}/methodologies`)
      ])

      setProjects(projectsData || [])
      setMethodologies(methodologiesData || [])

      // Load evidence and command history
      await loadEvidenceAndCommands()

    } catch (error) {
      console.error("Failed to load reports data", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEvidenceAndCommands() {
    try {
      // Try to load all evidence at once (if the endpoint exists)
      try {
        const evidenceData = await fetchJSON(`${apiBase}/evidence`);
        setManualEvidence(evidenceData || []);
      } catch (error) {
        console.log("Trying alternative evidence loading method...");
        // If /evidence endpoint doesn't exist, load evidence per project
        await loadEvidencePerProject();
      }

      // Load command history from localStorage
      const savedHistory = localStorage.getItem('commandHistory');
      if (savedHistory) {
        setCommandHistory(JSON.parse(savedHistory));
      }

    } catch (error) {
      console.error("Failed to load evidence and commands", error);
    }
  }

  async function loadEvidencePerProject() {
    let allEvidence: ManualEvidence[] = [];
    
    // Fetch evidence for each project individually
    for (const project of projects) {
      try {
        const evidenceData = await fetchJSON(`${apiBase}/evidence/${project.id}`);
        allEvidence = [...allEvidence, ...(evidenceData || [])];
      } catch (error) {
        console.error(`Failed to load evidence for project ${project.id}`, error);
      }
    }
    
    setManualEvidence(allEvidence);
  }

  // Filter data based on selected project and search term
  const filteredCommands = commandHistory.filter(cmd => {
    const matchesProject = selectedProject === "all" || cmd.project_id === selectedProject
    const matchesSearch = cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cmd.output.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesProject && matchesSearch
  })

  const filteredEvidence = manualEvidence.filter(evidence => {
    const matchesProject = selectedProject === "all" || evidence.project_id === selectedProject
    const matchesSearch = evidence.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         evidence.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         evidence.filename.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesProject && matchesSearch
  })

  function getProjectName(projectId: number) {
    const project = projects.find(p => p.id === projectId)
    return project ? project.name : `Project ${projectId}`
  }

  function getMethodologyName(methodologyId: number) {
    const methodology = methodologies.find(m => m.id === methodologyId)
    return methodology ? methodology.name : `Methodology ${methodologyId}`
  }

  function formatTimestamp(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  function exportToJSON() {
    const reportData = {
      generatedAt: new Date().toISOString(),
      commands: filteredCommands,
      evidence: filteredEvidence,
      projects: projects,
      methodologies: methodologies
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pentest-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function clearAllData() {
    if (confirm("Are you sure you want to clear all command history? This cannot be undone.")) {
      setCommandHistory([])
      localStorage.removeItem('commandHistory')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
            
            <FileText className="h-8 w-8 text-primary" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Pentest Reports</h1>
              <p className="text-muted-foreground">View command executions and collected evidence</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={clearAllData} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              Clear History
            </Button>
            <Button onClick={exportToJSON}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search commands, outputs, or evidence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Terminal className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{filteredCommands.length}</p>
                  <p className="text-sm text-muted-foreground">Commands Executed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{filteredEvidence.length}</p>
                  <p className="text-sm text-muted-foreground">Evidence Files</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Command History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Command History ({filteredCommands.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCommands.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredCommands.map((cmd, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            cmd.status === "success" ? "bg-green-500" :
                            cmd.status === "failed" ? "bg-red-500" : "bg-yellow-500"
                          }`} />
                          <code className="text-sm font-mono bg-black text-green-400 px-2 py-1 rounded">
                            {cmd.command}
                          </code>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          cmd.status === "success" ? "bg-green-100 text-green-800" :
                          cmd.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {cmd.status}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {cmd.timestamp && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(cmd.timestamp).toLocaleString()}
                          </span>
                        )}
                        {cmd.project_id && (
                          <span className="flex items-center gap-1 mt-1">
                            <FolderOpen className="h-3 w-3" />
                            {getProjectName(cmd.project_id)}
                          </span>
                        )}
                      </div>

                      <div className="bg-black text-green-400 p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                        <pre>{cmd.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No command history found</p>
                  <p className="text-sm">Execute commands in the methodologies page to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manual Evidence ({filteredEvidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEvidence.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredEvidence.map((evidence) => (
                    <div key={evidence.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">{evidence.filename}</span>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {evidence.type}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimestamp(evidence.uploaded_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {getProjectName(evidence.project_id)}
                          {evidence.methodology_id && ` • ${getMethodologyName(evidence.methodology_id)}`}
                        </div>
                        {evidence.step_id && (
                          <div className="text-xs">
                            Step ID: <code className="bg-gray-200 px-1 rounded">{evidence.step_id}</code>
                          </div>
                        )}
                      </div>

                      {evidence.description && (
                        <p className="text-sm mb-2">{evidence.description}</p>
                      )}
                      
                      {evidence.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Notes:</p>
                          <p className="text-xs text-yellow-700">{evidence.notes}</p>
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs">
                        <span className="text-muted-foreground">Path: </span>
                        <code className="bg-gray-200 px-1 rounded break-all">{evidence.saved_path}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No manual evidence found</p>
                  <p className="text-sm">Upload evidence in manual steps to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Raw Data Export */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Raw Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    const data = JSON.stringify(commandHistory, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `command-history-${Date.now()}.json`
                    a.click()
                  }}
                  variant="outline"
                  size="sm"
                >
                  Export Commands JSON
                </Button>
                <Button 
                  onClick={() => {
                    const data = JSON.stringify(manualEvidence, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `evidence-${Date.now()}.json`
                    a.click()
                  }}
                  variant="outline"
                  size="sm"
                >
                  Export Evidence JSON
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-semibold mb-2">Commands Data Structure:</h4>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify({
                      command: "string",
                      output: "string", 
                      status: "success|failed|running",
                      timestamp: "string",
                      project_id: "number"
                    }, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Evidence Data Structure:</h4>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify({
                      id: "number",
                      project_id: "number",
                      filename: "string",
                      description: "string",
                      saved_path: "string",
                      uploaded_at: "number"
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}