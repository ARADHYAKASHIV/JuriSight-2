# JuriSight - AI-Powered Legal Document Analysis Platform

![Status](https://img.shields.io/badge/Status-Development-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-blue)
![Dependencies](https://img.shields.io/badge/Dependencies-Up%20to%20Date-brightgreen)

> **Transforming legal document analysis with the power of modern AI.**

---

JuriSight is a comprehensive legal document analysis platform that leverages advanced AI to help legal professionals analyze, understand, and manage legal documents with unprecedented efficiency and accuracy.

## 🏗 System Architecture

```mermaid
graph TD
    User([User]) <--> Frontend[Frontend - React/Vite]
    Frontend <--> Backend[Backend - Node/Express]
    Backend <--> DB[(PostgreSQL - Prisma)]
    Backend <--> Redis[(Redis - Caching)]
    Backend <--> OpenAI[OpenAI API - GPT-4]
    Backend <--> Gemini[Google Gemini API]
    
    subgraph "Data Flow"
    Backend -- "Embeddings" --> VectorSearch[Vector Semantic Search]
    Backend -- "Parsing" --> DocProcessing[Document Processing Pipeline]
    end
```

## 🚀 Features

### Core Functionality
- **AI-Powered Document Analysis**: Automatically extract key insights, summaries, and entities from legal documents
- **Intelligent Chat Interface**: Ask questions about your documents and get AI-powered answers with citations
- **Document Comparison**: Compare multiple documents to identify differences and similarities
- **Advanced Search**: Vector-based semantic search across document collections
- **Workspace Management**: Organize documents and collaborate with team members
- **Multi-format Support**: Process PDF, DOC, DOCX, and TXT files

### AI Capabilities
- **Document Summarization**: Generate concise summaries of complex legal documents
- **Entity Extraction**: Identify people, organizations, dates, amounts, and legal terms
- **Risk Assessment**: Highlight potential risks and important clauses
- **Question Answering**: Interactive Q&A with contextual responses
- **Document Insights**: Extract key points and critical information

### Security & Compliance
- **Enterprise-grade Security**: JWT authentication with refresh tokens
- **Role-based Access Control**: Admin, Manager, Analyst, and Viewer roles
- **Data Encryption**: Secure data transmission and storage
- **Audit Logging**: Comprehensive activity tracking and monitoring

## 🛠 Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for modern styling
- **React Query** for efficient data fetching
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL
- **JWT** for authentication
- **Winston** for logging
- **Multer** for file uploads

### AI Integration
- **OpenAI GPT-3.5/4** for document analysis
- **Google Gemini** as fallback AI service
- **Vector embeddings** for semantic search
- **Custom document processing** pipeline

### Infrastructure
- **Docker** containerization
- **PostgreSQL** (Neon cloud database)
- **Redis** for caching and sessions
- **Nginx** as reverse proxy
- **Docker Compose** for orchestration

## 📁 Project Structure

```
JuriSight/
├── apps/
│   ├── frontend/          # React frontend application (Vite, Tailwind, Shadcn/UI)
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Application pages
│   │   │   └── services/      # API services
│   └── backend/           # Node.js backend application (Express, Prisma)
│       ├── src/
│       │   ├── routes/        # API route handlers
│       │   ├── services/      # AI & Business logic
│       │   └── middleware/    # Auth & Validation
├── packages/              # Shared packages
│   └── types/             # Common TypeScript interfaces
├── prisma/               # Database schema and migrations
├── docs/                 # Detailed documentation
├── docker/               # Docker configuration files
├── docker-compose.prod.yml
├── nginx.conf
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL database
- OpenAI and/or Google Gemini API keys

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd JuriSight
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Variables**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# JWT Secrets
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

4. **Database Setup**
```bash
cd apps/backend
npx prisma generate
npx prisma db push
```

5. **Start Development Servers**

You can start both frontend and backend concurrently from the root directory:
```bash
npm run dev
```

Alternatively, run them separately:

**Backend:**
```bash
npm run dev:backend
```

**Frontend:**
```bash
npm run dev:frontend
```

### Production Deployment

1. **Build and Deploy with Docker**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

2. **Using the deployment script**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Document Endpoints
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/analyze` - Analyze document
- `GET /api/documents/:id/download` - Download document

### Chat Endpoints
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions/:id` - Get chat session
- `GET /api/chat/sessions/:id/messages` - Get messages
- `POST /api/chat/messages` - Send message
- `DELETE /api/chat/sessions/:id` - Delete session

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health status
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

## 🎯 Key Features Implemented

### ✅ Complete Feature Set
- [x] User authentication and authorization
- [x] Document upload and processing
- [x] AI-powered document analysis
- [x] Interactive chat interface
- [x] Document comparison
- [x] Vector-based search
- [x] Workspace management
- [x] Responsive design
- [x] Error handling and validation
- [x] Comprehensive logging
- [x] Performance optimization
- [x] Production deployment setup
- [x] Health monitoring
- [x] Security implementation

### 🔧 Technical Implementation
- [x] TypeScript throughout the stack
- [x] Prisma ORM with PostgreSQL
- [x] JWT authentication with refresh tokens
- [x] File upload with validation
- [x] AI integration (OpenAI + Gemini)
- [x] Vector embeddings for search
- [x] Docker containerization
- [x] Nginx reverse proxy
- [x] Redis for caching
- [x] Comprehensive error handling
- [x] Performance optimizations
- [x] Security best practices

## 🔒 Security Features

- **Authentication**: JWT-based with access and refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Input validation and sanitization
- **File Security**: File type validation and secure storage
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: CSRF, XSS, and other security headers
- **Audit Logging**: Comprehensive activity logging
- **Data Encryption**: Secure data transmission and storage

## 📊 Performance Optimizations

- **Frontend**: Code splitting, lazy loading, React Query caching
- **Backend**: Database query optimization, connection pooling
- **Infrastructure**: Nginx gzip compression, static file caching
- **AI Services**: Efficient prompt engineering and caching
- **Database**: Proper indexing and query optimization

## 🚀 Deployment Options

### Cloud Platforms
- **AWS**: ECS + RDS deployment configuration
- **Vercel**: Frontend deployment configuration
- **Railway**: Full-stack deployment
- **Docker Hub**: Container registry integration

### Self-Hosted
- **Docker Compose**: Complete stack deployment
- **Kubernetes**: Scalable container orchestration
- **Traditional VPS**: Manual deployment guides

## 📝 Development Workflow

1. **Code Style**: ESLint + Prettier configuration
2. **Type Safety**: Full TypeScript implementation
3. **Testing**: Jest setup for unit and integration tests
4. **CI/CD**: GitHub Actions workflows
5. **Monitoring**: Winston logging with multiple transports
6. **Error Tracking**: Comprehensive error handling

## 🗺 Project Roadmap

- [x] Phase 1: Core AI Analysis & Document Upload
- [x] Phase 2: RAG-based Chat & Semantic Search
- [/] Phase 3: Advanced UI Overhaul (Migrating to Shadcn/UI)
- [ ] Phase 4: Collaborative Workspaces & Team Features
- [ ] Phase 5: Advanced Analytics & Risk Benchmarking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛠 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify network connectivity

2. **AI API Issues**
   - Verify API keys are correct
   - Check API quotas and limits
   - Ensure proper environment variables

3. **File Upload Issues**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure proper file type validation

### Support

For support and questions:
- Check the [documentation](./docs/)
- Review the [deployment guide](./docs/DEPLOYMENT.md)
- Open an issue on GitHub

## 🎉 Acknowledgments

- OpenAI for GPT models
- Google for Gemini AI
- Prisma for excellent ORM
- The open-source community

---

**JuriSight** - Transforming legal document analysis with AI