import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Sans `globals: true`, RTL ne s'auto-nettoie pas entre les tests.
afterEach(cleanup);
