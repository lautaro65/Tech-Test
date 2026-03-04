export default function TerminosPage() {
  return (
    <main className="relative overflow-hidden bg-background px-6 py-12 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,var(--color-primary)/0.12,transparent_34%),radial-gradient(circle_at_90%_85%,var(--color-accent)/0.12,transparent_42%)]" />

      <article className="relative mx-auto w-full max-w-5xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-xl backdrop-blur-sm md:p-10">
        <header className="border-b border-border/70 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            FANZ · Legal
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Términos de servicio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Estos Términos regulan el acceso y uso de FANZ. Al crear una cuenta o
            utilizar la plataforma, aceptas estas condiciones. Si no estás de
            acuerdo, no debes usar el servicio.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Última actualización: 2 de marzo de 2026.
          </p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-xl font-semibold text-foreground">1. Objeto del servicio</h2>
            <p className="mt-2">
              FANZ es una plataforma para crear, editar y administrar dashboards de
              eventos, incluyendo mapas de asientos, sectores, mesas, snapshots y
              controles de colaboración entre miembros de equipo.
            </p>
            <p className="mt-2">
              Nos reservamos el derecho de agregar, modificar o discontinuar
              funcionalidades para mejorar la experiencia, la seguridad y la
              estabilidad general del servicio.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">2. Registro y cuentas</h2>
            <p className="mt-2">
              Para acceder a ciertas funciones, debes registrarte y mantener datos
              de cuenta exactos y actualizados. Eres responsable de proteger tus
              credenciales y de toda actividad realizada bajo tu cuenta.
            </p>
            <p className="mt-2">
              Debes notificarnos de inmediato ante accesos no autorizados o
              incidentes de seguridad vinculados a tu cuenta.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">3. Uso aceptable</h2>
            <p className="mt-2">Está prohibido usar FANZ para:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Violar leyes o regulaciones aplicables.</li>
              <li>Interferir con el funcionamiento del servicio o infraestructura.</li>
              <li>Intentar acceder a datos o cuentas sin autorización.</li>
              <li>Distribuir contenido malicioso, fraudulento o engañoso.</li>
              <li>Automatizar acciones abusivas que degraden rendimiento o seguridad.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">4. Contenido y propiedad intelectual</h2>
            <p className="mt-2">
              Conservas titularidad sobre el contenido que subes o creas en FANZ.
              Nos otorgas una licencia limitada para procesar, almacenar y mostrar
              dicho contenido con el único fin de operar la plataforma.
            </p>
            <p className="mt-2">
              El software, marca, diseño, documentación y componentes de FANZ están
              protegidos por derechos de propiedad intelectual y no pueden
              reproducirse o distribuirse sin autorización.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">5. Roles, colaboración y permisos</h2>
            <p className="mt-2">
              Puedes compartir dashboards y asignar roles con distintos niveles de
              acceso. El titular del dashboard es responsable de conceder permisos
              adecuados y revisar periódicamente quién puede visualizar o editar.
            </p>
            <p className="mt-2">
              FANZ puede registrar eventos de auditoría para trazabilidad y
              seguridad, incluyendo acciones críticas dentro de cada dashboard.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">6. Disponibilidad y cambios</h2>
            <p className="mt-2">
              Procuramos alta disponibilidad, pero no garantizamos operación
              ininterrumpida o libre de errores. Podemos realizar mantenimiento,
              actualizaciones o cambios de arquitectura que afecten temporalmente el
              acceso.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">7. Suspensión y terminación</h2>
            <p className="mt-2">
              Podemos suspender o cancelar cuentas ante uso abusivo, incumplimiento
              de estos términos, fraude, riesgo de seguridad o requerimiento legal.
              También puedes solicitar cierre de cuenta en cualquier momento.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">8. Limitación de responsabilidad</h2>
            <p className="mt-2">
              En la medida permitida por la ley, FANZ no será responsable por daños
              indirectos, lucro cesante, pérdida de datos o interrupciones derivadas
              de factores externos, fallos de terceros o uso indebido del servicio.
            </p>
            <p className="mt-2">
              La responsabilidad total de FANZ se limitará al monto efectivamente
              abonado por el usuario, cuando corresponda, durante el período
              contractual relevante.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">9. Modificaciones de los términos</h2>
            <p className="mt-2">
              Podemos actualizar estos términos cuando sea necesario por razones
              legales, operativas o de producto. La versión vigente será publicada
              en esta página con su fecha de actualización.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">10. Ley aplicable y contacto</h2>
            <p className="mt-2">
              Estos términos se interpretan conforme a la normativa aplicable en la
              jurisdicción definida por tu organización o contrato. Para consultas
              legales o contractuales, utiliza los canales de soporte oficial.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
            <h2 className="text-lg font-semibold text-foreground">Aviso importante</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Este texto es una base extensa para entorno de desarrollo/demos. Antes
              de publicar en producción, debes adaptar y validar estos términos con
              asesoría legal especializada.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
