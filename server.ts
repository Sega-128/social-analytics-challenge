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

  return app;
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);

if (isRunDirectly) {
  const start = async () => {
    const app = buildApp({ logger: true });

    try {
      await app.listen({ port: 3000, host: "0.0.0.0" });
      console.log("http://localhost:3000");
      console.log("http://localhost:3000/docs");
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  start();
}
