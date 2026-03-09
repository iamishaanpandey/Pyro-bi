# PyroBI: Conversational Business Intelligence Platform

🔗 **Live Web App:** [https://pyro-bi.vercel.app/](https://pyro-bi.vercel.app/)

[![PyroBI Tech Demo](https://img.youtube.com/vi/fQJ8e8mZ7tI/maxresdefault.jpg)](https://youtu.be/fQJ8e8mZ7tI)
*Click above to watch the 10-minute technical demonstration video.*

PyroBI is a next-generation, high-performance web application designed to democratize data analytics. Built from the ground up, it allows non-technical users to ask natural-language questions about their datasets and instantly receive production-grade SQL queries, interactive visualizations, and deep AI-driven executive summaries.

The platform embraces a striking **Bauhaus design aesthetic**, prioritizing bold typography, geometric shapes, high-contrast primary colors, and smooth micro-animations to create an engaging and premium analytical experience.

---

## 🎨 Core Features & UX

### 1. Premium Data Connect Wizard
A high-end, 3-step onboarding flow designed for data quality.
- **Bauhaus Dropzone:** A striking, animated interface for CSV ingestion.
- **Interactive Schema Editor:** Real-time DuckDB schema management, allowing users to cast data types (e.g., Integer to Float) before analysis.
- **Intelligent Normalization:** Fuzzy-logic engine that detects and merges dirty data (e.g., "Met Life" vs "Metlife") using RapidFuzz and custom acronym detection.

### 2. Conversational Agent Pipeline
A multi-agent Mixture-of-Experts (MoE) pipeline powered by **Groq**:
- **Router Agent:** Classifies intent (KPI, Trend, Comparison).
- **SQL Generator:** Writes precise DuckDB-dialect SQL, including complex CAGR and window functions.
- **Chart Configurator:** Dynamically generates optimal Apache ECharts configurations.
- **Model Cascade:** Automatically falls back from `llama-3.3-70b` to secondary models if rate limits are hit.

### 3. Interactive Dashboard Grid
- **Dynamic Layout:** Built using `react-grid-layout`, allowing users to drag and resize charts into a custom analytical workspace.
- **Dashboard Chat:** A contextual AI sidebar that remembers the state of the dashboard, allowing for follow-up questions like "Now filter the whole dashboard by sector" across multiple widgets simultaneously.

### 4. Data Quality & DuckDB Profiling
- **Zero-LLM Anomaly Detection:** Native SQL profiling that identifies missing data, outliers, and data-type mismatches (>20% null flags) to protect analysis integrity.

### 5. Multi-User Cloud Security
- **Tenant Isolation:** Every user is uniquely identified via an anonymous browser fingerprint (X-User-ID), ensuring data is never leaked between sessions.
- **UUID Namespacing:** DuckDB tables are securely namespaced per-user to prevent collision and data overwrites.
- **OOM Protection:** Strict 15MB upload limits and query row-capping to ensure server stability on cloud platforms like Render.

### 6. Executive Reporting & Premium PDF Export
- **Cloud Persistence:** Powered by **Redis**, ensuring your saved sessions and reports survive cloud server restarts.
- **Styled PDF Engine:** Generates board-ready documents with proportional chart scaling, text-wrapped AI summaries, and multi-page layout logic.

---

## 🏗 Technology Stack

**Frontend (Client)**
- **Framework:** React 18 + Vite (JavaScript)
- **State Management:** Zustand (Session store, Report store)
- **Styling:** Custom Vanilla CSS tailored to a strict Bauhaus design system
- **Visualization:** Apache ECharts (`echarts`, `echarts-for-react`)
- **Document Export:** `jspdf`, `html2canvas`

**Backend (Server)**
- **Framework:** FastAPI (Python 3.10+)
- **Database Engine:** DuckDB (In-memory analytical processing)
- **Data Engineering:** Pandas (Data cleansing and type coercion)
- **String Matching:** RapidFuzz (Token-based and WRatio entity normalization)
- **Caching & Sessions:** Redis
- **AI/LLM:** Groq (**Model Cascade**: `llama-3.3-70b` → `llama-3.1-70b` → `mixtral-8x7b`)

---

## 📜 Development History & Changelog

### Version 1.0 (Initial Architecture)
- Defined the core full-stack project structure separating `/frontend` and `/backend`.
- Built the foundational FastAPI backend and the multi-agent pipeline (`pipeline.py`, `query_executor.py`, etc.).
- Created the React frontend with a functional Dashboard, DynamicChart renderer, and a Bauhaus-themed CSS engine.
- Implemented DuckDB for rapid, in-memory SQL execution over uploaded CSV files.
- Added Redis backing for session tracking and history recall.

### Version 1.1 (Detailed Analysis & UI Polish)
- Added the `DetailedAnalyzer` agent to provide in-depth textual analysis behind the charts.
- Built a sliding `RightSidebar` in the frontend containing complete Chat History and a dynamic Report Builder.
- Introduced the `Save to Report` feature allowing users to stitch together multiple queries into a single PDF deck.

### Version 1.2 (Fuzzy Normalization & Data Cleansing)
- **Backend:** Built `fuzzy_normalizer.py` using RapidFuzz. Initially used `token_sort_ratio` to find matching entity names.
- **Frontend:** Added the `NormalizationPanel.jsx` to let users review and apply fuzzy matches before querying.
- **Feature:** Introduced pandas-based CSV sanitization to handle blank spaces, whitespace trimming, and bad formatting automatically on upload.

### Version 1.3 (AI Prompt Tuning & SQL Accuracy)
- **Fix:** AI struggling with CAGR metrics. Hardcoded an explicit mathematical AAGR/CAGR strategy into the SQL Generator prompt `ROUND((POWER(MAX/MIN, 1/(n-1))-1)*100, 2)`.
- **Optimization:** Tokens were being wasted. Slashed the dataset sample sizes sent to the `ui_config` and `insight_summarizer` agents by 75%, vastly improving response times while retaining high quality.
- **Feature:** Shifted anomaly detection strictly to DuckDB SQL parsing, injecting findings (like null percentages) into the LLM context seamlessly.

### Version 1.4 (Fuzzy Logic Overhaul)
- **Fix:** `token_sort_ratio` was too strict for Indian Life Insurance entities (scoring "PNB Met Life" vs "PNB Metlife" at only 60%).
- **Enhancement:** Switched algorithm to `WRatio` and lowered the manual review threshold to 75%.
- **Enhancement:** Built a custom Python functional acronym detector to accurately catch abbreviations like `ABSL` evaluating natively to `Aditya Birla Sun Life` with a 96% match score.

### Version 1.5 (Report Presentation Upgrade)
- **Fix:** PDF exports were squashing chart images into rigid height boxes.
- **Fix:** AI Insight text strings were overflowing the alert boxes in the generated PDF.
- **Enhancement:** Implemented proportional image scaling via `doc.getImageProperties()`. Reordered font application before calculating line-breaks using `doc.splitTextToSize()`.
- **Feature:** Wired the Detailed Analysis data structure into the PDF loop, allowing the renderer to dynamically print Executive Summaries and Recommendations across automatically generated new pages.
- **UX Fix:** Pinned the `ReportPanel` Action Bar (Download Button) to the bottom of the scrollable list via CSS `position: sticky`.

### Version 1.6 (Premium Data Onboarding Launch)
- **UX Update:** Completely redesigned the initial Data Upload Tab with a premium, animated Bauhaus splash screen.
- **UX Update:** Replaced static loading with a staggered 3-Step animated state (Uploading → Analyzing → Profiling).
- **UX Update:** Implemented `SequentialReveal` flows for Schema, Normalization, and Preview blocks.
- **Feature (Editable Schema):** Added `/update-column` endpoint and frontend selector for dynamic Data Type casting.

### Version 1.7 (Cloud Hardening & "Erdis" Launch)
- **Deployment:** Successfully deployed to Vercel (Frontend) and Render (Backend).
- **Persistence:** Refactored architecture to prioritize **Cloud Redis** (Upstash) for session storage.
- **Security:** Implemented anonymous **Browser Fingerprinting** (X-User-ID) for multi-user isolation.
- **Stateless Stability:** Resolved Render multi-worker race conditions by bundling normalization logic into the upload request.
- **Safety:** Enforced a **15MB upload limit** and model-capping to prevent OOM errors.

### Version 1.8 (Interactive Dashboard & Grid Launch)
- **UI Architecture:** Migrated from a 2-tab layout to a **3-tab "Command Center"** (Data → Query → Dashboard).
- **Interactive Grid:** Integrated `react-grid-layout`, enabling users to build custom, persistent dashboard layouts via drag-and-drop.
- **Contextual Memory:** Enhanced the AI pipeline to support "Dashboard Chat," allowing for seamless follow-up filters across multiple dashboard widgets.
- **Visual Polish:** Added real-time resizing and squish-protection for ECharts within the grid system.

---

## 🚀 Quick Start (Local)

1. **Clone & Setup Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8001
   ```

2. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev -- --port 5174
   ```

3. **Docker (One-Click)**:
   ```bash
   docker-compose up --build
   ```

---

## ☁️ Cloud Deployment Architecture & Challenges

Deploying a stateful analytical platform to stateless cloud environments (Vercel + Render Free Tier) presented several unique physical constraints that required architectural pivots from the local development version:

1. **The Multi-Worker "Amnesia" Bug (Race Conditions):** 
   - *Local:* The frontend made sequential API calls (`Upload` → `Get Preview` → `Get Normalizations`). It worked perfectly because local `uvicorn` runs 1 worker process that shares memory perfectly.
   - *Cloud:* Render dynamically routes requests. The `Upload` POST went to Worker A, which loaded the CSV into its memory. The immediate `Get Normalizations` GET request was routed to Worker B, which had empty memory and returned zero results.
   - *Solution:* Bundled the normalization and preview computations directly into the `POST /upload-csv` response, completely eliminating the race condition.

2. **Strict Dependency Resolution on Blank Slates:**
   - *Local:* Packages installed iteratively over days work fine.
   - *Cloud:* Render builds a pristine OS container on every deploy and strictly follows `requirements.txt`. A strict version pin conflict (`langchain-groq` vs `groq==1.0.0`) combined with a missing `rapidfuzz` entry caused complete 500 build failures.
   - *Solution:* Relaxed version constraints to allow `pip` to resolve the dependency graph dynamically during the Render build phase.

3. **Ephemeral Memory & Filesystems:**
   - Render free-tier instances sleep after 15 minutes of inactivity. When they wake up, the RAM is dumped and the local filesystem is wiped. 
   - *Impact:* Uploaded CSVs and saved user sessions (currently stored in `sessions.json`) are automatically cleared between sleeps. This makes the platform excellent for secure, stateless "drop and analyze" sessions, but requires upgrading to AWS S3 / Postgres for permanent multi-day storage.

4. **Multi-User Data Collision (Global State):**
   - *Challenge:* Because there is no database schema separating users, if User A and User B both uploaded `sales.csv` simultaneously, User B would overwrite User A's table in the global DuckDB engine memory.
   - *Solution (Anonymous UUID Authentication):* The React frontend generates a unique `pyro_user_id` stored in `localStorage` and strictly attaches it as an `X-User-ID` header on all Axios requests. The backend creates a secure namespace by appending this UUID to DuckDB tables (e.g., `tbl_8chars_4_4_4_12_sales`), entirely hiding User A's data and session history from User B.
   - *Solution (UI Alias Stripping):* To prevent the ugly 36-character UUID from exposing backend architecture in the frontend UI or polluting the LLM's natural language queries, a secondary middleware layer uses strict Regex to clean and alias the strings before they hit the screen (`India Life Insurance Claims` instead of `tbl_8chars...`).

5. **OOM (Out-of-Memory) Server Crashes:**
   - *Challenge:* Render Free Tier provides limited RAM. A single massive CSV upload could instantly exhaust the server's memory, crashing the service for all users.
   - *Solution:* Built a FastApi memory-stream chunker into the `/upload-csv` endpoint that strictly enforces a 15MB file size limit, instantly rejecting oversized payloads with a `413 Error` before the bytes can hit the DuckDB ingestion engine.

