// components/ManualStepModal.tsx
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, FileText } from "lucide-react"

interface MethodologyStep {
  id: string
  type: "command" | "manual"
  content: string
  requiresUpload: boolean
  completed: boolean
  evidence?: string[]
}

interface ManualStepModalProps {
  isOpen: boolean
  onClose: () => void
  step: MethodologyStep | null
  projectId: number | undefined
  methodologyId: number | undefined
  onEvidenceUploaded: (stepId: string, evidencePath: string) => void
}

const apiBase = "http://127.0.0.1:5000"

export function ManualStepModal({ 
  isOpen, 
  onClose, 
  step, 
  projectId, 
  methodologyId,
  onEvidenceUploaded 
}: ManualStepModalProps) {
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen || !step) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !projectId || !methodologyId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("project_id", projectId.toString())
      formData.append("methodology_id", methodologyId.toString())
      formData.append("step_id", step.id)
      formData.append("description", description)
      formData.append("notes", notes)
      formData.append("file", selectedFile)

      const response = await fetch(`${apiBase}/manual-evidence`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        onEvidenceUploaded(step.id, result.evidence?.saved_path || "evidence_uploaded")
        resetForm()
        onClose()
      } else {
        throw new Error(`Upload failed: ${response.status}`)
      }
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setDescription("")
    setNotes("")
    setSelectedFile(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manual Step Evidence
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Step Instructions:</h3>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
              {step.content}
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Evidence description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            
            <Textarea
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                id="evidence-file"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label htmlFor="evidence-file" className="cursor-pointer block">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">
                  {selectedFile ? selectedFile.name : "Click to upload evidence file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported: images, documents, screenshots
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading || !description.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? "Uploading..." : "Complete Step"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}