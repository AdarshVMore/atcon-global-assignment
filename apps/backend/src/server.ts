const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  routes: {
    "/health": () => Response.json({ status: "ok" }),
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);
