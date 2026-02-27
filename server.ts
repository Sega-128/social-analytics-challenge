import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { fileURLToPath } from "node:url";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { leaderboardRoutes } from "./routes/leaderboard.routes.ts";
import { bestTimeRoutes } from "./routes/best-time.routes.ts";
import { consistencyRoutes } from "./routes/consistency.routes.ts";

export function buildApp(opts = {}) {
  const app = Fastify(opts).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Social Analytics API",
        description: "API Social Analytics",
        version: "0.0.1",
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });

  app.register(leaderboardRoutes);
  app.register(bestTimeRoutes);
  app.register(consistencyRoutes);

  return app;
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);

if (isRunDirectly) {
  const start = async () => {
    const app = buildApp({ logger: true });

    try {
      const port = Number(process.env.PORT) || 3000;
      const host = process.env.HOST || "0.0.0.0";

      await app.listen({ port, host });
      console.log(`http://${host}:${port}`);
      console.log(`http://${host}:${port}/docs`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  start();
}
