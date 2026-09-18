/*
# OnboardAI RAG Upgrade + NovaTech Seed Data

## What this migration adds
1. match_document_chunks() - pgvector similarity search RPC
2. Demo user upsert (NovaTech / Alex Johnson)
3. NovaTech contacts (5 team members)
4. Onboarding tasks for demo user (6 tasks)
5. 7 NovaTech knowledge documents with full content
6. Pre-chunked document_chunks (keyword search works without embeddings)
   Real embeddings are generated server-side by the ingest Edge Function
*/

-- ─── 1. pgvector similarity search function ───
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  section_label text,
  similarity float,
  document_title text,
  document_type text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.section_label,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.type AS document_type
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_document_chunks(vector, float, int) TO anon, authenticated;

-- ─── 2. Demo user ───
INSERT INTO users (id, name, role, email, department, avatar, start_date, progress)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Alex Johnson',
  'ML Engineer',
  'alex.johnson@novatech.ai',
  'Machine Learning',
  'AJ',
  'Sep 16, 2026',
  17
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  department = EXCLUDED.department,
  start_date = EXCLUDED.start_date;

-- ─── 3. NovaTech contacts ───
INSERT INTO contacts (name, role, department, email, phone, handles_issue) VALUES
  ('Sarah Chen', 'ML Team Lead', 'Machine Learning', 'sarah.chen@novatech.ai', '+1 (555) 101-2020',
   'github access approval team lead ml engineering mentoring onboarding manager'),
  ('James Park', 'IT Support Engineer', 'IT Operations', 'james.park@novatech.ai', '+1 (555) 303-4040',
   'laptop hardware vpn password reset IT support dev environment network setup badge mfa'),
  ('Maria Rodriguez', 'HR Manager', 'Human Resources', 'maria.rodriguez@novatech.ai', '+1 (555) 505-6060',
   'leave policy benefits payroll onboarding offboarding employee relations hr handbook'),
  ('David Kim', 'Security Engineer', 'Information Security', 'david.kim@novatech.ai', '+1 (555) 707-8080',
   'security training compliance incident response access policy phishing mfa two factor'),
  ('Priya Patel', 'Engineering Manager', 'Engineering', 'priya.patel@novatech.ai', '+1 (555) 909-1010',
   'engineering escalation manager admin code review deployment ci cd infrastructure handbook')
ON CONFLICT DO NOTHING;

-- ─── 4. Onboarding tasks for demo user ───
INSERT INTO onboarding_tasks
  (id, user_id, title, description, duration, category, icon, status, task_order, link)
VALUES
  ('00000000-0000-0001-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Complete Security Training',
   'Mandatory information security training. Covers data handling, phishing awareness, access policies, and compliance. Complete all 3 modules at learn.novatech.ai.',
   '45 min', 'Compliance', 'ShieldCheck', 'completed', 1, NULL),
  ('00000000-0000-0001-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Set Up Developer Environment',
   'Install required development tools, configure IDE, set up Python environment, and verify VPN access. Contact James Park (IT Support) for laptop admin permissions.',
   '2 hrs', 'Setup', 'Monitor', 'in-progress', 2, NULL),
  ('00000000-0000-0001-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Request GitHub Access',
   'Submit access request for ML team GitHub repositories. Requires team lead approval from Sarah Chen. Access covers ml-pipeline, ml-models, and ml-infrastructure.',
   '10 min', 'Access', 'Github', 'pending', 3, 'access-request'),
  ('00000000-0000-0001-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Meet Your Team',
   'Schedule 1:1 meetings with your team lead Sarah Chen, peer ML engineers, and key cross-functional stakeholders in the first week.',
   '3 hrs', 'People', 'Users', 'pending', 4, NULL),
  ('00000000-0000-0001-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Review ML Team Standards',
   'Read the ML team engineering handbook, model registry guidelines, experiment tracking protocols using MLflow, and deployment standards.',
   '1 hr', 'Documentation', 'BookOpen', 'pending', 5, NULL),
  ('00000000-0000-0001-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Configure VPN and SSO',
   'Set up Cisco AnyConnect VPN client and configure Single Sign-On for internal systems. Contact James Park (IT) if you need help with configuration files.',
   '30 min', 'Setup', 'Lock', 'pending', 6, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. NovaTech knowledge documents ───
-- Delete existing seed docs to keep idempotent
DELETE FROM documents WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007'
);

INSERT INTO documents (id, title, type, size, upload_date, status, sections, content) VALUES

('00000000-0000-0000-0000-000000000001', 'Security Policy', 'MD', '9 KB', 'Sep 10, 2026', 'indexed', 6,
'# NovaTech Information Security Policy

## Security Training Requirements
All new employees must complete mandatory security training within their first 7 days of employment. The security training program includes three modules: Information Security Fundamentals (45 minutes), Phishing Awareness Training (20 minutes), and Data Handling and Privacy Compliance (30 minutes). Completion of all three modules is required before access to any NovaTech systems beyond email and Slack is granted.

## Security Training Platform
Training is conducted through the NovaTech learning management system at learn.novatech.ai. Log in using your company SSO credentials. The system tracks your progress automatically.

## Training Deadline
All mandatory security training must be completed within 7 calendar days of your start date. Your manager and HR will be notified if training is not completed on time. Access to critical systems may be restricted until training is complete.

## Annual Renewal
Security training must be renewed annually. A reminder will be sent 30 days before your training expires.

## Password Policy
All NovaTech accounts require passwords that are at least 12 characters long, contain uppercase and lowercase letters, at least one number and one special character, changed every 90 days, and not reused from the previous 10 passwords. Multi-factor authentication (MFA) is mandatory for all system access.

## Reporting Security Incidents
If you suspect a security incident such as a phishing email, unauthorized access, or data breach, contact the Security team immediately. David Kim (Security Engineer) handles all security incidents and compliance matters. Email: david.kim@novatech.ai, Phone: +1 (555) 707-8080.'),

('00000000-0000-0000-0000-000000000002', 'GitHub Access Policy', 'MD', '7 KB', 'Sep 10, 2026', 'indexed', 5,
'# GitHub Repository Access Policy

## Overview
Access to the NovaTech GitHub organization is provisioned based on role and team assignment. All access requests must go through the formal approval process via the OnboardAI system or IT portal.

## Access Tiers
Tier 1 (Read-only) is available to all employees after security training completion. Tier 2 (Read and Write to team repositories) requires team lead approval. Tier 3 (Admin and Infrastructure) requires Engineering Manager approval plus a security review.

## ML Team Repositories
ML team members receive Tier 2 access to the following repositories: ml-pipeline (core ML training pipeline), ml-models (model registry and versioning), and ml-infrastructure (MLOps tooling and deployment configuration).

## Access Requirements
To request GitHub access the following requirements must be met: security training completed (all 3 modules), team assignment confirmed in HR systems, and manager or team lead identified as approver.

## Approval Process
Submit an access request through the OnboardAI system. The request is automatically routed to your direct team lead for approval. Team leads have 24 hours to approve or reject. Upon approval, access is provisioned within 2 hours. You will receive an email confirmation when access is granted.

## ML Team Approver
GitHub access for ML team members is approved by the ML Team Lead, Sarah Chen (sarah.chen@novatech.ai). Standard ML team access includes read and write permissions to ml-pipeline, ml-models, and ml-infrastructure repositories.

## Escalation
If your access request has not been processed within 48 hours, contact Priya Patel (Engineering Manager) at priya.patel@novatech.ai or +1 (555) 909-1010.'),

('00000000-0000-0000-0000-000000000003', 'ML Team Onboarding Guide', 'MD', '11 KB', 'Sep 10, 2026', 'indexed', 7,
'# ML Team Onboarding Guide

## Welcome to the ML Team
Welcome to the NovaTech Machine Learning team. This guide will help you get up to speed in your first two weeks.

## Week 1: Getting Started
Day 1 and 2: Complete security training (mandatory within 7 days). Get your laptop configured with IT support (James Park, james.park@novatech.ai). Set up your development environment following the Developer Environment Setup guide. Request GitHub access through OnboardAI (Sarah Chen approves). Join ML team Slack channels: #ml-team, #ml-models, #ml-infra, and #engineering.

Day 3 through 5: Schedule a 1:1 with your team lead Sarah Chen. Review ML pipeline documentation in the ml-pipeline GitHub repository. Set up local Python environment with the ML team conda configuration. Complete developer environment verification.

## Week 2: Going Deeper
Get access to tools: GitHub (request through OnboardAI, approved by Sarah Chen). AWS (request through IT portal, requires Engineering Manager sign-off). Weights and Biases or MLflow (available via SSO after GitHub access). Jupyter Hub (available after GitHub access is provisioned).

## ML Team Tech Stack
Python 3.11 or later with conda environments. PyTorch and TensorFlow for model development. MLflow for experiment tracking. Kubernetes for model deployment. AWS SageMaker for large-scale training runs.

## Key Contacts for ML Team
Sarah Chen (ML Team Lead): sarah.chen@novatech.ai - GitHub access approval, mentoring, technical guidance. James Park (IT Support): james.park@novatech.ai - Laptop, VPN, and developer environment issues. David Kim (Security): david.kim@novatech.ai - Security training and compliance questions.

## Onboarding Checklist
Security training completed. Development environment set up. GitHub access requested and granted. 1:1 with team lead scheduled. ML team standards reviewed. VPN and SSO configured.'),

('00000000-0000-0000-0000-000000000004', 'Developer Environment Setup', 'MD', '8 KB', 'Sep 10, 2026', 'indexed', 5,
'# Developer Environment Setup Guide

## Prerequisites
Before setting up your development environment: complete security training (mandatory first step), have your company laptop issued by IT, and configure VPN access.

## Laptop Setup
Contact James Park (IT Support Engineer) at james.park@novatech.ai or +1 (555) 303-4040 for initial laptop provisioning, software installation permissions, admin access for development tools, and VPN client installation.

## Required Software
Install in order: Package manager (Homebrew for macOS, Chocolatey or WSL2 for Windows). Git version 2.40 or later. Python 3.11 or later via conda using Miniforge. Node.js 20 LTS. Docker Desktop. VS Code or JetBrains IDEs.

## VPN Setup
NovaTech uses Cisco AnyConnect for VPN. Configuration files are available at vpn-config.novatech.ai after SSO login. If you have VPN connection issues, contact James Park at james.park@novatech.ai.

## SSH and Git Configuration
Configure git with your NovaTech email: git config global user.email and user.name. Generate an SSH key and add it to GitHub after your GitHub access is provisioned.

## Common Issues
Cannot install software: Contact James Park for admin permissions. VPN not connecting: Contact James Park at james.park@novatech.ai. Password reset needed: Use https://password.novatech.ai or contact IT Support. MFA device issues: Contact James Park or David Kim (Security).'),

('00000000-0000-0000-0000-000000000005', 'IT Support Guide', 'MD', '6 KB', 'Sep 10, 2026', 'indexed', 4,
'# IT Support Guide

## Getting IT Help
For all IT-related issues at NovaTech, contact: James Park, IT Support Engineer. Email: james.park@novatech.ai. Phone: +1 (555) 303-4040. Location: Building A, Floor 2, Desk IT-205. Hours: Monday through Friday, 9 AM to 6 PM PST.

## Laptop and Hardware Problems
Hardware issues such as screen, keyboard, or battery problems: contact James Park immediately. Software installation: James Park can grant temporary admin access. Laptop replacement: submit a request to IT Support with manager approval.

## Password and Account Access
Forgotten password: use https://password.novatech.ai (requires MFA device) or call James Park. MFA device lost or broken: contact James Park and David Kim (Security) immediately. Account locked: contact James Park.

## VPN and Network Issues
VPN client: install Cisco AnyConnect from https://vpn-client.novatech.ai. VPN configuration files available at https://vpn-config.novatech.ai after SSO login. VPN connection errors: restart AnyConnect. If the problem persists, contact James Park.

## Software Requests
Submit a ticket at https://it.novatech.ai/tickets. Include business justification. Manager approval is required for software over 500 dollars per year. IT will process within 3 business days.'),

('00000000-0000-0000-0000-000000000006', 'Leave Policy', 'MD', '5 KB', 'Sep 10, 2026', 'indexed', 4,
'# NovaTech Leave Policy

## Annual Leave (PTO)
All full-time employees receive the following PTO allocation: Years 1 through 2 receive 15 days per year. Years 3 through 5 receive 20 days per year. Year 6 and beyond receive 25 days per year. PTO accrues monthly and can be carried over up to 10 days into the next calendar year.

## Sick Leave
All employees receive 10 days of sick leave per year. Sick leave is separate from PTO and does not carry over to the next year. A medical certificate is required for absences longer than 3 consecutive days.

## Parental Leave
Primary caregiver receives 16 weeks of paid leave. Secondary caregiver receives 6 weeks of paid leave. Adoption leave follows the same policy as parental leave.

## How to Request Leave
Submit leave requests through the HR portal at https://hr.novatech.ai. For PTO, request at least 2 weeks in advance. For sick leave, notify your manager by 9 AM on the day of absence. For parental leave, notify HR at least 8 weeks in advance.

## Contact for Leave Questions
Maria Rodriguez, HR Manager. Email: maria.rodriguez@novatech.ai. Phone: +1 (555) 505-6060.'),

('00000000-0000-0000-0000-000000000007', 'Engineering Handbook', 'MD', '10 KB', 'Sep 10, 2026', 'indexed', 5,
'# NovaTech Engineering Handbook

## Code Review Process
All code changes must go through code review before merging. Create a pull request in GitHub. Request review from at least 2 engineers, one of whom must be a senior engineer. Address all review comments. Get approval from reviewers. Merge using squash-and-merge to keep a clean commit history.

## Deployment Process
NovaTech uses a GitOps deployment model. All deployments are automated via GitHub Actions. Staging deploys automatically from the main branch after passing tests. Production deploys require a signed release tag and Engineering Manager approval for major changes. Emergency rollbacks: contact Priya Patel (Engineering Manager).

## Engineering Standards
Use conventional commits for commit messages. Write unit tests for all new functions with a minimum of 80 percent code coverage. Document public APIs with OpenAPI specifications. Run the full test suite before opening a pull request.

## Tech Stack
Frontend: React with TypeScript and Vite. Backend: Python with FastAPI or Node.js with Express. Infrastructure: AWS with EKS, RDS, and S3. CI/CD: GitHub Actions. Monitoring: Datadog and PagerDuty.

## Contact for Engineering Questions
Priya Patel, Engineering Manager. Email: priya.patel@novatech.ai. Phone: +1 (555) 909-1010.');

-- ─── 6. Pre-chunked document_chunks (NULL embeddings, keyword search works) ───
-- Real embeddings generated by ingest Edge Function when documents are re-uploaded

-- Security Policy chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000001', 0,
 'All new employees must complete mandatory security training within their first 7 days of employment. The security training program includes three modules: Information Security Fundamentals (45 minutes), Phishing Awareness Training (20 minutes), and Data Handling and Privacy Compliance (30 minutes). Completion of all three modules is required before access to any NovaTech systems beyond email and Slack is granted.',
 'Security Training Requirements'),
('00000000-0000-0000-0000-000000000001', 1,
 'Training is conducted through the NovaTech learning management system at learn.novatech.ai. Log in using your company SSO credentials. All mandatory security training must be completed within 7 calendar days of your start date. Your manager and HR will be notified if training is not completed on time.',
 'Security Training Platform and Deadline'),
('00000000-0000-0000-0000-000000000001', 2,
 'All NovaTech accounts require passwords that are at least 12 characters long, contain uppercase and lowercase letters, at least one number and one special character, changed every 90 days, and not reused from the previous 10 passwords. Multi-factor authentication (MFA) is mandatory for all system access.',
 'Password Policy'),
('00000000-0000-0000-0000-000000000001', 3,
 'If you suspect a security incident such as a phishing email, unauthorized access, or data breach, contact the Security team immediately. David Kim (Security Engineer) handles all security incidents and compliance matters. Email: david.kim@novatech.ai, Phone: +1 (555) 707-8080.',
 'Reporting Security Incidents');

-- GitHub Access Policy chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000002', 0,
 'Access to the NovaTech GitHub organization is provisioned based on role and team assignment. Tier 1 (Read-only) is available to all employees after security training completion. Tier 2 (Read and Write to team repositories) requires team lead approval. Tier 3 (Admin and Infrastructure) requires Engineering Manager approval plus a security review.',
 'GitHub Access Overview and Tiers'),
('00000000-0000-0000-0000-000000000002', 1,
 'ML team members receive Tier 2 access to: ml-pipeline (core ML training pipeline), ml-models (model registry and versioning), and ml-infrastructure (MLOps tooling and deployment configuration). To request GitHub access the following requirements must be met: security training completed (all 3 modules), team assignment confirmed in HR systems.',
 'ML Team Repositories and Requirements'),
('00000000-0000-0000-0000-000000000002', 2,
 'Submit an access request through the OnboardAI system. The request is automatically routed to your direct team lead for approval. Team leads have 24 hours to approve or reject. Upon approval, access is provisioned within 2 hours. You will receive an email confirmation when access is granted.',
 'Approval Process'),
('00000000-0000-0000-0000-000000000002', 3,
 'GitHub access for ML team members is approved by the ML Team Lead, Sarah Chen (sarah.chen@novatech.ai). Standard ML team access includes read and write permissions to ml-pipeline, ml-models, and ml-infrastructure repositories. If your request has not been processed within 48 hours, contact Priya Patel (Engineering Manager) at priya.patel@novatech.ai.',
 'ML Team Approver and Escalation');

-- ML Team Onboarding Guide chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000003', 0,
 'Welcome to the NovaTech Machine Learning team. Week 1 Day 1 and 2: Complete security training (mandatory within 7 days). Get your laptop configured with IT support (James Park, james.park@novatech.ai). Set up your development environment. Request GitHub access through OnboardAI (Sarah Chen approves). Join ML team Slack channels: #ml-team, #ml-models, #ml-infra, and #engineering.',
 'Week 1 Getting Started'),
('00000000-0000-0000-0000-000000000003', 1,
 'Week 1 Day 3 through 5: Schedule a 1:1 with your team lead Sarah Chen. Review ML pipeline documentation in the ml-pipeline GitHub repository. Set up local Python environment with the ML team conda configuration. Week 2: Get access to tools including GitHub (request through OnboardAI), AWS, Weights and Biases, MLflow, and Jupyter Hub.',
 'Week 1 Day 3 through Week 2'),
('00000000-0000-0000-0000-000000000003', 2,
 'ML Team Tech Stack: Python 3.11 or later with conda environments. PyTorch and TensorFlow for model development. MLflow for experiment tracking. Kubernetes for model deployment. AWS SageMaker for large-scale training runs.',
 'ML Team Tech Stack'),
('00000000-0000-0000-0000-000000000003', 3,
 'Key Contacts for ML Team: Sarah Chen (ML Team Lead): sarah.chen@novatech.ai - GitHub access approval, mentoring, technical guidance. James Park (IT Support): james.park@novatech.ai - Laptop, VPN, and developer environment issues. David Kim (Security): david.kim@novatech.ai - Security training and compliance questions.',
 'Key Contacts'),
('00000000-0000-0000-0000-000000000003', 4,
 'ML Team Onboarding Checklist: Security training completed. Development environment set up. GitHub access requested and granted. 1:1 with team lead Sarah Chen scheduled. ML team standards reviewed. VPN and SSO configured. First project assigned by team lead.',
 'Onboarding Checklist');

-- Developer Environment Setup chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000004', 0,
 'Before setting up your development environment: complete security training (mandatory first step), have your company laptop issued by IT, and configure VPN access. Contact James Park (IT Support Engineer) at james.park@novatech.ai or +1 (555) 303-4040 for laptop provisioning, software installation permissions, and VPN client installation.',
 'Prerequisites and Laptop Setup'),
('00000000-0000-0000-0000-000000000004', 1,
 'Required software in order: Homebrew (macOS) or Chocolatey/WSL2 (Windows). Git version 2.40 or later. Python 3.11 or later via conda using Miniforge. Node.js 20 LTS. Docker Desktop. VS Code or JetBrains IDEs.',
 'Required Software'),
('00000000-0000-0000-0000-000000000004', 2,
 'NovaTech uses Cisco AnyConnect for VPN. Configuration files are available at vpn-config.novatech.ai after SSO login. If you have VPN connection issues, contact James Park at james.park@novatech.ai. For SSH key setup, generate an SSH key and add it to GitHub after your GitHub access is provisioned.',
 'VPN and SSH Setup'),
('00000000-0000-0000-0000-000000000004', 3,
 'Common issues: Cannot install software, contact James Park for admin permissions. VPN not connecting, contact James Park at james.park@novatech.ai. Password reset needed, use https://password.novatech.ai or contact IT Support. MFA device issues, contact James Park or David Kim (Security).',
 'Common Issues and Troubleshooting');

-- IT Support Guide chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000005', 0,
 'For all IT-related issues at NovaTech, contact: James Park, IT Support Engineer. Email: james.park@novatech.ai. Phone: +1 (555) 303-4040. Location: Building A, Floor 2, Desk IT-205. Hours: Monday through Friday, 9 AM to 6 PM PST.',
 'IT Support Contact'),
('00000000-0000-0000-0000-000000000005', 1,
 'Laptop and hardware problems: Hardware issues such as screen, keyboard, or battery problems, contact James Park immediately. Software installation, James Park can grant temporary admin access. Laptop replacement, submit a request to IT Support with manager approval.',
 'Laptop and Hardware Problems'),
('00000000-0000-0000-0000-000000000005', 2,
 'Password and account access: Forgotten password, use https://password.novatech.ai (requires MFA device) or call James Park. MFA device lost or broken, contact James Park and David Kim (Security) immediately. Account locked, contact James Park.',
 'Password and Account Access'),
('00000000-0000-0000-0000-000000000005', 3,
 'VPN issues: Install Cisco AnyConnect from https://vpn-client.novatech.ai. Configuration files available at https://vpn-config.novatech.ai after SSO login. VPN connection errors: restart AnyConnect. If the problem persists, contact James Park.',
 'VPN and Network Issues');

-- Leave Policy chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000006', 0,
 'Annual Leave (PTO): Years 1 through 2 receive 15 days per year. Years 3 through 5 receive 20 days per year. Year 6 and beyond receive 25 days per year. PTO accrues monthly and can be carried over up to 10 days into the next calendar year.',
 'Annual Leave PTO Allocation'),
('00000000-0000-0000-0000-000000000006', 1,
 'Sick Leave: 10 days per year, non-accruing, does not carry over. Separate from PTO. Medical certificate required for absences longer than 3 consecutive days. Parental Leave: Primary caregiver receives 16 weeks of paid leave. Secondary caregiver receives 6 weeks of paid leave.',
 'Sick Leave and Parental Leave'),
('00000000-0000-0000-0000-000000000006', 2,
 'How to request leave: Submit leave requests through the HR portal at https://hr.novatech.ai. For PTO, request at least 2 weeks in advance. For sick leave, notify your manager by 9 AM on the day of absence. For parental leave, notify HR at least 8 weeks in advance. Contact: Maria Rodriguez, HR Manager, maria.rodriguez@novatech.ai.',
 'Requesting Leave');

-- Engineering Handbook chunks
INSERT INTO document_chunks (document_id, chunk_index, content, section_label) VALUES
('00000000-0000-0000-0000-000000000007', 0,
 'Code Review Process: All code changes must go through code review before merging. Create a pull request in GitHub. Request review from at least 2 engineers, one of whom must be a senior engineer. Address all review comments. Get approval from reviewers. Merge using squash-and-merge.',
 'Code Review Process'),
('00000000-0000-0000-0000-000000000007', 1,
 'Deployment Process: NovaTech uses a GitOps deployment model. All deployments are automated via GitHub Actions. Staging deploys automatically from the main branch after passing tests. Production deploys require a signed release tag. Emergency rollbacks: contact Priya Patel (Engineering Manager) at priya.patel@novatech.ai.',
 'Deployment Process'),
('00000000-0000-0000-0000-000000000007', 2,
 'Engineering Standards: Use conventional commits for commit messages. Write unit tests for all new functions with a minimum of 80 percent code coverage. Document public APIs with OpenAPI specifications. Run the full test suite before opening a pull request.',
 'Engineering Standards'),
('00000000-0000-0000-0000-000000000007', 3,
 'Tech Stack: Frontend with React, TypeScript, and Vite. Backend with Python FastAPI or Node.js Express. Infrastructure: AWS with EKS, RDS, and S3. CI/CD: GitHub Actions. Monitoring: Datadog and PagerDuty. Contact for Engineering Questions: Priya Patel, Engineering Manager, priya.patel@novatech.ai.',
 'Tech Stack and Contacts');
