import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "node:dns";
import net from "node:net";

// Node 19+'s "Happy Eyeballs" dual-stack connection racing can time out
// entirely (AggregateError ETIMEDOUT) on networks where IPv6 is routable
// but not actually reachable -- common on home/ISP networks. postgres.js
// connects via node:net/node:tls directly, so it hits this. Both lines
// are safe, additive fixes for that specific failure mode.
// https://nodejs.org/api/net.html#netsetdefaultautoselectfamilyenable
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

// Neon requires this explicitly for postgres.js clients -- it's what
// triggers SNI during the TLS handshake, which Neon's proxy needs to route
// the connection to the right compute. Without it, connections don't get
// rejected cleanly; they hang and eventually time out (ETIMEDOUT), even
// though `sslmode=require` is already in the connection string itself.
// https://neon.com/docs/changelog/2023-03-31
const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});

export const db = drizzle(client);
