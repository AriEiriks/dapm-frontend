# 🖥️ DAPM – End-to-End Streaming Platform (Frontend)

This repository (`dapm-frontend`) contains the **web frontend** for the
DAPM end-to-end streaming process mining platform, developed as part of a
master's thesis.

The frontend provides a GUI for:

- Managing organizations and their configurations  
- Defining and inspecting streaming pipelines  
- Uploading and managing Processing Elements (PEs)  
- Interacting with the running end-to-end scenario

It communicates with one or more backend instances from
[`dapm-integration-platform`](https://github.com/DAPM-Thesis-25/dapm-integration-platform).

---

## 🧠 Prerequisites

- Node.js  
- npm   
- Git  
- Running backend instances from `dapm-integration-platform`

---

## 📁 Related Repositories

To use this frontend as intended in the thesis, you’ll typically also run:

- **Backend**  
  [`dapm-integration-platform`](https://github.com/DAPM-Thesis-25/dapm-integration-platform)  
  Per-organization backend (security, ingestion, pipeline execution).

- **Pipeline Library (previous work)**  
  [`dapm-pipeline`](https://github.com/DAPM-Thesis-25/dapm-pipeline)  
  Used by the backend as a pipeline/PE library.

- **Processing Elements – templates and examples**  
  [`processing-elements-templates`](https://github.com/DAPM-Thesis-25/processing-elements-templates)  
  Example/template PEs that can be built and installed for use in pipelines.

---

## ⚡ Quick run

```bash
git clone https://github.com/DAPM-Thesis-25/dapm-frontend.git
cd dapm-frontend
npm install           # or: yarn
npm run dev           # or: yarn dev
