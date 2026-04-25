from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from app.db.session import Base


class MCPActionAudit(Base):
    __tablename__ = "mcp_action_audit"
    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            "tool_name",
            "idempotency_key",
            name="uq_mcp_action_audit_idempotency",
        ),
    )

    audit_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True
    )
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    tool_name = Column(String(100), nullable=False, index=True)
    idempotency_key = Column(String(128), nullable=False)
    payload_hash = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="started", index=True)
    risk_level = Column(String(32), nullable=False, default="standard")
    requires_confirmation = Column(Boolean, default=False, nullable=False)
    confirmation_token_hash = Column(String(64), nullable=True)
    outcome_code = Column(String(64), nullable=True)
    error_code = Column(String(64), nullable=True)
    input_summary = Column(JSON, nullable=True)
    result_summary = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
