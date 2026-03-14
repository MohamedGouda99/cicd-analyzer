from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
import structlog

from app.models.schemas import (
    AIDiagnosis,
    AnalysisList,
    GitHubWebhookPayload,
    PipelineAnalysis,
    PipelineAnalysisCreate,
)
from app.services import analyzer, github_service, storage

logger = structlog.get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Background task: full analysis pipeline
# ---------------------------------------------------------------------------

async def _process_failed_run(payload: GitHubWebhookPayload) -> None:
    """Fetch logs, run AI analysis, store result, and post a PR comment."""
    run = payload.workflow_run
    repo = payload.repository.full_name
    log = logger.bind(repo=repo, run_id=run.id, workflow=run.name)

    log.info("pipeline.processing_started")

    # 1. Fetch logs
    logs = await github_service.fetch_workflow_logs(repo, run.id)

    # 2. AI analysis
    diagnosis: AIDiagnosis = await analyzer.analyze_logs(
        logs=logs,
        workflow=run.name,
        repo=repo,
        branch=run.head_branch,
    )

    # 3. Attempt to post a PR comment
    pr_comment_url: str | None = None
    pr = await github_service.find_pull_request_for_sha(repo, run.head_sha)
    if pr:
        pr_comment_url = await github_service.post_pr_comment(
            repo_full_name=repo,
            pr_number=pr["number"],
            diagnosis=diagnosis,
            run_url=run.html_url,
            workflow=run.name,
        )
    else:
        log.info("pipeline.no_pr_found", sha=run.head_sha)

    # 4. Persist to Supabase
    record = PipelineAnalysisCreate(
        repo=repo,
        workflow=run.name,
        run_id=run.id,
        run_url=run.html_url,
        head_branch=run.head_branch,
        head_sha=run.head_sha,
        status=run.status,
        conclusion=run.conclusion.value if run.conclusion else None,
        failure_logs=logs,
        ai_diagnosis=diagnosis.model_dump(),
        pr_comment_url=pr_comment_url,
    )
    await storage.store_analysis(record)
    log.info("pipeline.processing_completed")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@router.post("/webhook/github", tags=["webhooks"], status_code=202)
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str | None = Header(None),
    x_github_event: str | None = Header(None),
) -> JSONResponse:
    """Receive a GitHub webhook, verify signature, and kick off analysis for failed runs."""
    body = await request.body()

    # Verify signature
    if not github_service.verify_webhook_signature(body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # We only care about workflow_run events
    if x_github_event != "workflow_run":
        return JSONResponse(
            status_code=202,
            content={"message": f"Event '{x_github_event}' ignored"},
        )

    payload = GitHubWebhookPayload.model_validate_json(body)

    # Only process completed, failed runs
    if payload.action != "completed":
        return JSONResponse(
            status_code=202,
            content={"message": f"Action '{payload.action}' ignored"},
        )

    conclusion = payload.workflow_run.conclusion
    if conclusion is None or conclusion.value not in ("failure", "timed_out", "startup_failure"):
        return JSONResponse(
            status_code=202,
            content={"message": f"Conclusion '{conclusion}' is not a failure — skipped"},
        )

    logger.info(
        "webhook.accepted",
        repo=payload.repository.full_name,
        run_id=payload.workflow_run.id,
        conclusion=conclusion.value,
    )

    background_tasks.add_task(_process_failed_run, payload)

    return JSONResponse(
        status_code=202,
        content={"message": "Analysis queued", "run_id": payload.workflow_run.id},
    )


@router.get("/analyses", response_model=AnalysisList, tags=["analyses"])
async def list_analyses(
    repo: str | None = Query(None, description="Filter by repository full name"),
    conclusion: str | None = Query(None, description="Filter by conclusion (failure, timed_out)"),
    branch: str | None = Query(None, description="Filter by branch name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> AnalysisList:
    return await storage.list_analyses(
        repo=repo,
        conclusion=conclusion,
        branch=branch,
        page=page,
        page_size=page_size,
    )


@router.get("/analyses/{analysis_id}", response_model=PipelineAnalysis, tags=["analyses"])
async def get_analysis(analysis_id: str) -> PipelineAnalysis:
    result = await storage.get_analysis(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.post(
    "/analyses/{analysis_id}/reanalyze",
    response_model=PipelineAnalysis,
    tags=["analyses"],
)
async def reanalyze(analysis_id: str) -> PipelineAnalysis:
    """Re-run AI analysis on an existing record using the stored logs."""
    existing = await storage.get_analysis(analysis_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    logger.info("reanalyze.started", id=analysis_id, repo=existing.repo)

    new_diagnosis = await analyzer.analyze_logs(
        logs=existing.failure_logs,
        workflow=existing.workflow,
        repo=existing.repo,
        branch=existing.head_branch,
    )

    updated = await storage.update_analysis(
        analysis_id,
        {"ai_diagnosis": new_diagnosis.model_dump()},
    )
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update analysis")

    logger.info("reanalyze.completed", id=analysis_id)
    return updated
