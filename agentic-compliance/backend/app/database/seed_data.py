"""Seed demo compliance data when the database is empty (SQLite local dev)."""
from datetime import date
from .connection import SessionLocal
from . import models, schemas, crud


def seed_demo_data():
    db = SessionLocal()
    try:
        has_obligations = db.query(models.Obligation).count() > 0
        has_tasks = db.query(models.ComplianceTask).count() > 0
        has_gaps = db.query(models.GapAnalysis).count() > 0

        if has_obligations and has_tasks and has_gaps:
            return

        officer = db.query(models.User).filter(models.User.username == "officer").first()
        officer_id = officer.id if officer else 1

        regulations = db.query(models.Regulation).order_by(models.Regulation.id.asc()).all()
        if not regulations:
            reg1 = crud.create_regulation(
                db,
                schemas.RegulationCreate(
                    title="SEBI Master Circular for Mutual Funds 2026",
                    description="Consolidated guidelines issued by SEBI regarding mutual fund registrations, operations, and portfolio compliance.",
                    source="SEBI",
                    category="Mutual Funds",
                    reference_url="https://www.sebi.gov.in/legal/master-circulars/",
                    published_date=date(2026, 2, 15),
                ),
            )
            crud.update_regulation_status(db, reg1.id, "Processed")

            reg2 = crud.create_regulation(
                db,
                schemas.RegulationCreate(
                    title="RBI Master Direction - Know Your Customer (KYC) Direction, 2016 (Updated 2026)",
                    description="Guidelines regarding standard customer identification procedures, transaction monitoring, and risk management compliance.",
                    source="RBI",
                    category="Anti-Money Laundering",
                    reference_url="https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx",
                    published_date=date(2026, 4, 10),
                ),
            )
            crud.update_regulation_status(db, reg2.id, "Processed")
            regulations = db.query(models.Regulation).order_by(models.Regulation.id.asc()).all()

        reg1 = regulations[0] if regulations else None
        reg2 = regulations[1] if len(regulations) > 1 else reg1

        if not has_obligations:
            if reg1:
                crud.create_obligation(
                    db,
                    schemas.ObligationBase(
                        title="Minimum Net Worth Requirement",
                        description="Asset Management Companies (AMCs) shall maintain a minimum net worth of not less than INR 50 Crore on a continuous basis.",
                        section_reference="Section 2.1.1",
                        category="Financial Requirements",
                        compliance_deadline=date(2026, 12, 31),
                        penalty_description="Suspension of mutual fund registration and monetary penalty of up to INR 1 Crore.",
                        risk_level="High",
                    ),
                    regulation_id=reg1.id,
                )
            if reg1:
                crud.create_obligation(
                    db,
                    schemas.ObligationBase(
                        title="Appointment of Compliance Officer",
                        description="Every AMC shall appoint a designated Compliance Officer responsible for monitoring compliance with SEBI regulations.",
                        section_reference="Section 4.3.2",
                        category="Governance",
                        compliance_deadline=date(2026, 8, 1),
                        penalty_description="Regulatory warning, audit flag, and administrative penalty.",
                        risk_level="Medium",
                    ),
                    regulation_id=reg1.id,
                )
            if reg2:
                crud.create_obligation(
                    db,
                    schemas.ObligationBase(
                        title="Periodic Re-KYC Verification",
                        description="Regulated Entities must perform periodic updation of KYC information at least once in every two years for high-risk customers.",
                        section_reference="Section 38",
                        category="Customer Onboarding",
                        compliance_deadline=date(2026, 10, 15),
                        penalty_description="Strict regulatory audit remarks and fines up to INR 50 Lakhs.",
                        risk_level="High",
                    ),
                    regulation_id=reg2.id,
                )

        obligations = db.query(models.Obligation).all()
        if not has_tasks and obligations:
            first_obligation = obligations[0]
            second_obligation = obligations[1] if len(obligations) > 1 else obligations[0]
            third_obligation = obligations[2] if len(obligations) > 2 else obligations[0]
            crud.create_task(
                db,
                schemas.ComplianceTaskCreate(
                    obligation_id=first_obligation.id,
                    title="Submit Annual AMC Net Worth Auditor Certificate",
                    description="Verify that the net worth of the AMC is above INR 50 Crores. Gather certificate from Chartered Accountant and upload.",
                    assigned_to=officer_id,
                    due_date=date(2026, 12, 15),
                    status="Pending",
                    priority="High",
                ),
            )
            crud.create_task(
                db,
                schemas.ComplianceTaskCreate(
                    obligation_id=second_obligation.id,
                    title="Validate Compliance Officer Board Appointment Resolution",
                    description="Ensure that the Board of Directors has formally approved the Compliance Officer designation.",
                    assigned_to=officer_id,
                    due_date=date(2026, 7, 25),
                    status="In_Progress",
                    priority="Medium",
                ),
            )
            crud.create_task(
                db,
                schemas.ComplianceTaskCreate(
                    obligation_id=third_obligation.id,
                    title="Trigger Quarterly Batch Re-KYC Audits",
                    description="Pull list of all high-risk accounts due for re-KYC. Initiate verification workflows and compile status report.",
                    assigned_to=officer_id,
                    due_date=date(2026, 9, 30),
                    status="Pending",
                    priority="High",
                ),
            )

        if not has_gaps and reg1 and reg2:
            crud.create_gap_analysis(
                db,
                findings="Our current AMC net worth is INR 52.4 Crores, which meets the INR 50 Crore obligation. However, the cushion is small (4.8%). Any decline in assets under management could breach the threshold.",
                risk_assessment="Medium Risk. Small buffer could easily trigger non-compliance during market downturns.",
                recommendations="Maintain a capital buffer of at least INR 5 Crore above the limit. Board should review capital structure.",
                regulation_id=reg1.id,
                status="In_Progress",
            )
            crud.create_gap_analysis(
                db,
                findings="Periodic re-KYC workflows are run manually. High-risk customers are identified, but re-KYC collection rate is currently at 78%, leaving a 22% compliance gap.",
                risk_assessment="High Risk. Pending re-KYC on high-risk customers represents an AML vulnerability.",
                recommendations="Implement automated SMS/Email reminders for re-KYC. Impose temporary debit-freezes on accounts missing the deadline by over 90 days.",
                regulation_id=reg2.id,
                status="Identified",
            )

        print("Seeded demo regulations, obligations, tasks, and gap analyses where needed.")
    except Exception as e:
        print(f"Failed demo data seeding: {e}")
    finally:
        db.close()
