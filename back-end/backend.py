import os
import json
import uuid
import shutil
import platform
import threading
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse

# -----------------------
# App + CORS
# -----------------------
app = FastAPI(title="Pentest Orchestration API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Storage (simple JSON file)
# -----------------------
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
    "evidence": []  # list of {id, project_id, type, filename?, path?, description}
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

# -----------------------
# Models
# -----------------------
class Project(BaseModel):
    id: int
    name: str
    client: str
    scope: str
    status: str  # ongoing/completed/etc

class Methodology(BaseModel):
    id: int
    name: str
    steps: List[str]

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

# -----------------------
# Helpers
# -----------------------
def next_id(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 1
    return max(int(i["id"]) for i in items) + 1

# -----------------------
# Projects
# -----------------------
@app.get("/projects")
def list_projects():
    return db["projects"]

@app.post("/projects")
def add_project(p: Project):
    db["projects"].append(p.dict())
    save_db(db)
    return {"ok": True, "project": p}

# -----------------------
# Methodologies
# -----------------------
@app.get("/methodologies")
def list_methodologies():
    return db["methodologies"]

@app.post("/methodologies")
def add_methodology(m: Methodology):
    db["methodologies"].append(m.dict())
    save_db(db)
    return {"ok": True, "methodology": m}

# -----------------------
# Findings
# -----------------------
@app.get("/findings/{project_id}")
def list_findings(project_id: int):
    return [f for f in db["findings"] if int(f["project_id"]) == int(project_id)]

@app.post("/findings")
def add_finding(f: Finding):
    db["findings"].append(f.dict())
    save_db(db)
    return {"ok": True, "finding": f}

# -----------------------
# Reports
# -----------------------
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

# -----------------------
# Evidence (file upload)
# -----------------------
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

    # Save file (if provided)
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

@app.get("/evidence/{project_id}")
def list_evidence(project_id: int):
    return [e for e in db["evidence"] if int(e["project_id"]) == int(project_id)]

# -----------------------
# Command Execution
# -----------------------
# 1) One-off (safer) execution endpoint
@app.post("/exec")
def exec_command(req: CommandRequest):
    global current_process
    try:
        current_process = subprocess.Popen(
            req.command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        output_lines = []
        # Print and collect line by line
        for line in iter(current_process.stdout.readline, ''):
            if not line:
                break
            print(line, end='')  # show in backend terminal immediately
            output_lines.append(line)

        current_process.wait(timeout=300)
        rc = current_process.returncode
        return {
            "returncode": rc,
            "stdout": "".join(output_lines).strip()
        }
    except subprocess.TimeoutExpired:
        current_process.kill()
        return JSONResponse(status_code=408, content={"error": "Command timed out"})
    except Exception as e:
        return {"error": str(e)}
    finally:
        current_process = None

@app.post("/methodologies/{methodology_id}/run")
def run_methodology(methodology_id: int):
    # Find methodology
    m = next((m for m in db["methodologies"] if int(m["id"]) == methodology_id), None)
    if not m:
        return JSONResponse(status_code=404, content={"error": "Methodology not found"})

    results = []
    for step in m.get("steps", []):
        step_name = step.get("name")
        commands = step.get("commands", [])
        step_results = []

        for cmd in commands:
            try:
                completed = subprocess.run(
                    cmd,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                # Print to backend terminal
                print(f"\n[STEP: {step_name}] Executed: {cmd}")
                if completed.stdout:
                    print("[STDOUT]:")
                    print(completed.stdout)
                if completed.stderr:
                    print("[STDERR]:")
                    print(completed.stderr)

                step_results.append({
                    "command": cmd,
                    "stdout": completed.stdout.strip(),
                    "stderr": completed.stderr.strip(),
                    "returncode": completed.returncode
                })
            except Exception as e:
                step_results.append({
                    "command": cmd,
                    "error": str(e)
                })

        results.append({
            "step": step_name,
            "results": step_results
        })

    return {"methodology": m["name"], "execution": results}

# 2) Persistent shell (advanced). Uses a background reader + marker approach.
SHELL_CMD = "cmd.exe" if platform.system().lower().startswith("win") else "/bin/bash"

class PersistentShell:
    def __init__(self):
        self.proc = subprocess.Popen(
            [SHELL_CMD],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        self.buffer_lock = threading.Lock()
        self.buffer: str = ""
        self.reader = threading.Thread(target=self._read_stdout, daemon=True)
        self.reader.start()

    def _read_stdout(self):
        while True:
            line = self.proc.stdout.readline()
            if not line:
                break
            with self.buffer_lock:
                self.buffer += line

    def run(self, command: str, wait_ms: int = 300):
        # Use a unique marker to know when this command's output ends
        marker = f"__END__{uuid.uuid4().hex}__"
        to_send = f"{command}\necho {marker}\n"
        self.proc.stdin.write(to_send)
        self.proc.stdin.flush()

        # Spin-wait up to a limit for marker to appear
        import time
        start = time.time()
        output_collected = ""
        while True:
            with self.buffer_lock:
                if marker in self.buffer:
                    # split at marker
                    before, after = self.buffer.split(marker, 1)
                    output_collected = before
                    # discard up to marker
                    self.buffer = after
                    break
            if (time.time() - start) > 5:  # 5s hard cap
                break
            time.sleep(wait_ms / 1000.0)
        return output_collected.strip()

persistent_shell = PersistentShell()

@app.post("/run")
def run_persistent(req: CommandRequest):
    try:
        out = persistent_shell.run(req.command)
        return {"output": out}
    except Exception as e:
        return {"error": str(e)}

# -----------------------
# Health
# -----------------------
@app.get("/")
def root():
    return {"ok": True, "service": "Pentest Orchestration API"}

# -----------------------
# How to run:
#   uvicorn backend:app --host 0.0.0.0 --port 5000 --reload
# -----------------------