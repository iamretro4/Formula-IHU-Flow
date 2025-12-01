# Formula IHU Team Preparation Hub

A comprehensive team management and project collaboration platform designed specifically for Formula IHU competition teams. This application provides end-to-end project management, document tracking, task coordination, and team collaboration features.

## 🚀 Features

### Core Functionality
- **Task Management**: Create, assign, and track tasks with priorities, dependencies, and status tracking
- **Project Management**: Organize work into projects with milestones, timelines, and progress tracking
- **Document Repository**: Upload, version, and manage compliance documents with approval workflows
- **Team Collaboration**: Team member profiles, workload distribution, and communication tools
- **Gantt Charts**: Visual project timelines and task dependencies
- **Calendar Integration**: Google Calendar sync for scheduling and deadlines
- **Activity Logging**: Comprehensive audit trail of all system activities
- **Reports & Analytics**: Export data, generate reports, and track team performance

### Advanced Features
- **Kanban Board**: Drag-and-drop task management with visual workflow
- **Time Tracking**: Track time spent on tasks with analytics
- **Comments System**: Collaborative discussions on tasks and documents
- **Version History**: Track document versions with restore capabilities
- **Approval Workflows**: Automated document approval processes
- **Notifications**: Real-time notifications for important events
- **Mobile Optimized**: Fully responsive design with touch gestures
- **Dark Mode**: Theme switching with system preference detection

## 🛠️ Technology Stack

### Frontend
- **React 18.3** - UI framework with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite 7.2** - Fast build tool and dev server
- **React Router 6.30** - Client-side routing
- **TanStack Query 5.83** - Server state management and caching
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Radix UI** - Accessible component primitives

### Backend & Database
- **Supabase** - Backend-as-a-Service (PostgreSQL, Auth, Storage)
- **PostgreSQL** - Relational database with Row Level Security
- **Supabase Edge Functions** - Serverless functions for integrations

### Key Libraries
- **@dnd-kit** - Drag and drop functionality
- **recharts** - Data visualization and charts
- **react-flow** - Interactive node-based graphs
- **date-fns** - Date manipulation
- **react-hook-form** - Form management
- **zod** - Schema validation

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Supabase Account** - For backend services
- **Git** - Version control

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FIHU Flow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Application URLs (Optional - defaults to current origin)
VITE_BASE_URL=http://localhost:8000
VITE_HUB_URL=http://localhost:8000
```

**Important Notes:**
- In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client
- Access them using `import.meta.env.VITE_*` (not `process.env`)
- For production, update URLs to your actual domain:
  ```env
  VITE_BASE_URL=https://fihu.gr
  VITE_HUB_URL=https://hub.fihu.gr
  ```

Get Supabase values from your Supabase project settings:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 4. Database Setup

Apply database migrations in order:

1. Navigate to Supabase Dashboard → SQL Editor
2. Apply migrations from `supabase/migrations/` in chronological order:
   - Start with the earliest dated migration
   - Apply each migration sequentially
   - Verify with `VERIFY_MIGRATIONS.sql` after completion

Key migrations:
- `20251105201154_*.sql` - Initial schema setup
- `20250114000000_complete_notification_triggers.sql` - Notifications
- `20250114000001_comments_table.sql` - Comments system
- `20250114000002_time_tracking.sql` - Time tracking
- `20250115000000_scheduled_reports.sql` - Reports
- `20250115000001_advanced_permissions.sql` - Permissions

### 5. Storage Buckets

Create storage buckets in Supabase Dashboard → Storage:

- **documents** - For document files (50MB limit recommended)
  - Enable public access or configure RLS policies
  - Set up CORS if needed

### 6. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8000`

## 🏗️ Project Structure

```
FIHU Flow/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── DashboardLayout.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── ...
│   ├── pages/               # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── Documents.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   │   ├── useTasks.ts
│   │   ├── useDocuments.ts
│   │   ├── useMobileGestures.ts
│   │   └── ...
│   ├── utils/               # Utility functions
│   │   ├── export.ts
│   │   ├── debounce.ts
│   │   └── ...
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── integrations/        # External service integrations
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   └── App.tsx              # Main application component
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
│       ├── google-calendar-oauth/
│       ├── google-calendar-sync/
│       └── process-email-queue/
├── public/                  # Static assets
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind configuration
└── package.json
```

## 🎯 Usage Guide

### Getting Started

1. **Sign Up / Sign In**
   - Navigate to the application
   - Create an account or sign in with existing credentials
   - Your profile will be automatically created

2. **Create a Project**
   - Go to Projects page
   - Click "New Project"
   - Fill in project details, dates, and description
   - Add milestones to track progress

3. **Add Tasks**
   - Navigate to Tasks page
   - Click "Create Task"
   - Assign to team members, set priority and due dates
   - Link tasks to projects if needed

4. **Upload Documents**
   - Go to Documents page
   - Click "Upload Document"
   - Select document type and upload file
   - Set submission deadlines

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + /` - Show keyboard shortcuts
- `Ctrl/Cmd + F` - Search/Filter
- `Ctrl/Cmd + N` - Create new item
- `Esc` - Close dialogs

### Mobile Usage

- **Swipe Gestures**: Swipe left/right on Tasks page to switch between list and Kanban views
- **Touch Targets**: All interactive elements are optimized for touch (minimum 44x44px)
- **Responsive Design**: Fully responsive layouts adapt to screen sizes

## 🔐 Authentication & Security

- **Row Level Security (RLS)**: All database tables use RLS policies
- **Authentication**: Supabase Auth with email/password
- **Storage Policies**: Secure file access with RLS on storage buckets
- **API Security**: All API calls go through Supabase with proper authentication

## 📊 Database Schema

### Core Tables

- **profiles** - User profiles and team member information
- **projects** - Project definitions with timelines
- **tasks** - Task management with dependencies
- **documents** - Document repository with versioning
- **milestones** - Project milestone tracking
- **comments** - Comments on tasks and documents
- **time_tracking** - Time entries for tasks
- **notifications** - User notifications
- **workflows** - Automated approval workflows

### Enums

- `task_priority`: low, medium, high, critical
- `task_status`: pending, in_progress, review, completed, blocked
- `document_type`: design_spec, engineering_report, cost_report, status_video, business_plan, safety_doc, other
- `department`: electrical, mechanical, operations

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_BASE_URL` (optional)
   - `VITE_HUB_URL` (optional)
3. Build command: `npm run build`
4. Output directory: `dist`

### Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy google-calendar-oauth
supabase functions deploy google-calendar-sync
supabase functions deploy process-email-queue
supabase functions deploy send-email
```

### Configure Resend for Email

1. **Get Resend API Key**:
   - Sign up at [Resend](https://resend.com)
   - Go to API Keys section
   - Create a new API key

2. **Set Environment Variable in Supabase**:
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add a new secret:
     - Name: `RESEND_API_KEY`
     - Value: Your Resend API key
   - Click "Save"

3. **Optional - Configure Custom Domain**:
   - In Resend dashboard, add and verify your domain
   - Update the `from_email` in email functions to use your custom domain
   - Default uses `noreply@fihu.gr` (make sure to verify this domain in Resend)

4. **Deploy Email Functions** (if not already deployed):
   ```bash
   supabase functions deploy send-email
   supabase functions deploy process-email-queue
   ```

## 🧪 Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier (via ESLint) for formatting

### Performance Optimizations

- **Lazy Loading**: Routes are code-split and loaded on demand
- **React Query**: Intelligent caching and background refetching
- **Memoization**: Expensive components use React.memo and useMemo
- **Virtual Scrolling**: Large lists use virtualization
- **Image Optimization**: Lazy loading for images
- **Bundle Optimization**: Vite optimizes chunks automatically

### Adding New Features

1. Create component in `src/components/`
2. Add route in `src/App.tsx` if needed
3. Create database migration if schema changes needed
4. Update types in `src/types/index.ts`
5. Add hooks in `src/hooks/` for data fetching

## 🐛 Troubleshooting

### Common Issues

**Database connection errors**
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify network connectivity

**Build errors**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

**Migration errors**
- Ensure migrations are applied in order
- Check for conflicting migrations
- Verify RLS policies are correct

**Storage upload failures**
- Check bucket exists and is configured
- Verify storage policies allow uploads
- Check file size limits

## 📝 API Reference

### Supabase Client

The application uses Supabase client for all database operations:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query example
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'pending');
```

### React Query Hooks

Custom hooks for data fetching:

```typescript
import { useTasks } from '@/hooks/useTasks';

const { data: tasks, isLoading } = useTasks();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Formula IHU team use.

## 📞 Support

For issues, questions, or contributions, please contact the development team or open an issue in the repository.

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- Mobile optimizations and performance improvements
- Advanced permissions and scheduled reports
- Time tracking and comments system

---

Built with ❤️ for Formula IHU competition teams
