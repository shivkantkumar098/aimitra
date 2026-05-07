"""Issue report route — appends reports to Excel file and saves screenshots."""

import os
import uuid
from datetime import datetime, timezone

import openpyxl
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(tags=["report"])

BASE_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ISSUES_FILE = os.path.join(BASE_DIR, "issues.xlsx")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "issue_screenshots")


def _ensure_dirs():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


def _get_workbook():
    if os.path.exists(ISSUES_FILE):
        wb = openpyxl.load_workbook(ISSUES_FILE)
        ws = wb.active
    else:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Issues"
        ws.column_dimensions["B"].width = 22
        ws.column_dimensions["C"].width = 28
        ws.column_dimensions["D"].width = 30
        ws.column_dimensions["E"].width = 65
        ws.column_dimensions["F"].width = 40
        ws.append(["#", "Timestamp (UTC)", "Reporter Email", "Page / Context", "Description", "Screenshot File"])
    return wb, ws


@router.post("/api/report-issue")
async def report_issue(
    description: str = Form(...),
    reporter_email: str = Form(""),
    page: str = Form(""),
    screenshot: UploadFile = File(None),
):
    _ensure_dirs()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    screenshot_filename = "—"

    if screenshot and screenshot.filename:
        screenshot_bytes = await screenshot.read()
        ext = os.path.splitext(screenshot.filename)[-1] or ".png"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(SCREENSHOTS_DIR, unique_name)
        with open(save_path, "wb") as f:
            f.write(screenshot_bytes)
        screenshot_filename = unique_name

    try:
        wb, ws = _get_workbook()
        issue_num = ws.max_row
        ws.append([issue_num, timestamp, reporter_email or "—", page or "—", description, screenshot_filename])
        wb.save(ISSUES_FILE)
        return JSONResponse({"status": "ok", "message": "Issue recorded — thank you for the report!"})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to save report: {str(e)}"}
        )


@router.get("/api/issues")
async def list_issues():
    if not os.path.exists(ISSUES_FILE):
        return JSONResponse({"issues": [], "total": 0})
    try:
        wb = openpyxl.load_workbook(ISSUES_FILE)
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        issues = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if any(cell is not None for cell in row):
                issues.append(dict(zip(headers, row)))
        return JSONResponse({"issues": issues, "total": len(issues)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/issues/download")
async def download_issues():
    if not os.path.exists(ISSUES_FILE):
        return JSONResponse(status_code=404, content={"error": "No issues file found yet."})
    return FileResponse(
        ISSUES_FILE,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="aimitra-issues.xlsx",
    )


@router.get("/api/issues/screenshot/{filename}")
async def get_screenshot(filename: str):
    # Prevent path traversal
    safe_name = os.path.basename(filename)
    path = os.path.join(SCREENSHOTS_DIR, safe_name)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Screenshot not found."})
    return FileResponse(path)
