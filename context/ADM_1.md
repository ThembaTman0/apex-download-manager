# Premium Download Manager — Modern UI Technology Blueprint

> Use this prompt to redesign the project so the application looks like a premium desktop product similar to the provided mockup.
> The focus of this document is on **UI technology choices, architecture, styling, and implementation details** needed to achieve a world-class interface.

---

# 1. Design Goal

Build a visually stunning desktop application that matches the following characteristics:

- Dark glassmorphism interface
- Rounded corners and floating panels
- Soft shadows and gradients
- Animated progress bars
- Sidebar navigation with icons
- Toolbar with actions
- Search bar
- Rich data table
- Context menus
- Dashboard cards
- Premium typography
- Smooth 60 FPS animations
- Native desktop performance

The application should visually compete with:

- Internet Download Manager
- Linear
- Arc Browser
- Figma
- Raycast
- Notion
- Obsidian

---

# 2. Recommended Technology Stack

## Primary Recommendation (Best for Premium UI)

### Frontend UI

- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI
- shadcn/ui
- Lucide React icons
- TanStack Table
- Recharts

### Desktop Framework

- Tauri v2

### Backend Engine

- Java 21
- Spring Boot (headless REST API)

### Local Communication

- HTTP REST on localhost
- WebSocket for real-time updates

### Storage

- SQLite

### Packaging

- Tauri bundler

---

# 3. Why This Stack Is Better Than Pure JavaFX

Although JavaFX is capable, the React + Tauri approach provides:

- Significantly better visual fidelity
- Easier implementation of glassmorphism
- Access to modern UI libraries
- Faster prototyping
- Cleaner component architecture
- Better animations
- Easier theming
- More design flexibility
- Smaller app size than Electron
- Native desktop performance

Java remains responsible for all download logic.

---

# 4. Architecture Overview

```text
React + TypeScript Frontend
          ↓
      Tauri Shell
          ↓
   Local REST API + WebSocket
          ↓
 Java 21 Download Engine
          ↓
        SQLite
```

---

# 5. UI Technology Responsibilities

## React

Responsible for:

- Layout
- State management
- Routing
- Data tables
- Charts
- Dialogs
- Search
- Context menus

## Tailwind CSS

Responsible for:

- Styling
- Gradients
- Rounded corners
- Shadows
- Responsive spacing

## Framer Motion

Responsible for:

- Page transitions
- Hover animations
- Progress transitions
- Modal animations

## Tauri

Responsible for:

- Native desktop shell
- Window management
- Installer generation
- File dialogs
- Native notifications

## Java Backend

Responsible for:

- Multi-threaded downloading
- Resume support
- Scheduler
- Browser integration
- Analytics
- Licensing

---

# 6. Visual Design System

## Colors

```text
Background      #0B0F17
Surface         #111827
Card            #151B26
Border          rgba(255,255,255,0.08)
Accent          #7C3AED
Accent Secondary #06B6D4
Success         #22C55E
Warning         #F59E0B
Error           #EF4444
Text Primary    #F8FAFC
Text Secondary  #94A3B8
```

## Gradients

Primary CTA:

```css
from-violet-600 to-cyan-500
```

## Radius

- Cards: 24px
- Buttons: 14px
- Inputs: 14px

## Shadows

- `shadow-2xl`
- `shadow-black/40`

## Blur

- `backdrop-blur-xl`

---

# 7. Typography

Use:

- Inter

Weights:

- 400 Regular
- 500 Medium
- 600 Semibold
- 700 Bold

---

# 8. Application Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Title Bar + Search                                         │
├───────────────┬────────────────────────────────────────────┤
│ Sidebar       │ Toolbar                                    │
│               ├────────────────────────────────────────────┤
│               │ Downloads Table                            │
│               │ Context Menus                              │
│               │ Dashboard Widgets                          │
│               │ Upgrade Card                               │
├───────────────┴────────────────────────────────────────────┤
│ Status Bar                                                │
└────────────────────────────────────────────────────────────┘
```

---

# 9. Pages

- Dashboard
- Downloads
- Scheduler
- Video Grabber
- Browser Integration
- Analytics
- Settings
- Plugins
- Licensing

---

# 10. Sidebar Features

Sidebar includes:

- Navigation items
- Download categories
- Disk usage widget
- Quick actions

Use:

- Collapsible sections
- Animated selection indicator
- Icon-based navigation

---

# 11. Toolbar Features

Buttons:

- Add URL
- Resume
- Pause
- Stop
- Delete
- Options
- Queue
- Scheduler
- Share

Each button:

- Icon + label
- Hover glow
- Motion scale effect

---

# 12. Downloads Table

Use TanStack Table.

Columns:

- Checkbox
- Icon
- Name
- Type
- Size
- Progress
- Speed
- ETA
- Status
- Modified Date

Features:

- Sorting
- Filtering
- Column resizing
- Virtual scrolling
- Context menu
- Row selection

---

# 13. Custom Progress Bar

Visual style:

- Gradient fill
- Animated shimmer
- Rounded ends

Tailwind classes:

```text
bg-gradient-to-r from-cyan-400 to-violet-500
```

---

# 14. Search Bar

Features:

- Instant filtering
- Keyboard shortcut Ctrl+F
- Debounced input

Style:

- Rounded full pill
- Icon inside
- Glass background

---

# 15. Context Menus

Use Radix Context Menu.

Actions:

- Open
- Open With
- Open Folder
- Rename
- Redownload
- Pause
- Resume
- Stop
- Add to Queue
- Properties

---

# 16. Upgrade Card

Floating premium card with:

- Gradient button
- Pricing text
- Animated entrance

---

# 17. Analytics Dashboard

Use Recharts.

Widgets:

- Speed graph
- Daily totals
- File type distribution
- Success rate

---

# 18. State Management

Use:

- Zustand

Stores:

- downloadsStore
- settingsStore
- analyticsStore
- schedulerStore
- licenseStore

---

# 19. Data Fetching

Use:

- TanStack Query

For:

- REST API calls
- Caching
- Background refetching

---

# 20. Real-Time Updates

Use WebSocket to push:

- Progress updates
- Speed updates
- Notifications
- Scheduler events

---

# 21. Component Structure

```text
src/
├── app/
├── components/
│   ├── layout/
│   ├── downloads/
│   ├── analytics/
│   ├── settings/
│   └── ui/
├── pages/
├── hooks/
├── stores/
├── services/
├── types/
├── lib/
└── assets/
```

---

# 22. Key Components

- Sidebar
- TopBar
- Toolbar
- SearchBar
- DownloadsTable
- ProgressCell
- StatusBadge
- UpgradeCard
- DiskUsageCard
- StatsCards
- NotificationCenter

---

# 23. Window Effects

Tauri window settings:

- Transparent background
- Hidden native title bar
- Rounded corners
- Custom drag regions
- Vibrancy (where supported)

---

# 24. Native Integrations

Use Tauri APIs for:

- File dialogs
- Notifications
- System tray
- Auto-launch
- Window control

---

# 25. Theme Support

Provide:

- Dark mode (default)
- Light mode
- Accent color selection

---

# 26. Animation Guidelines

Use Framer Motion for:

- Sidebar transitions
- Modal dialogs
- Table row highlights
- Progress changes
- Button interactions

---

# 27. Accessibility

- Keyboard navigation
- ARIA labels
- High contrast mode
- Scalable fonts

---

# 28. Icons

Use Lucide icons.

Examples:

- Download
- Pause
- Play
- Folder
- Clock
- Settings
- Search

---

# 29. Fonts and Assets

Assets:

- Inter font
- SVG icons
- App logo

---

# 30. Backend API Endpoints

## Downloads

- GET /api/downloads
- POST /api/downloads
- POST /api/downloads/{id}/pause
- POST /api/downloads/{id}/resume
- POST /api/downloads/{id}/stop
- DELETE /api/downloads/{id}

## Settings

- GET /api/settings
- PUT /api/settings

## Analytics

- GET /api/analytics

## Scheduler

- GET /api/schedules
- POST /api/schedules

---

# 31. WebSocket Events

- download_created
- download_updated
- download_completed
- download_failed
- scheduler_triggered
- notification

---

# 32. Packaging Output

Tauri should generate:

- Windows MSI
- Windows EXE
- macOS DMG
- Linux DEB
- Linux RPM

---

# 33. Performance Goals

- Startup under 2 seconds
- 60 FPS animations
- Support 10,000 download records
- Low memory footprint

---

# 34. Suggested Monorepo Structure

```text
apex-download-manager/
├── backend-java/
├── desktop-ui/
├── browser-extension/
├── docs/
└── scripts/
```

---

# 35. Development Phases

## Phase 1: UI Shell

- Tauri setup
- React + TypeScript
- Tailwind
- Sidebar
- Toolbar
- Downloads table mock

## Phase 2: Java Backend

- Spring Boot API
- SQLite
- WebSocket

## Phase 3: Connect UI to Backend

## Phase 4: Download Engine

## Phase 5: Scheduler

## Phase 6: Browser Integration

## Phase 7: Video Downloader

## Phase 8: Analytics

## Phase 9: Licensing

## Phase 10: Final Polish

---

# 36. Coding Instructions for Claude

When generating code:

1. Produce complete production-ready files.
2. Use TypeScript strict mode.
3. Use functional React components.
4. Use Tailwind for all styling.
5. Use shadcn/ui components.
6. Use Framer Motion for animations.
7. Keep components modular.
8. Include exact file paths.
9. Ensure code compiles.
10. Avoid placeholders and TODOs.

---

# 37. Immediate Task

Start with Phase 1 and generate:

- Complete Tauri project
- React + TypeScript setup
- Tailwind configuration
- shadcn/ui setup
- Sidebar navigation
- Toolbar
- Search bar
- Downloads table with mock data
- Upgrade card
- Disk usage card
- Premium dark theme
- Custom title bar

The UI must closely resemble the provided mockup with:

- Dark glassmorphism
- Rounded panels
- Gradient progress bars
- Smooth animations
- Premium typography

After Phase 1 is complete, stop and wait for confirmation.

---

# 38. Product Name

Application Name:

- Apex Download Manager

Short Name:

- ADM

Tagline:

- Download Faster. Smarter. Better.

---

# 39. Final Instruction

Claude, build the application using:

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui
- Tauri
- Java 21 backend

The result should look and feel like a premium commercial desktop application.

