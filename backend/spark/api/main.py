"""FastAPI application. Run locally from backend/:  uvicorn spark.api.main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from spark.api.routes import router
from spark.config import get_settings

app = FastAPI(title="SPARK API", description="Space fire-safety insights from NASA PSI combustion data", version="1.0")
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
