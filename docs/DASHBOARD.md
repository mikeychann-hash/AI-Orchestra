# FusionForge Dashboard - Complete Guide

Comprehensive guide to the AI Orchestra FusionForge Web Dashboard.

## Overview

The FusionForge Dashboard is a modern, real-time web interface for monitoring and controlling the AI Orchestra system. Built with Next.js 14, it provides a beautiful, responsive UI for managing multi-LLM orchestration.

## Architecture

### Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Real-time Communication**: WebSocket
- **Icons**: Lucide React

### Directory Structure

```
dashboard/
├── app/                    # Next.js app directory
│   ├── page.tsx            # Home/Overview page
│   ├── build/              # Build pipeline page
│   ├── logs/               # Agent logs page
│   ├── artifacts/          # Artifacts browser
│   ├── agents/             # Agent management
│   ├── system/             # System status
│   ├── config/             # Configuration page
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard-layout.tsx
│   ├── sidebar.tsx
│   └── header.tsx
├── lib/                    # Utilities
│   ├── api.ts              # API client
│   ├── store.ts            # Zustand store
│   └── utils.ts            # Helper functions
├── hooks/                  # React hooks
│   └── useWebSocket.ts     # WebSocket hook
└── types/                  # TypeScript types
    └── index.ts
```

## Features

### 1. Overview Page

**Path**: `/`

Displays system-wide metrics and status:

- Active builds count
- Provider status
- Success rates
- System uptime
- Recent activity feed
- Quick stats cards

### 2. Build Pipeline

**Path**: `/build`

Interactive interface for triggering LLM queries:

- **Configuration Panel**:
  - Prompt input (multiline textarea)
  - Provider selection (OpenAI, Grok, Ollama)
  - Model selection
  - Temperature slider (0-2)
  - Max tokens input

- **Build Output**:
  - Real-time status updates
  - Streaming responses
  - Token usage statistics
  - Error handling

- **Build History**:
  - Previous builds list
  - Status badges
  - Duration metrics

### 3. Agent Logs

**Path**: `/logs`

Real-time log viewer with filtering:

- **Features**:
  - Live log streaming via WebSocket
  - Filter by log level (info, warn, error, debug)
  - Agent-specific filtering
  - Timestamp display
  - Metadata viewer
  - Clear logs button

- **Log Levels**:
  - Info: General information (green)
  - Warn: Warnings (yellow)
  - Error: Errors (red)
  - Debug: Debug information (blue)

### 4. Artifacts

**Path**: `/artifacts`

Browse generated files and reports:

- File type indicators
- Size display
- Creation timestamps
- Download buttons
- Artifact types:
  - Files
  - Reports
  - Patches
  - Logs

### 5. Agents

**Path**: `/agents`

Monitor autonomous agents:

- Agent status (idle, active, error)
- Current tasks
- Tasks completed count
- Last activity timestamp
- Agent types:
  - Frontend
  - Backend
  - QA
  - Debugger
  - Coordinator

### 6. System

**Path**: `/system`

System health and configuration:

- Connection status
- System uptime
- Environment info
- Version number
- Available models per provider
- Provider configuration
- Load balancing strategy

### 7. Configuration

**Path**: `/config`

Manage system settings:

- Provider enable/disable
- Default provider selection
- Load balancing strategy
- Log level configuration
- GitHub integration toggle
- Fallback settings

## State Management

### Zustand Store

The dashboard uses Zustand for global state management:

```typescript
interface DashboardStore {
  // System
  systemStatus: SystemStatus | null;

  // Agents
  agents: Agent[];

  // Logs
  logs: AgentLog[];
  filterLogLevel: 'all' | 'info' | 'warn' | 'error' | 'debug';

  // Builds
  builds: Build[];
  currentBuild: Build | null;

  // Artifacts
  artifacts: Artifact[];

  // WebSocket
  isConnected: boolean;

  // UI
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
}
```

### Actions

- `setSystemStatus()`: Update system status
- `addLog()`: Add new log entry
- `addBuild()`: Add new build
- `updateBuild()`: Update build status
- `addArtifact()`: Add new artifact
- `setIsConnected()`: Update WebSocket connection status

## WebSocket Integration

### Connection Management

The `useWebSocket` hook manages real-time connections:

```typescript
const { isConnected, sendMessage, reconnect } = useWebSocket({
  onMessage: handleWebSocketMessage,
  onOpen: () => setIsConnected(true),
  onClose: () => setIsConnected(false),
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});
```

### Message Types

| Type | Description | Data |
|------|-------------|------|
| `log` | New log entry | AgentLog |
| `status` | System status update | SystemStatus |
| `build` | Build lifecycle event | Build |
| `agent` | Agent status change | Agent |
| `artifact` | New artifact created | Artifact |

### Automatic Reconnection

- Attempts reconnection on disconnect
- Exponential backoff (3s default)
- Max 5 attempts
- Visual connection indicator in header

## API Integration

### REST Endpoints

```typescript
// Health check
GET /health

// System status
GET /api/status

// Providers
GET /api/providers

// Models
GET /api/models

// Query LLM
POST /api/query

// Stream query
POST /api/stream
```

### API Client

```typescript
import { api } from '@/lib/api';

// Get system status
const status = await api.getStatus();

// Query LLM
const result = await api.query({
  prompt: 'Hello',
  provider: 'openai',
  model: 'gpt-4',
});

// Stream query
const stream = api.streamQuery({ prompt: 'Tell me a story' });
```

## Styling

### Tailwind CSS

The dashboard uses Tailwind CSS for styling with a custom theme:

```css
/* CSS Variables */
--background: Dark background color
--foreground: Text color
--primary: Primary brand color
--secondary: Secondary color
--muted: Muted backgrounds
--accent: Accent color
--destructive: Error/danger color
```

### Dark Mode

Default theme is dark mode. Configured in `app/layout.tsx`:

```tsx
<html lang="en" className="dark">
```

### Custom Styles

- Custom scrollbar styling
- Code block formatting
- Loading animations
- Pulse effects for live indicators

## UI Components

### shadcn/ui Components

All UI components are from shadcn/ui:

- `Button`: Multiple variants and sizes
- `Card`: Container with header/content/footer
- `Badge`: Status indicators
- `Tabs`: Tabbed interfaces
- `Dialog`: Modal dialogs
- `Select`: Dropdowns
- `Switch`: Toggle switches

### Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>

<Button variant="default">Click me</Button>
```

## Development

### Running Locally

```bash
cd dashboard
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Adding a New Page

1. Create file in `app/[page-name]/page.tsx`
2. Use `DashboardLayout` wrapper
3. Add navigation item to `sidebar.tsx`
4. Define types in `types/index.ts`

### Adding UI Components

```bash
# Copy component from shadcn/ui
npx shadcn-ui@latest add [component-name]
```

## Deployment

### Docker (Recommended)

Included in main docker-compose:

```yaml
dashboard:
  build: ./dashboard
  ports:
    - "3001:3001"
  environment:
    - NEXT_PUBLIC_API_URL=http://ai-orchestra:3000
```

### Standalone

```bash
npm run build
npm start
```

### Vercel

```bash
vercel deploy
```

Configure environment variables in Vercel dashboard.

## Performance

### Optimization

- Server Components by default
- Client Components only when needed (`'use client'`)
- Lazy loading for heavy components
- WebSocket connection pooling
- Log limiting (1000 entries max)

### Bundle Size

- Next.js automatic code splitting
- Tree-shaking unused components
- Optimized Tailwind CSS output

## Security

### Best Practices

- No sensitive data in frontend
- API keys stored in backend only
- CORS configuration required
- WebSocket authentication (future)
- Rate limiting on backend

## Troubleshooting

### Common Issues

**WebSocket Not Connecting**
- Check backend is running
- Verify `NEXT_PUBLIC_WS_URL`
- Check firewall settings

**API Calls Failing**
- Verify `NEXT_PUBLIC_API_URL`
- Enable CORS in backend
- Check network tab in devtools

**Styles Not Loading**
- Run `npm install`
- Clear `.next` cache
- Restart dev server

**TypeScript Errors**
- Run `npm run type-check`
- Update type definitions
- Check `tsconfig.json`

## Future Enhancements

- [ ] User authentication
- [ ] Multi-user support
- [ ] Build history persistence
- [ ] Advanced filtering and search
- [ ] Export logs to file
- [ ] Custom themes
- [ ] Mobile responsiveness improvements
- [ ] Agent creation/configuration UI
- [ ] Drag-and-drop file uploads
- [ ] Real-time collaboration

## Contributing

See main project CONTRIBUTING.md for guidelines.

## License

MIT
