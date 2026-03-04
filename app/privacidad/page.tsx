export default function PrivacidadPage() {
  return (
    <main className="relative overflow-hidden bg-background px-6 py-12 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,var(--color-primary)/0.12,transparent_35%),radial-gradient(circle_at_85%_80%,var(--color-accent)/0.14,transparent_40%)]" />

      <article className="relative mx-auto w-full max-w-5xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-xl backdrop-blur-sm md:p-10">
        <header className="border-b border-border/70 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            FANZ · Legal
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Política de privacidad
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            En FANZ nos tomamos la privacidad en serio. Este documento explica qué
            datos recopilamos, con qué finalidad los usamos, cómo los protegemos y
            qué derechos tienes sobre tu información personal cuando utilizas la
            plataforma para diseñar y gestionar eventos.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Última actualización: 2 de marzo de 2026.
          </p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-xl font-semibold text-foreground">1. Alcance y responsable del tratamiento</h2>
            <p className="mt-2">
              Esta política aplica a todos los usuarios que acceden a FANZ,
              incluyendo cuentas de organizadores, equipos de operaciones y perfiles
              administrativos. FANZ actúa como responsable del tratamiento respecto
              de los datos de autenticación y uso de la plataforma.
            </p>
            <p className="mt-2">
              Si gestionas datos de terceros dentro de tus dashboards (por ejemplo,
              información de asistentes o reservas), eres responsable de cumplir con
              las obligaciones legales aplicables a esos datos y de contar con una
              base legal válida para tratarlos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">2. Datos que recopilamos</h2>
            <p className="mt-2">Podemos recopilar y procesar las siguientes categorías de datos:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Datos de cuenta: nombre, email, hash de contraseña, rol y foto de perfil.</li>
              <li>Datos de sesión: tokens de sesión, fecha de expiración, IP y user-agent.</li>
              <li>Datos operativos: dashboards, snapshots, configuraciones, historial de cambios y auditoría.</li>
              <li>Datos técnicos: eventos de error, métricas de rendimiento y registros de seguridad.</li>
              <li>Datos de soporte: información que compartas al contactar al equipo.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">3. Finalidades del tratamiento</h2>
            <p className="mt-2">Tratamos datos para:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Crear y administrar cuentas de usuario.</li>
              <li>Autenticar accesos y prevenir uso no autorizado.</li>
              <li>Guardar y sincronizar dashboards y diseños.</li>
              <li>Permitir colaboración, compartición y trazabilidad de cambios.</li>
              <li>Mejorar funcionalidades, estabilidad y experiencia de producto.</li>
              <li>Cumplir obligaciones legales y responder requerimientos válidos.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">4. Base legal</h2>
            <p className="mt-2">
              Según la jurisdicción aplicable, tratamos datos bajo una o más bases
              legales: ejecución de contrato, interés legítimo, consentimiento,
              cumplimiento de obligaciones legales y protección ante fraude o abuso.
            </p>
            <p className="mt-2">
              Cuando el tratamiento requiera consentimiento, podrás retirarlo en
              cualquier momento. Esto no afecta la licitud del tratamiento previo al
              retiro.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">5. Conservación de datos</h2>
            <p className="mt-2">
              Conservamos los datos mientras exista una cuenta activa o una relación
              contractual vigente. Posteriormente, los mantenemos por el tiempo
              necesario para resolver disputas, cumplir obligaciones legales y
              aplicar políticas de seguridad y auditoría.
            </p>
            <p className="mt-2">
              Cuando los datos dejen de ser necesarios, se eliminan o anonimizan de
              forma segura.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">6. Seguridad y controles</h2>
            <p className="mt-2">
              Implementamos medidas técnicas y organizativas razonables, incluyendo
              autenticación segura, hashing de contraseñas, políticas de control de
              acceso, monitoreo de actividad y limitación de intentos en endpoints
              sensibles.
            </p>
            <p className="mt-2">
              Ningún sistema es completamente invulnerable; por ello revisamos
              continuamente nuestras prácticas para mitigar riesgos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">7. Compartición con terceros</h2>
            <p className="mt-2">
              Podemos compartir datos con proveedores que prestan servicios de
              infraestructura, autenticación, almacenamiento y analítica, siempre
              bajo contratos de confidencialidad y limitación de uso.
            </p>
            <p className="mt-2">
              No vendemos información personal. Solo compartimos datos cuando sea
              necesario para operar FANZ, cumplir la ley o proteger derechos
              legítimos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">8. Derechos del usuario</h2>
            <p className="mt-2">Puedes solicitar, sujeto a la ley aplicable:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Acceso a tus datos personales.</li>
              <li>Rectificación de información incompleta o inexacta.</li>
              <li>Eliminación de datos en circunstancias específicas.</li>
              <li>Limitación u oposición al tratamiento.</li>
              <li>Portabilidad de datos cuando corresponda.</li>
            </ul>
            <p className="mt-2">
              Para ejercer derechos, contáctanos desde los canales de soporte y
              verificaremos tu identidad antes de responder.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">9. Menores de edad</h2>
            <p className="mt-2">
              FANZ no está dirigido a menores de edad sin autorización legal.
              Si detectamos datos de menores tratados sin base válida, aplicaremos
              medidas de bloqueo o eliminación según corresponda.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">10. Cambios a esta política</h2>
            <p className="mt-2">
              Podemos actualizar esta política para reflejar cambios regulatorios,
              técnicos o de producto. Publicaremos la versión vigente en esta página
              e indicaremos la fecha de última actualización.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
            <h2 className="text-lg font-semibold text-foreground">Aviso importante</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Este contenido funciona como base de privacidad para entorno de
              desarrollo y demostración. Antes de publicar en producción, debe ser
              revisado y aprobado por asesoría legal en función del país o región
              donde opere tu proyecto.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
