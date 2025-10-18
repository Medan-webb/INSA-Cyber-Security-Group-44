// app/notes/page.jsx

"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Plus, Trash2, Edit, Save, X, FileText, Search, FolderOpen,
    Filter, Tag, Calendar, User, Zap, Download, Upload,
    Eye, EyeOff, Star, AlertTriangle, Info, CheckCircle,
    Bookmark, Pin, Copy, Share, MoreVertical, List,
    ChevronLeft, ChevronRight, LayoutDashboard, Settings,
    ArrowLeft
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProjectSelector } from "../components/ProjectSelector"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

const apiBase = "http://127.0.0.1:5000"

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    return res.json()
}

export default function EnhancedTargetNotesPage() {
    const [projects, setProjects] = useState([])
    const [currentProject, setCurrentProject] = useState(null)
    const [showProjectSelector, setShowProjectSelector] = useState(false)
    const [notes, setNotes] = useState([])
    const [filteredNotes, setFilteredNotes] = useState([])
    const [selectedNote, setSelectedNote] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTarget, setSelectedTarget] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")
    const [selectedTag, setSelectedTag] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [editingNote, setEditingNote] = useState(null)
    const [viewMode, setViewMode] = useState("preview") // "edit" or "preview"
    const [categories, setCategories] = useState([])
    const [tags, setTags] = useState([])
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const [newNote, setNewNote] = useState({
        title: "",
        content: "",
        target: "",
        category: "findings",
        tags: [],
        severity: "medium",
        status: "draft"
    })

    const [newTag, setNewTag] = useState("")
    const textareaRef = useRef(null)

    // Available options
    const categoriesOptions = [
        "findings", "evidence", "commands", "reconnaissance",
        "vulnerability", "exploitation", "post-exploitation",
        "reporting", "general", "quick"
    ]

    const severityOptions = [
        { value: "critical", label: "Critical", color: "bg-red-500" },
        { value: "high", label: "High", color: "bg-orange-500" },
        { value: "medium", label: "Medium", color: "bg-yellow-500" },
        { value: "low", label: "Low", color: "bg-blue-500" },
        { value: "info", label: "Info", color: "bg-gray-500" }
    ]

    const statusOptions = [
        { value: "draft", label: "Draft", color: "bg-gray-500" },
        { value: "in_review", label: "In Review", color: "bg-blue-500" },
        { value: "completed", label: "Completed", color: "bg-green-500" }
    ]

    // Load projects and data
    useEffect(() => {
        loadProjects()
    }, [])

    useEffect(() => {
        if (currentProject) {
            loadNotes()
            loadCategories()
            loadTags()
        }
    }, [currentProject])


    const filterNotes = useCallback(() => {
        let filtered = notes

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(term) ||
                note.content.toLowerCase().includes(term) ||
                note.target.toLowerCase().includes(term) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(term)))
            )
        }

        if (selectedTarget) {
            filtered = filtered.filter(note => note.target === selectedTarget)
        }

        if (selectedCategory) {
            filtered = filtered.filter(note => note.category === selectedCategory)
        }

        if (selectedStatus) {
            filtered = filtered.filter(note => note.status === selectedStatus)
        }

        if (selectedTag) {
            filtered = filtered.filter(note => note.tags.includes(selectedTag))
        }

        setFilteredNotes(filtered)
    }, [notes, searchTerm, selectedTarget, selectedCategory, selectedStatus, selectedTag])

    useEffect(() => {
        filterNotes()
    }, [notes, searchTerm, selectedTarget, selectedCategory, selectedStatus, selectedTag])




    // Auto-select first note when filtered notes change
    useEffect(() => {
        if (filteredNotes.length > 0 && !selectedNote) {
            setSelectedNote(filteredNotes[0])
        } else if (filteredNotes.length === 0) {
            setSelectedNote(null)
        }
    }, [filteredNotes, selectedNote])

    async function loadProjects() {
        try {
            const data = await fetchJSON(`${apiBase}/projects`)
            setProjects(data || [])
        } catch (error) {
            console.error("Failed to load projects", error)
        }
    }

    async function loadNotes() {
        if (!currentProject) return

        try {
            const params = new URLSearchParams()
            if (selectedTarget) params.append('target', selectedTarget)
            if (selectedCategory) params.append('category', selectedCategory)
            if (selectedStatus) params.append('status', selectedStatus)
            if (selectedTag) params.append('tag', selectedTag)

            const data = await fetchJSON(
                `${apiBase}/api/enhanced-target-notes/${currentProject.id}?${params}`
            )
            setNotes(data.notes || [])
        } catch (error) {
            console.error("Failed to load notes", error)
            setNotes([])
        }
    }

    async function loadCategories() {
        if (!currentProject) return
        try {
            const data = await fetchJSON(`${apiBase}/api/note-categories/${currentProject.id}`)
            setCategories(data.categories || [])
        } catch (error) {
            console.error("Failed to load categories", error)
        }
    }

    async function loadTags() {
        if (!currentProject) return
        try {
            const data = await fetchJSON(`${apiBase}/api/note-tags/${currentProject.id}`)
            setTags(data.tags || [])
        } catch (error) {
            console.error("Failed to load tags", error)
        }
    }



    async function createNote() {
        if (!currentProject || !newNote.title.trim() || !newNote.target.trim()) {
            alert("Please fill in title and target")
            return
        }

        try {
            const payload = {
                project_id: currentProject.id,
                target: newNote.target,
                title: newNote.title,
                content: newNote.content,
                category: newNote.category,
                tags: newNote.tags,
                severity: newNote.severity
            }

            const response = await fetchJSON(`${apiBase}/api/enhanced-target-notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            setNotes(prev => [response.note, ...prev])
            setSelectedNote(response.note)
            setNewNote({
                title: "",
                content: "",
                target: "",
                category: "findings",
                tags: [],
                severity: "medium",
                status: "draft"
            })
            setIsCreating(false)
            loadCategories()
            loadTags()
        } catch (error) {
            console.error("Failed to create note", error)
            alert("Failed to create note")
        }
    }

    async function updateNote() {
        if (!editingNote) return

        try {
            console.log("Updating note:", editingNote); // Debug log

            const response = await fetchJSON(`${apiBase}/api/enhanced-target-notes/${editingNote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editingNote.title,
                    content: editingNote.content,
                    category: editingNote.category,
                    tags: editingNote.tags,
                    severity: editingNote.severity,
                    status: editingNote.status
                })
            })

            console.log("Update response:", response); // Debug log

            setNotes(prev => prev.map(note =>
                note.id === editingNote.id ? response.note : note
            ))
            setSelectedNote(response.note)
            setEditingNote(null)
            setViewMode("preview")
            loadCategories()
            loadTags()
        } catch (error) {
            console.error("Failed to update note:", error)
            alert(`Failed to update note: ${error.message}`)
        }
    }

    async function deleteNote(noteId) {
        if (!confirm("Are you sure you want to delete this note?")) return

        try {
            await fetchJSON(`${apiBase}/api/enhanced-target-notes/${noteId}`, {
                method: "DELETE"
            })

            setNotes(prev => prev.filter(note => note.id !== noteId))
            if (selectedNote?.id === noteId) {
                setSelectedNote(filteredNotes.find(note => note.id !== noteId) || null)
            }
            loadCategories()
            loadTags()
        } catch (error) {
            console.error("Failed to delete note", error)
            alert("Failed to delete note")
        }
    }

    function startEdit(note) {
        setEditingNote({ ...note })
        setViewMode("edit")
    }

    function cancelEdit() {
        setEditingNote(null)
        setViewMode("preview")
    }

    function cancelCreate() {
        setIsCreating(false)
        setNewNote({
            title: "",
            content: "",
            target: "",
            category: "findings",
            tags: [],
            severity: "medium",
            status: "draft"
        })
    }

    function addTagToNewNote() {
        if (newTag.trim() && !newNote.tags.includes(newTag.trim())) {
            setNewNote(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }))
        }
        setNewTag("")
    }

    function removeTagFromNewNote(tagToRemove) {
        setNewNote(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }))
    }

    function addTagToEditingNote() {
        const tagInput = document.getElementById('editing-tag-input')
        if (tagInput && tagInput.value.trim() && !editingNote.tags.includes(tagInput.value.trim())) {
            setEditingNote(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.value.trim()]
            }))
            tagInput.value = ""
        }
    }

    function removeTagFromEditingNote(tagToRemove) {
        setEditingNote(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }))
    }

    function insertMarkdownSyntax(syntax) {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)

        let newText = ""
        let newCursorPos = start

        switch (syntax) {
            case "bold":
                newText = `**${selectedText}**`
                newCursorPos = start + 2
                break
            case "italic":
                newText = `*${selectedText}*`
                newCursorPos = start + 1
                break
            case "code":
                newText = selectedText.includes('\n') ? `\`\`\`\n${selectedText}\n\`\`\`` : `\`${selectedText}\``
                newCursorPos = start + (selectedText.includes('\n') ? 4 : 1)
                break
            case "link":
                newText = `[${selectedText || "link text"}](https://)`
                newCursorPos = start + (selectedText ? selectedText.length + 3 : 10)
                break
            case "list":
                newText = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : "- "
                newCursorPos = start + 2
                break
            default:
                return
        }

        const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end)

        if (editingNote) {
            setEditingNote(prev => ({ ...prev, content: newContent }))
        } else {
            setNewNote(prev => ({ ...prev, content: newContent }))
        }

        // Focus and set cursor position
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(newCursorPos, newCursorPos + (selectedText ? selectedText.length : 0))
        }, 0)
    }

    function exportNotes() {
        const data = {
            project: currentProject.name,
            exportDate: new Date().toISOString(),
            notes: filteredNotes
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pentest-notes-${currentProject.name}-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Get unique targets from notes
    const targets = [...new Set(notes.map(note => note.target))].sort()

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return <AlertTriangle className="h-4 w-4" />
            case 'high': return <AlertTriangle className="h-4 w-4" />
            case 'medium': return <Info className="h-4 w-4" />
            case 'low': return <Info className="h-4 w-4" />
            default: return <Info className="h-4 w-4" />
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="h-4 w-4" />
            case 'in_review': return <Eye className="h-4 w-4" />
            default: return <Edit className="h-4 w-4" />
        }
    }

    const NoteListItem = React.memo(({
        note,
        isSelected,
        sidebarCollapsed,
        onClick
    }: {
        note: Note;
        isSelected: boolean;
        sidebarCollapsed: boolean;
        onClick: () => void;
    }) => (
        <div
            className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
            onClick={onClick}
        >
            {sidebarCollapsed ? (
                <div className="flex flex-col items-center space-y-1">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <div className={`w-2 h-2 rounded-full ${note.severity === 'critical' ? 'bg-red-500' :
                        note.severity === 'high' ? 'bg-orange-500' :
                            note.severity === 'medium' ? 'bg-yellow-500' :
                                note.severity === 'low' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                </div>
            ) : (
                <>
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
                            {note.title}
                        </h4>
                        <Badge
                            variant="outline"
                            className={`text-xs ${note.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                note.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    note.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                        note.severity === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                        >
                            {note.severity?.charAt(0).toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {note.content.substring(0, 60)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                            {note.target}
                        </span>
                        <span>{new Date(note.updated_at * 1000).toLocaleDateString()}</span>
                    </div>
                </>
            )}
        </div>
    ))

    NoteListItem.displayName = 'NoteListItem'

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">

                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Pentest Notes
                        </h1>
                        <p className="text-muted-foreground text-lg mt-2">
                            Professional note-taking for penetration testers with Markdown support
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {currentProject && (
                            <>
                                <Button variant="outline" onClick={exportNotes}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                                <Button
                                    onClick={() => setIsCreating(true)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={isCreating}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Note
                                </Button>
                            </>
                        )}
                    </div>


                </div>

                {/* Filters */}
                {!sidebarCollapsed && (
                    <Card className="bg-white/80 backdrop-blur-sm border-blue-200 mb-4">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4 items-end"> {/* Change this line */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                                    <Input
                                        placeholder="Search notes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full text-sm"
                                    />
                                </div>

                                <div className="min-w-[150px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Target</label>
                                    <select
                                        value={selectedTarget}
                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">All Targets</option>
                                        {targets.map(target => (
                                            <option key={target} value={target}>{target}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="min-w-[150px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="min-w-[150px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">All Status</option>
                                        {statusOptions.map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quick Stats */}
                                <div className="min-w-[200px]">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Stats</h4>
                                    <div className="space-y-1 text-xs text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Total Notes:</span>
                                            <span className="font-medium">{notes.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Filtered:</span>
                                            <span className="font-medium">{filteredNotes.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Completed:</span>
                                            <span className="font-medium">
                                                {notes.filter(n => n.status === 'completed').length}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Project Selection */}
                {!currentProject ? (
                    <Card className="border-2 border-dashed border-blue-200 bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-8 text-center">
                            <FileText className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Project</h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Choose a penetration testing project to start managing your target notes, findings, and evidence.
                            </p>
                            <Button
                                onClick={() => setShowProjectSelector(true)}
                                className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                            >
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Select Project
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex gap-6 h-[calc(100vh-200px)]">
                        {/* Sidebar */}
                        <div className={`flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-80'
                            }`}>
                            {/* Project Info */}
                            <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg mb-4">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <FolderOpen className="h-5 w-5 text-blue-600" />
                                            </div>
                                            {!sidebarCollapsed && (
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">{currentProject.name}</h3>
                                                    <p className="text-xs text-gray-600 truncate">
                                                        {currentProject.target}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                        </Button>
                                    </div>

                                    {!sidebarCollapsed && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>{notes.length} notes</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowProjectSelector(true)}
                                                    className="h-6 text-xs"
                                                >
                                                    Change
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>


                            {/* Notes List */}
                            <Card className="bg-white/80 backdrop-blur-sm border-blue-200 flex-1">
                                <CardHeader className={`pb-3 ${sidebarCollapsed ? 'text-center' : ''}`}>
                                    <CardTitle className={`text-sm flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                                        <List className="h-4 w-4" />
                                        {!sidebarCollapsed && `Notes (${filteredNotes.length})`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className={`p-2 ${sidebarCollapsed ? 'text-center' : ''}`}>
                                    {filteredNotes.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            {!sidebarCollapsed && <p className="text-sm">No notes found</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                                            {filteredNotes.map(note => (
                                                <div
                                                    key={note.id}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedNote?.id === note.id
                                                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    onClick={() => {
                                                        setSelectedNote(note)
                                                        setEditingNote(null)
                                                        setViewMode("preview")
                                                    }}
                                                >
                                                    {sidebarCollapsed ? (
                                                        <div className="flex flex-col items-center space-y-1">
                                                            <FileText className="h-4 w-4 text-gray-600" />
                                                            <div className={`w-2 h-2 rounded-full ${note.severity === 'critical' ? 'bg-red-500' :
                                                                note.severity === 'high' ? 'bg-orange-500' :
                                                                    note.severity === 'medium' ? 'bg-yellow-500' :
                                                                        note.severity === 'low' ? 'bg-blue-500' : 'bg-gray-500'
                                                                }`} />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
                                                                    {note.title}
                                                                </h4>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs ${note.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                        note.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                            note.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                note.severity === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                                    'bg-gray-100 text-gray-800 border-gray-200'
                                                                        }`}
                                                                >
                                                                    {note.severity?.charAt(0).toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                                {note.content.substring(0, 60)}...
                                                            </p>
                                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                                <span className="bg-gray-100 px-2 py-1 rounded">
                                                                    {note.target}
                                                                </span>
                                                                <span>{new Date(note.updated_at * 1000).toLocaleDateString()}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col">
                            {/* Create Note Form */}
                            {isCreating && (
                                <Card className="border-2 border-blue-300 bg-white/90 backdrop-blur-sm shadow-xl mb-6">
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                        <CardTitle className="flex items-center gap-2 text-blue-900">
                                            <Plus className="h-5 w-5" />
                                            Create New Note
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Target *</label>
                                                <Input
                                                    placeholder="e.g., 192.168.1.1 or example.com"
                                                    value={newNote.target}
                                                    onChange={(e) => setNewNote(prev => ({ ...prev, target: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Title *</label>
                                                <Input
                                                    placeholder="Note title..."
                                                    value={newNote.title}
                                                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                                                <select
                                                    value={newNote.category}
                                                    onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                >
                                                    {categoriesOptions.map(category => (
                                                        <option key={category} value={category}>{category}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Severity</label>
                                                <select
                                                    value={newNote.severity}
                                                    onChange={(e) => setNewNote(prev => ({ ...prev, severity: e.target.value }))}
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                >
                                                    {severityOptions.map(severity => (
                                                        <option key={severity.value} value={severity.value}>{severity.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Add tag..."
                                                        value={newTag}
                                                        onChange={(e) => setNewTag(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && addTagToNewNote()}
                                                        className="flex-1"
                                                    />
                                                    <Button onClick={addTagToNewNote} size="sm">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tags Display */}
                                        {newNote.tags.length > 0 && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Current Tags</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {newNote.tags.map(tag => (
                                                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                                            {tag}
                                                            <X
                                                                className="h-3 w-3 cursor-pointer"
                                                                onClick={() => removeTagFromNewNote(tag)}
                                                            />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Content Editor */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-700">Content *</label>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => insertMarkdownSyntax("bold")}
                                                        className="h-8 px-2"
                                                    >
                                                        <span className="font-bold">B</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => insertMarkdownSyntax("italic")}
                                                        className="h-8 px-2"
                                                    >
                                                        <span className="italic">I</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => insertMarkdownSyntax("code")}
                                                        className="h-8 px-2"
                                                    >
                                                        <code>{`</>`}</code>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => insertMarkdownSyntax("link")}
                                                        className="h-8 px-2"
                                                    >
                                                        <Link className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => insertMarkdownSyntax("list")}
                                                        className="h-8 px-2"
                                                    >
                                                        <List className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Textarea
                                                ref={textareaRef}
                                                placeholder="Write your note in Markdown... You can include code blocks, tables, lists, and more."
                                                value={newNote.content}
                                                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                                                rows={15}
                                                className="font-mono text-sm resize-none"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-4 border-t">
                                            <Button onClick={createNote} className="bg-blue-600 hover:bg-blue-700">
                                                <Save className="h-4 w-4 mr-2" />
                                                Create Note
                                            </Button>
                                            <Button variant="outline" onClick={cancelCreate}>
                                                <X className="h-4 w-4 mr-2" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Note Detail View */}
                            {selectedNote && !isCreating && (
                                <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-2 border-blue-200 flex-1 flex flex-col">
                                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-3">
                                                {/* Title and Status */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        {editingNote?.id === selectedNote.id ? (
                                                            <Input
                                                                value={editingNote.title}
                                                                onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                                                                className="text-2xl font-bold border-0 shadow-none focus:ring-0 p-0"
                                                                placeholder="Note title..."
                                                            />
                                                        ) : (
                                                            <CardTitle className="text-2xl text-gray-900">{selectedNote.title}</CardTitle>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        {editingNote?.id === selectedNote.id ? (
                                                            <>
                                                                <Button
                                                                    onClick={updateNote}
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    size="sm"
                                                                >
                                                                    <Save className="h-4 w-4 mr-2" />
                                                                    Save
                                                                </Button>
                                                                <Button variant="outline" onClick={cancelEdit} size="sm">
                                                                    <X className="h-4 w-4 mr-2" />
                                                                    Cancel
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`flex items-center gap-1 ${selectedNote.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                        selectedNote.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                            selectedNote.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                selectedNote.severity === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                                    'bg-gray-100 text-gray-800 border-gray-200'
                                                                        }`}
                                                                >
                                                                    {getSeverityIcon(selectedNote.severity)}
                                                                    {selectedNote.severity}
                                                                </Badge>
                                                                {/* EDIT BUTTON ADDED HERE */}
                                                                <Button
                                                                    onClick={() => startEdit(selectedNote)}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Edit className="h-4 w-4 mr-2" />
                                                                    Edit
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => deleteNote(selectedNote.id)} className="text-red-600">
                                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata */}
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Tag className="h-4 w-4" />
                                                        {editingNote?.id === selectedNote.id ? (
                                                            <select
                                                                value={editingNote.category}
                                                                onChange={(e) => setEditingNote(prev => ({ ...prev, category: e.target.value }))}
                                                                className="border rounded px-2 py-1 text-sm"
                                                            >
                                                                {categoriesOptions.map(category => (
                                                                    <option key={category} value={category}>{category}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                                                {selectedNote.category}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Pin className="h-4 w-4" />
                                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{selectedNote.target}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {editingNote?.id === selectedNote.id ? (
                                                            <select
                                                                value={editingNote.status}
                                                                onChange={(e) => setEditingNote(prev => ({ ...prev, status: e.target.value }))}
                                                                className="border rounded px-2 py-1 text-sm"
                                                            >
                                                                {statusOptions.map(status => (
                                                                    <option key={status.value} value={status.value}>{status.label}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <>
                                                                {getStatusIcon(selectedNote.status)}
                                                                <span className="capitalize">{selectedNote.status.replace('_', ' ')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Updated: {new Date(selectedNote.updated_at * 1000).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Tags */}
                                                {(selectedNote.tags && selectedNote.tags.length > 0) || editingNote?.id === selectedNote.id ? (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-700">Tags:</span>
                                                        {editingNote?.id === selectedNote.id ? (
                                                            <>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {editingNote.tags.map(tag => (
                                                                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                                                            {tag}
                                                                            <X
                                                                                className="h-3 w-3 cursor-pointer"
                                                                                onClick={() => removeTagFromEditingNote(tag)}
                                                                            />
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        id="editing-tag-input"
                                                                        placeholder="Add tag..."
                                                                        className="w-32 h-6 text-xs"
                                                                        onKeyPress={(e) => e.key === 'Enter' && addTagToEditingNote()}
                                                                    />
                                                                    <Button onClick={addTagToEditingNote} size="sm" className="h-6">
                                                                        <Plus className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            selectedNote.tags.map(tag => (
                                                                <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                    <Tag className="h-3 w-3 mr-1" />
                                                                    {tag}
                                                                </Badge>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex-1 p-6">
                                        {editingNote?.id === selectedNote.id ? (
                                            <div className="h-full flex flex-col">
                                                {/* Content Editor */}
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-sm font-medium text-gray-700">Content</label>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => insertMarkdownSyntax("bold")}
                                                                className="h-8 px-2"
                                                            >
                                                                <span className="font-bold">B</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => insertMarkdownSyntax("italic")}
                                                                className="h-8 px-2"
                                                            >
                                                                <span className="italic">I</span>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => insertMarkdownSyntax("code")}
                                                                className="h-8 px-2"
                                                            >
                                                                <code>{`</>`}</code>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => insertMarkdownSyntax("link")}
                                                                className="h-8 px-2"
                                                            >
                                                                <Link className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => insertMarkdownSyntax("list")}
                                                                className="h-8 px-2"
                                                            >
                                                                <List className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Textarea
                                                        ref={textareaRef}
                                                        value={editingNote.content}
                                                        onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                                                        className="font-mono text-sm flex-1 resize-none"
                                                        placeholder="Write your note content here..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="prose prose-lg max-w-none h-full">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {selectedNote.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Empty State */}
                            {!selectedNote && !isCreating && (
                                <Card className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-blue-200 flex-1 flex items-center justify-center">
                                    <CardContent className="p-12 text-center">
                                        <FileText className="h-24 w-24 text-blue-300 mx-auto mb-6" />
                                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Note Selected</h3>
                                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                            Select a note from the sidebar to view its contents, or create a new note to get started.
                                        </p>
                                        <Button
                                            onClick={() => setIsCreating(true)}
                                            className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                                        >
                                            <Plus className="h-5 w-5 mr-2" />
                                            Create Your First Note
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* Project Selector Modal */}
                {showProjectSelector && (
                    <ProjectSelector
                        currentProject={currentProject}
                        onProjectSelect={(project: Project) => {
                            setCurrentProject(project)
                            setShowProjectSelector(false)
                        }}
                        onProjectCreate={(projectData: Omit<Project, 'id' | 'createdAt' | 'status'>) => {
                            const project: Project = {
                                ...projectData,
                                id: Date.now(),
                                createdAt: new Date().toISOString(),
                                status: "active"
                            }
                            setProjects(prev => [...prev, project])
                            setCurrentProject(project)
                            setShowProjectSelector(false)
                        }}
                        onClose={() => setShowProjectSelector(false)}
                    />
                )}
            </div>
        </div>
    )
}