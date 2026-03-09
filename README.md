# PyroBI: Conversational Business Intelligence Platform

[![PyroBI Tech Demo](https://img.youtube.com/vi/fQJ8e8mZ7tI/maxresdefault.jpg)](https://youtu.be/fQJ8e8mZ7tI)
*Click above to watch the 10-minute technical demonstration video.*

PyroBI is a next-generation, high-performance web application designed to democratize data analytics. Built from the ground up, it allows non-technical users to ask natural-language questions about their datasets and instantly receive production-grade SQL queries, interactive visualizations, and deep AI-driven executive summaries.

The platform embraces a striking **Bauhaus design aesthetic**, prioritizing bold typography, geometric shapes, high-contrast primary colors, and smooth micro-animations to create an engaging and premium analytical experience.

---

## 🎨 Core Features & UX

### 1. The Data Connect Wizard (3-Step Animated Flow)
Reimagined data onboarding experience designed to make dropping a CSV exciting.
- **Step 1: Schema Overview:** Instantly parses the uploaded CSV using Pandas for sanitization (trimming whitespace, converting blanks to NULL) and loads it blazingly fast into an in-memory DuckDB engine. Users can actively edit the inferred data types using a drop-down menu that triggers real-time `ALTER TABLE` casting in the database.
- **Step 2: Intelligent Normalization:** Automatically profiles low-cardinality string columns to detect near-duplicate entities (e.g., `PNB Met Life` vs `PNB Metlife`). Uses advanced `WRatio` fuzzy-matching and a custom Acronym Detection engine (`ABSL` → `Aditya Birla Sun Life`) to group dirty data into "Auto-Merge" and "Manual Review" tiers.
- **Step 3: Data Preview:** Displays sample records from the sanitized dataset, ready for querying.

### 2. Conversational Agent Pipeline
A robust MoE (Mixture of Experts) style pipeline powered by the llama-3.3-70b-versatile API:
1. **Router Agent:** Analyzes the user's intent to classify the query type (Trend, KPI, Distribution, Comparison).
2. **SQL Generator Agent (Query Executor):** Translates natural language into dialect-specific DuckDB SQL. Enforces strict analytical rules for aggregations, ensuring entity rankings correctly use `GROUP BY` and calculating sophisticated metrics like CAGR (Compound Annual Growth Rate) exactly as a data analyst would.
3. **Chart Configurator (UI Config):** Examines the output DataFrame and designs an optimal Apache ECharts configuration tailored to the specific data structure.
4. **Insight Summarizer:** Produces a concise, 1-2 sentence AI insight to accompany the chart.
5. **Detailed Analyzer:** Generates an exhaustive report detailing Executive Summaries, Key Findings, Trends, and Recommendations.

### 3. Data Quality & DuckDB Profiling
- **Zero-LLM Anomaly Detection:** The backend runs native SQL queries to calculate missing/null percentages across all columns. Columns with >20% missing data are automatically flagged as anomalies and injected directly into the detailed analysis report for the user's awareness.

### 4. Interactive Reporting & Premium PDF Export
- **Session History:** Every query is automatically saved to a persistent Redis session store.
- **Report Builder:** Users can pin dynamic charts and data matrices to a side-panel report deck.
- **Premium PDF Generation:** Using `jsPDF` and `html2canvas`, the platform generates stunning, styled PDF documents. The engine proportionally scales ECharts snapshots, correctly calculates text wrapping for AI insights, and sequentially renders the entire Detailed Analysis report (spanning multiple pages if necessary) to create a board-ready output.

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
- **AI/LLM:** Groq(llama-3.3-70b-versatile)

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
- **Major UX Update:** Completely redesigned the initial Data Upload Tab. Replaced the basic dropzone with a premium, animated Bauhaus splash screen.
- **UX Update:** Replaced the static loading spinner with a staggered 3-Step animated state (Uploading → Analyzing → Profiling).
- **UX Update:** Implemented `SequentialReveal` flows to slide the Schema, Normalization, and Preview blocks onto the screen with custom delays.
- **Feature (Editable Schema):** Added a new `/update-column` backend endpoint and a frontend UI selector allowing users to dynamically cast column Data Types (e.g., VARCHAR to INTEGER) directly from the Data Tab before moving to the query screen.

### Version 1.7 (Cloud Deployment & Stateless Architecture)
- **Deployment:** Successfully deployed the split-stack architecture live to the internet (Frontend on Vercel, Backend on Render).
- **Architecture Fix (DuckDB Race Condition):** Re-engineered the upload pipeline to compute normalization suggestions and preview data inside the exact same `/upload-csv` API request. This eliminated a critical deployment race-condition where Render's dynamic multi-worker routing would cause subsequent GET requests to hit a different container with an empty database.
- **Configuration:** Implemented dynamic CORS origins (`allow_origins=["*"]`) and dynamic Vite API routing via `import.meta.env.VITE_API_BASE_URL`.
- **Dependency Management:** Resolved strict `pip` version resolution conflicts between `groq`, `langchain-groq`, and `rapidfuzz` that were blocking Render container builds.

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

