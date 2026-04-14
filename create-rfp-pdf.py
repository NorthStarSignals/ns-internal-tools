"""Generate a realistic City of Dallas IT Infrastructure RFP document."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)

OUTPUT = r"C:\Users\alexa\claude\ns-internal-tools\example-rfp-dallas-it.pdf"

NAVY = HexColor("#1a2744")
DARK_BLUE = HexColor("#2c3e6b")
GOLD = HexColor("#c9a227")
GRAY = HexColor("#555555")
LIGHT_GRAY = HexColor("#e8e8e8")
WHITE = HexColor("#ffffff")

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    "CoverTitle", parent=styles["Title"],
    fontSize=22, leading=28, textColor=NAVY,
    spaceAfter=6, alignment=TA_CENTER, fontName="Helvetica-Bold"
))
styles.add(ParagraphStyle(
    "CoverSubtitle", parent=styles["Normal"],
    fontSize=14, leading=18, textColor=DARK_BLUE,
    spaceAfter=4, alignment=TA_CENTER, fontName="Helvetica"
))
styles.add(ParagraphStyle(
    "CoverDetail", parent=styles["Normal"],
    fontSize=11, leading=15, textColor=GRAY,
    spaceAfter=3, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    "SectionHeading", parent=styles["Heading1"],
    fontSize=14, leading=18, textColor=NAVY,
    spaceBefore=18, spaceAfter=8, fontName="Helvetica-Bold",
    borderWidth=0, borderPadding=0
))
styles.add(ParagraphStyle(
    "SubHeading", parent=styles["Heading2"],
    fontSize=11, leading=14, textColor=DARK_BLUE,
    spaceBefore=10, spaceAfter=4, fontName="Helvetica-Bold"
))
styles.add(ParagraphStyle(
    "RfpBody", parent=styles["Normal"],
    fontSize=10, leading=14, textColor=HexColor("#222222"),
    spaceAfter=6, alignment=TA_JUSTIFY
))
styles.add(ParagraphStyle(
    "BulletText", parent=styles["Normal"],
    fontSize=10, leading=14, textColor=HexColor("#222222"),
    spaceAfter=4, leftIndent=24, bulletIndent=12
))
styles.add(ParagraphStyle(
    "SmallNote", parent=styles["Normal"],
    fontSize=8, leading=10, textColor=GRAY, alignment=TA_CENTER
))

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=letter,
        topMargin=0.75*inch, bottomMargin=0.75*inch,
        leftMargin=1*inch, rightMargin=1*inch
    )
    story = []

    # ── COVER PAGE ──
    story.append(Spacer(1, 60))
    story.append(HRFlowable(width="100%", thickness=3, color=NAVY))
    story.append(Spacer(1, 20))
    story.append(Paragraph("CITY OF DALLAS", styles["CoverTitle"]))
    story.append(Paragraph("Office of Procurement Services", styles["CoverSubtitle"]))
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="40%", thickness=1, color=GOLD))
    story.append(Spacer(1, 30))
    story.append(Paragraph("REQUEST FOR PROPOSALS", styles["CoverSubtitle"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Enterprise IT Infrastructure Modernization",
        styles["CoverTitle"]
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph("RFP-2026-IT-0472", ParagraphStyle(
        "rfpnum", parent=styles["CoverSubtitle"],
        fontSize=16, textColor=GOLD, fontName="Helvetica-Bold"
    )))
    story.append(Spacer(1, 40))

    cover_data = [
        ["Issue Date:", "April 1, 2026"],
        ["Proposal Due Date:", "May 15, 2026 \u2014 2:00 PM CST"],
        ["Pre-Proposal Conference:", "April 14, 2026 \u2014 10:00 AM CST"],
        ["Contact:", "James Rodriguez, Senior Procurement Specialist"],
        ["Division:", "IT Procurement Division"],
        ["Email:", "james.rodriguez@dallascityhall.com"],
        ["Phone:", "(214) 670-3219"],
    ]
    cover_table = Table(cover_data, colWidths=[2.2*inch, 3.5*inch])
    cover_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
        ("TEXTCOLOR", (1, 0), (1, -1), GRAY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(cover_table)

    story.append(Spacer(1, 50))
    story.append(HRFlowable(width="100%", thickness=3, color=NAVY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "OFFICIAL USE \u2014 City of Dallas, Texas \u2014 All Rights Reserved",
        styles["SmallNote"]
    ))
    story.append(PageBreak())

    # ── SECTION 1: INTRODUCTION & PURPOSE ──
    story.append(Paragraph("SECTION 1: INTRODUCTION AND PURPOSE", styles["SectionHeading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "The City of Dallas (hereinafter referred to as \"the City\") is soliciting proposals from "
        "qualified vendors to modernize its enterprise IT infrastructure across forty-seven (47) "
        "city-owned and operated facilities. This initiative is a critical component of the City's "
        "Digital Dallas 2030 strategic plan, approved by City Council Resolution No. 26-0387 on "
        "February 12, 2026.",
        styles["RfpBody"]
    ))
    story.append(Paragraph(
        "The City's current IT infrastructure was largely deployed between 2014 and 2018 and has "
        "reached or exceeded its planned end-of-life. Key systems\u2014including core network "
        "switching, data center compute and storage, endpoint devices, and cybersecurity "
        "platforms\u2014require comprehensive modernization to meet the growing demands of city "
        "operations, constituent services, and evolving regulatory requirements.",
        styles["RfpBody"]
    ))
    story.append(Paragraph(
        "The approved budget envelope for this project is <b>$4,200,000 to $5,800,000</b> over a "
        "three (3) year period, subject to annual appropriation by the Dallas City Council. Vendors "
        "are expected to propose phased implementations that deliver measurable value within each "
        "fiscal year.",
        styles["RfpBody"]
    ))
    story.append(Paragraph(
        "Facilities in scope include Dallas City Hall, five (5) regional service centers, "
        "twelve (12) public library branches, the Dallas Convention Center, eight (8) recreation "
        "centers, the Municipal Courts Building, and nineteen (19) additional administrative and "
        "public safety facilities. A complete facility list is available as Attachment A "
        "(available upon request).",
        styles["RfpBody"]
    ))

    # ── SECTION 2: SCOPE OF WORK ──
    story.append(Spacer(1, 6))
    story.append(Paragraph("SECTION 2: SCOPE OF WORK", styles["SectionHeading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "The selected vendor shall provide comprehensive IT infrastructure modernization services "
        "as described in the following subsections. Proposals must address all six (6) work areas. "
        "Partial proposals will not be considered.",
        styles["RfpBody"]
    ))

    # 2.1
    story.append(Paragraph("2.1 Network Infrastructure Modernization", styles["SubHeading"]))
    story.append(Paragraph(
        "The vendor shall replace the City's core network switching and routing infrastructure "
        "across all forty-seven (47) facilities. The new network shall provide a minimum 10 Gbps "
        "backbone with redundant fiber paths between all major facilities. The vendor shall deploy "
        "Software-Defined Wide Area Networking (SD-WAN) technology to connect remote sites, "
        "ensuring quality-of-service prioritization for critical applications including public "
        "safety dispatch, financial systems, and video conferencing.",
        styles["RfpBody"]
    ))
    for item in [
        "Replace all end-of-life core switches and routers (estimated 340+ devices)",
        "Minimum 10 Gbps backbone connectivity between hub facilities",
        "Redundant fiber paths with automatic failover (<50ms switchover)",
        "SD-WAN deployment at all remote sites with centralized management",
        "Full IPv6 support with dual-stack transition plan",
        "802.1X network access control across all wired and wireless ports",
        "Comprehensive network monitoring with real-time alerting",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # 2.2
    story.append(Paragraph("2.2 Data Center Modernization", styles["SubHeading"]))
    story.append(Paragraph(
        "The City currently operates a primary data center at City Hall and a disaster recovery "
        "site at the Dallas Emergency Operations Center. The vendor shall architect and implement "
        "a hybrid cloud solution that migrates appropriate workloads to a FedRAMP-authorized cloud "
        "platform while maintaining on-premise infrastructure for workloads requiring CJIS "
        "compliance or ultra-low latency.",
        styles["RfpBody"]
    ))
    for item in [
        "Hybrid cloud architecture with FedRAMP High authorization",
        "Maintain Criminal Justice Information Services (CJIS) compliance for law enforcement systems",
        "99.99% uptime Service Level Agreement for all production systems",
        "Disaster recovery with Recovery Time Objective (RTO) of less than four (4) hours",
        "Recovery Point Objective (RPO) of less than one (1) hour for critical systems",
        "Data sovereignty: all data must reside within the continental United States",
        "Migration plan for 120+ existing virtual machines and 40+ physical servers",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # 2.3
    story.append(Paragraph("2.3 Endpoint Management", styles["SubHeading"]))
    story.append(Paragraph(
        "The vendor shall deploy a unified endpoint management (UEM) solution to manage the "
        "City's fleet of 3,200+ devices including desktops, laptops, tablets, and mobile devices. "
        "The solution must support zero-trust architecture principles and provide automated "
        "patching capabilities.",
        styles["RfpBody"]
    ))
    for item in [
        "Unified endpoint management platform for 3,200+ devices (Windows, macOS, iOS, Android)",
        "Zero-trust network access (ZTNA) implementation",
        "Automated OS and application patching with compliance reporting",
        "Endpoint Detection and Response (EDR) integration",
        "Remote wipe capability for lost/stolen devices",
        "Application whitelisting for high-security endpoints",
        "Hardware and software inventory with automated discovery",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # 2.4
    story.append(Paragraph("2.4 Cybersecurity Enhancement", styles["SubHeading"]))
    story.append(Paragraph(
        "The vendor shall implement a comprehensive cybersecurity program including Security "
        "Information and Event Management (SIEM), Security Operations Center (SOC) services, "
        "and compliance with the National Institute of Standards and Technology (NIST) "
        "Special Publication 800-53 Rev. 5 security controls.",
        styles["RfpBody"]
    ))
    for item in [
        "SIEM platform deployment with log aggregation from all network devices and servers",
        "24/7/365 Security Operations Center (SOC) monitoring (may be vendor-managed)",
        "Documented Incident Response Plan aligned with NIST Computer Security Incident Handling Guide",
        "Annual penetration testing (external and internal) with remediation tracking",
        "Compliance with NIST SP 800-53 Rev. 5 Moderate baseline controls",
        "Phishing simulation and security awareness training program",
        "Vulnerability management program with monthly scanning and quarterly reporting",
        "Multi-factor authentication (MFA) enforcement for all administrative access",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # 2.5
    story.append(Paragraph("2.5 Help Desk and Technical Support", styles["SubHeading"]))
    story.append(Paragraph(
        "The vendor shall establish a tiered help desk and technical support structure to serve "
        "all city employees and facilities during the transition period and for a minimum of "
        "twelve (12) months post-implementation.",
        styles["RfpBody"]
    ))
    for item in [
        "Tier 1/2/3 support structure with defined escalation procedures",
        "Critical issues (P1): response within fifteen (15) minutes, resolution within four (4) hours",
        "High issues (P2): response within one (1) hour, resolution within eight (8) hours",
        "On-site technicians at five (5) major facilities during business hours (M-F, 7AM-6PM)",
        "After-hours remote support available 24/7 for critical and high-priority issues",
        "IT Service Management (ITSM) platform with self-service portal for city employees",
        "Monthly service level reporting with root cause analysis for SLA misses",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # 2.6
    story.append(Paragraph("2.6 Training and Knowledge Transfer", styles["SubHeading"]))
    story.append(Paragraph(
        "The vendor shall develop and deliver a comprehensive training program to ensure City "
        "IT staff can effectively operate and maintain the new infrastructure. Training must be "
        "provided at multiple skill levels and include both hands-on labs and reference documentation.",
        styles["RfpBody"]
    ))
    for item in [
        "Training program for 200+ City IT employees across three skill levels",
        "Hands-on lab environments mirroring production infrastructure",
        "Complete operational runbooks for all deployed systems",
        "As-built documentation including network diagrams, configurations, and procedures",
        "Video-based training library for ongoing reference",
        "Knowledge transfer sessions (minimum 40 hours) with City IT leadership",
        "Certification preparation support for key City IT personnel",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles["BulletText"]))

    # ── SECTION 3: PROPOSAL REQUIREMENTS ──
    story.append(Spacer(1, 6))
    story.append(Paragraph("SECTION 3: PROPOSAL REQUIREMENTS", styles["SectionHeading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "Proposals must be submitted in the format specified below. Proposals that do not conform "
        "to these requirements may be considered non-responsive and may not be evaluated. All "
        "proposals must be received by <b>May 15, 2026 at 2:00 PM Central Standard Time</b>.",
        styles["RfpBody"]
    ))

    reqs = [
        ("3.1 Executive Summary", "A concise summary (maximum 3 pages) of the vendor's understanding of the City's needs, proposed approach, and key differentiators."),
        ("3.2 Technical Approach", "Detailed technical proposal addressing each of the six (6) scope areas in Section 2. Include architecture diagrams, technology selections with justifications, and integration considerations."),
        ("3.3 Project Timeline", "Detailed implementation schedule with milestones, dependencies, and resource loading. The total implementation period must not exceed eighteen (18) months from Notice to Proceed."),
        ("3.4 Team Qualifications", "Resumes and relevant certifications for all key personnel. Project Manager must hold PMP certification. Technical Lead must hold relevant manufacturer certifications (e.g., CCIE, CCNP, AWS Solutions Architect Professional)."),
        ("3.5 References", "Minimum three (3) references from government clients of similar size and scope completed within the past five (5) years. Include project name, client contact, contract value, and brief description of services provided."),
        ("3.6 Pricing", "Detailed pricing breakdown by phase, work area, and cost category (hardware, software, labor, ongoing support). Provide both capital expenditure and operating expenditure projections for the full three-year period."),
        ("3.7 Certifications", "Proof of current Cybersecurity Maturity Model Certification (CMMC) Level 2 and SOC 2 Type II report dated within the past twelve (12) months."),
        ("3.8 M/WBE Participation Plan", "Detailed plan demonstrating good-faith efforts to achieve the City's goal of fifteen percent (15%) Minority/Women-owned Business Enterprise participation. Include identified M/WBE subcontractors, their roles, and estimated contract values."),
    ]
    for title, desc in reqs:
        story.append(Paragraph(title, styles["SubHeading"]))
        story.append(Paragraph(desc, styles["RfpBody"]))

    # ── SECTION 4: EVALUATION CRITERIA ──
    story.append(Spacer(1, 6))
    story.append(Paragraph("SECTION 4: EVALUATION CRITERIA", styles["SectionHeading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "Proposals will be evaluated by a selection committee comprised of representatives from "
        "the City's Department of Information and Technology Services, the Office of Procurement "
        "Services, and an independent technical advisor. Evaluation will be based on the following "
        "weighted criteria:",
        styles["RfpBody"]
    ))

    eval_data = [
        ["Criterion", "Weight", "Description"],
        ["Technical Approach", "35%", "Quality, feasibility, and innovation of proposed solution"],
        ["Experience & References", "25%", "Relevant government IT experience and reference quality"],
        ["Price", "20%", "Total cost of ownership over three-year period"],
        ["Project Timeline", "10%", "Feasibility of schedule and approach to risk mitigation"],
        ["M/WBE Participation", "10%", "Commitment to diverse subcontractor engagement"],
    ]
    eval_table = Table(eval_data, colWidths=[1.8*inch, 0.8*inch, 3.6*inch])
    eval_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 1), (-1, -1), HexColor("#222222")),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, HexColor("#f5f5f5")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(eval_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "The City reserves the right to conduct oral presentations and/or site visits as part "
        "of the evaluation process. Vendors selected for oral presentations will be notified no "
        "later than June 6, 2026. The City anticipates making an award recommendation to City "
        "Council by July 2026.",
        styles["RfpBody"]
    ))

    # ── SECTION 5: TERMS & CONDITIONS ──
    story.append(Spacer(1, 6))
    story.append(Paragraph("SECTION 5: TERMS AND CONDITIONS", styles["SectionHeading"]))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 6))

    terms = [
        ("5.1 Insurance Requirements",
         "The selected vendor must maintain Commercial General Liability insurance with minimum "
         "limits of $2,000,000 per occurrence and $4,000,000 aggregate, Professional Liability "
         "(Errors & Omissions) insurance of $2,000,000, Cyber Liability insurance of $5,000,000, "
         "and Workers' Compensation insurance as required by Texas law. The City of Dallas must "
         "be named as an additional insured on all policies except Workers' Compensation."),
        ("5.2 Performance Bond",
         "The selected vendor shall provide a performance bond in the amount of one hundred "
         "percent (100%) of the first-year contract value within fifteen (15) calendar days of "
         "contract execution. The bond must be issued by a surety company authorized to do "
         "business in the State of Texas with an A.M. Best rating of A- VII or better."),
        ("5.3 Prevailing Wage",
         "All work performed under this contract shall comply with the Texas Prevailing Wage "
         "Act (Texas Government Code Chapter 2258) as applicable to public works projects. The "
         "vendor shall maintain certified payroll records and make them available upon request."),
        ("5.4 Right to Reject",
         "The City reserves the right to reject any or all proposals, to waive any informality "
         "or irregularity in any proposal, and to accept or reject any item or combination of "
         "items. The City further reserves the right to negotiate with any vendor to achieve "
         "the best value for the City."),
        ("5.5 Proposal Validity",
         "All proposals shall remain valid for a period of one hundred twenty (120) calendar "
         "days from the proposal due date. The City may request an extension of the validity "
         "period, and vendors may accept or decline such extension without prejudice."),
        ("5.6 Contract Term",
         "The initial contract term shall be three (3) years from the date of execution, with "
         "two (2) optional one-year renewal periods exercisable at the City's sole discretion."),
        ("5.7 Compliance",
         "The selected vendor must comply with all applicable federal, state, and local laws "
         "and regulations including but not limited to the Americans with Disabilities Act (ADA), "
         "Title VI of the Civil Rights Act, and the City of Dallas Business Inclusion and "
         "Development Plan."),
    ]
    for title, desc in terms:
        story.append(Paragraph(title, styles["SubHeading"]))
        story.append(Paragraph(desc, styles["RfpBody"]))

    # Footer
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=2, color=NAVY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "END OF RFP-2026-IT-0472 \u2014 City of Dallas Enterprise IT Infrastructure Modernization",
        styles["SmallNote"]
    ))
    story.append(Paragraph(
        "Page intentionally ends here. Attachments A through D available upon request from the "
        "IT Procurement Division.",
        styles["SmallNote"]
    ))

    doc.build(story)
    print(f"PDF created: {OUTPUT}")

if __name__ == "__main__":
    build_pdf()
