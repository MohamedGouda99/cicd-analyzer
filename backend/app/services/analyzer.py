from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.models.schemas import AIDiagnosis

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """\
You are a senior CI/CD and DevOps engineer with deep expertise in GitHub Actions, \
Docker, Kubernetes, Terraform, package managers (npm, pip, Maven, Gradle), and \
general software build systems.

Your task is to analyze failed CI/CD pipeline logs and produce a structured diagnosis.

Rules:
1. Identify the single most likely ROOT CAUSE of the failure.
2. Provide a clear, actionable EXPLANATION suitable for a mid-level developer.
3. Suggest concrete FIXES ordered from most to least likely to resolve the issue.
4. Assign a CONFIDENCE score between 0.0 and 1.0 reflecting how certain you are \
   about the root cause.
5. If logs are truncated or ambiguous, say so honestly and lower your confidence.

You MUST respond with valid JSON matching this schema exactly:
{
  "root_cause": "<short summary>",
  "explanation": "<detailed explanation>",
  "suggested_fixes": ["<fix 1>", "<fix 2>", ...],
  "confidence": <float 0-1>
}

Do NOT wrap the JSON in markdown code fences. Return ONLY the JSON object.\
"""


def _build_user_prompt(logs: str, workflow: str, repo: str, branch: str) -> str:
    return (
        f"Repository: {repo}\n"
        f"Workflow: {workflow}\n"
        f"Branch: {branch}\n\n"
        f"--- BEGIN LOGS ---\n{logs}\n--- END LOGS ---"
    )


def _parse_diagnosis(raw: str) -> AIDiagnosis:
    """Parse the LLM response into a validated AIDiagnosis model."""
    # Strip potential markdown fences the model might add despite instructions
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1 :]
    if cleaned.endswith("```"):
        cleaned = cleaned[: cleaned.rfind("```")]
    cleaned = cleaned.strip()

    data: dict[str, Any] = json.loads(cleaned)
    return AIDiagnosis(**data)


async def analyze_logs(
    logs: str,
    workflow: str,
    repo: str,
    branch: str,
) -> AIDiagnosis:
    """Send pipeline logs to the LLM and return a structured diagnosis."""
    log = logger.bind(repo=repo, workflow=workflow, branch=branch)
    log.info("analysis.started", log_length=len(logs))

    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.2,
        max_tokens=2048,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_user_prompt(logs, workflow, repo, branch)),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw_content = str(response.content)
        log.info("analysis.llm_responded", response_length=len(raw_content))

        diagnosis = _parse_diagnosis(raw_content)
        log.info(
            "analysis.completed",
            root_cause=diagnosis.root_cause[:80],
            confidence=diagnosis.confidence,
        )
        return diagnosis

    except json.JSONDecodeError as exc:
        log.error("analysis.json_parse_error", error=str(exc))
        return AIDiagnosis(
            root_cause="Analysis parsing failed",
            explanation=(
                "The AI returned a response that could not be parsed as valid JSON. "
                "This is likely a transient issue. Please retry the analysis."
            ),
            suggested_fixes=["Retry the analysis", "Check raw LLM output in application logs"],
            confidence=0.0,
        )
    except Exception as exc:
        log.error("analysis.failed", error=str(exc), exc_info=True)
        return AIDiagnosis(
            root_cause="Analysis unavailable",
            explanation=f"An error occurred while communicating with the AI service: {exc}",
            suggested_fixes=["Check OpenAI API key and quota", "Retry later"],
            confidence=0.0,
        )
