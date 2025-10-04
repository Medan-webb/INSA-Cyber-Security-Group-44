# Pentest Methodology Builder & Orchestration Platform (PentestFlow)

> **Hybrid pentest platform**: combine automated tooling and guided manual testing to plan, execute, and document penetration tests in a repeatable, auditable way.


---

## 1. Executive Summary

The Pentest Methodology Builder & Orchestration Platform (PentestFlow) is a hybrid web + terminal solution for penetration testers. It provides a structured environment to combine automated scans with human-guided manual steps, preserving tester judgment while ensuring repeatability and high-quality reporting.

Key benefits:

* Prevents over-reliance on automation
* Keeps manual decision points clear and auditable
* Speeds reporting via auto-collected evidence
* Encourages community sharing of methodologies

## 2. Objectives

* Customizable methodology builder
* Orchestrate both automated and manual steps
* Integrate open-source and proprietary tools
* Maintain evidence logs and generate professional reports
* Plugin-based extensibility

## 3. Platform Overview

Users can create projects, define scope, select or create methodologies (OWASP, PTES, bug-bounty), assign tools/commands to steps, run automated commands from the UI, follow instructions for manual steps, and compile findings into exportable reports.

## 4. Core Features

### 4.1 Methodology Templates

* Built-in frameworks: OWASP Web, PTES, Bug Bounty
* Create, edit, save custom templates
* Drag-and-drop step organization

### 4.2 Tool Integration

* CLI tools run inside sandboxed containers (nmap, amass, sqlmap, gobuster)
* API integrations for enrichment (Shodan, Censys)
* Output parsing and storage for reporting

### 4.3 Execution Control

* Automated execution for supported tools
* Manual mode for human-guided checks
* Runtime step skipping, reordering, and modification

### 4.4 Documentation & Evidence Management

* Auto-log command outputs
* Upload screenshots, PoC files, and notes
* Severity tagging and metadata for findings

### 4.5 Reporting

* Export PDF/HTML reports containing scope, methodology, findings, PoCs, and remediation guidance

### 4.6 Extensibility

* Plugin system for adding tools or methodology components
* API for CI/SIEM/ticketing integration

## 5. Advantages Over Fully Automated Tools

* Human-centric decision points
* Flexible mix of automated + manual steps
* Repeatable methodology-driven assessments
* Faster, consistent reporting

## 6. Technology Stack

* Frontend: React + Tailwind CSS
* Backend: Python (FastAPI) or Flask
* Execution: Docker containers for running tools securely
* Database: PostgreSQL
* Reporting: ReportLab / Pandoc
* Storage: AWS S3 or local filesystem

## 7. Example Workflow

**Project:** `target.com`

| Step                  | Command                                               | Execution |
| --------------------- | ----------------------------------------------------- | --------- |
| Passive Recon         | `amass enum -d {{target}}`                            | Automated |
| Active Recon          | `nmap -sV {{target}}`                                 | Automated |
| Directory Brute Force | `gobuster dir -u https://{{target}} -w /wordlist.txt` | Automated |
| Manual SQL Injection  | Method notes → Tester runs Burp Suite → Upload PoC    | Manual    |

The platform compiles results into a structured PDF report.

## 8. Future Expansion

* Community Methodology Marketplace
* AI-assisted next-step recommendations
* Bug-bounty platform integration
* Mobile/tablet support

## 9. Competitive Landscape

Compared to Dradis, Faraday, PlexTrac, and AttackForge, PentestFlow uniquely blends custom methodology creation, direct tool execution, manual-guidance, and automatic evidence logging in a single platform.

---

# 10. Installation

> **Prerequisites**
>
> * Git
> * Node.js (16+) / npm
> * Python 3.10+
> * Docker & Docker Compose (recommended)
> * PostgreSQL (or Dockerized Postgres)

### 10.2 Clone the repository

```bash
git clone https://github.com/Medan-webb/INSA-Cyber-Security-Group-44.git
cd INSA-Cyber-Security-Group-44
```

### 10.3 Frontend setup (Next.js)

```bash
cd front-end || cd web || # replace with actual frontend folder name
npm install
npm run dev
# Frontend dev server: http://localhost:3000
```

### 10.4 Backend setup (FastAPI)

```bash
cd back-end || cd backend
python -m venv .venv
# Activate the venv
# Linux/macOS:
source .venv/bin/activate
# Windows (PowerShell):
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
# or install minimal deps if requirements.txt is missing
pip install fastapi uvicorn python-multipart
```

#### Run backend (development)

```bash
# Example - adapt to your entrypoint (main.py, app.py, backend.py)
uvicorn backend:app --host 0.0.0.0 --port 5000 --reload
# API: http://localhost:5000
```

### 10.5 Docker tips

* Use Docker to isolate tool execution and avoid polluting host.
* Example: build a Docker image that contains required CLI tools and mounts a workspace.

### 10.6 Quick start (one-line)

```bash
# Start backend (if using provided script)
python backend.py
# Start frontend
npm run dev
```

---

## 11. First Use: Create Project & Methodology

### 11.1 Create your first project

1. Open: `http://localhost:3000`
2. Click **Create New Project**
3. Enter project name (e.g., `Client Security Assessment`) and target (e.g., `example.com`)

### 11.2 Create a methodology

1. Dashboard → **Add New Methodology**
2. Fill details: name, description, and list commands (one per line). Example commands using variables:

```
nmap -sC -sV {{target}} -oN scans/nmap_initial.txt
whois {{target}} > scans/whois_info.txt
dig ANY {{target}} > scans/dig_info.txt
```

### 11.3 Execute the methodology

* Select methodology → **Run All Steps**
* Automated steps run in sandbox; manual steps prompt the tester to perform actions and upload evidence.

### 11.4 Review results

* Reports page shows executed commands, outputs, and attachments
* Export JSON or PDF

---

## 12. Key Concepts

### 12.1 Projects

Isolated workspaces containing scans, evidence, and reports for a single engagement.

### 12.2 Methodologies

Reusable workflows combining automated commands and manual steps.

### 12.3 Variables

* `{{target}}` — project host or domain
* `{{targetIP}}` — resolved IP address

---

## 13. AI Integration (Ollama)

> Ollama can be used locally via Docker to host models for on-prem AI assistance. Below are recommended steps.

### 13.1 Run Ollama in Docker

```bash
docker run -d --name ollama -p 11434:11434 -v ollama-data:/root/.ollama --restart unless-stopped ollama/ollama
# Pull a model (example):
docker exec ollama ollama pull codellama:7b
```

### 13.2 Validate AI setup

```bash
curl http://localhost:11434/api/tags
# Test your backend AI integration endpoint:
http://localhost:5000/api/ai-status
```

---

## 14. Testing & Verification

* Always reproduce scanner findings manually
* Focus manual effort on authentication, authorization, business logic, file uploads, and APIs
* Capture Burp logs, screenshots, and PoC scripts
* Retest fixes by replaying the exact manual steps

## 15. Example Commands & Playbook Snippets

* `nmap -sS -sV -p- --min-rate=1000 --version-intensity 5 {{target}}`
* `amass enum -d {{target}} -o scans/amass.txt`
* `gobuster dir -u https://{{target}} -w /path/wordlists/common.txt -t 50 -x php,asp,html`
* `curl -i -X POST 'https://api.{{target}}/v1/order' -H 'Authorization: Bearer <token>' -d '@payload.json'`
* Simple race test (quick):

```bash
for i in {1..50}; do curl -s 'https://{{target}}/action' & done; wait
```

## 16. Maintenance, Backups & Security

* Rotate API keys and service credentials
* Backup PostgreSQL and evidence storage regularly
* Run vulnerability scans against the platform itself
* Use container isolation for tool execution

## 17. Contribution & Community

* Add methodology templates via pull requests
* Share plugins in the community marketplace (future)

## 18. License & Acknowledgements

* Include the repository license and contributor acknowledgements.

---

*End of documentation.*
