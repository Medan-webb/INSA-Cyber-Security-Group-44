# backend.py
import os
import json
import uuid
import shutil
import platform
import threading
import subprocess
import time
import re
import requests
import queue
import signal
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse

# ============================
# AI Library Configuration
# ============================
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

GEMINI_API_KEY = "AIzaSyCRwBoOyH94DLdpdlFDgKx6u_6T3GKBGnM"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ============================
# FastAPI App Setup
# ============================
app = FastAPI(title="Pentest Orchestration API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# Database Configuration
# ============================
DATA_DIR = Path("./data")
UPLOAD_DIR = DATA_DIR / "uploads"
DB_FILE = DATA_DIR / "db.json"
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB: Dict[str, Any] = {
    "projects": [],
    "methodologies": [],
    "findings": [],
    "reports": [],
    "evidence": [],
    "executions": []
}

def load_db() -> Dict[str, Any]:
    if DB_FILE.exists():
        with DB_FILE.open("r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return DEFAULT_DB.copy()
    return DEFAULT_DB.copy()

def save_db(db: Dict[str, Any]):
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DB_FILE.open("w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

db = load_db()
#initialize_default_methodologies

def initialize_default_methodologies():
    """Create default methodologies if they don't exist"""
    try:
        
        default_methodologies = [
            {
                "id": 1,
                "name": "Web Application Penetration Testing",
                "description": "Comprehensive web application security assessment methodology",
                "commands": [
                    "nmap -sS -sV -sC -O {{target}}",
                    "nmap --script vuln {{target}}",
                    "subfinder -d {{target}}",
                    "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt",
                    "nikto -h http://{{target}}",
                    "sqlmap -u 'http://{{target}}/login' --forms --batch",
                    "nuclei -u http://{{target}} -t /root/nuclei-templates/"
                ],
                "steps": [
                    {
                        "id": "recon-section",
                        "type": "section",
                        "content": "Information Gathering",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "nmap_scan",
                        "type": "command",
                        "content": "nmap -sS -sV -sC -O {{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "subdomain_enum",
                        "type": "command",
                        "content": "subfinder -d {{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "dir_enum",
                        "type": "command",
                        "content": "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "vuln_scan",
                        "type": "command",
                        "content": "nikto -h http://{{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "web-section",
                        "type": "section",
                        "content": "Web Application Analysis",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "sql_injection",
                        "type": "command",
                        "content": "sqlmap -u 'http://{{target}}/login' --forms --batch",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "manual_testing",
                        "type": "manual",
                        "content": "Manual Security Testing - Test for business logic flaws",
                        "requiresUpload": True,
                        "completed": False
                    }
                ]
            },
            {
                "id": 2,
                "name": "Network Penetration Testing",
                "description": "Comprehensive network infrastructure security assessment",
                "commands": [
                    "nmap -sS -sV -sC -p- {{target}}",
                    "nmap --script vuln {{target}}",
                    "masscan -p1-65535 {{targetIP}} --rate=1000",
                    "enum4linux -a {{targetIP}}",
                    "smbclient -L //{{targetIP}}",
                    "snmp-check {{targetIP}}"
                ],
                "steps": [
                    {
                        "id": "network_scan",
                        "type": "command",
                        "content": "nmap -sn {{targetIP}}/24",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "port_scan",
                        "type": "command",
                        "content": "nmap -sS -sV -sC -p- {{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "vuln_scan",
                        "type": "command",
                        "content": "nmap --script vuln {{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "service-section",
                        "type": "section",
                        "content": "Service Enumeration",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "smb_enum",
                        "type": "command",
                        "content": "enum4linux -a {{targetIP}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "snmp_enum",
                        "type": "command",
                        "content": "snmp-check {{targetIP}}",
                        "requiresUpload": False,
                        "completed": False
                    }
                ]
            },
            {
                "id": 3,
                "name": "API Security Testing",
                "description": "REST API and web service security assessment",
                "commands": [
                    "nmap -sV -p 443,8443 {{target}}",
                    "curl -X GET http://{{target}}/api/v1/users",
                    "curl -X POST http://{{target}}/api/v1/login -d '{\"username\":\"test\",\"password\":\"test\"}'",
                    "nikto -h http://{{target}}/api"
                ],
                "steps": [
                    {
                        "id": "api_discovery",
                        "type": "command",
                        "content": "curl -X OPTIONS http://{{target}}/api",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "auth_testing",
                        "type": "manual",
                        "content": "Authentication Testing - Test authentication mechanisms and tokens",
                        "requiresUpload": True,
                        "completed": False
                    },
                    {
                        "id": "input_validation",
                        "type": "manual",
                        "content": "Input Validation Testing - Test for injection and input validation flaws",
                        "requiresUpload": True,
                        "completed": False
                    }
                ]
            },
            {
                "id": 4,
                "name": "Quick Security Assessment",
                "description": "Rapid security assessment for time-constrained engagements",
                "commands": [
                    "nmap -sS -sV --top-ports 1000 {{target}}",
                    "subfinder -d {{target}}",
                    "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt -t 50",
                    "nikto -h http://{{target}}"
                ],
                "steps": [
                    {
                        "id": "quick_scan",
                        "type": "command",
                        "content": "nmap -sS -sV --top-ports 1000 {{target}}",
                        "requiresUpload": False,
                        "completed": False
                    },
                    {
                        "id": "web_scan",
                        "type": "command",
                        "content": "nikto -h http://{{target}}",
                        "requiresUpload": False,
                        "completed": False
                    }
                ]
            }
        ]
        
        # Check if methodologies exist in database
        existing_ids = [m['id'] for m in db_data.get('methodologies', [])]
        methodologies_added = 0
        
        for methodology in default_methodologies:
            if methodology['id'] not in existing_ids:
                db_data.setdefault('methodologies', []).append(methodology)
                methodologies_added += 1
                print(f"✅ Added default methodology: {methodology['name']}")
        
        if methodologies_added > 0:
            save_db(db_data)
            print(f"🎯 Initialized {methodologies_added} default methodologies")
        else:
            print("📋 Default methodologies already exist")
            
        return db_data['methodologies']
        
    except Exception as e:
        print(f"❌ Error initializing default methodologies: {e}")
        return []

initialize_default_methodologies()  
# ============================
# Data Models
# ============================
class Project(BaseModel):
    id: int
    name: str
    target: str
    targetIP: Optional[str] = None
    createdAt: str
    status: str = "active"
    client: Optional[str] = ""
    scope: Optional[str] = ""

class MethodologyModel(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    commands: List[str] = []
    steps: List[Dict[str, Any]] = []

class Finding(BaseModel):
    id: int
    project_id: int
    title: str
    severity: str
    impact: Optional[str] = ""
    remediation: Optional[str] = ""

class Report(BaseModel):
    id: int
    project_id: int
    summary: str

class CommandRequest(BaseModel):
    command: str
    timeout_sec: Optional[int] = 300
    project_id: Optional[int] = None
    methodology_id: Optional[int] = None

class CommandExecution(BaseModel):
    id: int
    command: str
    output: str
    status: str
    returncode: int
    project_id: Optional[int] = None
    methodology_id: Optional[int] = None
    timestamp: float
    duration: Optional[float] = None

# AI Analysis Models
class AIAnalysisRequest(BaseModel):
    commands: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    methodologies: List[Dict[str, Any]]
    customPrompt: Optional[str] = None
    selectedProjectId: Optional[int] = None
    useOnline: Optional[bool] = False
    onlineProvider: Optional[str] = "gemini"

class AIFinding(BaseModel):
    severity: str
    title: str
    description: str
    evidence: List[str]
    recommendation: str

class Statistics(BaseModel):
    totalCommands: int
    successfulCommands: int
    failedCommands: int
    evidenceCount: int
    criticalFindings: int

class AIAnalysisResponse(BaseModel):
    summary: str
    findings: List[AIFinding]
    statistics: Statistics

class OnlineAIAnalysisRequest(BaseModel):
    commands: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    methodologies: List[Dict[str, Any]]
    customPrompt: Optional[str] = None
    selectedProjectId: Optional[int] = None
    provider: str = "gemini"

class AIChatRequest(BaseModel):
    question: str
    context: Dict[str, Any]
    conversation_history: List[Dict[str, str]]
    provider: str = "gemini"

class AIChatResponse(BaseModel):
    answer: str
    context_used: Dict[str, Any]
# ============================
# Helper Functions
# ============================
def next_id(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 1
    return max(int(i["id"]) for i in items) + 1

# ============================
# Project Endpoints
# ============================
PROJECTS_DIR = DATA_DIR / "projects"

@app.get("/projects")
def list_projects():
    return db["projects"]

@app.post("/projects")
def add_project(p: Project):
    project_data = p.dict()
    project_dir = PROJECTS_DIR / str(p.id)
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "evidence").mkdir(exist_ok=True)
    (project_dir / "scans").mkdir(exist_ok=True)
    (project_dir / "reports").mkdir(exist_ok=True)
    db["projects"].append(project_data)
    save_db(db)
    return {"ok": True, "project": project_data}

@app.put("/projects/{project_id}")
def update_project(project_id: int, p: Project):
    for i, project in enumerate(db["projects"]):
        if int(project["id"]) == int(project_id):
            db["projects"][i] = p.dict()
            save_db(db)
            return {"ok": True, "project": p.dict()}
    raise HTTPException(status_code=404, detail="Project not found")

# ============================
# Methodology Endpoints
# ============================
@app.get("/methodologies")
def list_methodologies():
    """Return both default and user methodologies"""
    default_methodologies = initialize_default_methodologies() 
    user_methodologies = db.get("methodologies", [])
    
    # Merge defaults and user methodologies
    all_methodologies = default_methodologies + user_methodologies
    
    return all_methodologies
@app.post("/methodologies")
def add_methodology(m: MethodologyModel):
    new = m.dict()
    if any(int(x["id"]) == int(new["id"]) for x in db["methodologies"]):
        new["id"] = next_id(db["methodologies"])
    db["methodologies"].append(new)
    save_db(db)
    return {"ok": True, "methodology": new}

@app.put("/methodologies/{mid}")
def update_methodology(mid: int, m: MethodologyModel):
    found = False
    for i, item in enumerate(db["methodologies"]):
        if int(item.get("id")) == int(mid):
            db["methodologies"][i] = m.dict()
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Methodology not found")
    save_db(db)
    return {"ok": True, "methodology": m.dict()}

@app.delete("/methodologies/{mid}")
def delete_methodology(mid: int):
    new_list = [x for x in db["methodologies"] if int(x["id"]) != int(mid)]
    if len(new_list) == len(db["methodologies"]):
        raise HTTPException(status_code=404, detail="Methodology not found")
    db["methodologies"] = new_list
    save_db(db)
    return {"ok": True}
def initialize_default_methodologies():
    """Create default methodologies if they don't exist"""
    db_data = load_db()
    
    default_methodologies = [
        {
            "id": 1,
            "name": "Web Application Penetration Testing",
            "description": "Comprehensive web application security assessment methodology",
            "commands": [
                "nmap -sS -sV -sC -O {{target}}",
                "nmap --script vuln {{target}}",
                "subfinder -d {{target}}",
                "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt",
                "nikto -h http://{{target}}",
                "sqlmap -u 'http://{{target}}/login' --forms --batch",
                "nuclei -u http://{{target}} -t /root/nuclei-templates/"
            ],
            "steps": [
                {
                    "id": "recon",
                    "type": "section",
                    "title": "Information Gathering",
                    "description": "Passive and active reconnaissance"
                },
                {
                    "id": "nmap_scan",
                    "type": "command",
                    "title": "Network Scanning",
                    "description": "Perform comprehensive port scanning",
                    "command": "nmap -sS -sV -sC -O {{target}}",
                    "requires_upload": False
                },
                {
                    "id": "subdomain_enum",
                    "type": "command",
                    "title": "Subdomain Enumeration",
                    "description": "Discover subdomains and related assets",
                    "command": "subfinder -d {{target}}",
                    "requires_upload": False
                },
                {
                    "id": "dir_enum",
                    "type": "command",
                    "title": "Directory Brute-forcing",
                    "description": "Discover hidden directories and files",
                    "command": "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt",
                    "requires_upload": False
                },
                {
                    "id": "vuln_scan",
                    "type": "command",
                    "title": "Vulnerability Scanning",
                    "description": "Automated vulnerability assessment",
                    "command": "nikto -h http://{{target}}",
                    "requires_upload": False
                },
                {
                    "id": "web_analysis",
                    "type": "section",
                    "title": "Web Application Analysis",
                    "description": "In-depth web security testing"
                },
                {
                    "id": "sql_injection",
                    "type": "command",
                    "title": "SQL Injection Testing",
                    "description": "Test for SQL injection vulnerabilities",
                    "command": "sqlmap -u 'http://{{target}}/login' --forms --batch",
                    "requires_upload": False
                },
                {
                    "id": "manual_testing",
                    "type": "manual",
                    "title": "Manual Security Testing",
                    "description": "Manual testing for business logic flaws",
                    "requires_upload": True
                }
            ]
        },
        {
            "id": 2,
            "name": "Network Penetration Testing",
            "description": "Comprehensive network infrastructure security assessment",
            "commands": [
                "nmap -sS -sV -sC -p- {{target}}",
                "nmap --script vuln {{target}}",
                "masscan -p1-65535 {{targetIP}} --rate=1000",
                "enum4linux -a {{targetIP}}",
                "smbclient -L //{{targetIP}}",
                "snmp-check {{targetIP}}"
            ],
            "steps": [
                {
                    "id": "network_scan",
                    "type": "command",
                    "title": "Network Discovery",
                    "description": "Discover live hosts and network topology",
                    "command": "nmap -sn {{targetIP}}/24",
                    "requires_upload": False
                },
                {
                    "id": "port_scan",
                    "type": "command",
                    "title": "Port Scanning",
                    "description": "Comprehensive port scanning",
                    "command": "nmap -sS -sV -sC -p- {{target}}",
                    "requires_upload": False
                },
                {
                    "id": "vuln_scan",
                    "type": "command",
                    "title": "Vulnerability Scanning",
                    "description": "Network vulnerability assessment",
                    "command": "nmap --script vuln {{target}}",
                    "requires_upload": False
                },
                {
                    "id": "service_enum",
                    "type": "section",
                    "title": "Service Enumeration",
                    "description": "Service-specific enumeration and testing"
                },
                {
                    "id": "smb_enum",
                    "type": "command",
                    "title": "SMB Enumeration",
                    "description": "SMB share and user enumeration",
                    "command": "enum4linux -a {{targetIP}}",
                    "requires_upload": False
                },
                {
                    "id": "snmp_enum",
                    "type": "command",
                    "title": "SNMP Enumeration",
                    "description": "SNMP service information gathering",
                    "command": "snmp-check {{targetIP}}",
                    "requires_upload": False
                }
            ]
        },
        {
            "id": 3,
            "name": "API Security Testing",
            "description": "REST API and web service security assessment",
            "commands": [
                "nmap -sV -p 443,8443 {{target}}",
                "curl -X GET http://{{target}}/api/v1/users",
                "curl -X POST http://{{target}}/api/v1/login -d '{\"username\":\"test\",\"password\":\"test\"}'",
                "nikto -h http://{{target}}/api"
            ],
            "steps": [
                {
                    "id": "api_discovery",
                    "type": "command",
                    "title": "API Endpoint Discovery",
                    "description": "Discover API endpoints and methods",
                    "command": "curl -X OPTIONS http://{{target}}/api",
                    "requires_upload": False
                },
                {
                    "id": "auth_testing",
                    "type": "manual",
                    "title": "Authentication Testing",
                    "description": "Test authentication mechanisms and tokens",
                    "requires_upload": True
                },
                {
                    "id": "input_validation",
                    "type": "manual",
                    "title": "Input Validation Testing",
                    "description": "Test for injection and input validation flaws",
                    "requires_upload": True
                }
            ]
        },
        {
            "id": 4,
            "name": "Quick Security Assessment",
            "description": "Rapid security assessment for time-constrained engagements",
            "commands": [
                "nmap -sS -sV --top-ports 1000 {{target}}",
                "subfinder -d {{target}}",
                "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt -t 50",
                "nikto -h http://{{target}}"
            ],
            "steps": [
                {
                    "id": "quick_scan",
                    "type": "command",
                    "title": "Quick Network Scan",
                    "description": "Rapid port and service discovery",
                    "command": "nmap -sS -sV --top-ports 1000 {{target}}",
                    "requires_upload": False
                },
                {
                    "id": "web_scan",
                    "type": "command",
                    "title": "Web Application Scan",
                    "description": "Quick web vulnerability assessment",
                    "command": "nikto -h http://{{target}}",
                    "requires_upload": False
                }
            ]
        }
    ]
    
    # Check if methodologies exist in database
    existing_ids = [m['id'] for m in db_data.get('methodologies', [])]
    
    for methodology in default_methodologies:
        if methodology['id'] not in existing_ids:
            db_data.setdefault('methodologies', []).append(methodology)
            print(f"✅ Added default methodology: {methodology['name']}")
    
    save_db(db_data)
    return db_data['methodologies']

# ============================
# Findings Endpoints
# ============================
@app.get("/findings/{project_id}")
def list_findings(project_id: int):
    return [f for f in db["findings"] if int(f["project_id"]) == int(project_id)]

@app.post("/findings")
def add_finding(f: Finding):
    db["findings"].append(f.dict())
    save_db(db)
    return {"ok": True, "finding": f}

# ============================
# Reports Endpoints
# ============================
@app.get("/reports")
def list_reports():
    return db["reports"]

@app.get("/reports/{project_id}")
def list_reports_for_project(project_id: int):
    return [r for r in db["reports"] if int(r["project_id"]) == int(project_id)]

@app.post("/reports")
def add_report(r: Report):
    db["reports"].append(r.dict())
    save_db(db)
    return {"ok": True, "report": r}

# ============================
# Evidence Endpoints
# ============================
@app.post("/evidence")
async def upload_evidence(
    project_id: int = Form(...),
    description: str = Form(""),
    file: UploadFile = File(None),
):
    record = {
        "id": next_id(db["evidence"]),
        "project_id": int(project_id),
        "description": description,
        "type": "note" if file is None else "file",
    }

    if file is not None:
        project_dir = UPLOAD_DIR / str(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename).suffix
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = project_dir / safe_name
        with dest_path.open("wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
        record.update({
            "filename": file.filename,
            "path": str(dest_path.resolve())
        })

    db["evidence"].append(record)
    save_db(db)
    return {"ok": True, "evidence": record}

@app.get("/evidence")
@app.get("/evidence/{project_id}")
def list_evidence(project_id: Optional[int] = None):
    if project_id is not None:
        return [e for e in db["evidence"] if int(e["project_id"]) == int(project_id)]
    else:
        return db["evidence"]

@app.post("/manual-evidence")
async def upload_manual_evidence(
    project_id: int = Form(...),
    methodology_id: int = Form(...),
    step_id: str = Form(...),
    description: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(...)
):
    try:
        project = next((p for p in db["projects"] if int(p["id"]) == int(project_id)), None)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        project_dir = PROJECTS_DIR / str(project_id) / "manual_evidence"
        project_dir.mkdir(parents=True, exist_ok=True)

        file_ext = Path(file.filename).suffix
        safe_filename = f"evidence_{step_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = project_dir / safe_filename

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        evidence_record = {
            "id": next_id(db["evidence"]),
            "project_id": project_id,
            "methodology_id": methodology_id,
            "step_id": step_id,
            "filename": file.filename,
            "saved_path": str(file_path),
            "description": description,
            "notes": notes,
            "uploaded_at": time.time(),
            "type": "manual_evidence"
        }

        db["evidence"].append(evidence_record)
        save_db(db)
        return {"ok": True, "evidence": evidence_record}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/manual-evidence/{project_id}/{methodology_id}/{step_id}")
def get_step_evidence(project_id: int, methodology_id: int, step_id: str):
    evidence = [
        e for e in db["evidence"]
        if (int(e["project_id"]) == int(project_id) and
            int(e["methodology_id"]) == int(methodology_id) and
            e["step_id"] == step_id)
    ]
    return evidence

@app.get("/api/evidence-file/{evidence_id}")
async def get_evidence_file(evidence_id: int):
    """Serve evidence files with better error handling"""
    try:
        print(f"📁 Serving evidence file {evidence_id}")
        
        # Find the evidence record
        evidence = next((e for e in db["evidence"] if e["id"] == evidence_id), None)
        if not evidence:
            print(f"❌ Evidence {evidence_id} not found in database")
            raise HTTPException(status_code=404, detail="Evidence not found")

        file_path = evidence.get("saved_path") or evidence.get("path")
        if not file_path:
            print(f"❌ No file path for evidence {evidence_id}")
            raise HTTPException(status_code=404, detail="File path not found")
            
        if not os.path.exists(file_path):
            print(f"❌ File not found at path: {file_path}")
            # Try alternative locations
            alt_path = UPLOAD_DIR / str(evidence.get("project_id", "")) / Path(file_path).name
            if alt_path.exists():
                file_path = str(alt_path)
            else:
                raise HTTPException(status_code=404, detail="File not found on disk")

        filename = evidence.get("filename", "evidence")
        
        # Determine content type
        if filename.lower().endswith(('.jpg', '.jpeg')):
            media_type = 'image/jpeg'
        elif filename.lower().endswith('.png'):
            media_type = 'image/png'
        elif filename.lower().endswith(('.txt', '.log')):
            media_type = 'text/plain'
        else:
            media_type = 'application/octet-stream'

        print(f"✅ Serving file: {file_path}")
        return FileResponse(
            file_path,
            media_type=media_type,
            filename=filename
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error serving evidence file: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")
# ============================
# Command Execution Endpoints
# ============================
@app.post("/exec")
def exec_command(req: CommandRequest):
    proc = None
    try:
        project = None
        if hasattr(req, 'project_id') and req.project_id:
            project = next((p for p in db.get("projects", []) if int(p.get("id", 0)) == int(req.project_id)), None)
        
        command = req.command
        if project:
            command = command.replace("{{target}}", project.get("target", ""))
            command = command.replace("{{targetIP}}", project.get("targetIP", project.get("target", "")))
            command = command.replace("{{project}}", project.get("name", ""))
        
        print(f"Executing command: {command}")
        proc = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            preexec_fn=os.setsid if os.name != 'nt' else None
        )

        output_lines = []
        q = queue.Queue()

        def reader():
            for line in iter(proc.stdout.readline, ''):
                if not line:
                    break
                print(line, end='')
                q.put(line)
            proc.stdout.close()

        t = threading.Thread(target=reader)
        t.start()

        while t.is_alive() or not q.empty():
            try:
                line = q.get(timeout=0.1)
                output_lines.append(line)
            except queue.Empty:
                continue

        t.join()
        rc = proc.wait(timeout=req.timeout_sec or 300)

        return {
            "returncode": rc,
            "stdout": "".join(output_lines).strip()
        }

    except subprocess.TimeoutExpired:
        if proc:
            if os.name != 'nt':
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            else:
                proc.terminate()
            proc.wait()
        return JSONResponse(status_code=408, content={"error": "Command timed out"})
    except Exception as e:
        if proc:
            try:
                if os.name != 'nt':
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                else:
                    proc.terminate()
            except:
                pass
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/exec/{pid}/kill")
def kill_command(pid: int):
    try:
        if os.name != 'nt':
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        else:
            os.kill(pid, signal.SIGTERM)
        return {"ok": True, "message": f"Process {pid} terminated"}
    except ProcessLookupError:
        raise HTTPException(status_code=404, detail="Process not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def stream_subprocess(command: str, timeout_sec: int = 300):
    proc = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    start = time.time()
    try:
        if proc.stdout is None:
            yield "data: \n\n"
            return
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            yield f"data: {line.rstrip()}\n\n"
            if (time.time() - start) > timeout_sec:
                proc.kill()
                yield f"data: [PROCESS KILLED: timeout {timeout_sec}s]\n\n"
                break
        proc.wait(timeout=1)
        yield f"data: [PROCESS EXIT CODE: {proc.returncode}]\n\n"
    except Exception as e:
        yield f"data: [ERROR: {str(e)}]\n\n"
    finally:
        try:
            proc.kill()
        except Exception:
            pass

@app.post("/exec-stream")
def exec_stream_endpoint(req: CommandRequest):
    return StreamingResponse(stream_subprocess(req.command, timeout_sec=req.timeout_sec or 300),
                             media_type="text/event-stream")

@app.get("/executions")
def list_executions(project_id: Optional[int] = None):
    executions = db.get("executions", [])
    if project_id:
        executions = [e for e in executions if e.get("project_id") == project_id]
    return executions

@app.post("/executions")
def add_execution(execution: CommandExecution):
    if "executions" not in db:
        db["executions"] = []
    db["executions"].append(execution.dict())
    save_db(db)
    return {"ok": True, "execution": execution}

# ============================
# AI Analysis Core Functions
# ============================
def filter_project_data(commands, evidence, selected_project_id):
    """Filter commands and evidence for the selected project only"""
    if selected_project_id == "all" or selected_project_id is None:
        return commands, evidence

    project_commands = [
        cmd for cmd in commands
        if cmd.get('project_id') == selected_project_id
    ]

    project_evidence = [
        ev for ev in evidence
        if ev.get('project_id') == selected_project_id
    ]

    print(f"🔍 Filtered data: {len(project_commands)} commands, {len(project_evidence)} evidence for project {selected_project_id}")
    return project_commands, project_evidence

# [Rest of your AI analysis functions would go here...]
# analyze_command_outputs, analyze_nmap_output, extract_ips, etc.

# ============================
# AI Analysis Endpoints
# ============================
@app.get("/api/ai-status")
async def get_ai_status():
    """Check status of all AI providers"""
    status = {
        "local_ollama": {
            "available": False,
            "status": "Unknown"
        },
        "online_gemini": {
            "available": False,
            "status": "Not configured",
            "api_key_set": bool(GEMINI_API_KEY),
            "library_installed": GEMINI_AVAILABLE
        },
        "online_gpt": {
            "available": False,
            "status": "Not configured",
            "api_key_set": bool(OPENAI_API_KEY),
            "library_installed": OPENAI_AVAILABLE
        }
    }

    # Test Ollama
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        status["local_ollama"]["available"] = response.status_code == 200
        status["local_ollama"]["status"] = "Running" if response.status_code == 200 else "Not responding"
    except:
        status["local_ollama"]["status"] = "Not running"

    # Test Gemini if configured
    if GEMINI_API_KEY and GEMINI_AVAILABLE:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            models = genai.list_models()
            status["online_gemini"]["available"] = True
            status["online_gemini"]["status"] = "Working"
        except Exception as e:
            status["online_gemini"]["status"] = f"Error: {str(e)}"

    # Test GPT if configured
    if OPENAI_API_KEY and OPENAI_AVAILABLE:
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            models = client.models.list()
            status["online_gpt"]["available"] = True
            status["online_gpt"]["status"] = "Working"
        except Exception as e:
            status["online_gpt"]["status"] = f"Error: {str(e)}"

    return status

def create_online_analysis_prompt(data: OnlineAIAnalysisRequest):
    """Create optimized prompt for online AI models"""
    commands = data.commands
    evidence = data.evidence
    projects = data.projects
    methodologies = data.methodologies
    custom_prompt = data.customPrompt or ''

    # Build command summary
    command_summary = []
    for cmd in commands[-15:]:  # Last 15 commands
        status = cmd.get('status', 'unknown')
        command_text = cmd.get('command', '')[:100]
        command_summary.append(f"• [{status}] {command_text}")

    # Build evidence summary
    evidence_summary = []
    for ev in evidence[:10]:  # First 10 evidence files
        filename = ev.get('filename', 'Unknown')
        description = ev.get('description', 'No description')
        evidence_summary.append(f"• {filename}: {description}")

    prompt = f"""As a senior cybersecurity analyst, analyze this penetration testing data and provide a professional security assessment report.

CONTEXT:
- Assessment Scope: {len(projects)} projects, {len(commands)} commands executed, {len(evidence)} evidence files collected
- Methodologies Used: {', '.join([m.get('name', 'Unknown') for m in methodologies]) if methodologies else 'None specified'}

COMMAND EXECUTION SUMMARY:
{chr(10).join(command_summary)}

EVIDENCE COLLECTED:
{chr(10).join(evidence_summary) if evidence_summary else '• No evidence files collected'}

{custom_prompt and f'SPECIFIC FOCUS AREA: {custom_prompt}' or ''}

Please provide a comprehensive security analysis with:

EXECUTIVE SUMMARY:
- Brief overview of assessment scope and key findings
- Overall risk assessment

TECHNICAL FINDINGS:
- List 3-5 key security findings with:
  * Severity (Critical/High/Medium/Low/Info)
  * Clear title
  * Detailed description with evidence references
  * Specific remediation recommendations
  * Affected assets/components

RISK ASSESSMENT:
- Criticality analysis
- Potential impact
- Exploitation likelihood

RECOMMENDATIONS:
- Prioritized remediation steps
- Immediate actions vs. long-term improvements

Format the response as structured JSON that can be parsed programmatically with the following structure:
{{
  "summary": "executive summary here",
  "findings": [
    {{
      "severity": "high",
      "title": "Finding title",
      "description": "Detailed description",
      "evidence": ["evidence reference 1", "evidence reference 2"],
      "recommendation": "Specific remediation steps"
    }}
  ]
}}"""

    return prompt

def smart_detailed_analysis(commands, evidence, custom_prompt="", selected_project_id=None):
    """Generate detailed analysis with actual command output parsing for specific project"""
    try:
        # Filter data for selected project
        project_commands, project_evidence = filter_project_data(commands, evidence, selected_project_id)

        # Analyze command outputs for specific findings
        findings, discovered_assets = analyze_command_outputs(project_commands)

        # Create comprehensive summary
        summary = create_detailed_summary(project_commands, project_evidence, findings, discovered_assets, selected_project_id)

        # Add custom prompt to summary if provided
        if custom_prompt:
            summary = f"{custom_prompt} - {summary}"

        # Calculate statistics
        successful = len([c for c in project_commands if c.get('status') == 'success'])
        failed = len([c for c in project_commands if c.get('status') == 'failed'])

        return {
            "summary": summary,
            "findings": findings,
            "statistics": {
                "totalCommands": len(project_commands),
                "successfulCommands": successful,
                "failedCommands": failed,
                "evidenceCount": len(project_evidence),
                "criticalFindings": len([f for f in findings if f.get("severity") in ["critical", "high"]])
            }
        }
    except Exception as e:
        print(f"Error in detailed analysis: {e}")
        # Fallback to basic analysis if detailed parsing fails
        return fallback_basic_analysis(commands, evidence, custom_prompt, selected_project_id)

def filter_project_data(commands, evidence, selected_project_id):
    """Filter commands and evidence for the selected project only"""
    if selected_project_id == "all" or selected_project_id is None:
        # If no project selected or "all", use all data
        return commands, evidence

    # Filter commands for the selected project
    project_commands = [
        cmd for cmd in commands
        if cmd.get('project_id') == selected_project_id
    ]

    # Filter evidence for the selected project
    project_evidence = [
        ev for ev in evidence
        if ev.get('project_id') == selected_project_id
    ]

    print(f"🔍 Filtered data: {len(project_commands)} commands, {len(project_evidence)} evidence for project {selected_project_id}")

    return project_commands, project_evidence

def analyze_command_outputs(commands):
    """Deep analysis of command outputs to extract specific findings"""
    findings = []
    discovered_assets = {
        'subdomains': set(),
        'ip_addresses': set(),
        'open_ports': set(),
        'technologies': set(),
        'vulnerabilities': set(),
        'directories': set(),
        'files': set()
    }

    for cmd in commands:
        command = cmd.get('command', '').lower()
        output = cmd.get('output', '')
        status = cmd.get('status', '')

        if status != 'success' or not output:
            continue

        # Nmap scan analysis
        if 'nmap' in command:
            nmap_findings = analyze_nmap_output(command, output)
            findings.extend(nmap_findings)

            # Extract assets from nmap
            discovered_assets['ip_addresses'].update(extract_ips(output))
            discovered_assets['open_ports'].update(extract_ports(output))
            discovered_assets['technologies'].update(extract_technologies(output))

        # Subdomain enumeration
        elif any(tool in command for tool in ['subfinder', 'amass', 'sublist3r', 'assetfinder']):
            subdomain_findings = analyze_subdomain_output(command, output)
            findings.extend(subdomain_findings)
            discovered_assets['subdomains'].update(extract_subdomains(output))

        # Directory brute-forcing
        elif any(tool in command for tool in ['gobuster', 'dirb', 'dirbuster', 'feroxbuster', 'ffuf']):
            directory_findings = analyze_directory_output(command, output)
            findings.extend(directory_findings)
            discovered_assets['directories'].update(extract_directories(output))
            discovered_assets['files'].update(extract_files(output))

        # Vulnerability scanning
        elif any(tool in command for tool in ['sqlmap', 'nikto', 'wpscan', 'nuclei']):
            vuln_findings = analyze_vulnerability_output(command, output)
            findings.extend(vuln_findings)
            discovered_assets['vulnerabilities'].update(extract_vulnerabilities(output))

        # General information gathering
        elif any(tool in command for tool in ['whois', 'dig', 'nslookup', 'host']):
            info_findings = analyze_info_output(command, output)
            findings.extend(info_findings)
            discovered_assets['ip_addresses'].update(extract_ips(output))

    # Create findings from discovered assets
    asset_findings = create_asset_findings(discovered_assets)
    findings.extend(asset_findings)

    return findings, discovered_assets

def analyze_nmap_output(command, output):
    """Analyze nmap scan results"""
    findings = []

    # Extract open ports with services
    port_pattern = r'(\d+)/tcp\s+open\s+(\S+)'
    ports_found = re.findall(port_pattern, output)

    if ports_found:
        port_details = [f"{port}/{service}" for port, service in ports_found]
        findings.append({
            "severity": "medium",
            "title": f"Open Ports Discovered ({len(ports_found)} ports)",
            "description": f"Nmap scan revealed open ports: {', '.join(port_details)}",
            "evidence": [f"nmap_scan_{command[:20]}"],
            "recommendation": "Review each open service for potential vulnerabilities and unnecessary exposure."
        })

    # Check for specific vulnerable services
    if '21/tcp' in output and 'ftp' in output.lower():
        findings.append({
            "severity": "medium",
            "title": "FTP Service Detected",
            "description": "FTP service found on port 21. FTP transmits credentials in plaintext.",
            "evidence": ["nmap_ftp_detection"],
            "recommendation": "Consider using SFTP or FTPS. Check for anonymous FTP access."
        })

    if '23/tcp' in output and 'telnet' in output.lower():
        findings.append({
            "severity": "high",
            "title": "Telnet Service Detected",
            "description": "Telnet service found on port 23. Telnet transmits all data in plaintext.",
            "evidence": ["nmap_telnet_detection"],
            "recommendation": "Immediately disable Telnet and use SSH instead."
        })

    if '445/tcp' in output and 'microsoft-ds' in output.lower():
        findings.append({
            "severity": "medium",
            "title": "SMB Service Detected",
            "description": "SMB service found on port 445. Potential entry point for network attacks.",
            "evidence": ["nmap_smb_detection"],
            "recommendation": "Check SMB configuration and consider disabling if not needed."
        })

    return findings

def analyze_subdomain_output(command, output):
    """Analyze subdomain enumeration results"""
    findings = []
    subdomains = extract_subdomains(output)

    if subdomains:
        sample_subdomains = list(subdomains)[:5]  # Show first 5 as sample
        findings.append({
            "severity": "low",
            "title": f"Subdomain Enumeration ({len(subdomains)} found)",
            "description": f"Discovered subdomains including: {', '.join(sample_subdomains)}",
            "evidence": [f"subdomain_scan_{command[:20]}"],
            "recommendation": "Review all subdomains for security misconfigurations and test each for vulnerabilities."
        })

    return findings

def analyze_directory_output(command, output):
    """Analyze directory brute-forcing results"""
    findings = []
    directories = extract_directories(output)
    files = extract_files(output)

    interesting_dirs = [d for d in directories if any(keyword in d.lower() for keyword in
                     ['admin', 'login', 'config', 'backup', 'upload', 'database'])]

    interesting_files = [f for f in files if any(keyword in f.lower() for keyword in
                     ['.bak', '.sql', '.config', '.env', 'password', 'credential'])]

    if interesting_dirs:
        findings.append({
            "severity": "medium",
            "title": "Sensitive Directories Discovered",
            "description": f"Found potentially sensitive directories: {', '.join(interesting_dirs[:5])}",
            "evidence": [f"directory_scan_{command[:20]}"],
            "recommendation": "Review these directories for sensitive information exposure."
        })

    if interesting_files:
        findings.append({
            "severity": "high",
            "title": "Potential Sensitive Files Found",
            "description": f"Discovered files that may contain sensitive data: {', '.join(interesting_files[:5])}",
            "evidence": [f"file_discovery_{command[:20]}"],
            "recommendation": "Immediately investigate these files for credential or configuration exposure."
        })

    return findings

def analyze_vulnerability_output(command, output):
    """Analyze vulnerability scanner results"""
    findings = []

    # SQL Injection findings
    if 'sqlmap' in command.lower():
        if 'injection' in output.lower():
            findings.append({
                "severity": "critical",
                "title": "SQL Injection Vulnerability Detected",
                "description": "SQLMap identified SQL injection vulnerabilities in the target application.",
                "evidence": ["sqlmap_scan_results"],
                "recommendation": "Immediately patch the vulnerable parameters and implement input validation."
            })

    # Nikto findings
    if 'nikto' in command.lower():
        if any(issue in output.lower() for issue in ['vulnerable', 'outdated', 'xss', 'injection']):
            findings.append({
                "severity": "medium",
                "title": "Web Application Vulnerabilities Identified",
                "description": "Nikto scan revealed potential web application security issues.",
                "evidence": ["nikto_scan_results"],
                "recommendation": "Review detailed Nikto findings and address identified vulnerabilities."
            })

    return findings

def analyze_info_output(command, output):
    """Analyze general information gathering results"""
    findings = []

    # DNS information
    if any(tool in command for tool in ['dig', 'nslookup', 'host']):
        ips = extract_ips(output)
        if ips:
            findings.append({
                "severity": "info",
                "title": "DNS Resolution Information",
                "description": f"DNS queries resolved to IP addresses: {', '.join(ips)}",
                "evidence": [f"dns_lookup_{command[:20]}"],
                "recommendation": "Verify DNS records are properly configured and secured."
            })

    return findings

# Extraction functions
def extract_ips(text):
    """Extract IP addresses from text"""
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    matches = re.findall(ip_pattern, text)
    # Filter out common false positives
    filtered_ips = [ip for ip in matches if not ip.startswith('0.') and ip != '127.0.0.1']
    return set(filtered_ips)

def extract_ports(text):
    """Extract port numbers from nmap output"""
    port_pattern = r'(\d+)/tcp'
    matches = re.findall(port_pattern, text)
    return set(matches)

def extract_subdomains(text):
    """Extract subdomains from text"""
    domain_pattern = r'[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}'
    matches = re.findall(domain_pattern, text)
    # Filter out common false positives and normalize
    filtered_domains = []
    for domain in matches:
        domain = domain.lower().strip()
        if len(domain) > 4 and not domain.startswith('www.') and '.' in domain:
            filtered_domains.append(domain)
    return set(filtered_domains)

def extract_directories(text):
    """Extract directory paths from text"""
    dir_patterns = [
        r'/(admin|login|config|backup|upload|database|images|css|js)(?:/|$)',
        r'200\s+.*?(/\S+)',
        r'Found:\s*(/\S+)',
        r'/\S+/\S+'  # General path pattern
    ]

    directories = set()
    for pattern in dir_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                dir_path = match[0] if match else ''
            else:
                dir_path = match
            if dir_path and len(dir_path) > 2:
                directories.add(dir_path)

    return directories

def extract_files(text):
    """Extract file names from text"""
    file_pattern = r'/([^/\s]+\.(?:txt|log|sql|bak|config|conf|env|yml|yaml|json|xml))(?:/|\s|$)'
    matches = re.findall(file_pattern, text, re.IGNORECASE)
    return set(matches)

def extract_technologies(text):
    """Extract technology names from text"""
    tech_pattern = r'(Apache|nginx|IIS|WordPress|Drupal|Joomla|Tomcat|Node\.js|PHP|Python|Ruby)'
    matches = re.findall(tech_pattern, text, re.IGNORECASE)
    return set([tech.lower() for tech in matches])

def extract_vulnerabilities(text):
    """Extract vulnerability indicators from text"""
    vuln_pattern = r'(vulnerable|injection|XSS|CVE-\d+-\d+|exploit|weak|exposed)'
    matches = re.findall(vuln_pattern, text, re.IGNORECASE)
    return set([vuln.lower() for vuln in matches])

def create_asset_findings(discovered_assets):
    """Create findings from discovered assets"""
    findings = []

    # Subdomains finding
    if discovered_assets['subdomains']:
        sample_subs = list(discovered_assets['subdomains'])[:3]
        findings.append({
            "severity": "low",
            "title": f"Subdomain Discovery ({len(discovered_assets['subdomains'])} total)",
            "description": f"Discovered subdomains including: {', '.join(sample_subs)}",
            "evidence": ["subdomain_enumeration"],
            "recommendation": "Test all subdomains for security misconfigurations."
        })

    # IP addresses finding
    if discovered_assets['ip_addresses']:
        findings.append({
            "severity": "info",
            "title": f"IP Addresses Identified ({len(discovered_assets['ip_addresses'])} unique)",
            "description": f"Discovered IP addresses: {', '.join(list(discovered_assets['ip_addresses'])[:5])}",
            "evidence": ["network_scanning"],
            "recommendation": "Verify all IP addresses belong to authorized infrastructure."
        })

    # Open ports finding
    if discovered_assets['open_ports']:
        findings.append({
            "severity": "medium",
            "title": f"Network Services Exposed ({len(discovered_assets['open_ports'])} ports)",
            "description": f"Open ports found: {', '.join(list(discovered_assets['open_ports'])[:10])}",
            "evidence": ["port_scanning"],
            "recommendation": "Review each service for vulnerabilities and disable unnecessary services."
        })

    # Technologies finding
    if discovered_assets['technologies']:
        findings.append({
            "severity": "info",
            "title": "Technology Stack Identified",
            "description": f"Detected technologies: {', '.join(discovered_assets['technologies'])}",
            "evidence": ["service_detection"],
            "recommendation": "Check for outdated versions of detected technologies."
        })

    # Vulnerabilities finding
    if discovered_assets['vulnerabilities']:
        findings.append({
            "severity": "high",
            "title": "Potential Vulnerabilities Flagged",
            "description": f"Scanner identified potential issues: {', '.join(discovered_assets['vulnerabilities'])}",
            "evidence": ["vulnerability_scanning"],
            "recommendation": "Immediately investigate and remediate flagged vulnerabilities."
        })

    return findings

def create_detailed_summary(commands, evidence, findings, discovered_assets, selected_project_id):
    """Create a comprehensive summary based on the analysis"""
    total_commands = len(commands)
    successful_commands = len([c for c in commands if c.get('status') == 'success'])

    summary_parts = []

    # Project-specific header
    if selected_project_id and selected_project_id != "all":
        summary_parts.append(f"Project #{selected_project_id} Security Assessment:")
    else:
        summary_parts.append("Multi-Project Security Assessment:")

    # Basic overview
    summary_parts.append(f"Analyzed {total_commands} commands ({successful_commands} successful) and {len(evidence)} evidence files.")

    # Key discoveries
    if discovered_assets['subdomains']:
        summary_parts.append(f"Discovered {len(discovered_assets['subdomains'])} subdomains.")

    if discovered_assets['ip_addresses']:
        summary_parts.append(f"Identified {len(discovered_assets['ip_addresses'])} unique IP addresses.")

    if discovered_assets['open_ports']:
        summary_parts.append(f"Found {len(discovered_assets['open_ports'])} open network ports.")

    # Critical findings
    critical_findings = [f for f in findings if f.get('severity') in ['critical', 'high']]
    if critical_findings:
        summary_parts.append(f"Identified {len(critical_findings)} high-severity security issues requiring immediate attention.")

    # Tools used
    tools_used = set()
    for cmd in commands:
        command_str = cmd.get('command', '').lower()
        if 'nmap' in command_str:
            tools_used.add('Network Scanning')
        if any(tool in command_str for tool in ['subfinder', 'amass']):
            tools_used.add('Subdomain Enumeration')
        if any(tool in command_str for tool in ['gobuster', 'dirb']):
            tools_used.add('Directory Brute-forcing')
        if any(tool in command_str for tool in ['sqlmap', 'nikto']):
            tools_used.add('Vulnerability Assessment')

    if tools_used:
        summary_parts.append(f"Assessment utilized: {', '.join(tools_used)}.")

    return " ".join(summary_parts)

def fallback_basic_analysis(commands, evidence, custom_prompt="", selected_project_id=None):
    """Fallback analysis if detailed parsing fails"""
    # Filter data for selected project
    project_commands, project_evidence = filter_project_data(commands, evidence, selected_project_id)

    successful = len([c for c in project_commands if c.get('status') == 'success'])
    failed = len([c for c in project_commands if c.get('status') == 'failed'])

    project_context = f" for Project #{selected_project_id}" if selected_project_id and selected_project_id != "all" else ""

    return {
        "summary": f"Basic security analysis of {len(project_commands)} commands{project_context}. {custom_prompt}",
        "findings": [{
            "severity": "info",
            "title": f"Security Assessment Data Collected{project_context}",
            "description": f"Analyzed {len(project_commands)} commands ({successful} successful, {failed} failed) and {len(project_evidence)} evidence files.",
            "evidence": [],
            "recommendation": "Review command outputs and evidence for security findings."
        }],
        "statistics": {
            "totalCommands": len(project_commands),
            "successfulCommands": successful,
            "failedCommands": failed,
            "evidenceCount": len(project_evidence),
            "criticalFindings": 0
        }
    }

def parse_online_ai_response(response_text: str, original_request: OnlineAIAnalysisRequest):
    """Parse and validate online AI response"""
    try:
        print(f"📨 Raw AI response: {response_text[:500]}...")  # Debug log

        # Try to extract JSON from the response
        import re
        import json

        # Look for JSON pattern
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                print("✅ Successfully parsed JSON response")
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed: {e}")
                return create_structured_fallback(response_text, original_request)
        else:
            print("❌ No JSON found in response, using fallback")
            # If no JSON found, create structured response from text
            return create_structured_fallback(response_text, original_request)

        # Validate and structure the response
        commands = original_request.commands
        evidence = original_request.evidence

        findings = []
        if 'findings' in parsed and isinstance(parsed['findings'], list):
            for finding in parsed['findings']:
                if isinstance(finding, dict):
                    findings.append({
                        "severity": finding.get("severity", "medium").lower(),
                        "title": finding.get("title", "Security Finding"),
                        "description": finding.get("description", "No description provided."),
                        "evidence": finding.get("evidence", []),
                        "recommendation": finding.get("recommendation", "Further investigation recommended.")
                    })
        else:
            print("⚠️ No findings array in parsed response")

        # If no findings parsed, create intelligent fallback
        if not findings:
            print("🔄 Creating intelligent findings from response text")
            findings = create_intelligent_findings(commands, evidence, response_text)

        # Create proper summary
        summary = parsed.get("summary") or parsed.get("executiveSummary", {}).get("overview", "Online AI analysis completed successfully.")
        if isinstance(summary, dict):
            summary = summary.get("overview", "Online AI analysis completed successfully.")

        return {
            "summary": summary,
            "findings": findings,
            "statistics": {
                "totalCommands": len(commands),
                "successfulCommands": len([c for c in commands if c.get('status') == 'success']),
                "failedCommands": len([c for c in commands if c.get('status') == 'failed']),
                "evidenceCount": len(evidence),
                "criticalFindings": len([f for f in findings if f.get("severity") in ["critical", "high"]])
            }
        }

    except Exception as e:
        print(f"❌ Error parsing online AI response: {e}")
        return create_structured_fallback(response_text, original_request)

def create_intelligent_findings(commands, evidence, ai_text):
    """Create intelligent findings when AI response parsing fails"""
    findings = []

    # Analyze commands for patterns
    security_tools = set()
    for cmd in commands:
        cmd_str = cmd.get('command', '').lower()
        if any(tool in cmd_str for tool in ['nmap', 'masscan']):
            security_tools.add('Network Scanning')
        if any(tool in cmd_str for tool in ['gobuster', 'dirb']):
            security_tools.add('Directory Enumeration')
        if any(tool in cmd_str for tool in ['sqlmap']):
            security_tools.add('SQL Injection Testing')

    if security_tools:
        findings.append({
            "severity": "medium",
            "title": "Security Assessment Activities",
            "description": f"Comprehensive security testing performed using: {', '.join(security_tools)}",
            "evidence": ["command_execution_logs"],
            "recommendation": "Review all tool outputs for identified vulnerabilities and findings."
        })

    # Add AI-generated insight
    findings.append({
        "severity": "info",
        "title": "AI Security Analysis",
        "description": ai_text[:300] + "..." if len(ai_text) > 300 else ai_text,
        "evidence": [],
        "recommendation": "Consider the AI-generated insights alongside manual analysis."
    })

    return findings

def create_structured_fallback(response_text: str, original_request: OnlineAIAnalysisRequest):
    """Create structured fallback when online AI fails"""
    commands = original_request.commands
    evidence = original_request.evidence

    return {
        "summary": "Online AI analysis completed. Review the findings below.",
        "findings": [
            {
                "severity": "medium",
                "title": "AI-Generated Security Assessment",
                "description": response_text[:500] + "..." if len(response_text) > 500 else response_text,
                "evidence": [],
                "recommendation": "Validate AI findings with manual analysis and tool outputs."
            }
        ],
        "statistics": {
            "totalCommands": len(commands),
            "successfulCommands": len([c for c in commands if c.get('status') == 'success']),
            "failedCommands": len([c for c in commands if c.get('status') == 'failed']),
            "evidenceCount": len(evidence),
            "criticalFindings": 0
        }
    }
@app.post("/api/ai-analysis")
async def ai_analysis(request: AIAnalysisRequest):
    """Main AI analysis endpoint - handles both local and online"""
    print(f"🔍 AI analysis request received - Online: {request.useOnline}, Provider: {request.onlineProvider}")
    print(f"📊 Data: {len(request.commands)} commands, {len(request.evidence)} evidence files")

    try:
        if request.useOnline:
            print(f"🌐 Using online AI analysis with {request.onlineProvider}")
            # Create online request
            online_request = OnlineAIAnalysisRequest(
                commands=request.commands,
                evidence=request.evidence,
                projects=request.projects,
                methodologies=request.methodologies,
                customPrompt=request.customPrompt,
                selectedProjectId=request.selectedProjectId,
                provider=request.onlineProvider
            )
            result = await online_ai_analysis(online_request)
            print(f"✅ Online AI analysis completed with {len(result.get('findings', []))} findings")
            return result
        else:
            print("🖥️ Using local AI analysis")
            # Use local analysis
            result = smart_detailed_analysis(
                request.commands,
                request.evidence,
                request.customPrompt or "",
                request.selectedProjectId
            )
            print(f"✅ Local analysis completed with {len(result.get('findings', []))} findings")
            return result
            
    except Exception as e:
        print(f"❌ AI analysis failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback response
        return {
            "summary": f"Analysis completed with issues: {str(e)}",
            "findings": [
                {
                    "severity": "info",
                    "title": "Analysis Service Temporarily Unavailable",
                    "description": f"The AI analysis encountered an error: {str(e)}",
                    "evidence": [],
                    "recommendation": "Please try again or check the backend service logs."
                }
            ],
            "statistics": {
                "totalCommands": len(request.commands),
                "successfulCommands": len([c for c in request.commands if c.get('status') == 'success']),
                "failedCommands": len([c for c in request.commands if c.get('status') == 'failed']),
                "evidenceCount": len(request.evidence),
                "criticalFindings": 0
            }
        }

@app.post("/api/online-ai-analysis")
async def online_ai_analysis(request: OnlineAIAnalysisRequest):
    """Online AI analysis endpoint"""
    try:
        print(f"🌐 Online AI analysis request for {len(request.commands)} commands using {request.provider}")

        # Filter data for selected project
        project_commands, project_evidence = filter_project_data(
            request.commands, request.evidence, request.selectedProjectId
        )

        print(f"🔍 Filtered to {len(project_commands)} commands and {len(project_evidence)} evidence for analysis")

        # Create prompt with filtered data
        prompt = create_online_analysis_prompt(request)

        print(f"📝 Prompt created ({len(prompt)} characters)")

        # Call the selected online provider
        if request.provider == "gemini":
            print("🚀 Calling Gemini API...")
            ai_response = await analyze_with_gemini(prompt)
        else:  # gpt
            print("🚀 Calling GPT API...")
            ai_response = await analyze_with_gemini(prompt)  # Temporary fallback to Gemini

        if not ai_response:
            raise Exception("No response from AI provider")

        print(f"📨 Received AI response ({len(ai_response)} characters)")

        # Parse and return the response
        result = parse_online_ai_response(ai_response, request)
        print(f"✅ Parsed response with {len(result.get('findings', []))} findings")
        return result

    except Exception as e:
        print(f"❌ Online AI analysis error: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to local analysis
        print("🔄 Falling back to local analysis...")
        return smart_detailed_analysis(
            request.commands,
            request.evidence,
            request.customPrompt or "",
            request.selectedProjectId
        )

class TextFilePreview:
    """Helper for text file previews"""
    
    @staticmethod
    async def get_preview(file_path: str, filename: str, api_base: str, evidence_id: int, max_lines: int = 20):
        try:
            # Try to fetch via API first
            try:
                response = requests.get(f"{api_base}/api/evidence-file/{evidence_id}", timeout=5)
                if response.status_code == 200:
                    content = response.text
                    lines = content.split('\n')
                    preview = '\n'.join(lines[:max_lines])
                    if len(lines) > max_lines:
                        preview += f"\n\n... and {len(lines) - max_lines} more lines"
                    return preview
            except:
                pass
            
            # Fallback to direct file reading
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    preview = ''.join(lines[:max_lines])
                    if len(lines) > max_lines:
                        preview += f"\n\n... and {len(lines) - max_lines} more lines"
                    return preview
                    
            return f"Unable to preview {filename}"
            
        except Exception as e:
            return f"Preview error: {str(e)}"
@app.post("/api/ai-chat")
async def ai_chat(request: AIChatRequest):
    """AI chat endpoint for follow-up questions"""
    try:
        print(f"💬 AI Chat request: {request.question[:100]}...")
        
        # Build context from the analysis
        ai_analysis = request.context.get('previous_analysis')
        commands = request.context.get('commands', [])
        evidence = request.context.get('evidence', [])
        
        # Create chat prompt
        chat_prompt = f"""
        SECURITY ASSESSMENT CHAT CONTEXT:
        
        Previous Analysis Summary:
        {ai_analysis.get('summary', 'No previous analysis available') if ai_analysis else 'No analysis available'}
        
        Key Findings: {len(ai_analysis.get('findings', [])) if ai_analysis else 0} security findings
        Commands Executed: {len(commands)}
        Evidence Collected: {len(evidence)}
        
        Conversation History:
        {format_conversation_history(request.conversation_history)}
        
        USER QUESTION: {request.question}
        
        Please provide a helpful, specific response based on the security assessment context above.
        Focus on practical security insights and recommendations.
        """
        
        # Use Gemini for chat (you can extend this for GPT later)
        if request.provider == "gemini" and GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel('models/gemini-2.0-flash-lite')
                
                response = model.generate_content(
                    chat_prompt,
                    generation_config={
                        'temperature': 0.3,
                        'max_output_tokens': 1000,
                    }
                )
                answer = response.text
            except Exception as e:
                answer = f"Gemini chat unavailable: {str(e)}. Using fallback response."
        else:
            # Fallback response
            answer = f"I received your question about the security assessment. Based on the analysis of {len(commands)} commands and {len(evidence)} evidence files, I'd be happy to help. However, the AI chat service is currently being configured. Please check the backend setup for complete functionality."
        
        return {
            "answer": answer,
            "context_used": {
                "has_analysis": bool(ai_analysis),
                "findings_count": len(ai_analysis.get('findings', [])) if ai_analysis else 0,
                "commands_count": len(commands),
                "evidence_count": len(evidence)
            }
        }
        
    except Exception as e:
        print(f"❌ AI Chat error: {e}")
        return {
            "answer": f"Sorry, I encountered an error while processing your question: {str(e)}. Please try again or check the service configuration.",
            "context_used": {}
        }

def format_conversation_history(history):
    """Format conversation history for context"""
    if not history:
        return "No previous conversation"
    
    formatted = []
    for i, exchange in enumerate(history[-3:], 1):  # Last 3 exchanges
        formatted.append(f"Q{i}: {exchange.get('question', '')}")
        formatted.append(f"A{i}: {exchange.get('answer', '')}")
    
    return "\n".join(formatted)


# Add these models after your existing AI models (around line where OnlineAIAnalysisRequest is defined)
class AIChatRequest(BaseModel):
    question: str
    context: Dict[str, Any]
    conversation_history: Optional[List[Dict[str, str]]] = []
    provider: str = "gemini"

class AIChatResponse(BaseModel):
    answer: str

# Add these debug functions after your existing functions
def debug_print_prompt(prompt: str, request_data: OnlineAIAnalysisRequest):
    """Print the complete prompt being sent to AI for debugging"""
    print("\n" + "🔍" * 40)
    print("🤖 AI PROMPT DEBUG INFORMATION")
    print("🔍" * 40)
    
    print(f"\n📊 DATA PROVIDED TO AI:")
    print(f"   • Projects: {len(request_data.projects)}")
    print(f"   • Commands: {len(request_data.commands)}")
    print(f"   • Evidence: {len(request_data.evidence)}")
    print(f"   • Methodologies: {len(request_data.methodologies)}")
    print(f"   • Custom Prompt: '{request_data.customPrompt}'")
    print(f"   • Selected Project: {request_data.selectedProjectId}")
    
    print(f"\n📝 SAMPLE COMMANDS ({min(5, len(request_data.commands))} of {len(request_data.commands)}):")
    for i, cmd in enumerate(request_data.commands[:5]):
        status_icon = "✅" if cmd.get('status') == 'success' else "❌"
        print(f"   {i+1}. {status_icon} {cmd.get('command', '')[:80]}...")
    
    print(f"\n📁 SAMPLE EVIDENCE ({min(3, len(request_data.evidence))} of {len(request_data.evidence)}):")
    for i, ev in enumerate(request_data.evidence[:3]):
        print(f"   {i+1}. 📄 {ev.get('filename', 'Unknown')}: {ev.get('description', 'No description')}")
    
    print(f"\n🎯 CUSTOM PROMPT:")
    print(f"   '{request_data.customPrompt or 'No custom prompt provided'}'")
    
    print(f"\n📨 FULL PROMPT SENT TO AI:")
    print("─" * 80)
    print(prompt[:2000] + "..." if len(prompt) > 2000 else prompt)
    print("─" * 80)
    print(f"📏 Prompt length: {len(prompt)} characters")
    print("🔍" * 40 + "\n")

def print_ai_analysis_to_terminal(analysis_data: dict, request_data: dict):
    """Print AI analysis results to terminal in a readable format"""
    print("\n" + "="*80)
    print("🛡️  AI SECURITY ASSESSMENT REPORT")
    print("="*80)
    
    # Basic info
    print(f"📅 Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔍 Project ID: {request_data.get('selectedProjectId', 'All Projects')}")
    print(f"📊 Commands analyzed: {analysis_data['statistics']['totalCommands']}")
    print(f"📁 Evidence files: {analysis_data['statistics']['evidenceCount']}")
    
    # Summary
    print(f"\n📋 EXECUTIVE SUMMARY:")
    print(f"{analysis_data['summary']}")
    
    # Findings
    print(f"\n🔍 SECURITY FINDINGS ({len(analysis_data['findings'])}):")
    for i, finding in enumerate(analysis_data['findings'], 1):
        print(f"\n{i}. [{finding['severity'].upper()}] {finding['title']}")
        print(f"   Description: {finding['description']}")
        print(f"   Recommendation: {finding['recommendation']}")
        if finding['evidence']:
            print(f"   Evidence: {', '.join(finding['evidence'])}")
    
    # Statistics
    print(f"\n📈 STATISTICS:")
    stats = analysis_data['statistics']
    print(f"   • Total Commands: {stats['totalCommands']}")
    print(f"   • Successful: {stats['successfulCommands']}")
    print(f"   • Failed: {stats['failedCommands']}")
    print(f"   • Evidence Files: {stats['evidenceCount']}")
    print(f"   • Critical Findings: {stats['criticalFindings']}")
    
    print("="*80 + "\n")

# Update the analyze_with_gemini function to use correct models
async def analyze_with_gemini(prompt: str):
    """Analyze with Google Gemini"""
    try:
        if not GEMINI_API_KEY:
            raise Exception("Gemini API key not configured")

        genai.configure(api_key=GEMINI_API_KEY)
        
        # Use the exact model names from your available list
        model_names_to_try = [
            'models/gemini-2.0-flash',  # Fast and capable
            'models/gemini-2.0-flash-001',  # Alternative flash model
            'models/gemini-pro-latest',  # Latest pro version
        ]

        model = None
        last_error = None
        
        for model_name in model_names_to_try:
            try:
                print(f"🔄 Trying model: {model_name}")
                model = genai.GenerativeModel(model_name)
                
                # Test with a small prompt first
                test_response = model.generate_content(
                    "Hello, please respond with 'OK' if you're working.",
                    generation_config={
                        'temperature': 0.1,
                        'max_output_tokens': 10,
                    }
                )
                
                print(f"✅ Model {model_name} is working: {test_response.text}")
                break
                
            except Exception as e:
                last_error = e
                print(f"❌ Model {model_name} failed: {e}")
                continue

        if model is None:
            raise Exception(f"No working Gemini model found. Last error: {last_error}")

        print(f"🚀 Using model: {model_name} for analysis")
        
        # Now generate the actual analysis
        response = model.generate_content(
            prompt,
            generation_config={
                'temperature': 0.3,
                'top_p': 0.8,
                'top_k': 40,
                'max_output_tokens': 2048,
            }
        )

        print(f"📨 Gemini response received successfully")
        return response.text
        
    except Exception as e:
        print(f"Gemini analysis error: {e}")
        raise Exception(f"Gemini analysis failed: {str(e)}")

# Add the chat endpoint
@app.post("/api/ai-chat")
async def ai_chat(request: AIChatRequest):
    """Chat with AI about the security assessment - User input only"""
    try:
        print(f"💬 AI Chat request: '{request.question}'")
        
        # Prepare context for the chat
        commands = request.context.get('commands', [])
        evidence = request.context.get('evidence', [])
        previous_analysis = request.context.get('previous_analysis', {})
        
        # Build focused chat prompt
        chat_prompt = f"""As a senior cybersecurity analyst, answer this specific question based on the penetration testing data:

USER QUESTION: {request.question}

CONTEXT DATA:
- Previous Analysis Summary: {previous_analysis.get('summary', 'No previous analysis')}
- Total Commands Executed: {len(commands)}
- Evidence Files Collected: {len(evidence)}
- Security Findings Identified: {len(previous_analysis.get('findings', []))}

RECENT CONVERSATION:
{chr(10).join([f"User: {msg.get('question', '')} | Analyst: {msg.get('answer', '')}" for msg in request.conversation_history[-3:]])}

Please provide:
1. A direct, professional answer to the user's specific question
2. Reference specific commands, evidence, or findings when relevant
3. Provide actionable insights based on the available data
4. Be concise but thorough

Answer format: Provide a clear, well-structured response without JSON formatting.
"""
        
        # Print chat prompt for debugging
        print(f"💬 CHAT PROMPT SENT:")
        print("─" * 60)
        print(chat_prompt)
        print("─" * 60)
        
        if request.provider == "gemini":
            answer = await analyze_with_gemini(chat_prompt)
        else:
            answer = await analyze_with_gpt(chat_prompt)
        
        print(f"💬 CHAT RESPONSE: {answer[:200]}...")
        
        # Return simple response
        return {
            "answer": answer
        }
        
    except Exception as e:
        print(f"❌ AI Chat error: {e}")
        return {
            "answer": f"I apologize, but I encountered an error: {str(e)}. Please try again with a different question."
        }

# Update the main AI analysis endpoint to print to terminal
@app.post("/api/ai-analysis", response_model=AIAnalysisResponse)
async def ai_analysis(request: AIAnalysisRequest):
    """Main AI analysis endpoint - handles both local and online"""
    print(f"🔍 AI analysis request - Online: {request.useOnline}, Provider: {request.onlineProvider}")

    if request.useOnline:
        print(f"🌐 Using online AI analysis with {request.onlineProvider}")
        online_request = OnlineAIAnalysisRequest(
            commands=request.commands,
            evidence=request.evidence,
            projects=request.projects,
            methodologies=request.methodologies,
            customPrompt=request.customPrompt,
            selectedProjectId=request.selectedProjectId,
            provider=request.onlineProvider
        )
        result = await online_ai_analysis(online_request)
    else:
        print("🖥️ Using local AI analysis")
        result = smart_detailed_analysis(
            request.commands,
            request.evidence,
            request.customPrompt or "",
            request.selectedProjectId
        )
    
    # Print to terminal
    print_ai_analysis_to_terminal(result, request.dict())
    
    return result

@app.get("/api/health")
async def health_check():
    """Comprehensive health check"""
    status = {
        "api": "healthy",
        "database": "healthy" if DB_FILE.exists() else "missing",
        "upload_dir": "healthy" if UPLOAD_DIR.exists() else "missing",
        "ai_services": {}
    }
    
    # Check AI services
    try:
        ai_status = await get_ai_status()
        status["ai_services"] = ai_status
    except Exception as e:
        status["ai_services"] = {"error": str(e)}
    
    return status
@app.get("/api/ai-status")
async def get_ai_status():
    """Check status of all AI providers"""
    status = {
        "local_ollama": {
            "available": False,
            "status": "Unknown"
        },
        "online_gemini": {
            "available": False,
            "status": "Not configured",
            "api_key_set": bool(GEMINI_API_KEY),
            "library_installed": GEMINI_AVAILABLE
        },
        "online_gpt": {
            "available": False,
            "status": "Not configured",
            "api_key_set": bool(OPENAI_API_KEY),
            "library_installed": OPENAI_AVAILABLE
        }
    }

    # Test Ollama
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        status["local_ollama"]["available"] = response.status_code == 200
        status["local_ollama"]["status"] = "Running" if response.status_code == 200 else "Not responding"
    except:
        status["local_ollama"]["status"] = "Not running"

    # Test Gemini if configured
    if GEMINI_API_KEY and GEMINI_AVAILABLE:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            # Simple test - list available models
            models = genai.list_models()
            status["online_gemini"]["available"] = True
            status["online_gemini"]["status"] = "Working"
        except Exception as e:
            status["online_gemini"]["status"] = f"Error: {str(e)}"

    # Test GPT if configured
    if OPENAI_API_KEY and OPENAI_AVAILABLE:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            # Simple test - list models
            models = client.models.list()
            status["online_gpt"]["available"] = True
            status["online_gpt"]["status"] = "Working"
        except Exception as e:
            status["online_gpt"]["status"] = f"Error: {str(e)}"

    return status
# ============================
# Methodology Sharing Models
# ============================
class SharedMethodology(BaseModel):
    id: str
    title: str
    description: str
    methodology_data: Dict[str, Any]
    author: str = "Anonymous"
    tags: List[str] = []
    likes: int = 0
    downloads: int = 0
    comments: List[Dict[str, Any]] = []
    created_at: float
    updated_at: float
    is_public: bool = True
    views: int = 0  # Added for analytics

class ShareMethodologyRequest(BaseModel):
    methodologyId: str  # Changed to match frontend
    title: str
    description: str
    author: str = "Anonymous"
    tags: List[str] = []
    is_public: bool = True

class CommentRequest(BaseModel):
    author: str = "Anonymous"
    content: str
    rating: Optional[int] = None

class AdoptMethodologyRequest(BaseModel):
    new_name: Optional[str] = None

# ============================
# Methodology Sharing Storage
# ============================
# In production, use a proper database
shared_methodologies_db = {}
popular_tags_cache = {}
tags_cache_timestamp = 0

def get_shared_methodologies_db():
    """Get shared methodologies storage"""
    global shared_methodologies_db
    return shared_methodologies_db

def update_popular_tags_cache():
    """Update popular tags cache"""
    global popular_tags_cache, tags_cache_timestamp
    methodologies = list(get_shared_methodologies_db().values())
    tag_counts = {}
    
    for methodology in methodologies:
        for tag in methodology.get('tags', []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    popular_tags_cache = tag_counts
    tags_cache_timestamp = time.time()

# ============================
# Methodology Sharing Endpoints
# ============================

@app.get("/api/shared-methodologies")
def get_shared_methodologies(
    search: Optional[str] = None,
    tags: Optional[str] = None,
    sort_by: str = "updated_at",
    page: int = 1,
    limit: int = 20
):
    """Get all shared methodologies with filtering and pagination"""
    try:
        methodologies_db = get_shared_methodologies_db()
        methodologies = list(methodologies_db.values())
        
        print(f"📊 Total methodologies in DB: {len(methodologies)}")

        # Filter by search term
        if search:
            search_lower = search.lower()
            methodologies = [
                m for m in methodologies
                if (search_lower in m.get('title', '').lower() or
                    search_lower in m.get('description', '').lower() or
                    search_lower in ' '.join(m.get('tags', [])).lower())
            ]
            print(f"🔍 After search filter: {len(methodologies)}")

        # Filter by tags
        if tags:
            tag_list = [tag.strip().lower() for tag in tags.split(',')]
            methodologies = [
                m for m in methodologies
                if any(tag in [t.lower() for t in m.get('tags', [])] for tag in tag_list)
            ]
            print(f"🏷️ After tag filter: {len(methodologies)}")

        # Sort methodologies
        if sort_by == "likes":
            methodologies.sort(key=lambda x: x.get('likes', 0), reverse=True)
        elif sort_by == "downloads":
            methodologies.sort(key=lambda x: x.get('downloads', 0), reverse=True)
        elif sort_by == "updated_at":
            methodologies.sort(key=lambda x: x.get('updated_at', 0), reverse=True)
        elif sort_by == "created_at":
            methodologies.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        # Pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_methodologies = methodologies[start_idx:end_idx]

        print(f"📄 Pagination: page {page}, limit {limit}, showing {len(paginated_methodologies)}")

        return {
            "methodologies": paginated_methodologies,
            "total": len(methodologies),
            "page": page,
            "limit": limit,
            "total_pages": max(1, (len(methodologies) + limit - 1) // limit)
        }

    except Exception as e:
        print(f"❌ Error in get_shared_methodologies: {e}")
        import traceback
        traceback.print_exc()
        return {
            "methodologies": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0
        }

@app.post("/api/share-methodology")
def share_methodology(request: ShareMethodologyRequest):
    """Share a methodology to the community"""
    try:
        print(f"📤 Sharing methodology request: {request.dict()}")
        
        # Find the methodology to share
        methodology = None
        methodology_id = int(request.methodologyId)
        
        print(f"🔍 Looking for methodology ID: {methodology_id}")
        print(f"📋 Available methodologies: {[m['id'] for m in db['methodologies']]}")
        
        for m in db["methodologies"]:
            if int(m["id"]) == methodology_id:
                methodology = m
                break

        if not methodology:
            print(f"❌ Methodology {methodology_id} not found")
            raise HTTPException(status_code=404, detail="Methodology not found")

        print(f"✅ Found methodology: {methodology['name']}")

        # Create shared methodology
        shared_id = str(uuid.uuid4())
        shared_methodology = SharedMethodology(
            id=shared_id,
            title=request.title,
            description=request.description,
            methodology_data=methodology,
            author=request.author or "Anonymous",
            tags=request.tags,
            created_at=time.time(),
            updated_at=time.time(),
            is_public=request.is_public
        )

        # Save to storage
        methodologies_db = get_shared_methodologies_db()
        methodologies_db[shared_id] = shared_methodology.dict()
        
        # Update tags cache
        update_popular_tags_cache()

        print(f"✅ Methodology shared successfully with ID: {shared_id}")
        
        return {
            "ok": True,
            "shared_id": shared_id,
            "message": "Methodology shared successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sharing methodology: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to share methodology: {str(e)}")

@app.get("/api/shared-methodologies/{shared_id}")
def get_shared_methodology(shared_id: str):
    """Get a specific shared methodology"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if shared_id not in methodologies_db:
            print(f"❌ Shared methodology {shared_id} not found")
            raise HTTPException(status_code=404, detail="Shared methodology not found")

        methodology = methodologies_db[shared_id]

        # Increment view count (for analytics)
        methodology['views'] = methodology.get('views', 0) + 1
        methodology['updated_at'] = time.time()

        print(f"✅ Returning shared methodology: {methodology['title']}")
        return methodology

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting shared methodology: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get shared methodology: {str(e)}")

@app.post("/api/shared-methodologies/{shared_id}/like")
def like_methodology(shared_id: str):
    """Like a shared methodology"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if shared_id not in methodologies_db:
            raise HTTPException(status_code=404, detail="Shared methodology not found")

        methodology = methodologies_db[shared_id]
        methodology['likes'] = methodology.get('likes', 0) + 1
        methodology['updated_at'] = time.time()

        print(f"✅ Liked methodology {shared_id}, total likes: {methodology['likes']}")
        
        return {"ok": True, "likes": methodology['likes']}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error liking methodology: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to like methodology: {str(e)}")

@app.post("/api/shared-methodologies/{shared_id}/adopt")
def adopt_methodology(shared_id: str, request: AdoptMethodologyRequest = None):
    """Adopt a shared methodology into personal methodologies"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if shared_id not in methodologies_db:
            raise HTTPException(status_code=404, detail="Shared methodology not found")

        shared_methodology = methodologies_db[shared_id]
        methodology_data = shared_methodology['methodology_data']

        # Create a copy for the user
        new_methodology = methodology_data.copy()
        new_methodology['id'] = next_id(db["methodologies"])

        if request and request.new_name:
            new_methodology['name'] = request.new_name
        else:
            # Add " (Adopted)" suffix to distinguish
            new_methodology['name'] = f"{new_methodology['name']} (Adopted)"

        # Add to user's methodologies
        db["methodologies"].append(new_methodology)
        save_db(db)

        # Increment download count
        shared_methodology['downloads'] = shared_methodology.get('downloads', 0) + 1
        shared_methodology['updated_at'] = time.time()

        print(f"✅ Methodology adopted: {new_methodology['name']}")
        
        return {
            "ok": True,
            "methodology_id": new_methodology['id'],
            "message": "Methodology adopted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error adopting methodology: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to adopt methodology: {str(e)}")

@app.post("/api/shared-methodologies/{shared_id}/comment")
def add_comment(shared_id: str, request: CommentRequest):
    """Add a comment to a shared methodology"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if shared_id not in methodologies_db:
            raise HTTPException(status_code=404, detail="Shared methodology not found")

        methodology = methodologies_db[shared_id]

        comment = {
            "id": str(uuid.uuid4()),
            "author": request.author or "Anonymous",
            "content": request.content,
            "rating": request.rating,
            "created_at": time.time()
        }

        if 'comments' not in methodology:
            methodology['comments'] = []

        methodology['comments'].append(comment)
        methodology['updated_at'] = time.time()

        print(f"✅ Comment added to methodology {shared_id}")
        
        return {"ok": True, "comment": comment}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error adding comment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add comment: {str(e)}")

@app.get("/api/shared-methodologies/{shared_id}/comments")
def get_comments(shared_id: str, page: int = 1, limit: int = 10):
    """Get comments for a shared methodology"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if shared_id not in methodologies_db:
            raise HTTPException(status_code=404, detail="Shared methodology not found")

        methodology = methodologies_db[shared_id]
        comments = methodology.get('comments', [])

        # Sort by newest first
        comments.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        # Pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_comments = comments[start_idx:end_idx]

        return {
            "comments": paginated_comments,
            "total": len(comments),
            "page": page,
            "limit": limit
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting comments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")

@app.get("/api/popular-tags")
def get_popular_tags(limit: int = 15):
    """Get most popular tags from shared methodologies"""
    try:
        global popular_tags_cache, tags_cache_timestamp
        
        # Refresh cache if it's old (older than 5 minutes)
        if time.time() - tags_cache_timestamp > 300:
            update_popular_tags_cache()

        # Sort by count and get top tags
        popular_tags = sorted(
            popular_tags_cache.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:limit]

        print(f"✅ Returning {len(popular_tags)} popular tags")
        
        return [{"tag": tag, "count": count} for tag, count in popular_tags]

    except Exception as e:
        print(f"❌ Error getting popular tags: {e}")
        return []

# ============================
# Initialize with Sample Data
# ============================
def initialize_sample_shared_methodologies():
    """Initialize with some sample shared methodologies for testing"""
    try:
        methodologies_db = get_shared_methodologies_db()
        
        if methodologies_db:
            print("📚 Sample methodologies already initialized")
            return

        sample_methodologies = [
            {
                "id": str(uuid.uuid4()),
                "title": "Comprehensive Web Application Testing",
                "description": "A complete methodology for testing modern web applications including API endpoints and SPA frameworks.",
                "methodology_data": {
                    "id": 1001,
                    "name": "Web App Comprehensive Test",
                    "description": "Complete web application security assessment",
                    "commands": [
                        "nmap -sS -sV -sC -O {{target}}",
                        "subfinder -d {{target}}",
                        "gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt",
                        "nikto -h http://{{target}}",
                        "sqlmap -u 'http://{{target}}/login' --forms --batch"
                    ],
                    "steps": [
                        {
                            "id": "recon",
                            "type": "section",
                            "title": "Information Gathering",
                            "description": "Passive and active reconnaissance"
                        },
                        {
                            "id": "nmap_scan",
                            "type": "command",
                            "title": "Network Scanning",
                            "description": "Perform comprehensive port scanning",
                            "command": "nmap -sS -sV -sC -O {{target}}",
                            "requires_upload": False
                        }
                    ]
                },
                "author": "Security Expert",
                "tags": ["web", "api", "comprehensive", "owasp"],
                "likes": 15,
                "downloads": 8,
                "comments": [
                    {
                        "id": str(uuid.uuid4()),
                        "author": "PenTester123",
                        "content": "Great methodology! Used it on my last engagement and found critical issues.",
                        "rating": 5,
                        "created_at": time.time() - 86400
                    }
                ],
                "created_at": time.time() - 2592000,  # 30 days ago
                "updated_at": time.time() - 86400,    # 1 day ago
                "is_public": True,
                "views": 42
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Quick Network Security Scan",
                "description": "Rapid network assessment for time-constrained engagements. Perfect for initial reconnaissance.",
                "methodology_data": {
                    "id": 1002,
                    "name": "Quick Network Scan",
                    "description": "Rapid network security assessment",
                    "commands": [
                        "nmap -sS -sV --top-ports 1000 {{target}}",
                        "masscan -p1-1000 {{targetIP}} --rate=1000"
                    ],
                    "steps": [
                        {
                            "id": "quick_scan",
                            "type": "command",
                            "title": "Quick Port Scan",
                            "description": "Rapid port discovery",
                            "command": "nmap -sS -sV --top-ports 1000 {{target}}",
                            "requires_upload": False
                        }
                    ]
                },
                "author": "Network Specialist",
                "tags": ["network", "quick", "reconnaissance", "nmap"],
                "likes": 8,
                "downloads": 12,
                "comments": [],
                "created_at": time.time() - 1728000,  # 20 days ago
                "updated_at": time.time() - 172800,
                "is_public": True,
                "views": 28
            }
        ]

        for methodology in sample_methodologies:
            methodologies_db[methodology['id']] = methodology

        update_popular_tags_cache()
        print("🎉 Sample shared methodologies initialized")

    except Exception as e:
        print(f"❌ Error initializing sample methodologies: {e}")

# Initialize sample data when the app starts
@app.on_event("startup")
async def startup_event():
    initialize_sample_shared_methodologies()

# Add to your existing models
class CommandSuggestionRequest(BaseModel):
    current_methodology: Dict[str, Any]
    project_target: str
    completed_steps: List[str] = []
    custom_prompt: Optional[str] = None
    use_online: bool = True
    provider: str = "gemini"

class CommandExplanationRequest(BaseModel):
    command: str
    context: Dict[str, Any]
    use_online: bool = True
    provider: str = "gemini"

class CommandSuggestion(BaseModel):
    command: str
    description: str
    category: str
    risk_level: str
    prerequisites: Optional[List[str]] = []
    expected_output: Optional[str] = None

class CommandExplanation(BaseModel):
    command: str
    explanation: str
    purpose: str
    risks: List[str]
    alternatives: List[str]
    best_practices: List[str]

# Add these endpoints to your FastAPI app
@app.post("/api/ai-command-suggestions", response_model=Dict[str, List[CommandSuggestion]])
async def ai_command_suggestions(request: CommandSuggestionRequest):
    """Get AI-powered command suggestions using Gemini"""
    try:
        print(f"🎯 AI Command Suggestions request received")
        print(f"📊 Methodology: {request.current_methodology.get('name', 'Unknown')}")
        print(f"🎯 Target: {request.project_target}")

        # Prepare comprehensive prompt for AI
        prompt = f"""
ACT AS: Senior Cybersecurity Penetration Tester

CONTEXT:
- Current Methodology: {request.current_methodology.get('name', 'Unknown')} - {request.current_methodology.get('description', 'No description')}
- Target: {request.project_target}
- Completed Steps: {request.completed_steps if request.completed_steps else 'None'}
- Custom Instructions: {request.custom_prompt or 'None'}

TASK: Suggest 3-7  penetration testing commands that would be appropriate for the current methodology phase consider the current methodology name .

For each command, provide:
1. The exact command string (use {{target}} for the target variable)
2. Brief description of what it does
3. Category (Network Reconnaissance, Web Testing, Vulnerability Assessment, Exploitation, Post-Exploitation)
4. Risk level (low, medium, high) - consider detection risk and target impact
5. Prerequisites (if any)
6. Expected typical output

IMPORTANT: Commands should be practical, commonly used in penetration testing, and appropriate for the methodology context.

Return ONLY valid JSON array format, no other text:

[
  {{
    "command": "nmap -sV -sC {{target}}",
    "description": "Service version detection with script scanning",
    "category": "Network Reconnaissance",
    "risk_level": "low",
    "prerequisites": ["Network access"],
    "expected_output": "Open ports, service versions, script results"
  }}
]
"""

        print(f"📝 Prompt length: {len(prompt)} characters")

        if request.use_online and request.provider == "gemini":
            print("🚀 Using Gemini for command suggestions...")
            ai_response = await analyze_with_gemini(prompt)
            suggestions = parse_command_suggestions(ai_response)
        else:
            print("🔄 Using fallback suggestions")
            suggestions = get_fallback_command_suggestions(request)

        print(f"✅ Generated {len(suggestions)} command suggestions")
        return {"suggestions": suggestions}

    except Exception as e:
        print(f"❌ AI command suggestion error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"suggestions": get_fallback_command_suggestions(request)}

@app.post("/api/ai-explain-command", response_model=CommandExplanation)
async def ai_explain_command(request: CommandExplanationRequest):
    """Get AI explanation for a specific command using Gemini"""
    try:
        print(f"🔍 Command explanation request: {request.command[:100]}...")

        prompt = f"""
ACT AS: Senior Cybersecurity Instructor

COMMAND TO EXPLAIN: {request.command}
TARGET: {request.context.get('target', 'Unknown')}
METHODOLOGY: {request.context.get('methodology', 'Unknown')}

Provide a comprehensive explanation including:

1. What the command does technically
2. Its purpose in penetration testing context
3. Potential risks and considerations
4. Alternative commands or approaches
5. Best practices when using this command

Return ONLY valid JSON format:

{{
  "command": "{request.command}",
  "explanation": "Detailed technical explanation...",
  "purpose": "Primary use case in pentesting...",
  "risks": ["Risk 1", "Risk 2"],
  "alternatives": ["Alternative command 1", "Alternative command 2"],
  "best_practices": ["Best practice 1", "Best practice 2"]
}}
"""

        if request.use_online and request.provider == "gemini":
            print("🚀 Using Gemini for command explanation...")
            ai_response = await analyze_with_gemini(prompt)
            explanation = parse_command_explanation(ai_response, request.command)
        else:
            print("🔄 Using fallback explanation")
            explanation = get_fallback_command_explanation(request.command, request.context)

        return explanation

    except Exception as e:
        print(f"❌ Command explanation error: {str(e)}")
        return get_fallback_command_explanation(request.command, request.context)

# Helper functions
def parse_command_suggestions(ai_response: str) -> List[CommandSuggestion]:
    """Parse AI response for command suggestions"""
    try:
        import re
        import json
        
        # Look for JSON pattern in the response
        json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
        if json_match:
            suggestions_data = json.loads(json_match.group())
            return [CommandSuggestion(**suggestion) for suggestion in suggestions_data]
        else:
            print("❌ No JSON array found in AI response")
            return get_fallback_suggestions_default()
    except Exception as e:
        print(f"❌ Error parsing command suggestions: {e}")
        return get_fallback_suggestions_default()

def parse_command_explanation(ai_response: str, original_command: str) -> CommandExplanation:
    """Parse AI response for command explanation"""
    try:
        import re
        import json
        
        # Look for JSON pattern in the response
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            explanation_data = json.loads(json_match.group())
            return CommandExplanation(**explanation_data)
        else:
            print("❌ No JSON object found in AI response")
            return get_fallback_explanation_default(original_command)
    except Exception as e:
        print(f"❌ Error parsing command explanation: {e}")
        return get_fallback_explanation_default(original_command)

def get_fallback_command_suggestions(request: CommandSuggestionRequest) -> List[CommandSuggestion]:
    """Fallback command suggestions"""
    return [
        CommandSuggestion(
            command=f"nmap -sV -sC {request.project_target}",
            description="Comprehensive network scan with version detection and script scanning",
            category="Network Reconnaissance",
            risk_level="low",
            prerequisites=["Network access to target"],
            expected_output="Open ports, service versions, OS detection"
        ),
        CommandSuggestion(
            command=f"gobuster dir -u https://{request.project_target} -w /usr/share/wordlists/dirb/common.txt",
            description="Directory and file brute force scanning",
            category="Web Application Testing",
            risk_level="medium",
            prerequisites=["Web server accessible"],
            expected_output="Discovered directories and files"
        )
    ]

def get_fallback_suggestions_default() -> List[CommandSuggestion]:
    """Default fallback suggestions"""
    return [
        CommandSuggestion(
            command="nmap -sV -sC {{target}}",
            description="Service version detection with default scripts",
            category="Network Reconnaissance",
            risk_level="low",
            prerequisites=["Network access"],
            expected_output="Service versions and basic vulnerabilities"
        )
    ]

def get_fallback_command_explanation(command: str, context: Dict[str, Any]) -> CommandExplanation:
    """Fallback command explanation"""
    return CommandExplanation(
        command=command,
        explanation=f"This is a security testing command targeting {context.get('target', 'the target')}.",
        purpose="Security assessment and penetration testing",
        risks=["May trigger security monitoring", "Could impact target system"],
        alternatives=["Consider using less intrusive options first"],
        best_practices=["Test in controlled environment", "Obtain proper authorization"]
    )

def get_fallback_explanation_default(command: str) -> CommandExplanation:
    """Default fallback explanation"""
    return CommandExplanation(
        command=command,
        explanation="This command is used in security testing for reconnaissance or vulnerability assessment.",
        purpose="Security assessment",
        risks=["Potential detection by security systems", "May cause service disruption"],
        alternatives=[],
        best_practices=["Use in authorized environments only", "Follow responsible disclosure practices"]
    )
# ============================
# Health Check Endpoint
# ============================
@app.get("/api/health")
async def health_check():
    """Comprehensive health check including sharing functionality"""
    methodologies_db = get_shared_methodologies_db()
    
    status = {
        "api": "healthy",
        "database": "healthy" if DB_FILE.exists() else "missing",
        "upload_dir": "healthy" if UPLOAD_DIR.exists() else "missing",
        "methodology_sharing": {
            "shared_count": len(methodologies_db),
            "sample_data_loaded": len(methodologies_db) > 0
        },
        "ai_services": {}
    }

    # Check AI services
    try:
        ai_status = await get_ai_status()
        status["ai_services"] = ai_status
    except Exception as e:
        status["ai_services"] = {"error": str(e)}

    return status

@app.get("/")
def root():
    methodologies_db = get_shared_methodologies_db()
    return {
        "ok": True, 
        "service": "Pentest Orchestration API",
        "shared_methodologies_count": len(methodologies_db)
    }
#ai_command_suggestions
