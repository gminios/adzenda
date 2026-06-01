/**
 * Next.js Instrumentation Hook
 * Se ejecuta una vez al iniciar el servidor (Node.js runtime).
 * Registra todos los cron jobs de la aplicación.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initJobs } = await import("./src/jobs/index");
    initJobs();
  }
}
