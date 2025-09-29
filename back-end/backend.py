import os
import json
import uuid
import shutil
import platform
import threading
import subprocess
import time
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse


app = FastAPI(title="Pentest Orchestration API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Storage 
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
    "evidence": []
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
    status: str  # success/failed/running
    returncode: int
    project_id: Optional[int] = None
    methodology_id: Optional[int] = None
    timestamp: float
    duration: Optional[float] = None
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
PROJECTS_DIR = DATA_DIR / "projects"
@app.get("/projects")
def list_projects():
    return db["projects"]

@app.post("/projects")
def add_project(p: Project):
    # Ensure the project has all required fields
    project_data = p.dict()

    # Create project folder structure
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
# -----------------------
# Methodologies (CRUD)
# -----------------------
@app.get("/methodologies")
def list_methodologies():
    # Return methodologies array
    return db["methodologies"]

@app.post("/methodologies")
def add_methodology(m: MethodologyModel):
    new = m.dict()
    # ensure unique id if user provided one
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
# Evidence 
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
@app.get("/evidence")
@app.get("/evidence/{project_id}")
def list_evidence(project_id: int):
    return [e for e in db["evidence"] if int(e["project_id"]) == int(project_id)]

# -----------
# Manual evidence
# -----------------
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
        # Validate project exists
        project = next((p for p in db["projects"] if int(p["id"]) == int(project_id)), None)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Create project evidence directory
        project_dir = PROJECTS_DIR / str(project_id) / "manual_evidence"
        project_dir.mkdir(parents=True, exist_ok=True)

        # Generate safe filename
        file_ext = Path(file.filename).suffix
        safe_filename = f"evidence_{step_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = project_dir / safe_filename

        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create evidence record
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

# Add endpoint to get manual evidence for a step
@app.get("/manual-evidence/{project_id}/{methodology_id}/{step_id}")
def get_step_evidence(project_id: int, methodology_id: int, step_id: str):
    evidence = [
        e for e in db["evidence"]
        if (int(e["project_id"]) == int(project_id) and
            int(e["methodology_id"]) == int(methodology_id) and
            e["step_id"] == step_id)
    ]
    return evidence



# -----------------------
# Command Execution (one-shot)
# -----------------------
@app.post("/exec")
def exec_command(req: CommandRequest):
    import queue
    import signal

    proc = None
    try:

        # Get project context for variable substitution
        project = None

        if hasattr(req, 'project_id') and req.project_id:
            project = next((p for p in db.get("projects", []) if int(p.get("id", 0)) == int(req.project_id)), None)
        # Substitute variables in command
        command = req.command
        if project:
            command = command.replace("{{target}}", project.get("target", ""))
            command = command.replace("{{targetIP}}", project.get("targetIP", project.get("target", "")))
            command = command.replace("{{project}}", project.get("name", ""))
        print(f"Executing command: {command}")
        # Start the process with substituted command
        proc = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            preexec_fn=os.setsid if os.name != 'nt' else None  # Create process group for better killing
        )

        output_lines = []
        q = queue.Queue()

        # Read stdout line by line in a thread
        def reader():
            for line in iter(proc.stdout.readline, ''):
                if not line:
                    break
                print(line, end='')
                q.put(line)
            proc.stdout.close()

        t = threading.Thread(target=reader)
        t.start()

        # Collect all lines into a list for response
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
            # Kill the entire process group
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
# -----------------------
# Streaming command output (SSE)
# -----------------------
def stream_subprocess(command: str, timeout_sec: int = 300):
    # Starts a subprocess and yields lines as SSE events
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
        # read line by line
        if proc.stdout is None:
            yield "data: \n\n"
            return
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            # SSE formatted event
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
    # Return Server Sent Events stream
    return StreamingResponse(stream_subprocess(req.command, timeout_sec=req.timeout_sec or 300),
                             media_type="text/event-stream")


# excecution log

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