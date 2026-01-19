from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from models import AccessLog, AccessMethod, AccessType
from schemas.logs import AccessLogResponse, AccessLogListResponse, AccessStatsResponse
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/logs", tags=["Access Logs"])

@router.get("", response_model=AccessLogListResponse)
async def get_logs(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    method: Optional[AccessMethod] = None,
    access_type: Optional[AccessType] = None,
    success: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    
    query = db.query(AccessLog)
    
    if method:
        query = query.filter(AccessLog.access_method == method)
    if access_type:
        query = query.filter(AccessLog.access_type == access_type)
    if success is not None:
        query = query.filter(AccessLog.success == success)
    
    total = query.count()
    
    logs = query.order_by(desc(AccessLog.timestamp)).offset(offset).limit(limit).all()
    
    return AccessLogListResponse(
        logs=[
            AccessLogResponse(
                id=log.id,
                user_name=log.user_name,
                access_method=log.access_method,
                access_type=log.access_type,
                success=log.success,
                timestamp=log.timestamp,
                details=log.details
            )
            for log in logs
        ],
        total=total
    )

@router.get("/stats", response_model=AccessStatsResponse)
async def get_stats(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db)
):
    
    start_date = datetime.now() - timedelta(days=days)
    
    logs_query = db.query(AccessLog).filter(AccessLog.timestamp >= start_date)
    
    total_accesses = logs_query.count()
    
    successful_accesses = logs_query.filter(AccessLog.success == True).count()
    failed_accesses = logs_query.filter(AccessLog.success == False).count()
    
    by_method = {}
    for method in AccessMethod:
        count = logs_query.filter(AccessLog.access_method == method).count()
        by_method[method.value] = count
    
    by_type = {}
    for access_type in AccessType:
        count = logs_query.filter(AccessLog.access_type == access_type).count()
        by_type[access_type.value] = count
    
    recent_logs = logs_query.order_by(desc(AccessLog.timestamp)).limit(10).all()
    
    return AccessStatsResponse(
        total_accesses=total_accesses,
        successful_accesses=successful_accesses,
        failed_accesses=failed_accesses,
        by_method=by_method,
        by_type=by_type,
        recent_logs=[
            AccessLogResponse(
                id=log.id,
                user_name=log.user_name,
                access_method=log.access_method,
                access_type=log.access_type,
                success=log.success,
                timestamp=log.timestamp,
                details=log.details
            )
            for log in recent_logs
        ]
    )

@router.delete("/{log_id}")
async def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(AccessLog).filter(AccessLog.id == log_id).first()
    
    if not log:
        return {"success": False, "message": "Không tìm thấy nhật ký"}
    
    db.delete(log)
    db.commit()
    
    return {"success": True, "message": "Đã xóa nhật ký"}

@router.delete("/clear-all")
async def clear_all_logs(db: Session = Depends(get_db)):
    count = db.query(AccessLog).delete()
    db.commit()
    
    return {"success": True, "message": f"Đã xóa {count} nhật ký"}
