$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd `"$ROOT\backend`"; .\.venv\Scripts\Activate.ps1; uvicorn main:app --reload --host 0.0.0.0 --port 8000"

Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd `"$ROOT\frontend`"; npm run dev"
