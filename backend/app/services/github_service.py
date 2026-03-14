from __future__ import annotations

import hashlib
import hmac
import io
import zipfile
from typing import Any

import httpx
import structlog

from app.core.config import settings
from app.models.schemas import AIDiagnosis

logger = structlog.get_logger(__name__)

GITHUB_API = "https://api.github.com"


def _auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# ---------------------------------------------------------------------------
# Webhook signature verification
# ---------------------------------------------------------------------------

def verify_webhook_signature(payload_body: bytes, signature_header: str | None) -> bool:
    """Verify the HMAC-SHA256 signature sent by GitHub on each webhook request."""
    if not signature_header:
        logger.warning("webhook.signature_missing")
        return False

    if not signature_header.startswith("sha256="):
        logger.warning("webhook.signature_bad_prefix", header=signature_header)
        return False

    expected_sig = hmac.new(
        settings.github_webhook_secret.encode("utf-8"),
        payload_body,
        hashlib.sha256,
    ).hexdigest()

    received_sig = signature_header.removeprefix("sha256=")
    is_valid = hmac.compare_digest(expected_sig, received_sig)

    if not is_valid:
        logger.warning("webhook.signature_mismatch")

    return is_valid


# ---------------------------------------------------------------------------
# Fetch workflow run logs
# ---------------------------------------------------------------------------

async def fetch_workflow_logs(repo_full_name: str, run_id: int) -> str:
    """Download the log archive for a workflow run and return concatenated text.

    GitHub returns a ZIP of log files. We extract all .txt files and concatenate
    them, truncating to a sensible limit so the LLM prompt stays manageable.
    """
    url = f"{GITHUB_API}/repos/{repo_full_name}/actions/runs/{run_id}/logs"
    log = logger.bind(repo=repo_full_name, run_id=run_id)

    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        resp = await client.get(url, headers=_auth_headers())

        if resp.status_code == 404:
            log.warning("workflow_logs.not_found")
            return "[Logs not available — the run may have been deleted or logs expired.]"

        resp.raise_for_status()

    log.info("workflow_logs.downloaded", size_bytes=len(resp.content))

    try:
        buf = io.BytesIO(resp.content)
        combined_lines: list[str] = []
        with zipfile.ZipFile(buf) as zf:
            for name in sorted(zf.namelist()):
                if name.endswith("/"):
                    continue
                with zf.open(name) as f:
                    text = f.read().decode("utf-8", errors="replace")
                    combined_lines.append(f"===== {name} =====")
                    combined_lines.append(text)

        full_text = "\n".join(combined_lines)

        # Truncate to ~120 000 chars (~30k tokens) to keep within LLM limits
        max_chars = 120_000
        if len(full_text) > max_chars:
            full_text = full_text[-max_chars:]
            full_text = "[...truncated...]\n" + full_text

        return full_text

    except zipfile.BadZipFile:
        log.error("workflow_logs.bad_zip")
        return "[Failed to decompress log archive — file may be corrupt.]"


# ---------------------------------------------------------------------------
# Find associated pull request
# ---------------------------------------------------------------------------

async def find_pull_request_for_sha(
    repo_full_name: str, head_sha: str
) -> dict[str, Any] | None:
    """Find an open PR whose head SHA matches the given commit."""
    url = f"{GITHUB_API}/repos/{repo_full_name}/commits/{head_sha}/pulls"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=_auth_headers())

        if resp.status_code != 200:
            logger.warning(
                "pr_lookup.failed",
                repo=repo_full_name,
                sha=head_sha,
                status=resp.status_code,
            )
            return None

        pulls: list[dict[str, Any]] = resp.json()
        if not pulls:
            return None

        # Prefer open PRs
        for pr in pulls:
            if pr.get("state") == "open":
                return pr
        return pulls[0]


# ---------------------------------------------------------------------------
# Post PR comment
# ---------------------------------------------------------------------------

def _format_comment(diagnosis: AIDiagnosis, run_url: str, workflow: str) -> str:
    fixes = "\n".join(f"  {i + 1}. {fix}" for i, fix in enumerate(diagnosis.suggested_fixes))
    confidence_pct = int(diagnosis.confidence * 100)

    return (
        f"## CI/CD Pipeline Analysis\n\n"
        f"**Workflow:** `{workflow}`\n"
        f"**Run:** [{run_url}]({run_url})\n"
        f"**Confidence:** {confidence_pct}%\n\n"
        f"### Root Cause\n"
        f"{diagnosis.root_cause}\n\n"
        f"### Explanation\n"
        f"{diagnosis.explanation}\n\n"
        f"### Suggested Fixes\n"
        f"{fixes}\n\n"
        f"---\n"
        f"*Automated analysis by CI/CD Pipeline Analyzer*"
    )


async def post_pr_comment(
    repo_full_name: str,
    pr_number: int,
    diagnosis: AIDiagnosis,
    run_url: str,
    workflow: str,
) -> str | None:
    """Post an issue comment on the associated PR and return the comment URL."""
    url = f"{GITHUB_API}/repos/{repo_full_name}/issues/{pr_number}/comments"
    body = _format_comment(diagnosis, run_url, workflow)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            headers=_auth_headers(),
            json={"body": body},
        )

        if resp.status_code == 201:
            comment_url = resp.json().get("html_url", "")
            logger.info(
                "pr_comment.posted",
                repo=repo_full_name,
                pr=pr_number,
                url=comment_url,
            )
            return comment_url

        logger.error(
            "pr_comment.failed",
            repo=repo_full_name,
            pr=pr_number,
            status=resp.status_code,
            detail=resp.text,
        )
        return None
