export const DD_ITEMS = [
  'Financial health & solvency',
  'Legal & compliance check',
  'Security & pentest results',
  'Business continuity plan',
  'Data privacy & GDPR',
  'Subcontractor mapping',
  'Reputation & references',
  'Insurance verification',
]

export const RA_DIMS = [
  { key: 'security',      label: 'Security',      desc: 'Cybersecurity posture' },
  { key: 'compliance',    label: 'Compliance',     desc: 'Regulatory adherence' },
  { key: 'financial',     label: 'Financial',      desc: 'Financial stability' },
  { key: 'operational',   label: 'Operational',    desc: 'Service resilience' },
  { key: 'reputational',  label: 'Reputational',   desc: 'Brand & trust' },
]

export const CATEGORIES = [
  'Cloud Infrastructure', 'Data Storage', 'Cybersecurity', 'Payment Processing',
  'Logistics', 'HR & Payroll', 'Legal', 'Marketing Tech', 'ERP/CRM', 'Other',
]

export const TIERS       = ['Critical', 'High', 'Medium', 'Low']
export const DEPARTMENTS = ['Risk & Compliance', 'Security', 'Operations', 'Finance', 'IT', 'Legal', 'HR', 'Other']
export const MONTHS      = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

export const AVATAR_GRADS = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
]

export const INIT_VENDORS = [
  {
    id: 1, name: 'CloudNest Inc.', website: 'https://cloudnest.io',
    category: 'Cloud Infrastructure', tier: 'Critical', status: 'Active',
    riskScore: 72, contact: 'Sarah Lin', country: 'USA',
    raScores: { security: 68, compliance: 75, financial: 80, operational: 65, reputational: 70 },
    alerts: [{ id: 1, type: 'warning', msg: 'SSL cert expiring in 14 days' }],
    ddCompleted: [0, 1, 3, 4], research: null, documents: [],
    monData: [65, 68, 70, 72, 71, 72],
  },
  {
    id: 2, name: 'DataVault Ltd.', website: 'https://datavault.de',
    category: 'Data Storage', tier: 'High', status: 'Under Review',
    riskScore: 45, contact: 'Marco Rossi', country: 'Germany',
    raScores: { security: 42, compliance: 50, financial: 55, operational: 40, reputational: 38 },
    alerts: [
      { id: 2, type: 'critical', msg: 'GDPR audit overdue 7 days' },
      { id: 3, type: 'info',     msg: 'Contract renewal in 60 days' },
    ],
    ddCompleted: [0], research: null, documents: [],
    monData: [52, 50, 48, 46, 44, 45],
  },
  {
    id: 3, name: 'SecureLink Corp.', website: 'https://securelink.co.uk',
    category: 'Cybersecurity', tier: 'Critical', status: 'Active',
    riskScore: 88, contact: 'Anika Patel', country: 'UK',
    raScores: { security: 90, compliance: 88, financial: 85, operational: 87, reputational: 90 },
    alerts: [], ddCompleted: [0, 1, 2, 3, 4, 5, 6, 7], research: null, documents: [],
    monData: [85, 86, 87, 88, 88, 88],
  },
  {
    id: 4, name: 'PayStream Solutions', website: 'https://paystream.ie',
    category: 'Payment Processing', tier: 'High', status: 'Active',
    riskScore: 61, contact: 'Tom Brennan', country: 'Ireland',
    raScores: { security: 65, compliance: 70, financial: 55, operational: 58, reputational: 57 },
    alerts: [{ id: 4, type: 'info', msg: 'Security review scheduled Mar 10' }],
    ddCompleted: [0, 1, 2, 3], research: null, documents: [],
    monData: [58, 59, 60, 61, 62, 61],
  },
  {
    id: 5, name: 'LogiTrack Systems', website: 'https://logitrack.sg',
    category: 'Logistics', tier: 'Medium', status: 'Onboarding',
    riskScore: 55, contact: 'Chen Wei', country: 'Singapore',
    raScores: { security: 52, compliance: 58, financial: 60, operational: 50, reputational: 55 },
    alerts: [{ id: 5, type: 'warning', msg: 'DD questionnaire not submitted' }],
    ddCompleted: [], research: null, documents: [],
    monData: [50, 52, 53, 54, 55, 55],
  },
]
