 cat aibackend.py
# backend.py
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

# -----------------------
# App + CORS
# -----------------------
app = FastAPI(title="Pentest Orchestration API", version="1.1.0")

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
    client: str
    scope: str
    status: str  # ongoing/completed/etc

class MethodologyModel(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    commands: List[str] = []

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

# -----------------------
# Helpers
# -----------------------
def next_id(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 1
    return max(int(i["id"]) for i in items) + 1

# -----------------------
# Projects (unchanged)
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
# Findings (unchanged)
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
# Reports (unchanged)
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
# Evidence (unchanged)
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
# Command Execution (one-shot)
# -----------------------
@app.post("/exec")
def exec_command(req: CommandRequest):
    import queue

    try:
        # Start the process
        proc = subprocess.Popen(
            req.command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        output_lines = []
        q = queue.Queue()

        # Read stdout line by line in a thread
        def reader():
            for line in iter(proc.stdout.readline, ''):
                if not line:
                    break
                print(line, end='')         # Show in terminal
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
        rc = proc.wait(timeout=300)

        return {
            "returncode": rc,
            "stdout": "".join(output_lines).strip()
        }

    except subprocess.TimeoutExpired:
        proc.kill()
        return JSONResponse(status_code=408, content={"error": "Command timed out"})
    except Exception as e:
        return {"error": str(e)}

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