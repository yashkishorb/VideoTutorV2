from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}
