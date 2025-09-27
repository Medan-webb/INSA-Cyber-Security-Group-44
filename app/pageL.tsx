"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Shield, Trash2, Menu, Terminal, FileText, GripVertical, Download, Globe, Edit } from "lucide-react"

interface Methodology {
  id: number
  name: string
  description: string
  commands: string[]
  target?: string
  targetIP?: string
}

export default function PentestMethodologies() {
  const [methodologies, setMethodologies] = useState<Methodology[]>([
    {
      id: 1,
      name: "Web Application Scan",
      description: "Comprehensive security assessment of web applications to identify vulnerabilities",
      commands: ["nmap -sV -sC target.com", "nikto -h target.com", "sqlmap -u 'http://target.com/page?id=1'"],
    },
    {
      id: 2,
      name: "Network Penetration Test",
      description: "Network infrastructure security testing to find entry points and vulnerabilities",
      commands: [
        "nmap -sS -O target-network",
        "masscan -p1-65535 target-network --rate=1000",
        "nessus_scan target-network",
      ],
    },
    {
      id: 3,
      name: "API Security Assessment",
      description: "Testing REST/GraphQL APIs for authentication, authorization, and data exposure issues",
      commands: [
        "burp-suite --target=api.target.com",
        "postman-newman run api-tests.json",
        "owasp-zap -quickurl http://api.target.com",
      ],
    },
    {
      id: 4,
      name: "OWASP Top 10 Testing",
      description: "Systematic testing for the most critical web application security risks",
      commands: [
        "owasp-zap -quickscan http://target.com",
        "burp-suite --scan-owasp-top10 target.com",
        "wpscan --url http://target.com --enumerate u,p,t",
      ],
    },
    {
      id: 5,
      name: "Wireless Security Assessment",
      description: "Testing wireless networks for security vulnerabilities and misconfigurations",
      commands: [
        "airodump-ng wlan0mon",
        "aircrack-ng -w wordlist.txt capture.cap",
        "reaver -i wlan0mon -b [BSSID] -vv",
      ],
    },
    {
      id: 6,
      name: "Social Engineering Assessment",
      description: "Testing human factors and awareness through phishing and social engineering techniques",
      commands: ["setoolkit", "gophish --config config.json", "beef-xss"],
    },
    {
      id: 7,
      name: "Mobile Application Testing",
      description: "Security assessment of mobile applications for Android and iOS platforms",
      commands: [
        "mobsf --scan app.apk",
        "frida -U -f com.example.app -l script.js",
        "objection -g com.example.app explore",
      ],
    },
    {
      id: 8,
      name: "Database Security Testing",
      description: "Testing database systems for misconfigurations and injection vulnerabilities",
      commands: [
        "sqlmap -u 'http://target.com/login' --forms --dbs",
        "nmap --script mysql-audit --script-args 'mysql-audit.username=root'",
        "nosqlmap -t http://target.com/api --verb POST",
      ],
    },
    {
      id: 9,
      name: "Active Directory Assessment",
      description: "Testing Windows Active Directory environments for privilege escalation and lateral movement",
      commands: [
        "bloodhound-python -u username -p password -ns dc.domain.com -d domain.com",
        "impacket-secretsdump domain/user:password@dc.domain.com",
        "crackmapexec smb target-range -u username -p password",
      ],
    },
    {
      id: 10,
      name: "Cloud Security Assessment",
      description: "Testing cloud infrastructure and services for misconfigurations and vulnerabilities",
      commands: [
        "scout suite --provider aws",
        "cloudsploit --cloud aws --config config.js",
        "pacu --session newsession",
      ],
    },
  ])

  const [newMethodologyName, setNewMethodologyName] = useState("")
  const [newMethodologyDescription, setNewMethodologyDescription] = useState("")
  const [newMethodologyCommands, setNewMethodologyCommands] = useState("")
  const [newCommand, setNewCommand] = useState("")

  const apiBase = "http://127.0.0.1:5000";
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null)
  const [editingCommandText, setEditingCommandText] = useState("")
  const [terminalOutput, setTerminalOutput] = useState<
    { command: string; output: string; status: "success" | "failed" | "running" }[]
  >([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isRunningAll, setIsRunningAll] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedMethodology, setSelectedMethodology] = useState<Methodology | null>(null)

  const addMethodology = () => {
    if (newMethodologyName.trim() === "") return

    const commandsArray = newMethodologyCommands
      .split("\n")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0)

    const newMethodology: Methodology = {
      id: Date.now(),
      name: newMethodologyName.trim(),
      description: newMethodologyDescription.trim(),
      commands: commandsArray,
    }

    setMethodologies([...methodologies, newMethodology])
    setNewMethodologyName("")
    setNewMethodologyDescription("")
    setNewMethodologyCommands("")
  }

  const deleteMethodology = (id: number) => {
    setMethodologies(methodologies.filter((method) => method.id !== id))
    if (selectedMethodology?.id === id) {
      setSelectedMethodology(null)
    }
  }
  async function fetchJSON(url, options) {
        try {
          const res = await fetch(url, options);
          return await res.json();
        } catch (e) {
          console.error(e);
          return null;
        }
      }

  const runCommand = async (command: string) => {
    console.log(`Running command: ${command}`);

    if (!command) return;
            const res = await fetchJSON(`${apiBase}/exec`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command }),
            });
            
    const newOutput = {
      command,
      output: `[Command executed successfully - output would appear here]`,
      status: Math.random() > 0.3 ? "success" : ("failed" as "success" | "failed"),
    }
    setTerminalOutput((prev) => [...prev, newOutput])
  }

  const runAllCommands = async () => {
    if (!selectedMethodology || selectedMethodology.commands.length === 0) return

    setIsRunningAll(true)
    setTerminalOutput([])

    for (let i = 0; i < selectedMethodology.commands.length; i++) {
      const command = selectedMethodology.commands[i]
      runCommand(command);

      // Add running status
      setTerminalOutput((prev) => [
        ...prev,
        {
          command,
          output: "Running...",
          status: "running",
        },
      ])

      // Simulate command execution delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update with result
      setTerminalOutput((prev) => {
        const newOutput = [...prev]
        newOutput[newOutput.length - 1] = {
          command,
          output: `[Command executed - output would appear here]`,
          status: Math.random() > 0.3 ? "success" : ("failed" as "success" | "failed"),
        }
        return newOutput
      })
    }

    setIsRunningAll(false)
  }

  const exportToJSON = () => {
    const exportData = {
      methodologies: methodologies,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = "pentest-methodologies.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resolveIP = async () => {
    if (!selectedMethodology?.target) return

    // Simulate IP resolution
    const mockIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

    const updatedMethodologies = methodologies.map((method) => {
      if (method.id === selectedMethodology.id) {
        const updatedMethod = { ...method, targetIP: mockIP }
        setSelectedMethodology(updatedMethod)
        return updatedMethod
      }
      return method
    })

    setMethodologies(updatedMethodologies)
  }

  const updateTarget = (target: string) => {
    if (!selectedMethodology) return

    const updatedMethodologies = methodologies.map((method) => {
      if (method.id === selectedMethodology.id) {
        const updatedMethod = { ...method, target, targetIP: undefined }
        setSelectedMethodology(updatedMethod)
        return updatedMethod
      }
      return method
    })

    setMethodologies(updatedMethodologies)
  }

  const deleteCommand = (methodologyId: number, commandIndex: number) => {
    setMethodologies(
      methodologies.map((method) => {
        if (method.id === methodologyId) {
          const updatedCommands = method.commands.filter((_, index) => index !== commandIndex)
          const updatedMethod = { ...method, commands: updatedCommands }

          if (selectedMethodology?.id === methodologyId) {
            setSelectedMethodology(updatedMethod)
          }

          return updatedMethod
        }
        return method
      }),
    )
  }

  const addCommandToMethodology = () => {
    if (!selectedMethodology || newCommand.trim() === "") return

    const updatedMethodologies = methodologies.map((method) => {
      if (method.id === selectedMethodology.id) {
        const updatedMethod = {
          ...method,
          commands: [...method.commands, newCommand.trim()],
        }
        setSelectedMethodology(updatedMethod)
        return updatedMethod
      }
      return method
    })

    setMethodologies(updatedMethodologies)
    setNewCommand("")
  }

  const startEditCommand = (index: number, command: string) => {
    setEditingCommandIndex(index)
    setEditingCommandText(command)
  }

  const saveEditCommand = () => {
    if (!selectedMethodology || editingCommandIndex === null) return

    const updatedMethodologies = methodologies.map((method) => {
      if (method.id === selectedMethodology.id) {
        const updatedCommands = [...method.commands]
        updatedCommands[editingCommandIndex] = editingCommandText.trim()
        const updatedMethod = { ...method, commands: updatedCommands }
        setSelectedMethodology(updatedMethod)
        return updatedMethod
      }
      return method
    })

    setMethodologies(updatedMethodologies)
    setEditingCommandIndex(null)
    setEditingCommandText("")
  }

  const cancelEditCommand = () => {
    setEditingCommandIndex(null)
    setEditingCommandText("")
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!selectedMethodology || draggedIndex === null || draggedIndex === dropIndex) return

    const updatedMethodologies = methodologies.map((method) => {
      if (method.id === selectedMethodology.id) {
        const updatedCommands = [...method.commands]
        const draggedCommand = updatedCommands[draggedIndex]
        updatedCommands.splice(draggedIndex, 1)
        updatedCommands.splice(dropIndex, 0, draggedCommand)
        const updatedMethod = { ...method, commands: updatedCommands }
        setSelectedMethodology(updatedMethod)
        return updatedMethod
      }
      return method
    })

    setMethodologies(updatedMethodologies)
    setDraggedIndex(null)
  }

  const clearTerminalOutput = () => {
    setTerminalOutput([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      addMethodology()
    }
  }

  const handleCommandKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      addCommandToMethodology()
    }
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`
fixed lg:static lg:h-screen inset-y-0 left-0 z-50 w-96 bg-white border-r transform transition-transform duration-200 ease-in-out overflow-hidden
${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
`}

      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-gray-800" />
              <h2 className="text-xl font-bold text-gray-800">Methodologies</h2>
            </div>
            <p className="text-sm text-gray-600">Manage your pentest workflows</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-gray-800">
                  <Plus className="h-4 w-4" />
                  Add New Methodology
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="text"
                  placeholder="Methodology name..."
                  value={newMethodologyName}
                  onChange={(e) => setNewMethodologyName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                />
                <Textarea
                  placeholder="Description of what this methodology does..."
                  value={newMethodologyDescription}
                  onChange={(e) => setNewMethodologyDescription(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm min-h-[60px] resize-none bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                />
                <Textarea
                  placeholder="Commands to run (one per line)..."
                  value={newMethodologyCommands}
                  onChange={(e) => setNewMethodologyCommands(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm min-h-[80px] font-mono resize-none bg-white border-gray-300 text-gray-800 placeholder-gray-500"
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
                <p className="text-xs text-gray-500">Press Ctrl+Enter to add quickly</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-800">Methodologies ({methodologies.length})</CardTitle>
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
                        className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                          selectedMethodology?.id === methodology.id
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
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteMethodology(methodology.id)
                            }}
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
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">Total: {methodologies.length} methodologies</div>
          </div>
        </div>
      </div>

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
            {selectedMethodology ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMethodology(null)}
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Back to Dashboard
                  </Button>

                  <Button
                    onClick={exportToJSON}
                    size="sm"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Export JSON
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">{selectedMethodology.name}</h1>
                </div>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Target
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter target (e.g., google.com)"
                        value={selectedMethodology.target || ""}
                        onChange={(e) => updateTarget(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={resolveIP}
                        disabled={!selectedMethodology.target}
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        Resolve IP
                      </Button>
                    </div>
                    {selectedMethodology.targetIP && (
                      <p className="text-sm text-muted-foreground">
                        Resolved IP: <code className="bg-muted px-2 py-1 rounded">{selectedMethodology.targetIP}</code>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedMethodology.description || "No description provided."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-gray-200/80 backdrop-blur-sm bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      Commands ({selectedMethodology.commands.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-b pb-4">
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Enter new command, use {{TARGET}} {{TARGET_IP}} {{USERNAME}} {{PASSWORD}}"
                          value={newCommand}
                          onChange={(e) => setNewCommand(e.target.value)}
                          onKeyPress={handleCommandKeyPress}
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          onClick={addCommandToMethodology}
                          disabled={!newCommand.trim()}
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          Add Command
                        </Button>
                      </div>

                      {selectedMethodology.commands.length > 0 && (
                        <Button
                          onClick={runAllCommands}
                          disabled={isRunningAll}
                          className="bg-cyan-600 hover:bg-cyan-700 mb-3"
                        >
                          {isRunningAll ? "Running..." : "Run All Commands Step-by-Step"}
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground">Press Ctrl+Enter to add quickly</p>
                    </div>

                    {selectedMethodology.commands.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMethodology.commands.map((command, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                            {editingCommandIndex === index ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editingCommandText}
                                  onChange={(e) => setEditingCommandText(e.target.value)}
                                  className="font-mono text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") saveEditCommand()
                                    if (e.key === "Escape") cancelEditCommand()
                                  }}
                                />
                                <Button size="sm" onClick={saveEditCommand} className="bg-green-600 hover:bg-green-700">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditCommand}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <code className="flex-1 text-sm font-mono">{command}</code>
                                <Button
                                  size="sm"
                                  onClick={() => runCommand(command)}
                                  className="flex-shrink-0 bg-black hover:bg-green-600 text-white"
                                >
                                  Run
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => startEditCommand(index, command)}
                                  className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteCommand(selectedMethodology.id, index)}
                                  className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        terminalOutput.map((result, index) => (
                          <div key={index} className="mb-3 border-b border-gray-700 pb-2 last:border-b-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  result.status === "success"
                                    ? "bg-green-400"
                                    : result.status === "failed"
                                      ? "bg-red-400"
                                      : "bg-yellow-400"
                                }`}
                              />
                              <span className="text-cyan-400">{result.command}</span>
                              <span className="ml-auto text-xs text-gray-400">
                                {result.status === "success"
                                  ? "Success"
                                  : result.status === "failed"
                                    ? "Failed"
                                    : "Running"}
                              </span>
                            </div>
                            <div className="text-gray-300 ml-4 text-xs">{result.output}</div>
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
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  A collaborative platform for designing and executing penetration testing workflows.
                </p>
                <div className="mt-8">
                  <p className="text-muted-foreground">
                    Select a methodology from the sidebar to view its details and commands.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
