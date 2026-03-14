from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


# ---------------------------------------------------------------------------
# GitHub Webhook
# ---------------------------------------------------------------------------

class WorkflowRunConclusion(str, Enum):
    success = "success"
    failure = "failure"
    cancelled = "cancelled"
    timed_out = "timed_out"
    action_required = "action_required"
    skipped = "skipped"
    stale = "stale"
    startup_failure = "startup_failure"


class WorkflowRunPayload(BaseModel):
    """Subset of the workflow_run object from the GitHub webhook."""

    id: int
    name: str
    head_branch: str
    head_sha: str
    status: str
    conclusion: WorkflowRunConclusion | None = None
    html_url: str
    logs_url: str
    run_number: int
    event: str
    created_at: str
    updated_at: str

    class Config:
        extra = "allow"


class RepositoryPayload(BaseModel):
    id: int
    full_name: str
    html_url: str

    class Config:
        extra = "allow"


class SenderPayload(BaseModel):
    login: str
    id: int

    class Config:
        extra = "allow"


class GitHubWebhookPayload(BaseModel):
    """Top-level payload for a workflow_run webhook event."""

    action: str
    workflow_run: WorkflowRunPayload
    repository: RepositoryPayload
    sender: SenderPayload

    class Config:
        extra = "allow"


# ---------------------------------------------------------------------------
# Pull Request reference (used when posting comments)
# ---------------------------------------------------------------------------

class PullRequestRef(BaseModel):
    number: int
    head_sha: str


# ---------------------------------------------------------------------------
# AI Diagnosis
# ---------------------------------------------------------------------------

class AIDiagnosis(BaseModel):
    root_cause: str
    explanation: str
    suggested_fixes: list[str]
    confidence: float = Field(ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Pipeline Analysis (stored in Supabase)
# ---------------------------------------------------------------------------

class PipelineAnalysisCreate(BaseModel):
    """Shape used when inserting a new analysis row."""

    repo: str
    workflow: str
    run_id: int
    run_url: str
    head_branch: str
    head_sha: str
    status: str
    conclusion: str | None = None
    failure_logs: str
    ai_diagnosis: dict[str, Any]
    pr_comment_url: str | None = None


class PipelineAnalysis(BaseModel):
    """Full analysis record returned from the database."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    repo: str
    workflow: str
    run_id: int
    run_url: str
    head_branch: str
    head_sha: str
    status: str
    conclusion: str | None = None
    failure_logs: str
    ai_diagnosis: AIDiagnosis
    pr_comment_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class AnalysisList(BaseModel):
    """Paginated list of analyses."""

    items: list[PipelineAnalysis]
    total: int
    page: int
    page_size: int
