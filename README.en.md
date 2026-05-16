# Web3D Platform - 3D Model Generation & Management Platform

## 📋 Introduction

Web3D is a full-stack 3D model generation and management platform that integrates multiple AI 3D generation engines, providing an all-in-one solution from model generation, display, management to a website template engine. It supports **image-to-3D model generation**, **3D model gallery display**, **unified admin control**, and more.

---

## ✨ Core Features

### 🎨 3D Rendering & Display
| Feature | Description |
|:---|:---|
| **SPZ Progressive Rendering** | Supports 3D Gaussian Splatting SPZ format with progressive loading — renders while downloading for instant first-frame display |
| **Multi-format Support** | Compatible with glTF/GLB / SPZ / STL and other 3D formats |
| **Smart Centering Engine** | Automatically calculates model bounding boxes and adapts camera distance — no manual tuning required |
| **5 Orbit Modes** | Auto-rotation, manual drag, zoom, pan, and preset camera angles |
| **Product Label System** | 3D scene annotation with configurable label count and content via admin panel |

### 🤖 AI 3D Generation Engines
| Engine | Mode | Status |
|:---|:---|:---|
| **Tencent Hunyuan 3D** | Cloud API (Standard/Pro/Express) | ✅ Production Ready |
| **TripoSR** | CPU Procedural Generation / GPU Inference | ⚠️ CPU Fallback |
| **ImageToSTL** | CPU Image Relief Generation | ✅ Ready |
| **SF3D** | GPU Mode (Mock Ready) | 🚧 Pending Deployment |
| **InstantMesh** | GPU Mode (Mock Ready) | 🚧 Pending Deployment |

### 🏗️ Website Template Engine
| Feature | Description |
|:---|:---|
| **Page Template System** | Visual page layout editor supporting full-page, section, and component template types |
| **Slot Mechanism** | Each template contains multiple slots with independently configurable component types and parameters |
| **Navigation Menu Management** | Tree-based menu editor with multi-level support, template binding, and batch sorting |
| **Component Registry** | 9 built-in registered components with dynamic loading and lazy loading support |
| **Dual-mode Rendering** | Seamless switching between template mode (dynamic rendering) and legacy component mode (hardcoded pages) |

### 🛠️ Admin Dashboard
| Module | Features |
|:---|:---|
| **Dashboard** | System status overview, statistics |
| **Model Management** | Model list, upload, edit, delete, status control |
| **Template Management** | Template CRUD, slot management, publish/archive |
| **Navigation Menu** | Menu tree editing, template binding, sorting, visibility control |
| **User Management** | User list, role assignment, status management |
| **AI Generation** | Multi-engine generation, task queue, history |
| **System Settings** | Runtime mode switching, quota configuration, API key management |

### 🌐 Public Pages
| Page | Description |
|:---|:---|
| **Home** | 3D model carousel display, Hero section, feature entry points |
| **Model Gallery** | Card grid display with category filtering and search |
| **3D Workshop** | Immersive 3D scene display |
| **Model Upload** | File upload and AI 3D generation entry |
| **User Login** | JWT authentication |
| **Book Viewer / Book Gallery** | E-book reading experience |
| **Spark Editor** | Online 3D scene editing |

---

## 🏗️ Technology Stack

### Frontend Stack

| Layer | Technology |
|:---|:---|
| **Framework** | React 18 + TypeScript 6 + Vite 8 |
| **UI Components** | Ant Design 5 + @ant-design/icons |
| **3D Rendering** | Three.js (0.180) + threepipe + @react-three/fiber + @react-three/drei |
| **3DGS Rendering** | PlayCanvas + SuperSplat + @playcanvas/splat-transform |
| **Admin Framework** | Refine (4.x) + @refinedev/antd |
| **State Management** | Zustand 5 |
| **Animation** | @tweenjs/tween.js |
| **HTTP Client** | Axios |
| **Routing** | react-router-dom v7 |
| **Data Fetching** | @tanstack/react-query |
| **i18n** | Built-in Chinese/English |

### Backend Stack

| Layer | Technology |
|:---|:---|
| **Web Framework** | FastAPI (0.109) |
| **ASGI Server** | Uvicorn (0.27) |
| **ORM** | SQLAlchemy 2.0 (Async) |
| **Database** | SQLite (Dev) / PostgreSQL (Production) |
| **Migrations** | Alembic |
| **Authentication** | JWT (python-jose) + bcrypt (passlib) |
| **Validation** | Pydantic 2 + pydantic-settings |
| **Cloud SDK** | Tencent Cloud Official SDK |
| **Logging** | Loguru |
| **3D Processing** | Trimesh + numpy + Pillow + OpenCV |

---

## 📁 Project Structure

```
web3D/
├── backend/                          # Python Backend
│   ├── app/
│   │   ├── api/v1/                   # API Routes
│   │   │   ├── auth.py               # Authentication
│   │   │   ├── users.py              # User Management
│   │   │   ├── models.py             # 3D Model CRUD
│   │   │   ├── website.py            # Website Template System
│   │   │   ├── generation.py         # AI 3D Generation
│   │   │   ├── templates.py          # Render Templates
│   │   │   ├── experimental.py       # Experimental Features
│   │   │   ├── settings.py           # System Settings
│   │   │   └── quota.py              # Quota Management
│   │   ├── models/                   # SQLAlchemy Models
│   │   ├── schemas/                  # Pydantic Schemas
│   │   ├── services/                 # Business Logic
│   │   │   └── generation/           # AI Generation Services
│   │   ├── core/                     # Core Utilities
│   │   │   └── security.py           # JWT + Password
│   │   ├── config.py                 # Configuration
│   │   ├── database.py               # Database Connection
│   │   ├── dependencies.py           # Dependency Injection
│   │   └── main.py                   # Application Entry
│   ├── database/                     # Migrations
│   ├── uploads/                      # Upload Directory
│   ├── static/                       # Static Files
│   ├── .env                          # Environment Config
│   └── requirements.txt              # Python Dependencies
│
├── src/
│   └── web-frontend/                 # React Frontend
│       ├── src/
│       │   ├── admin/                # Admin Dashboard
│       │   │   ├── modules/
│       │   │   │   ├── dashboard/    # Dashboard
│       │   │   │   ├── model/        # Model Management
│       │   │   │   ├── template/     # Template Management
│       │   │   │   ├── user/         # User Management
│       │   │   │   ├── auth/         # Login
│       │   │   │   └── experimental/ # Experimental
│       │   │   ├── components/       # Shared Components
│       │   │   ├── layout/           # Layout
│       │   │   └── core/             # Admin Core
│       │   ├── core/template/        # Template Engine
│       │   │   ├── ComponentRegistry # Component Registry
│       │   │   ├── TemplateRenderer  # Template Renderer
│       │   │   ├── TemplateProvider  # Template Context
│       │   │   └── builtin/          # Built-in Components
│       │   ├── pages/                # Public Pages
│       │   │   ├── Home/             # Home Page
│       │   │   ├── Gallery/          # Model Gallery
│       │   │   ├── Workshop3D/       # 3D Workshop
│       │   │   ├── Upload/           # Model Upload
│       │   │   ├── Auth/             # Login
│       │   │   ├── BookViewer/       # Book Viewer
│       │   │   ├── BookGallery/      # Book Gallery
│       │   │   ├── Editor/           # 3D Editor
│       │   │   └── SuperSplat/       # SuperSplat
│       │   ├── components/3d/        # 3D Components
│       │   ├── types/               # TypeScript Types
│       │   ├── i18n/                 # Internationalization
│       │   └── stores/               # State Management
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/                            # Project Documentation
└── .vscode/                         # VS Code Config
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.11
- **npm** >= 9

### One-Click Start (Recommended)

```bash
# Windows
start.bat

# Mac/Linux
./start.sh
```

### Manual Setup

#### 1. Start Backend

```bash
cd backend

# Create virtual environment (first time)
python -m venv .venv

# Activate virtual environment
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend runs at **http://localhost:8000**，API docs at **http://localhost:8000/docs**

#### 2. Start Frontend

```bash
cd src/web-frontend

# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Start admin panel (optional)
npm run dev:admin
```

Frontend runs at **http://localhost:5173**

---

## 🔧 Configuration

### Environment Variables (`backend/.env`)

| Variable | Default | Description |
|:---|:---|:---|
| `HOST` | `0.0.0.0` | Backend listen address |
| `PORT` | `8000` | Backend port |
| `DEBUG` | `true` | Debug mode |
| `DATABASE_URL` | `sqlite+aiosqlite:///./web3d_test.db` | Database connection |
| `SECRET_KEY` | `your-secret-key` | JWT signing key |
| `HUNYUAN3D_MODE` | `mock` | Hunyuan 3D mode (mock/cloud) |
| `GENERATION_MODE` | `mock` | Generation mode (mock/cpu/gpu) |

### Generation Mode Switching

Configure in `backend/.env`:

```ini
# Mock mode (default, no GPU needed, for development/testing)
GENERATION_MODE=mock
HUNYUAN3D_MODE=mock

# Cloud mode (uses Tencent Hunyuan 3D API, requires SecretId/SecretKey)
GENERATION_MODE=mock
HUNYUAN3D_MODE=cloud
# VERSION_LIST=hy-3d-3.0,hy-3d-3.1,HY-3D-Express
```

---

## 🎯 API Overview

| Endpoint | Description | Auth |
|:---|:---|:---:|
| `GET /health` | Health check | No |
| `POST /api/v1/auth/login` | User login | No |
| `POST /api/v1/auth/register` | User registration | No |
| `GET /api/v1/models` | Model list (paginated) | Optional |
| `POST /api/v1/models` | Create model | Required |
| `POST /api/v1/generate` | AI 3D generation | Required |
| `GET /api/v1/nav-menus/flat` | Flat nav menu list | No |
| `GET /api/v1/nav-menus` | Tree nav menu structure | Optional |
| `GET /api/v1/website-templates` | Template list | Optional |
| `GET /api/v1/website-templates/{id}` | Template detail (with slots) | No |
| `POST /api/v1/website-templates` | Create template | Required |
| `PUT /api/v1/website-templates/{id}` | Update template | Required |
| `DELETE /api/v1/website-templates/{id}` | Delete template | Required |
| `POST /api/v1/website-templates/{id}/publish` | Publish template | Required |
| `GET /api/v1/website-templates/{id}/slots` | Template slot list | No |
| `POST /api/v1/website-templates/{id}/slots` | Add slot | Required |
| `GET /api/v1/components` | Registered component list | No |
| `GET /api/v1/users` | User list | Required |
| `GET /api/v1/settings` | System settings | Required |

---

## 🏗️ Website Template Engine Architecture

```
Nav Menu Management (Admin)
    │
    ▼
NavMenu (Tree Structure)
    ├── template_id ────→ WebsiteTemplate (Page Template)
    │                         ├── layout_config (Section Structure)
    │                         ├── theme_config (CSS Variables)
    │                         └── slots[] (Component Slots)
    │                               ├── slot_key (Slot Identifier)
    │                               ├── component_type (Component Type)
    │                               └── component_config (Component Config)
    │
    └── page_component ──→ Legacy Page (Hardcoded)

Frontend Rendering Pipeline:
    TemplateProvider (Load Template Data)
        ↓
    TemplateRenderer (Parse layout_config Sections)
        ↓
    ComponentRegistry (Lookup Component by type)
        ↓
    Built-in Components / Dynamic Lazy-loaded Pages
```

---

## 📜 License

MIT License

---

*Last updated: 2026-05-01*
