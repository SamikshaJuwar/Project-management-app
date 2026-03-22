# 🔐 GitHub Personal Access Tokens (PAT) – Permissions Guide

This document explains the differences between **Fine-Grained Tokens** and **Classic Tokens** in GitHub, including their access scope, permissions, and use cases.

---

## 🆕 Fine-Grained Personal Access Tokens (Recommended)

Fine-grained tokens are the **modern and secure** way to access GitHub APIs. They follow the principle of **least privilege**.

### ✅ Key Characteristics

- Scoped to **specific repositories or organizations**
- Granular permission control (read/write/admin per resource)
- Built-in expiration (mandatory)
- Better auditability and security
- Cannot access everything by default

---

## 🔑 Fine-Grained Token Permissions

Permissions are divided into **Repository Permissions** and **Account Permissions**

---

### 📦 Repository Permissions

| Permission | Description |
|----------|------------|
| Actions | Manage GitHub Actions workflows |
| Administration | Full control over repo settings |
| Checks | Read/write check runs |
| Contents | Read/write code, commits, branches |
| Deployments | Manage deployments |
| Discussions | Manage discussions |
| Issues | Read/write issues |
| Metadata | Read-only repo metadata (always enabled) |
| Packages | Manage GitHub Packages |
| Pages | Manage GitHub Pages |
| Pull Requests | Manage PRs |
| Repository Security Advisories | Manage security advisories |
| Secrets | Manage repository secrets |
| Variables | Manage GitHub Actions variables |
| Webhooks | Manage webhooks |

---

### 👤 Account Permissions

| Permission | Description |
|----------|------------|
| Email Addresses | Read user email |
| Followers | Read followers |
| GPG Keys | Manage GPG keys |
| SSH Keys | Manage SSH keys |

---

### 🎯 Scope Control

- Can be restricted to:
  - Single repository
  - Multiple selected repositories
  - Entire organization (limited)
- Cannot access repos outside selected scope

---

### ⏳ Expiration

- Mandatory expiration (e.g., 7 days, 30 days, custom)
- Improves security automatically

---

## ⚠️ Classic Personal Access Tokens (Legacy)

Classic tokens are **older and broader** in access. They are still used but **not recommended for new systems**.

---

### ❗ Key Characteristics

- Broad access across **all repositories**
- Scope-based (not resource-based)
- No fine-grained control
- Optional expiration (can be permanent → risky)

---

## 🔑 Classic Token Scopes

---

### 📦 Repository Scopes

| Scope | Description |
|------|------------|
| repo | Full control of private repositories |
| repo:status | Access commit status |
| repo_deployment | Access deployments |
| public_repo | Access public repositories |
| repo:invite | Accept/decline repo invites |

---

### 🔐 Workflow & Packages

| Scope | Description |
|------|------------|
| workflow | Update GitHub Actions workflows |
| write:packages | Upload packages |
| read:packages | Download packages |
| delete:packages | Delete packages |

---

### 👤 User Scopes

| Scope | Description |
|------|------------|
| user | Full user profile access |
| read:user | Read user profile |
| user:email | Access user emails |
| user:follow | Follow/unfollow users |

---

### 🏢 Organization Scopes

| Scope | Description |
|------|------------|
| admin:org | Full org control |
| read:org | Read org data |
| write:org | Modify org data |

---

### 🔑 Security & Admin

| Scope | Description |
|------|------------|
| admin:repo_hook | Manage repo webhooks |
| write:repo_hook | Write repo hooks |
| read:repo_hook | Read repo hooks |
| admin:org_hook | Manage org hooks |
| gist | Access gists |
| notifications | Access notifications |

---

## 🔍 Key Differences

| Feature | Fine-Grained Token | Classic Token |
|--------|------------------|--------------|
| Scope Control | Repository-level | Account-wide |
| Permission Type | Resource-based | Scope-based |
| Security | High | Lower |
| Expiration | Mandatory | Optional |
| Recommended | Yes | No (Legacy) |
| Access Limitation | Strict | Broad |

---

## 🧠 When to Use What?

### ✅ Use Fine-Grained Tokens When:
- Building SaaS / apps
- Need repo-specific access
- Security is critical
- Multi-client architecture

---

### ⚠️ Use Classic Tokens When:
- Legacy integrations
- APIs not supported by fine-grained tokens
- Quick testing (not production)

---

## 🚀 Recommendation for Your System

Use **Fine-Grained Tokens**

### Suggested Permissions:
- Contents → Read/Write
- Issues → Read/Write
- Pull Requests → Read/Write
- Metadata → Read
- Webhooks → (if needed)

---

## 🔐 Best Practices

- Always use **minimum required permissions**
- Set **short expiration**
- Rotate tokens regularly
- Never expose tokens in frontend
- Store securely (e.g., environment variables, secret manager)
