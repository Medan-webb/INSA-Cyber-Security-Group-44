// components/ManualStepModal.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Upload, X, Trash2, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ManualStepModalProps {
  isOpen: boolean
  onClose: () => void
  step: any
  projectId: number | undefined
  methodologyId: number | undefined
  onEvidenceUploaded: (stepId: string, evidencePath: string) => void
}

interface EvidenceFile {
  id: number
  filename: string
  description: string
  notes: string
  uploaded_at: number
  type: string
  uploadState?: 'uploading' | 'success' | 'error'
}

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
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [existingEvidence, setExistingEvidence] = useState<EvidenceFile[]>([])

  const apiBase = "http://127.0.0.1:5000"

  // Load existing evidence when modal opens
  useEffect(() => {
    if (isOpen && step && projectId && methodologyId) {
      loadExistingEvidence()
    }
  }, [isOpen, step, projectId, methodologyId])

  const loadExistingEvidence = async () => {
    try {
      const response = await fetch(
        `${apiBase}/manual-evidence/${projectId}/${methodologyId}/${step.id}`
      )
      if (response.ok) {
        const evidence = await response.json()
        setExistingEvidence(evidence.map((ev: any) => ({
          ...ev,
          uploadState: 'success' as const
        })))
      }
    } catch (error) {
      console.error("Failed to load existing evidence:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const uploadEvidence = async () => {
    if (!file || !projectId || !methodologyId || !step) {
      alert("Please select a file and ensure all required fields are set")
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append("project_id", projectId.toString())
    formData.append("methodology_id", methodologyId.toString())
    formData.append("step_id", step.id)
    formData.append("description", description)
    formData.append("notes", notes)
    formData.append("file", file)

    try {
      // Add to existing evidence with uploading state
      const tempEvidence: EvidenceFile = {
        id: Date.now(), // temporary ID
        filename: file.name,
        description,
        notes,
        uploaded_at: Date.now() / 1000,
        type: "manual_evidence",
        uploadState: 'uploading'
      }

      setExistingEvidence(prev => [...prev, tempEvidence])

      const response = await fetch(`${apiBase}/manual-evidence`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()

        // Update the temporary evidence with the real one
        setExistingEvidence(prev =>
          prev.map(ev =>
            ev.id === tempEvidence.id
              ? { ...result.evidence, uploadState: 'success' as const }
              : ev
          )
        )

        // Clear form
        setDescription("")
        setNotes("")
        setFile(null)

        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ""

        console.log("✅ Evidence uploaded successfully:", result)

      } else {
        throw new Error(`Upload failed: ${response.status}`)
      }
    } catch (error) {
      console.error("❌ Upload failed:", error)

      // Update the evidence with error state
      setExistingEvidence(prev =>
        prev.map(ev =>
          ev.id === tempEvidence.id
            ? { ...ev, uploadState: 'error' as const }
            : ev
        )
      )

      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const deleteEvidence = async (evidenceId: number) => {
    if (!confirm("Are you sure you want to delete this evidence?")) {
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/evidence/${evidenceId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove from local state
        setExistingEvidence(prev => prev.filter(ev => ev.id !== evidenceId))
        console.log("✅ Evidence deleted successfully")
      } else {
        throw new Error("Delete failed")
      }
    } catch (error) {
      console.error("❌ Delete failed:", error)
      alert("Failed to delete evidence. Please try again.")
    }
  }

  const completeStep = () => {
    if (existingEvidence.length === 0) {
      if (!confirm("No evidence has been uploaded. Are you sure you want to mark this step as completed?")) {
        return
      }
    }

    onEvidenceUploaded(step.id, "manual_step_completed")
    onClose()

    // Reset form
    setDescription("")
    setNotes("")
    setFile(null)
    setExistingEvidence([])
  }

  const getUploadStateIcon = (state: string) => {
    switch (state) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getUploadStateText = (state: string) => {
    switch (state) {
      case 'uploading':
        return "Uploading..."
      case 'success':
        return "Uploaded"
      case 'error':
        return "Upload Failed"
      default:
        return "Ready"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-sm font-medium text-gray-800">
            <Upload className="h-6 w-6 text-blue-500" />
            <span className="text-gray-700">{step?.content}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload New Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upload New Evidence</CardTitle>
              <CardDescription>
                Upload screenshots, documents, or other evidence for this step
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this evidence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              <Button
                onClick={uploadEvidence}
                disabled={!file || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Evidence
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Evidence */}
          {existingEvidence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Uploaded Evidence ({existingEvidence.length})</CardTitle>
                <CardDescription>
                  Previously uploaded files for this step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {existingEvidence.map((evidence) => (
                    <div
                      key={evidence.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getUploadStateIcon(evidence.uploadState || 'success')}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {evidence.filename}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {evidence.description}
                          </p>
                          {evidence.uploadState && (
                            <p className={`text-xs ${evidence.uploadState === 'success' ? 'text-green-600' :
                                evidence.uploadState === 'error' ? 'text-red-600' :
                                  'text-blue-600'
                              }`}>
                              {getUploadStateText(evidence.uploadState)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEvidence(evidence.id)}
                        disabled={evidence.uploadState === 'uploading'}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Section */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm text-green-800">
                Step Completion
              </CardTitle>
              <CardDescription className="text-green-700">
                Mark this step as completed when you're finished
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={completeStep}
                  className="bg-green-700 hover:bg-green-800 flex-1 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Step as Completed
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-green-300 text-green-800 hover:bg-green-100"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}