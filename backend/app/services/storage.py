from __future__ import annotations

from typing import Any

import structlog
from supabase import Client, create_client

from app.core.config import settings
from app.models.schemas import (
    AnalysisList,
    PipelineAnalysis,
    PipelineAnalysisCreate,
)

logger = structlog.get_logger(__name__)

TABLE = "pipeline_analyses"


def _get_client() -> Client:
    """Create a Supabase client. Kept as a function so it's easy to mock in tests."""
    return create_client(settings.supabase_url, settings.supabase_key)


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------

async def store_analysis(data: PipelineAnalysisCreate) -> PipelineAnalysis:
    """Insert a new pipeline analysis row and return the full record."""
    client = _get_client()
    payload = data.model_dump()
    log = logger.bind(repo=data.repo, run_id=data.run_id)

    try:
        result = (
            client.table(TABLE)
            .insert(payload)
            .execute()
        )
        row = result.data[0]
        log.info("storage.inserted", id=row["id"])
        return PipelineAnalysis(**row)

    except Exception as exc:
        log.error("storage.insert_failed", error=str(exc), exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Read many
# ---------------------------------------------------------------------------

async def list_analyses(
    repo: str | None = None,
    conclusion: str | None = None,
    branch: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AnalysisList:
    """Return a paginated, filtered list of analyses."""
    client = _get_client()
    log = logger.bind(repo=repo, conclusion=conclusion, page=page)

    try:
        query = client.table(TABLE).select("*", count="exact")

        if repo:
            query = query.eq("repo", repo)
        if conclusion:
            query = query.eq("conclusion", conclusion)
        if branch:
            query = query.eq("head_branch", branch)

        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

        result = query.execute()
        total = result.count if result.count is not None else len(result.data)

        items = [PipelineAnalysis(**row) for row in result.data]
        log.info("storage.listed", total=total, returned=len(items))

        return AnalysisList(items=items, total=total, page=page, page_size=page_size)

    except Exception as exc:
        log.error("storage.list_failed", error=str(exc), exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Read one
# ---------------------------------------------------------------------------

async def get_analysis(analysis_id: str) -> PipelineAnalysis | None:
    """Fetch a single analysis by its UUID."""
    client = _get_client()

    try:
        result = (
            client.table(TABLE)
            .select("*")
            .eq("id", analysis_id)
            .maybe_single()
            .execute()
        )

        if result.data is None:
            return None

        return PipelineAnalysis(**result.data)

    except Exception as exc:
        logger.error("storage.get_failed", id=analysis_id, error=str(exc), exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Update (used after re-analysis)
# ---------------------------------------------------------------------------

async def update_analysis(
    analysis_id: str, updates: dict[str, Any]
) -> PipelineAnalysis | None:
    """Patch an existing analysis row."""
    client = _get_client()

    try:
        result = (
            client.table(TABLE)
            .update(updates)
            .eq("id", analysis_id)
            .execute()
        )

        if not result.data:
            return None

        return PipelineAnalysis(**result.data[0])

    except Exception as exc:
        logger.error("storage.update_failed", id=analysis_id, error=str(exc), exc_info=True)
        raise
