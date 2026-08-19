# iCredix CRM

Sistema CRM interno para administrar créditos de iPhone. Desarrollado para una sola empresa (iCredix).

## Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons
- **Backend:** Next.js API Routes, Server Actions
- **Base de datos:** Supabase PostgreSQL
- **Autenticación:** Supabase Auth
- **Hosting:** Vercel

## Fases de desarrollo

| Fase | Estado | Módulos |
|------|--------|---------|
| 1 | ✅ Completa | Arquitectura, BD, Auth, Dashboard, Layout |
| 2 | Pendiente | Clientes, Créditos, Equipos |
| 3 | Pendiente | Cuotas, Pagos, Mora |
| 4 | Pendiente | Telegram, Bloqueos, Desbloqueos |
| 5 | Pendiente | Reportes, Configuración |

## Configuración local

### 1. Clonar e instalar

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

### 3. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta el SQL de `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Crea un usuario en **Authentication → Users**
4. Copia la URL y las keys anon/service a `.env.local`

### 4. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
/app                    # Rutas Next.js App Router
/components
  /ui                   # shadcn/ui
  /dashboard            # Componentes del dashboard
  /layout               # Sidebar, header, shell
/lib
  /supabase             # Clientes Supabase
  /validators           # Esquemas Zod
  /actions              # Server Actions
/services               # Lógica de negocio
/types                  # Interfaces TypeScript
/supabase/migrations    # Esquema SQL
```

## Despliegue en Vercel

1. Conecta el repositorio a Vercel
2. Agrega las variables de entorno de Supabase
3. Deploy automático en cada push

## Colores de marca

- Azul: `#0052FF`
- Morado: `#7000FF`
- Amarillo: `#FFD700`
- Fondo: `#F9FAFB`
