// Copies the skill's shared example component into the demo so the demo renders
// exactly what the skill ships. lib/skill is generated and gitignored.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "skills", "agent-approval-ux", "examples", "shared");
const dest = join(here, "..", "lib", "skill", "shared");

rmSync(join(here, "..", "lib", "skill"), { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`synced ${src} -> ${dest}`);
