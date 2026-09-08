from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Compliance_Officer")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("ComplianceTask", back_populates="assignee")
    evidence_uploaded = relationship("Evidence", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")


class Regulation(Base):
    __tablename__ = "regulations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    source = Column(String(100), nullable=False)  # e.g. SEBI, RBI
    category = Column(String(100))
    reference_url = Column(String(500))
    published_date = Column(Date)
    file_path = Column(String(500))
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Processing, Processed, Error
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    obligations = relationship("Obligation", back_populates="regulation", cascade="all, delete-orphan")
    gap_analyses = relationship("GapAnalysis", back_populates="regulation", cascade="all, delete-orphan")


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(Integer, primary_key=True, index=True)
    regulation_id = Column(Integer, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    section_reference = Column(String(150))
    category = Column(String(100))
    compliance_deadline = Column(Date)
    penalty_description = Column(Text)
    risk_level = Column(String(50), default="Medium")  # High, Medium, Low
    status = Column(String(50), default="Active")  # Active, Superceded, Inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    regulation = relationship("Regulation", back_populates="obligations")
    tasks = relationship("ComplianceTask", back_populates="obligation", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="obligation", cascade="all, delete-orphan")


class ComplianceTask(Base):
    __tablename__ = "compliance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(Date)
    status = Column(String(50), default="Pending")  # Pending, In_Progress, Under_Review, Completed
    priority = Column(String(50), default="Medium")  # High, Medium, Low
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    obligation = relationship("Obligation", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
    evidence_items = relationship("Evidence", back_populates="task", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="task")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("compliance_tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Pending_Review")  # Pending_Review, Approved, Rejected
    comments = Column(Text)

    task = relationship("ComplianceTask", back_populates="evidence_items")
    uploader = relationship("User", back_populates="evidence_uploaded")


class GapAnalysis(Base):
    __tablename__ = "gap_analyses"

    id = Column(Integer, primary_key=True, index=True)
    regulation_id = Column(Integer, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    findings = Column(Text)
    risk_assessment = Column(Text)
    recommendations = Column(Text)
    status = Column(String(50), default="Identified")  # Identified, Mitigated, In_Progress
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    regulation = relationship("Regulation", back_populates="gap_analyses")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("compliance_tasks.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="Pending")  # Pending, Dismissed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    obligation = relationship("Obligation", back_populates="reminders")
    task = relationship("ComplianceTask", back_populates="reminders")
    creator = relationship("User")


class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Float, nullable=False)
    total_obligations = Column(Integer, nullable=False, default=0)
    completed_tasks = Column(Integer, nullable=False, default=0)
    total_tasks = Column(Integer, nullable=False, default=0)
    open_gaps = Column(Integer, nullable=False, default=0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
