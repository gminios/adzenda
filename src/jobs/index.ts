/**
 * Registra todos los cron jobs de la aplicación.
 * Se llama una sola vez desde instrumentation.ts al iniciar el proceso.
 */
import cron from "node-cron";
import { logger } from "@/lib/logger";
import { runIngestion } from "./ingestion";
import { runReportGeneration } from "./report-generation";
import { runDelivery } from "./delivery";

let initialized = false;

export function initJobs(): void {
  if (initialized) return;
  initialized = true;

  const TZ = "America/Argentina/Buenos_Aires";

  // 03:00 diario → Ingesta de todas las cuentas activas
  cron.schedule(
    "0 3 * * *",
    async () => {
      logger.info("Cron: ingesta diaria");
      await runIngestion("cron").catch((e) =>
        logger.error({ err: e }, "Cron: ingesta falló")
      );
    },
    { timezone: TZ }
  );

  // 03:30 diario → Evaluación de alertas (PRD-05)
  // cron.schedule("30 3 * * *", runAlertEval, { timezone: TZ });

  // 06:00 lunes → Generación de informes (PRD-04)
  cron.schedule(
    "0 6 * * 1",
    async () => {
      logger.info("Cron: generación de informes semanales");
      await runReportGeneration().catch((e) =>
        logger.error({ err: e }, "Cron: generación de informes falló")
      );
    },
    { timezone: TZ }
  );

  // 08:00 lunes → Entrega automática de informes (PRD-05)
  cron.schedule(
    "0 8 * * 1",
    async () => {
      logger.info("Cron: entrega automática de informes");
      await runDelivery().catch((e) =>
        logger.error({ err: e }, "Cron: entrega falló")
      );
    },
    { timezone: TZ }
  );

  logger.info("Jobs registrados");
}
