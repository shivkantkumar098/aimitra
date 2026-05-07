"""Issue report route — appends reports to Excel file."""

import os
from datetime import datetime, timezone

import openpyxl
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(tags=["report"])

# Save issues.xlsx in the backend/ directory (one level up from routes/)
ISSUES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "issues.xlsx")


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
        ws.append(["#", "Timestamp (UTC)", "Reporter Email", "Page / Context", "Description", "Screenshot"])
    return wb, ws


@router.post("/api/report-issue")
async def report_issue(
    description: str = Form(...),
    reporter_email: str = Form(""),
    page: str = Form(""),
    screenshot: UploadFile = File(None),
):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    has_screenshot = "No"

    if screenshot and screenshot.filename:
        await screenshot.read()  # consume the stream
        has_screenshot = "Yes"

    try:
        wb, ws = _get_workbook()
        issue_num = ws.max_row  # row 1 = header
        ws.append([issue_num, timestamp, reporter_email or "—", page or "—", description, has_screenshot])
        wb.save(ISSUES_FILE)
        return JSONResponse({"status": "ok", "message": "Issue recorded — thank you for the report!"})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to save report: {str(e)}"}
        )
