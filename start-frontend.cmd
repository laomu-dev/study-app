@echo off
cd /d "%~dp0"
npm run client:dev -- --host 0.0.0.0
