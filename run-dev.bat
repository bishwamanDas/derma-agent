@echo off
echo Starting DermaAgent Backend and Frontend...
start "DermaAgent Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app:app --host 127.0.0.1 --port 8000"
start "DermaAgent Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo Both servers are launching in separate windows!
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:8000
