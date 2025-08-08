# INSA-Cyber-Security-Group-44
# Hybrid Pentest Methodology Builder & Orchestration Platform

## 1. Executive Summary
The Hybrid Pentest Methodology Builder & Orchestration Platform is a dual-interface solution for penetration testers.  
Its designed for penetration testers to plan, execute, and document security assessments in a structured and repeatable manner.
It bridges the gap between full automation and manual testing, allowing testers to integrate their preferred tools, commands, and logic while maintaining flexibility for manual intervention.

This hybrid approach:
- Avoids over-reliance on automation.
- Preserves the tester’s expertise and decision-making.
- Ensures consistent reporting and documentation.

Encourages knowledge sharing within teams and the wider pentest community.
Pentesters can:
- Design methodologies and manage projects in the web UI.
- Execute steps in either the web interface or directly from the terminal client.
- Have all actions — regardless of execution mode — logged and stored for reporting.


---

## 2. Objectives
- Provide cross-interface execution: seamless switch between web and terminal.
- Keep methodology-driven structure in both interfaces.
- Support integration of CLI and API-based tools.
- Enable real-time output streaming from terminal to web and vice versa.
- Maintain a central evidence repository regardless of execution mode.
- Automatically generate professional pentest reports.

---

## 3. Platform Overview

### 3.1 Web Interface
- Methodology builder (drag-and-drop steps).
- Tool configuration and scheduling.
- Project and team management.
- Visual dashboards for recon results, vulnerability stats, and execution progress.
- Reporting module for exporting PDF/HTML results.

### 3.2 Terminal Client
- CLI-based interface connecting to the same backend as the web UI.
- Run methodology-defined steps directly from the terminal.
- Stream real-time output into both CLI and web UI logs.
- Support ad-hoc command execution while logging results.
- Usable in restricted environments where web access is limited.

---

## 4. Core Features

### 4.1 Methodology Templates
- Built-in frameworks: OWASP Web, PTES, Bug Bounty workflows.
- Customizable and reusable templates.
- Shared between web and terminal views.

### 4.2 Tool Integration
- CLI tools: nmap, amass, sqlmap, gobuster.
- API tools: Shodan, Censys.
- Output parsing for structured storage.
- Ability to run tools from either the web interface or terminal client.

### 4.3 Cross-Interface Sync
- Every execution, whether via web or CLI, syncs results to a central database.
- Output logs, screenshots, and notes appear in both interfaces.
- Terminal execution updates web dashboard in real-time.

### 4.4 Evidence & Reporting
- Auto-logs command outputs.
- Upload or attach PoC screenshots from CLI or web.
- Severity tagging for vulnerabilities.
- Report generation with methodology, evidence, and recommendations.

---

## 5. Advantages Over Fully Web or Fully CLI Tools
- Flexibility: Works in environments where GUI isn’t practical or allowed.
- Unified Workflow: Web and terminal share the same methodology and project data.
- Speed: Terminal execution for quick tests, web for structured planning & collaboration.
- Documentation by Default: Even ad-hoc terminal tests are automatically logged.

---

## 6. Technology Stack
- Backend API: Python (FastAPI) serving both web and CLI clients.
- Web Frontend: React.js or Vue.js.
- Terminal Client: Python or Go CLI tool (connects to backend API).
- Execution Engine: Docker for isolating tools.
- Database: PostgreSQL for projects, methodologies, and logs.
- Reporting: Pandoc/ReportLab for PDF/HTML export.

---

## 7. Example Workflow

Scenario: Tester is on-site with limited internet access.

Before engagement:
- Build methodology and configure tools via web UI.

During engagement (CLI mode):
```
pentest-cli run project123 step 4

```
Tool executes locally, output captured and synced to backend (once connection is available).

Notes and PoC screenshots uploaded from CLI.

After engagement:

Switch back to web UI to review logs, adjust findings, and export final report.

8. Future Expansion
Offline mode for CLI with later sync.

Interactive CLI dashboards with ASCII graphs for results.

Custom scripting support for advanced users.

AI-assisted CLI suggestions for next steps.

9. Competitive Landscape
While there are web-based pentest management platforms (e.g., Dradis, PlexTrac) and CLI automation tools (e.g., AutoRecon, ReconFTW), no existing tool provides:

A shared methodology system across both web and CLI.

Real-time sync between terminal execution and web dashboards.

Centralized evidence storage regardless of execution environment.
