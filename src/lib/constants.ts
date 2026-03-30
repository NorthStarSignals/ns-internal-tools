export const DOCUMENT_CATEGORIES = {
  tax_return: { label: "Tax Return", icon: "FileText", color: "blue" },
  bank_statement: { label: "Bank Statement", icon: "Landmark", color: "green" },
  pnl: { label: "P&L Statement", icon: "TrendingUp", color: "amber" },
  balance_sheet: { label: "Balance Sheet", icon: "Scale", color: "purple" },
  cash_flow: { label: "Cash Flow", icon: "DollarSign", color: "emerald" },
  lease: { label: "Lease Agreement", icon: "Building", color: "orange" },
  vendor_contract: { label: "Vendor Contract", icon: "Handshake", color: "cyan" },
  customer_contract: { label: "Customer Contract", icon: "Users", color: "indigo" },
  employee_agreement: { label: "Employee Agreement", icon: "UserCheck", color: "rose" },
  insurance: { label: "Insurance Policy", icon: "Shield", color: "teal" },
  license_permit: { label: "License/Permit", icon: "Award", color: "yellow" },
  operating_agreement: { label: "Operating Agreement", icon: "FileCheck", color: "slate" },
  other: { label: "Other", icon: "File", color: "gray" },
} as const;

export const REQUIREMENT_TYPES = {
  narrative: { label: "Narrative", color: "bg-blue-500/20 text-blue-300" },
  technical: { label: "Technical", color: "bg-purple-500/20 text-purple-300" },
  compliance: { label: "Compliance", color: "bg-amber-500/20 text-amber-300" },
  pricing: { label: "Pricing", color: "bg-green-500/20 text-green-300" },
} as const;

export const RESPONSE_STATUSES = {
  draft: { label: "Draft", color: "bg-slate-500/20 text-slate-300" },
  reviewed: { label: "Reviewed", color: "bg-blue-500/20 text-blue-300" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-300" },
  needs_client: { label: "Needs Client", color: "bg-amber-500/20 text-amber-300" },
} as const;

export const RED_FLAG_SEVERITY = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-300 border-red-500/30" },
  warning: { label: "Warning", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  note: { label: "Note", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
} as const;

export const PROJECT_STATUSES = {
  active: { label: "Active", color: "bg-blue-500/20 text-blue-300" },
  submitted: { label: "Submitted", color: "bg-purple-500/20 text-purple-300" },
  won: { label: "Won", color: "bg-green-500/20 text-green-300" },
  lost: { label: "Lost", color: "bg-red-500/20 text-red-300" },
} as const;
