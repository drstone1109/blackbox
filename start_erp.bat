@echo off
title Blackbox ERP Server
cd /d "%~dp0"
echo Starting Blackbox ERP Server on port 8000...
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause

