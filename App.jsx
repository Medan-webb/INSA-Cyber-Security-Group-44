"use client"

import { useState } from "react"
import "./App.css"

const App = () => {
  const [methodologies, setMethodologies] = useState([
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
  const [editingCommandIndex, setEditingCommandIndex] = useState(null)
  const [editingCommandText, setEditingCommandText] = useState("")
  const [terminalOutput, setTerminalOutput] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedMethodology, setSelectedMethodology] = useState(null)

  const addMethodology = () => {
    if (newMethodologyName.trim() === "") return

    const commandsArray = newMethodologyCommands
      .split("\n")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0)

    const newMethodology = {
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

  const deleteMethodology = (id) => {
    setMethodologies(methodologies.filter((method) => method.id !== id))
    if (selectedMethodology?.id === id) {
      setSelectedMethodology(null)
    }
  }

  const runCommand = (command) => {
    console.log(`Running command: ${command}`)
    const newOutput = {
      command,
      output: `[Command executed successfully - output would appear here]`,
      status: Math.random() > 0.3 ? "success" : "failed",
    }
    setTerminalOutput((prev) => [...prev, newOutput])
  }

  const runAllCommands = async () => {
    if (!selectedMethodology || selectedMethodology.commands.length === 0) return

    setIsRunningAll(true)
    setTerminalOutput([])

    for (let i = 0; i < selectedMethodology.commands.length; i++) {
      const command = selectedMethodology.commands[i]

      setTerminalOutput((prev) => [
        ...prev,
        {
          command,
          output: "Running...",
          status: "running",
        },
      ])

      await new Promise((resolve) => setTimeout(resolve, 1000))

      setTerminalOutput((prev) => {
        const newOutput = [...prev]
        newOutput[newOutput.length - 1] = {
          command,
          output: `[Command executed - output would appear here]`,
          status: Math.random() > 0.3 ? "success" : "failed",
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

  const updateTarget = (target) => {
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

  const deleteCommand = (methodologyId, commandIndex) => {
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

  const startEditCommand = (index, command) => {
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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e, dropIndex) => {
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      addMethodology()
    }
  }

  const handleCommandKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      addCommandToMethodology()
    }
  }
 // Run single command by sending to backend
  async function runCommand2(command) {
    try {
      await fetch('http://127.0.0.1:5000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
    } catch (err) {
      alert('Error sending command: ' + err.message);
    }
  }
  

  return (
    <div className="app">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="header-title">
              <span className="shield-icon">🛡️</span>
              <h2>Methodologies</h2>
            </div>
            <p className="header-subtitle">Manage your pentest workflows</p>
          </div>

          <div className="sidebar-body">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span className="plus-icon">➕</span>
                  Add New Methodology
                </h3>
              </div>
              <div className="card-content">
                <input
                  type="text"
                  placeholder="Methodology name..."
                  value={newMethodologyName}
                  onChange={(e) => setNewMethodologyName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input"
                />
                <textarea
                  placeholder="Description of what this methodology does..."
                  value={newMethodologyDescription}
                  onChange={(e) => setNewMethodologyDescription(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="textarea"
                  rows="3"
                />
                <textarea
                  placeholder="Commands to run (one per line)..."
                  value={newMethodologyCommands}
                  onChange={(e) => setNewMethodologyCommands(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="textarea mono"
                  rows="4"
                />
                <button
                  onClick={addMethodology}
                  disabled={!newMethodologyName.trim()}
                  className="button button-primary"
                >
                  ➕ Add Methodology
                </button>
                <p className="help-text">Press Ctrl+Enter to add quickly</p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Methodologies ({methodologies.length})</h3>
              </div>
              <div className="card-content">
                {methodologies.length === 0 ? (
                  <div className="empty-state">
                    <span className="shield-icon">🛡️</span>
                    <p>No methodologies yet</p>
                  </div>
                ) : (
                  <div className="methodology-list">
                    {methodologies.map((methodology) => (
                      <div
                        key={methodology.id}
                        className={`methodology-item ${selectedMethodology?.id === methodology.id ? "selected" : ""}`}
                        onClick={() => setSelectedMethodology(methodology)}
                      >
                        <div className="methodology-info">
                          <span className="shield-icon">🛡️</span>
                          <h4>{methodology.name}</h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMethodology(methodology.id)
                          }}
                          className="button button-danger button-small"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="total-count">Total: {methodologies.length} methodologies</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="mobile-header">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <h1>Pentest Dashboard</h1>
          <div></div>
        </div>

        <div className="content">
          <div className="container">
            {selectedMethodology ? (
              <div className="methodology-details">
                <div className="details-header">
                  <button className="button button-outline" onClick={() => setSelectedMethodology(null)}>
                    🛡️ Back to Dashboard
                  </button>

                  <button onClick={exportToJSON} className="button button-blue">
                    📥 Export JSON
                  </button>
                </div>

                <div className="methodology-title">
                  <span className="shield-icon">🛡️</span>
                  <h1>{selectedMethodology.name}</h1>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span className="globe-icon">🌐</span>
                      Target
                    </h3>
                  </div>
                  <div className="card-content">
                    <div className="target-input">
                      <input
                        placeholder="Enter target (e.g., google.com)"
                        value={selectedMethodology.target || ""}
                        onChange={(e) => updateTarget(e.target.value)}
                        className="input"
                      />
                      <button onClick={resolveIP} disabled={!selectedMethodology.target} className="button button-cyan">
                        Resolve IP
                      </button>
                    </div>
                    {selectedMethodology.targetIP && (
                      <p className="resolved-ip">
                        Resolved IP: <code>{selectedMethodology.targetIP}</code>
                      </p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span className="file-icon">📄</span>
                      Description
                    </h3>
                  </div>
                  <div className="card-content">
                    <p className="description">{selectedMethodology.description || "No description provided."}</p>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span className="terminal-icon">💻</span>
                      Commands ({selectedMethodology.commands.length})
                    </h3>
                  </div>
                  <div className="card-content">
                    <div className="commands-header">
                      <div className="add-command">
                        <input
                          placeholder="Enter new command, use {{TARGET}} {{TARGET_IP}} {{USERNAME}} {{PASSWORD}}"
                          value={newCommand}
                          onChange={(e) => setNewCommand(e.target.value)}
                          onKeyPress={handleCommandKeyPress}
                          className="input mono"
                        />
                        <button
                          onClick={addCommandToMethodology}
                          disabled={!newCommand.trim()}
                          className="button button-cyan"
                        >
                          Add Command
                        </button>
                      </div>

                      {selectedMethodology.commands.length > 0 && (
                        <button onClick={runAllCommands} disabled={isRunningAll} className="button button-cyan run-all">
                          {isRunningAll ? "Running..." : "Run All Commands Step-by-Step"}
                        </button>
                      )}

                      <p className="help-text">Press Ctrl+Enter to add quickly</p>
                    </div>

                    {selectedMethodology.commands.length > 0 ? (
                      <div className="commands-list">
                        {selectedMethodology.commands.map((command, index) => (
                          <div
                            key={index}
                            className="command-item"
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                          >
                            <span className="drag-handle">⋮⋮</span>

                            {editingCommandIndex === index ? (
                              <div className="edit-command">
                                <input
                                  value={editingCommandText}
                                  onChange={(e) => setEditingCommandText(e.target.value)}
                                  className="input mono"
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") saveEditCommand()
                                    if (e.key === "Escape") cancelEditCommand()
                                  }}
                                />
                                <button onClick={saveEditCommand} className="button button-green">
                                  Save
                                </button>
                                <button onClick={cancelEditCommand} className="button button-outline">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <code className="command-text">{command}</code>
                                <button onClick={() => runCommand2(command)} className="button button-black">
                                  ▶ Run
                                </button>
                                <button onClick={() => startEditCommand(index, command)} className="button button-blue">
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteCommand(selectedMethodology.id, index)}
                                  className="button button-red"
                                >
                                  ❌
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-commands">No commands added yet.</p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="terminal-header">
                      <h3 className="card-title">
                        <span className="terminal-icon">💻</span>
                        Terminal Results
                      </h3>
                      {terminalOutput.length > 0 && (
                        <button onClick={clearTerminalOutput} className="button button-outline">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="terminal">
                      {terminalOutput.length > 0 ? (
                        terminalOutput.map((result, index) => (
                          <div key={index} className="terminal-result">
                            <div className="result-header">
                              <span className={`status-dot ${result.status}`}></span>
                              <span className="command-name">{result.command}</span>
                              <span className="status-text">
                                {result.status === "success"
                                  ? "Success"
                                  : result.status === "failed"
                                    ? "Failed"
                                    : "Running"}
                              </span>
                            </div>
                            <div className="result-output">{result.output}</div>
                          </div>
                        ))
                      ) : (
                        <div className="terminal-empty">
                          <span className="terminal-icon">💻</span>
                          <p>No commands executed yet</p>
                          <p className="help-text">Command results will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dashboard-home">
                <div className="home-header">
                  <span className="shield-icon">🛡️</span>
                </div>
                <h1>Pentest Methodology Builder</h1>
                <p className="home-description">
                  A collaborative platform for designing and executing penetration testing workflows.
                </p>
                <div className="home-instructions">
                  <p>Select a methodology from the sidebar to view its details and commands.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
