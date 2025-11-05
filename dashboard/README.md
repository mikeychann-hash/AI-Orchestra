# AI Orchestra Dashboard

Real-time monitoring and management dashboard for AI Orchestra multi-agent development pipeline.

## Features

- **Pipeline Trigger** - Upload feature specifications and start pipeline runs
- **Live Log Viewer** - Real-time streaming of pipeline execution logs
- **Artifact Viewer** - Browse and download generated code and reports
- **Status Dashboard** - Monitor QA iterations, debug cycles, and quality scores
- **Modern UI** - Built with Next.js 14, React 18, and Tailwind CSS

## Quick Start

### Installation

```bash
cd dashboard
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:

```env
ORCHESTRATOR_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=AI Orchestra Dashboard
```

### Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Usage

### 1. Upload Feature Specification

Click the upload area in the "Pipeline Trigger" card and select a JSON feature specification file. Example:

```json
{
  "id": "feature-001",
  "name": "User Authentication",
  "description": "Login and registration system",
  "type": "full-stack",
  "frontend": {
    "enabled": true,
    "components": [
      {
        "name": "LoginForm",
        "description": "User login form",
        "type": "form"
      }
    ],
    "styling": "tailwind"
  },
  "backend": {
    "enabled": true,
    "endpoints": [
      {
        "method": "POST",
        "route": "/api/auth/login",
        "description": "User login endpoint"
      }
    ],
    "framework": "express"
  }
}
```

### 2. Run Pipeline

After uploading a feature spec, click the "Run Pipeline" button. The dashboard will:

1. Validate the feature specification
2. Start the pipeline execution
3. Begin streaming logs in real-time
4. Display generated artifacts as they're created

### 3. Monitor Progress

The status dashboard shows:

- **Pipeline Status** - Running, Completed, or Failed
- **QA Iterations** - Number of QA review cycles
- **Debug Cycles** - Number of debug attempts
- **QA Score** - Final quality score (0-10)

### 4. View Logs

The Live Logs tab displays:

- Timestamp for each log entry
- Log level (info, warn, error)
- Pipeline stage (frontend, backend, qa, debug)
- Detailed log messages

### 5. Download Artifacts

The Artifacts tab allows you to:

- View generated code inline
- Download individual artifacts
- See which stage generated each artifact
- Browse all generated files

## Architecture

```
dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── pipeline/       # Pipeline management
│   │   │   │   ├── run/        # Start pipeline
│   │   │   │   └── [runId]/    # Get logs and artifacts
│   │   │   └── health/         # Health check
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main dashboard page
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── tabs.tsx
│   │   ├── PipelineTrigger.tsx
│   │   ├── LogViewer.tsx
│   │   ├── ArtifactViewer.tsx
│   │   └── StatusDashboard.tsx
│   └── lib/                    # Utilities
│       └── utils.ts
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

## API Endpoints

### Start Pipeline

```http
POST /api/pipeline/run
Content-Type: application/json

{
  "featureSpec": {
    "id": "feature-001",
    "name": "My Feature",
    ...
  }
}
```

Response:

```json
{
  "success": true,
  "runId": "run-1234567890-abc123",
  "message": "Pipeline started successfully"
}
```

### Get Logs

```http
GET /api/pipeline/{runId}/logs
```

Response:

```json
{
  "success": true,
  "logs": [
    {
      "timestamp": 1234567890000,
      "level": "info",
      "stage": "frontend",
      "message": "Generating React component..."
    }
  ],
  "status": {
    "status": "running",
    "qaIterations": 1,
    "debugIterations": 0
  }
}
```

### Get Artifacts

```http
GET /api/pipeline/{runId}/artifacts
```

Response:

```json
{
  "success": true,
  "artifacts": [
    {
      "type": "component",
      "stage": "frontend",
      "content": "import React from 'react'...",
      "path": "./artifacts/component.tsx"
    }
  ]
}
```

## Development

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Radix UI primitives
- **Icons**: Lucide React
- **Type Safety**: TypeScript

### Adding New Features

1. Create component in `src/components/`
2. Add API route in `src/app/api/`
3. Update main page to integrate the feature
4. Test with feature specifications

### Customization

Edit `tailwind.config.ts` to customize colors, fonts, and spacing:

```typescript
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: 'hsl(221, 83%, 53%)' },
      // ... more colors
    },
  },
}
```

## Docker Deployment

See the main project's `docker-compose.yml` for deploying the dashboard alongside the orchestrator and Ollama services.

## Troubleshooting

### Dashboard won't start

- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check for port conflicts (default: 3000)

### Can't connect to orchestrator

- Verify `ORCHESTRATOR_URL` in `.env`
- Ensure the orchestration service is running on port 8000
- Check network connectivity

### Logs not updating

- Check browser console for errors
- Verify the pipeline run ID is valid
- Ensure API routes are responding

## License

MIT
