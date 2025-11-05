# AI Orchestra Dashboard - FusionForge

Modern Next.js dashboard for monitoring and controlling the AI Orchestra system.

## Features

- **Real-time Monitoring**: WebSocket-based live updates for logs and system status
- **Build Pipeline**: Trigger and monitor LLM queries across multiple providers
- **Agent Management**: View and manage autonomous agents
- **Artifacts Inspector**: Browse generated files, reports, and patches
- **Configuration**: Manage providers, models, and system settings
- **Beautiful UI**: Built with Next.js, Tailwind CSS, and shadcn/ui

## Quick Start

### Development

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### Production

```bash
npm run build
npm start
```

## Pages

- **/**: Overview dashboard with system metrics
- **/build**: Build pipeline with LLM query interface
- **/logs**: Real-time agent logs viewer
- **/artifacts**: Generated files and artifacts browser
- **/agents**: Agent status and management
- **/system**: System health and configuration
- **/config**: Settings and provider configuration

## Environment Variables

Create `.env.local` in the dashboard directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Real-time**: WebSocket connections
- **TypeScript**: Full type safety

## Components

### UI Components (shadcn/ui)
- Button, Card, Badge, Tabs
- Dialog, Select, Switch
- All components in `components/ui/`

### Custom Components
- `dashboard-layout.tsx`: Main layout with sidebar and header
- `sidebar.tsx`: Navigation sidebar
- `header.tsx`: Top header with search and notifications

### Hooks
- `useWebSocket.ts`: WebSocket connection management

### State Management
- `lib/store.ts`: Zustand store for global state

## Development

### Adding a New Page

1. Create page in `app/[page-name]/page.tsx`
2. Wrap with `DashboardLayout`
3. Add route to `components/sidebar.tsx`

### Adding New Components

```bash
# UI components go in components/ui/
# Custom components go in components/
```

### State Management

```typescript
import { useDashboardStore } from '@/lib/store';

function MyComponent() {
  const { logs, addLog } = useDashboardStore();
  // Use state...
}
```

## WebSocket Events

The dashboard listens for these WebSocket message types:

- `log`: New log entries
- `status`: System status updates
- `build`: Build lifecycle events
- `agent`: Agent status changes
- `artifact`: New artifacts created

## API Integration

The dashboard communicates with the backend through:

- REST API: `/api/*` endpoints
- WebSocket: Real-time event stream

See `lib/api.ts` for API client implementation.

## Deployment

### With Docker

The dashboard is included in the main AI Orchestra Docker setup:

```bash
# From project root
docker-compose up -d
```

### Standalone

```bash
cd dashboard
npm run build
npm start
```

Or use Vercel/Netlify for hosting.

## Troubleshooting

### WebSocket not connecting

- Ensure backend is running on correct port
- Check `NEXT_PUBLIC_WS_URL` environment variable
- Verify firewall settings

### API calls failing

- Check `NEXT_PUBLIC_API_URL` points to running backend
- Enable CORS in backend configuration
- Check browser console for errors

## License

MIT
