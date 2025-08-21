# Overview

This is a WordPress AI Content Management System built with a full-stack TypeScript architecture. The application automates SEO-optimized content generation and analysis for multiple WordPress websites using AI models like GPT-4o and Claude-3. It provides a comprehensive dashboard for managing website connections, generating AI-powered content, performing SEO analysis, scheduling posts, and generating client reports.

Key features include:
- Multi-website WordPress management with automated content posting
- AI-powered content generation with SEO optimization
- Automated SEO analysis and issue detection with auto-fix capabilities
- Content scheduling and publishing automation
- Performance tracking and client reporting
- Activity logging and audit trails

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and building
- **Routing**: Wouter for client-side routing with simple declarative routes
- **State Management**: TanStack Query (React Query v5) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Forms**: React Hook Form with Zod for validation and type safety

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API with structured error handling and request logging
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod schemas shared between client and server for consistent validation

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Neon Database serverless connection
- **ORM Configuration**: Drizzle with PostgreSQL dialect for schema migrations and queries
- **Schema Design**: Normalized tables for users, websites, content, SEO reports, activity logs, and client reports
- **Storage Interface**: Abstract storage interface with in-memory implementation for development

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **User Model**: Simple username/password authentication with hashed passwords
- **Access Control**: Route-level protection with user session validation

## AI Integration Architecture
- **Primary AI Service**: OpenAI GPT-4o for content generation and SEO optimization
- **Content Generation**: Structured prompts with JSON response format for consistent output
- **SEO Analysis**: Custom SEO service that simulates PageSpeed Insights and technical analysis
- **Model Selection**: Configurable AI models per website (GPT-4o, Claude-3, etc.)

## External Service Integrations
- **WordPress Integration**: WordPress REST API connections for automated content posting
- **SEO Tools**: Simulated PageSpeed Insights API for performance analysis
- **Content Scheduling**: Built-in scheduling system with automated publishing

## Development and Build System
- **Development Server**: Vite with HMR and Express middleware integration
- **Build Process**: Vite for frontend bundling, esbuild for server bundling
- **Type Checking**: TypeScript strict mode with shared types between frontend and backend
- **Code Organization**: Monorepo structure with shared schemas and clear separation of concerns

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack Query
- **Backend Framework**: Express.js with TypeScript support
- **Database**: PostgreSQL via Neon Database serverless, Drizzle ORM
- **Build Tools**: Vite, esbuild, TypeScript compiler

## UI and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Design System**: shadcn/ui component collection with Tailwind CSS
- **Icons**: Lucide React for consistent iconography
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer

## AI and External Services
- **OpenAI**: Official OpenAI SDK for GPT-4o content generation
- **Session Storage**: connect-pg-simple for PostgreSQL session management
- **Date Handling**: date-fns for date formatting and manipulation

## Development Tools
- **Type Safety**: Zod for runtime validation and TypeScript integration
- **Form Handling**: React Hook Form with Zod resolvers
- **Development**: tsx for TypeScript execution, Replit-specific plugins

## Third-party Integrations
- **WordPress**: REST API integration for content publishing
- **Charts**: Chart.js with React wrapper for performance visualization
- **Carousel**: Embla Carousel for content presentation
- **Utilities**: clsx and class-variance-authority for conditional styling