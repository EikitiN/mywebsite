@echo off
start chrome.exe "http://localhost:8000/mywebsite/"
python -m http.server 8000
exit