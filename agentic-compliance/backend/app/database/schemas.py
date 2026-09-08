from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceBase(BaseModel):
    title: str

class EvidenceResponse(EvidenceBase):
    id: int
    task_id: int
    file_path: str
    uploaded_by: Optional[int] = None
    uploaded_at: datetime
    status: str
    comments: Optional[str] = None
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    obligation_title: Optional[str] = None
    obligation_risk_level: Optional[str] = None
    regulation_title: Optional[str] = None

    class Config:
        from_attributes = True

# Compliance Task Schemas
class ComplianceTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = "Pending"
    priority: Optional[str] = "Medium"
    assigned_to: Optional[int] = None

class ComplianceTaskCreate(ComplianceTaskBase):
    obligation_id: Optional[int] = None
    reminder_at: Optional[datetime] = None
    reminder_message: Optional[str] = None

class ComplianceTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class ComplianceTaskResponse(ComplianceTaskBase):
    id: int
    obligation_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    evidence_items: List[EvidenceResponse] = []
    obligation_risk_level: Optional[str] = None

    class Config:
        from_attributes = True

# Reminder Schemas
class ReminderBase(BaseModel):
    title: str
    message: Optional[str] = None
    remind_at: datetime
    obligation_id: int
    task_id: Optional[int] = None

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    status: Optional[str] = None
    remind_at: Optional[datetime] = None
    title: Optional[str] = None
    message: Optional[str] = None

class ReminderResponse(ReminderBase):
    id: int
    created_by: Optional[int] = None
    status: str
    created_at: datetime
    obligation_title: Optional[str] = None
    regulation_title: Optional[str] = None

    class Config:
        from_attributes = True


# Obligation Schemas
class ObligationBase(BaseModel):
    title: str
    description: str
    section_reference: Optional[str] = None
    category: Optional[str] = None
    compliance_deadline: Optional[date] = None
    penalty_description: Optional[str] = None
    risk_level: Optional[str] = "Medium"
    status: Optional[str] = "Active"

class ObligationResponse(ObligationBase):
    id: int
    regulation_id: int
    created_at: datetime
    tasks: List[ComplianceTaskResponse] = []
    reminders: List[ReminderResponse] = []
    regulation_title: Optional[str] = None
    regulation_source: Optional[str] = None
    regulation_file_path: Optional[str] = None

    class Config:
        from_attributes = True

# Regulation Schemas
class RegulationBase(BaseModel):
    title: str
    description: Optional[str] = None
    source: str
    category: Optional[str] = None
    reference_url: Optional[str] = None
    published_date: Optional[date] = None

class RegulationCreate(RegulationBase):
    pass

class RegulationResponse(RegulationBase):
    id: int
    file_path: Optional[str] = None
    status: str
    processed_at: Optional[datetime] = None
    created_at: datetime
    obligations: List[ObligationResponse] = []

    class Config:
        from_attributes = True

# Gap Analysis Schemas
class GapAnalysisBase(BaseModel):
    findings: Optional[str] = None
    risk_assessment: Optional[str] = None
    recommendations: Optional[str] = None
    status: Optional[str] = "Identified"

class GapAnalysisResponse(GapAnalysisBase):
    id: int
    regulation_id: int
    regulation_title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GapAnalysisRunRequest(BaseModel):
    regulation_id: int

class GapAnalysisStatusUpdate(BaseModel):
    status: str

# Analytics & Dashboard Metrics
class DashboardMetricsResponse(BaseModel):
    overall_compliance_score: float  # Percentage of tasks/obligations satisfied
    total_regulations: int
    total_obligations: int
    total_tasks: int
    tasks_by_status: dict
    obligations_by_risk: dict
    gaps_count: int
    recent_tasks: List[ComplianceTaskResponse]
    recent_regulations: List[RegulationResponse]

# Chat Schemas
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []  # List of dicts representing past messages, e.g. [{"role": "user", "content": "..."}, ...]

class ChatResponse(BaseModel):
    reply: str
    sources: List[dict] = []  # Document chunks references used for response
