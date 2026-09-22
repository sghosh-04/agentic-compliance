# API Documentation - Compliance Hub

This document defines the HTTP endpoints, headers, request structures, and response payloads for the backend application.

## 1. Authentication Endpoints

### Register User
* **Endpoint**: `POST /api/auth/register`
* **Request Payload**:
```json
{
  "username": "officer",
  "email": "officer@compliance.com",
  "password": "password123",
  "role": "Compliance_Officer"
}
```

### Obtain JWT Access Token
* **Endpoint**: `POST /api/auth/login`
* **Request Payload** (Form URL Encoded):
  - `username`: officer
  - `password`: password123
* **Response**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

---

## 2. Ingestion & Search

### Upload Regulation File
* **Endpoint**: `POST /api/upload`
* **Request Headers**: `Authorization: Bearer <token>`
* **Request Payload** (Multipart Form Data):
  - `file`: PDF document binary
* **Response**:
```json
{
  "id": 1,
  "title": "SEBI Master Circular For Mutual Funds 2026",
  "source": "SEBI",
  "category": "Mutual Funds",
  "reference_url": null,
  "published_date": "2026-02-15",
  "status": "Pending",
  "processed_at": null,
  "created_at": "2026-07-11T14:32:00"
}
```

### AI RAG Chat Query
* **Endpoint**: `POST /api/chat`
* **Request Payload**:
```json
{
  "message": "What is the AMC net worth limit?",
  "history": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "How can I help you?"}
  ]
}
```
* **Response**:
```json
{
  "reply": "AMCs must continuously maintain a minimum net worth of INR 50 Crores...",
  "sources": [
    {
      "id": "reg_1_chunk_3",
      "text": "AMCs shall maintain a minimum net worth of not less than INR 50 Crore...",
      "title": "SEBI Master Circular for Mutual Funds 2026",
      "score": 0.88
    }
  ]
}
```

---

## 3. Compliance Tasks & Evidence

### List Active Tasks
* **Endpoint**: `GET /api/compliance/tasks`
* **Response**: A JSON list of tasks, including their linked evidence items.

### Schedule Task
* **Endpoint**: `POST /api/compliance/tasks`
* **Request Payload**:
```json
{
  "obligation_id": 1,
  "title": "Verify AMC Net Worth Auditor Certificate",
  "description": "Obtain audited certificate and upload as proof.",
  "priority": "High",
  "due_date": "2026-12-15"
}
```

### Submit Audit Evidence File
* **Endpoint**: `POST /api/evidence`
* **Request Payload** (Form Data):
  - `task_id`: 1
  - `title`: CA Net Worth Certificate Q2 2026
  - `file`: Image/PDF file binary
* **Response**: Creates an evidence item and updates task status to `Under_Review`.
