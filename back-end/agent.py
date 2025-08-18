import subprocess
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str

# Start a persistent shell process
shell = subprocess.Popen(
    ["/bin/bash"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

@app.post("/run")
def run_command(req: CommandRequest):
    try:
        # Send command to shell
        shell.stdin.write(req.command + "\n")
        shell.stdin.flush()

        # Read output (non-blocking in production, but here just simple read)
        output = []
        while True:
            line = shell.stdout.readline()
            if not line:
                break
            output.append(line.strip())
            if line.strip().endswith("$") or line.strip().endswith("#"):  # crude prompt detection
                break

        return {"output": "\n".join(output)}
    except Exception as e:
        return {"error": str(e)}
