"""Issue report route — emails developer and appends to Excel."""

import os
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import openpyxl
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(tags=["report"])

RECIPIENT = "kumar.shivkant87@gmail.com"
ISSUES_FILE = "issues.xlsx"


def _get_workbook():
    if os.path.exists(ISSUES_FILE):
        wb = openpyxl.load_workbook(ISSUES_FILE)
        ws = wb.active
    else:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Issues"
        ws.column_dimensions["C"].width = 30
        ws.column_dimensions["D"].width = 70
        ws.append(["#", "Timestamp (UTC)", "Page / Context", "Description", "Screenshot"])
    return wb, ws


@router.post("/api/report-issue")
async def report_issue(
    description: str = Form(...),
    page: str = Form(""),
    screenshot: UploadFile = File(None),
):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    screenshot_bytes = None
    screenshot_filename = None

    if screenshot and screenshot.filename:
        screenshot_bytes = await screenshot.read()
        screenshot_filename = screenshot.filename

    # ── Append to Excel ───────────────────────────────────────────────
    try:
        wb, ws = _get_workbook()
        issue_num = ws.max_row  # row 1 = header, so max_row - 1 = existing issues
        ws.append([issue_num, timestamp, page or "—", description, "Yes" if screenshot_bytes else "No"])
        wb.save(ISSUES_FILE)
    except Exception:
        pass

    # ── Send email ────────────────────────────────────────────────────
    gmail_user = os.getenv("GMAIL_USER", "")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        return JSONResponse({
            "status": "saved",
            "message": "Issue recorded locally. Set GMAIL_USER + GMAIL_APP_PASSWORD in env to also receive email alerts."
        })

    try:
        msg = MIMEMultipart()
        msg["From"] = gmail_user
        msg["To"] = RECIPIENT
        msg["Subject"] = f"[AiMitra] Issue Report — {timestamp}"

        body = (
            "AiMitra Issue Report\n"
            + "=" * 40 + "\n"
            + f"Time   : {timestamp}\n"
            + f"Page   : {page or 'Not specified'}\n\n"
            + "Description\n"
            + "-" * 40 + "\n"
            + description + "\n"
        )
        msg.attach(MIMEText(body, "plain"))

        if screenshot_bytes and screenshot_filename:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(screenshot_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{screenshot_filename}"')
            msg.attach(part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, RECIPIENT, msg.as_string())

        return JSONResponse({"status": "ok", "message": "Issue reported — email sent to the developer!"})

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Saved to log but email failed: {str(e)}"}
        )
