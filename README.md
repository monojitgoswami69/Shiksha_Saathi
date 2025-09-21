**Project Status**

- **Version:** 0.1.0
- **Current Maintainer:** [monojitgoswami69](https://github.com/monojitgoswami69)
- **Development Status:** Developing MVP
- **Last Updated:** September 6, 2025
- **Project Type:** Campus Chatbot (AI, Multilingual, RAG)
- **Target Event:** Smart India Hackathon 2025
- **Contact:** See GitHub profile for details

<hr>

# Shiksha Saathi

**Shiksha Saathi** is a language-agnostic campus chatbot designed for Smart India Hackathon 2025. It provides instant, 24/7 support to students in multiple regional languages using a Retrieval-Augmented Generation (RAG) model for document-grounded, accurate responses.

## Problem Statement

Campus offices handle hundreds of repetitive queries daily—fee deadlines, scholarship forms, timetable changes—often from students more comfortable in Hindi or other regional languages. This creates communication gaps and strains both staff and learners. Shiksha Saathi aims to deflect routine inquiries, freeing staff for complex tasks and providing students with equitable, round-the-clock information access.


## Key Features

- **Multilingual Design:** Built to support countless regional languages with minimal setup and training. Easily extendable to new languages as needed.

- **Conversational Intelligence & Intent Recognition:** Understands user context and intent, providing accurate answers in the user's preferred language. Maintains multi-turn context for natural conversations.

- **RAG Retrieval & Hallucination Prevention:** Answers are grounded in institutional documents (PDFs, circulars, web pages) with confidence scores. Prevents hallucinations and triggers human handoff when confidence is low, based on configurable thresholds.

- **Web Chat Widget:** Easily integrable into any website with minimal frontend setup. Mobile-responsive and accessible for all users.

- **Scalable Backend:** Modular API design, supporting both local LLMs and cloud-hosted models for flexible, scalable deployment.

- **Admin Panel for Backend Management:** Each institution receives unique credentials for secure access. Admins can manage their own encrypted databases, upload documents, and control bot behavior through a user-friendly interface.

- **No-Code Maintenance:** Admin panel enables non-technical staff or student volunteers to maintain and update the bot without coding. The bot can automatically crawl institutional websites and sublinks to update its database nightly or on demand, while remaining functional for users. Manual PDF/circular upload is also supported for rapid updates.

- **Advanced Admin Features:** Includes student query logging, human handoff answering, and automated AI-based suggestions (e.g., most asked queries, confusion hotspots, recommended content updates).

- **Security & Privacy:** All institutional data and student chat logs are securely encrypted. Database contents use industry-standard encryption for maximum protection.

- **Low-Cost Infrastructure:** Utilizes free open-source LLMs and low-cost cloud/server setups. Designed to minimize annual costs for institutions (estimated cost per year available on request).

- **Accessibility Aids:** Audio/visual features to support handicapped users, ensuring inclusive access for all students.

- **Continuous Improvement:** Automated analytics and feedback loops help institutions identify common queries, improve content, and enhance student satisfaction.

<hr>

## MVP Version Overview

The current MVP (Minimum Viable Product) version of Shiksha Saathi is focused on rapid prototyping and core functionality validation. It is designed for basic testing and demonstration purposes, with the following features:

- **Basic Conversation:** Supports simple, natural language chat with users in English, Hindi, and Bengali.
- **Intent Recognition & Context Maintenance:** Maintains context across multiple turns and recognizes user intent for more relevant responses.
- **RAG Retrieval (Static):** Answers are grounded in static test files and PDFs using a basic RAG pipeline. No database storage is implemented yet; all knowledge is loaded from provided documents at startup.
- **No Admin Panel:** The MVP does not include an admin panel or backend management features.
- **Web Chat Widget:** Easily integrable into any website for basic conversational testing.
- **Free API Integration:** Uses a free, rate-limited API for LLM processing, restricting usage to basic testing and demonstration only.
- **Manual Document Setup:** Institutional documents must be manually loaded for each test; no automated crawling or updating is available in the MVP.
- **No Analytics or Logging:** The MVP does not log queries or provide analytics features.

## Architecture Diagram

Below is a flowchart representation of the Shiksha Saathi MVP:

```
User Device (Browser/Mobile)
	│
	▼
Web Chat Widget (HTML/JS/CSS)
	│
	▼
FastAPI Backend (Python)
	│
	▼
RAG Module (ChromaDB, PDF Loader, Embeddings)
	│
	▼
LLM API (Free Tier: Together AI / Hugging Face)
	│
	▼
Response to User (Preferred Language)
```

**Flow:**
- User interacts with the chat widget on the website.
- Widget sends queries to the FastAPI backend.
- Backend uses RAG module to retrieve answers from static PDFs and test files.
- LLM API is called for language understanding and generation.
- Response is sent back to the user in their preferred language.

## MVP Tech Stack

The following technologies, libraries, and services are required for the MVP implementation:

**Backend:**
- Python 3.12+
- FastAPI (web framework)
- ChromaDB (vector database)
- PyPDF2 (PDF text extraction)
- sentence-transformers (embeddings)
- LangChain (RAG orchestration)

**Frontend:**
- HTML5, CSS3, JavaScript (vanilla)
- Web chat widget (custom, embeddable)

**AI & NLP:**
- Together AI API (free tier, multilingual LLM)
- Hugging Face API (alternative LLM provider)

**Hosting & Deployment:**
- Vercel or GitHub Pages (frontend static hosting)
- Hugging Face Spaces or Google Cloud Run (backend hosting, free tier)
- Docker (containerization for backend)

## MVP Feature Checklist

- [x] Initial project setup (repository, environment, dependencies)
- [ ] Basic UI/UX design for chat widget
- [ ] Sample institutional document preparation
- [ ] Basic conversation in English, Hindi, Bengali
- [ ] Intent recognition and context maintenance
- [ ] RAG retrieval from static test files and PDFs
- [ ] Web chat widget integration
- [ ] Manual document setup
- [ ] Free, rate-limited API integration for LLM
- [ ] Testing and validation of conversation flow
- [ ] Documentation for setup and usage
- [ ] Deployment instructions (local/cloud)
- [ ] Feedback collection mechanism for MVP users

## Getting Started

This section will be published once the MVP is complete. It will contain step-by-step instructions for cloning the repository, installing dependencies, setting up the environment, and running the project for development and testing.

## Running the MVP Locally

Detailed local run instructions (commands, environment variables, example data) will be provided after MVP completion. For now, the MVP is under active development and these instructions will be added when the runnable artifacts and `requirements.txt` are finalized.

## Contributions

Contribution guidelines, code of conduct, and PR workflow will be documented after the MVP is stable. If you want to contribute during development, please open an issue to discuss proposed changes.

## License

The project's license information will be added once the core MVP is finalized and a license is chosen. For now, consider the project to be under review for licensing and contact the maintainer via the GitHub profile for any questions.
