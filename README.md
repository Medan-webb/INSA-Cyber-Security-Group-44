# Pentest Methodology Builder & Orchestration Platform(PentestFlow)
installation guide https://github.com/Medan-webb/INSA-Cyber-Security-Group-44/tree/main?tab=readme-ov-file#%EF%B8%8F-installation
## 1. Executive Summary

The Pentest Methodology Builder & Orchestration Platform is a hybrid (web and terminal-based) solution designed for penetration testers to plan, execute, and document security assessments in a structured and repeatable manner.

It bridges the gap between full automation and manual testing, allowing testers to integrate their preferred tools, commands, and logic while maintaining flexibility for manual intervention.

This hybrid approach:

- Avoids over-reliance on automation.
- Preserves the tester’s expertise and decision-making.
- Ensures consistent reporting and documentation.
- Encourages  sharing methodologies within the pentest community.



## 2. Objectives

- Provide a customizable methodology builder for testers.
- Orchestrate and execute both automated and manual testing steps.
- Support integration of existing open-source and proprietary tools.
- Maintain evidence logs for reporting and audit purposes.
- Generate professional penetration testing reports.
- Enable plugin-based extensibility for future tools and workflows.


## 3. Platform Overview

The platform is an interactive pentest playbook where users can:

- Create new projects and define scope.
- Select or build a methodology (e.g., OWASP, PTES, bug bounty workflows).
- Assign specific tools and commands to each step.
- Run automated commands directly from the interface.
- Receive instructions for manual steps and record results.
- Compile all findings into a structured, exportable report.

## 4. Core Features

### 4.1 Methodology Templates
- Built-in frameworks: OWASP Web, PTES, Bug Bounty Workflow.
- Ability to create, edit, and save custom templates.
- Drag-and-drop interface for step organization.

### 4.2 Tool Integration
- CLI-based tools (e.g., nmap, amass, sqlmap) executed in sandboxed environments.
- API integrations (e.g., Shodan, Censys).
- Output parsing and storage for reporting.

### 4.3 Execution Control
- Automated execution for supported tools.
- Manual mode for context-specific testing.
- Step skipping, reordering, and modification during execution.

### 4.4 Documentation & Evidence Management
- Auto-log command outputs.
- Upload screenshots, notes, and proof-of-concept files.
- Severity tagging for findings.

### 4.5 Reporting
- Automatic generation of PDF/HTML reports containing:
  - Scope and methodology.
  - Findings with severity levels.
  - Proof of Concept (PoC) evidence.
  - Remediation recommendations.

### 4.6 Extensibility
- Plugin-based system for adding new tools or methodologies.
- API for integrating with external platforms (e.g., SIEM, ticketing systems).


## 5. Advantages Over Fully Automated Tools

- Human-centric: Maintains tester decision-making where automation fails.
- Flexibility: Supports both automated scanning and guided manual testing.
- Consistency: Ensures methodology-driven, repeatable assessments.
- Documentation: Reduces report preparation time with auto-compiled results.


## 6. Technology Stack

- Frontend: React.js tailwind css.
- Backend: Python (FastAPI/Flask) for orchestration and API handling.
- Execution Environment: Docker containers for running tools securely.
- Database: PostgreSQL (methodologies, project data, findings).
- Reporting Engine: ReportLab / Pandoc for PDF & HTML generation.
- Storage: AWS S3 or local file storage for evidence files.


## 7. Example Workflow

Project: https://target.com
| Step                  | Command                                          | Execution         |
|-----------------------|-------------------------------------------------|-------------------|
| Passive Recon         | amass enum -d target.com                       | Run automatically  |
| Active Recon          | nmap -sV target.com                            | Run automatically  |
| Directory Brute Force | gobuster dir -u https://target.com -w /wordlist.txt | Run automatically  |
| Manual SQL Injection Test | Methodology notes displayed → Tester runs Burp Suite manually → Uploads PoC screenshot | Manual intervention |

Reporting: System auto-compiles findings into a structured PDF.


## 8. Future Expansion

- Community Methodology Marketplace for sharing workflows.
- AI-powered recommendations for next testing steps.
- Integration with bug bounty platforms.
- Cross-platform support for mobile and tablet usage.


## 9. Competitive Landscape

While platforms like Dradis, Faraday, PlexTrac, and AttackForge offer elements of documentation, tool integration, or project tracking, none combine:

- Custom methodology creation
- Direct tool execution
- Manual testing guidance
- Automatic evidence logging

in a single, user-friendly platform.

This positions the proposed solution as first-to-market in its category.




# 🛠️ Installation
1. Clone the Repository
```bash
git clone <repository-url>
cd INSA-Cyber-Security-Group-44
```


2. Frontend Setup (Next.js)
```bash
## Install dependencies
npm install
```


3. Backend Setup (FastAPI)

```
cd back-end

```
inside the back-end create a vertual enviroment 

```
python -m venv env

```

inside the enviroment install the back-end dependencies

```
#linux

pip install -r requirments.txt
#or

pip install fastapi uvicorn python-multipart
```

```bash
# Install Python dependencies
pip install fastapi uvicorn python-multipart
```

🚦 Quick Start

```
# Run the backend server
python backend.py
```
The backend API will be available at http://localhost:5000

## Run the front-end development server
```
npm run dev

```

## 1. Create Your First Project

Open http://localhost:3000 in your browser

Click "Create New Project"

Enter:

Project Name: "Client Security Assessment"

Target: "example.com"

## 2. Create a Methodology
From the dashboard, click "Add New Methodology"

Enter methodology details:

Name: "Web Application Reconnaissance"

Description: "Initial reconnaissance for web applications"

Commands (one per line):

text
nmap -sC -sV {{target}} -oN scans/nmap_initial.txt
whois {{target}} > scans/whois_info.txt
dig ANY {{target}} > scans/dig_info.txt
## 3. Execute the Methodology
Select your methodology from the sidebar

Click "Run All Steps" to execute commands sequentially

Monitor real-time output in the terminal

For manual steps, upload evidence when prompted

## 4. Review Results
Navigate to the "Reports" page

View all executed commands and their outputs

Browse collected evidence files

Export results as JSON for documentation

# 🎯 Key Concepts
## Projects
Isolated workspaces for different clients/assessments

Each project has its own directory structure

Contains all scans, evidence, and reports

## Methodologies
Reusable testing workflows

Mix of automated commands and manual steps

Support for variable substitution

## Variables
Use these placeholders in your commands:

{{target}} - Project target (e.g., example.com)

{{targetIP}} - Resolved IP address of target


# AI setup 

instal ollama

```
# Run Ollama in Docker - no installation needed
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama

# Pull a model
docker exec ollama ollama pull codellama:7b

# Test it
curl http://localhost:11434/api/tags
```


```

# 1. Make sure Docker is installed and running in WSL
sudo service docker start
docker --version

# 2. Run Ollama in Docker
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama-data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama

# 3. Pull the model (takes a few minutes)
docker exec ollama ollama pull codellama:7b

# 4. Verify it's working
curl http://localhost:11434/api/tags
```


# testing the AI's correctly configured or not 

http://localhost:5000/api/ai-status


returns json file 