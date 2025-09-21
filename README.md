# Shiksha Saathi

**Shiksha Saathi** is a multilingual, document-grounded campus chatbot designed to provide students instant, accurate, and accessible responses in their preferred language. Built for **Smart India Hackathon 2025**, it leverages a **Retrieval-Augmented Generation (RAG) pipeline** combined with modern LLMs to deliver context-aware, source-linked, and dynamically updated answers while maintaining security, accessibility, and continuous improvement.

---

## Project Status

* **Version:** 0.1.8
* **Current Maintainer:** [monojitgoswami69](https://github.com/monojitgoswami69)
* **Development Status:** Production-ready prototype
* **Last Updated:** September 21, 2025
* **Project Type:** Campus Chatbot (AI, Multilingual, RAG)
* **Target Event:** Smart India Hackathon 2025
* **Contact:** See GitHub profile

---

## Problem Statement

Campus offices handle hundreds of repetitive queries daily—fee deadlines, scholarship forms, timetable changes—often from students uncomfortable with English or official documentation. Students in rural or regional sectors frequently miss critical deadlines due to language barriers, while staff are burdened by repetitive queries.

**Shiksha Saathi** provides a **dynamic, multilingual, document-grounded solution** that delivers accurate, context-aware responses in the student’s preferred language, prevents misinformation, escalates ambiguous queries to humans, and ensures equitable access to official resources.

---

## Objectives

1. **Student-Centric:** Provide fast, reliable answers to students in English, Hindi, and regional languages.
2. **Accuracy & Trust:** Prevent misinformation through document-grounded retrieval and explicit source linking.
3. **Scalability:** Handle daily uploads of institutional PDFs and circulars dynamically.
4. **Accessibility:** Support visually/hearing-impaired and differently-abled students with voice and visual aids.
5. **Admin-Friendly:** Enable institutions to manage documents, queries, and analytics without coding knowledge.
6. **Continuous Improvement:** Collect and analyze query data to optimize content coverage, detect gaps, and retrain embeddings.

---

## Core Features

### 1. Multilingual Support

* English + Hindi + 3–5 regional languages in MVP.
* Automatic language detection with fallback to English.
* Easily extendable for new languages with minimal retraining.

### 2. Conversational Intelligence

* Multi-turn context with session limits.
* Intent recognition with **confidence thresholds** to trigger human fallback.
* Handles minor spelling, grammar, and semantic variations.

### 3. RAG-Based Retrieval & Hallucination Prevention

* Answers grounded in PDFs, circulars, and web pages.
* Dynamic ingestion pipeline for daily document uploads.
* Explicit source linking in responses.
* Semantic similarity checks prevent misretrieval.
* Low-confidence queries are flagged for human intervention.

### 4. Web Chat Widget

* Embeddable on college websites.
* Mobile-responsive, cross-browser tested (Chrome, Firefox, Edge, Safari).
* Accessibility: keyboard navigation, ARIA labels, high contrast, adjustable fonts.
* Source document links displayed alongside answers.

### 5. Scalable Backend

* Modular API architecture separating retrieval, embeddings, and LLM generation.
* Supports cloud LLMs (Gemini/OpenAI) and local embeddings.
* Async processing for multiple concurrent queries.
* Query caching for cost and latency optimization.

### 6. Admin Panel

* Role-based access per institution with encrypted credentials.
* Manual document upload with **approval workflow**.
* Document versioning, audit logs, and analytics dashboard.
* Dashboard metrics: top queries, low-confidence queries, repeated ambiguous queries.

### 7. Security & Privacy

* HTTPS + TLS 1.3; AES-256 encryption at rest.
* Query logs pseudonymized; retention period configurable.
* Human fallback for sensitive or ambiguous queries.

### 8. Accessibility Enhancements

* Text-to-speech for visually impaired students.
* High-contrast mode and adjustable fonts.
* Voice input for queries.
* Screen-reader compatibility.

### 9. Continuous Improvement

* Query logs analyzed for content gaps.
* Human-in-the-loop validation for updates.
* AI-based FAQ suggestions and recommended content updates.

### 10. Cost-Efficient & Scalable

* Hybrid local + cloud approach.
* Multi-tenant support for multiple institutions.
* Optimized cost per query with caching, batch embeddings, and async processing.

### 11. Differentiators

* Offline access to frequently queried documents for intermittent connectivity.
* Explainable AI: shows which source lines informed the answer.
* Multi-modal input: accepts text, PDF uploads, and screenshots.
* Proactive notifications via SMS/email/WhatsApp for deadlines.
* Emergency alerts for high-priority institutional announcements.

---

## Architecture & Flow Process

```
                         ┌────────────────────────┐
                         │  Institution Admin     │
                         │  Panel & Dashboard     │
                         └─────────┬──────────────┘
                                   │
                 Upload PDFs / View Analytics / Approve Documents
                                   │
                                   ▼
┌──────────────────────┐     ┌─────────────────────────────┐
│  Async Document      │     │  Vector DB / Embeddings     │
│  Preprocessing       │────▶│  (ChromaDB / FAISS)         │
│  Pipeline            │     │  Text Extraction & Indexing │
└──────────────────────┘     └─────────┬───────────────────┘
                                      │
                                      ▼
                               ┌───────────────────┐
                               │ RAG Retrieval     │
                               │ (FastAPI Backend) │
                               └─────────┬─────────┘
                                         │
                                         ▼
                               ┌───────────────────┐
                               │ LLM Response      │
                               │ Generation        │
                               │ (Gemini / OpenAI) │
                               └─────────┬─────────┘
                                         │
                                         ▼
                         ┌─────────────────────────┐
                         │  Web Chat Widget        │
                         │  (Student Interface)    │
                         └─────────┬───────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────────┐
                      │ Source-linked Answer /      │
                      │ Confidence Score / Human    │
                      │ Fallback Trigger            │
                      └─────────────────────────────┘
```

**Process Flow:**

1. Admin uploads PDFs/circulars; pipeline extracts and indexes content.
2. Embeddings stored in vector database (ChromaDB/FAISS).
3. Student submits query via web widget.
4. Backend retrieves relevant content, generates answer using LLM.
5. Response delivered with **source references**; low-confidence flagged for human fallback.
6. Query logged for analytics, continuous improvement, and FAQ optimization.

---

## Tech Stack

**Backend:** Python 3.12+, FastAPI, ChromaDB/FAISS, PyPDF2, sentence-transformers, LangChain<br> 
**Frontend:** React + Tailwind CSS, embeddable web chat widget<br>
**AI & NLP:** Gemini/OpenAI API, multilingual pipelines, RAG orchestration<br> 
**Hosting:** Vercel / GitHub Pages (frontend), Hugging Face Spaces / Google Cloud Run (backend), Docker containerization <br>
**Analytics:** Admin dashboard with query metrics, FAQ recommendations, and low-confidence alerts 

---

## Deployment Guidelines

1. **Frontend:** Host static React/Tailwind chat widget on Vercel or GitHub Pages.
2. **Backend:** Deploy FastAPI backend on Hugging Face Spaces, Google Cloud Run, or Docker container.
3. **Database:** ChromaDB or FAISS for embeddings; set up periodic backups.
4. **Document Ingestion:** Async pipeline for daily PDF uploads, preprocessing, and embedding generation.
5. **Monitoring:** Enable logging for query success rates, errors, and LLM response times.

---

## Contribution Guidelines

* Follow GitHub issue → PR workflow.
* All contributions must include **unit tests** for critical backend functionality.
* Code style: PEP8 for Python; ESLint + Prettier for frontend.
* Maintain modularity: separate retrieval, embedding, and LLM layers.
* For data or PDF changes, follow document approval workflow in admin panel.

---

## License

Under review; contact the maintainer via GitHub profile for inquiries.
