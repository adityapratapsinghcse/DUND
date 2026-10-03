# DEGRADE — GitHub Repository Setup & Push Guide

This document provides step-by-step instructions for publishing this project to GitHub and orchestrating team collaboration.

---

## 1. Pre-Flight Checklist
Before pushing to remote:
- [x] Verify `.gitignore` ignores all virtual environments, `.env`, SQLite DB files, `node_modules`, and `.expo`.
- [x] Ensure no hardcoded secrets or credentials are tracked.
- [x] Ensure automated test suites pass.
- [x] All phases committed using Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

---

## 2. Git Configuration & Remote Setup

### Step A: Configure Git Identity (if not set)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step B: Create GitHub Repository
Create a new private repository on GitHub named `DEFENCE_SIH` (or `defence-sih`).
- **Do NOT initialize** with README, .gitignore, or license (these exist locally).

### Step C: Add Remote and Push
```bash
# Set primary branch to main
git branch -M main

# Add origin remote
git remote add origin https://github.com/<your-username>/DEFENCE_SIH.git

# Push main
git push -u origin main

# Create and push development branch
git checkout -b dev
git push -u origin dev
```

---

## 3. Team Collaboration Workflow
For all team members:
1. **Clone repository**:
   ```bash
   git clone https://github.com/<your-username>/DEFENCE_SIH.git
   cd DEFENCE_SIH
   git checkout dev
   ```
2. **Feature Branches**:
   Always branch off `dev`:
   ```bash
   git checkout -b feature/land-tactical-map
   ```
3. **Commit Convention**:
   - `feat:` New capability or UI screen
   - `fix:` Bug fix
   - `docs:` Documentation improvements
   - `chore:` Build scripts or dependency updates
4. **Pull Requests & Code Reviews**:
   - Open PRs against `dev` branch.
   - Run tests (`npm run test:web` and `python manage.py test`) before merging.
   - Merge `dev` into `main` after each verified milestone.
