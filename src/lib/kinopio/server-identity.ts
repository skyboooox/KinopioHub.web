export function normalizeServerIdentity(server: string | null | undefined): string | null {
  if (!server?.trim()) {
    return null;
  }

  try {
    const trimmed = server.trim();
    const url = new URL(trimmed.includes("://") ? trimmed : `wss://${trimmed}`);
    const protocol = url.protocol.toLowerCase();
    const port =
      url.port ||
      (protocol === "ws:" || protocol === "http:" || protocol === "nats:"
        ? "80"
        : "443");

    return `${url.hostname.toLowerCase()}:${port}`;
  } catch {
    return server.trim().replace(/^[a-z]+:\/\//i, "").toLowerCase();
  }
}

export function formatServerDisplay(server: string): string {
  if (!server.includes("://")) {
    return server.replace(/^[^@/\s]+@/, "");
  }

  try {
    const url = new URL(server);
    url.username = "";
    url.password = "";

    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `${url.protocol}//${url.host}${pathname}${url.search}${url.hash}`;
  } catch {
    return server.replace(/\/\/[^@/\s]+@/, "//");
  }
}
