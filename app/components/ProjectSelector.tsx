// components/ProjectSelector.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FolderOpen, ChevronDown, X } from "lucide-react"

interface Project {
  id: number
  name: string
  target: string
  targetIP?: string
  createdAt: string
  status: "active" | "completed"
}

interface ProjectSelectorProps {
  currentProject: Project | null
  onProjectSelect: (project: Project) => void
  onProjectCreate: (projectData: { name: string; target: string }) => void
  onClose?: () => void
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

export function ProjectSelector({ 
  currentProject, 
  onProjectSelect, 
  onProjectCreate,
  onClose 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", target: "" })
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await fetchJSON(`${apiBase}/projects`)
      setProjects(data || [])
    } catch (error) {
      console.error("Failed to load projects", error)
    }
  }

  async function createProject() {
    if (!newProject.name.trim() || !newProject.target.trim()) return

    try {
      onProjectCreate(newProject)
      setShowCreateForm(false)
      setNewProject({ name: "", target: "" })
      await loadProjects() // Refresh the list
    } catch (error) {
      console.error("Project creation failed", error)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Project
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Create New Project Form */}
          {showCreateForm ? (
            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium text-sm">Create New Project</h3>
              <Input
                placeholder="Project name"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Target (e.g., example.com)"
                value={newProject.target}
                onChange={(e) => setNewProject(prev => ({ ...prev, target: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={createProject}
                  disabled={!newProject.name.trim() || !newProject.target.trim()}
                >
                  Create Project
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => setShowCreateForm(true)} 
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          )}

          {/* Projects List */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-3">Existing Projects</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects found. Create your first project.
                </p>
              ) : (
                projects.map(project => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentProject?.id === project.id 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      onProjectSelect(project)
                      handleClose()
                    }}
                  >
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Target: {project.target}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}