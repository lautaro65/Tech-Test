# Tech Test FANZ

## Instrucciones de Setup

1. **Clonar el repositorio:**
   ```bash
   git clone <repo-url>
   cd tech-test
   ```
2. **Instalar dependencias:**
   ```bash
   npm install
   ```
3. **Configurar variables de entorno:**
   -.env.local:



-.env 4. **Configurar la base de datos:** - Asegúrate de tener una instancia de PostgreSQL disponible. - Ejecuta las migraciones Prisma:
`bash
	  npx prisma migrate deploy
	  ` - (Opcional) Para desarrollo local, puedes usar:
`bash
	npx prisma generate
	` 6. **Iniciar la aplicación en desarrollo:**
`bash
	npm run dev
	` 7. **Build de producción:**
---

## Decisiones Técnicas Relevantes

- **Next.js App Router**: Se utiliza la carpeta `app/` y el sistema de rutas modernas de Next.js 16+.
- **TypeScript**: Tipado estricto en todo el proyecto.
- **Prisma ORM**: Modelado y acceso a datos con Prisma y PostgreSQL.
- **Autenticación**: NextAuth.js con soporte para roles (OWNER, EDITOR, VIEWER).
- **Persistencia Canvas**: El estado del canvas se guarda tanto en la base de datos como en localStorage para recuperación offline y drafts.
- **UI/UX**: Tailwind CSS, shadcn/ui, animaciones con Framer Motion, y componentes reutilizables.
- **Control de Acceso**: Validación de permisos en backend y frontend para cada dashboard.
- **Soporte Mobile**: UI adaptativa y tutorial específico para mobile.
- **Build**: Compatible con Vercel y despliegue serverless.

---

## Esquema de Datos (Prisma)

- **User**: Usuarios autenticados (NextAuth).
- **Dashboard**: Espacio de trabajo principal, con nombre, descripción, visibilidad y relación con usuarios.
- **DashboardInvite**: Invitaciones a dashboards por token.
- **DashboardAuditLog**: Historial de acciones relevantes.
- **DashboardSnapshot**: Backups y versiones del canvas.
- **Entity** (en canvasData):
  - `id`: string
  - `type`: 'seat' | 'row' | 'table-circle' | 'table-rect' | 'area'
  - `label`: string
  - `x`, `y`: posición
  - `rotation`, `color`, `parentId`, `areaId`, etc.
  - Relaciones padre-hijo para mesas, filas y áreas.

---

## Supuestos Asumidos

- Solo usuarios autenticados pueden crear y editar dashboards.
- El OWNER puede invitar y revocar acceso a otros usuarios.
- El estado del canvas es un array de entidades serializado en JSON (`canvasData`).
- Los VIEWER solo pueden ver, no editar entidades.
- El sistema de roles es estricto y validado en cada endpoint.
- El frontend asume que la API responde con los datos y permisos correctos.
- El sistema de invitaciones es por token único y expira tras su uso o revocación.
- El diseño es mobile-first pero optimizado también para desktop.

---

## Contacto

Lautaro Octavio Faure
