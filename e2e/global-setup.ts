import { rm } from "node:fs/promises";
import path from "node:path";

// Start every e2e run from an empty database.
export default async function globalSetup() {
  await rm(path.resolve(".pglite-e2e"), { recursive: true, force: true });
}
