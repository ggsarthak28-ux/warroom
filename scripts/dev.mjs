import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lanMode = process.argv.includes("--lan") || process.env.LAN === "true";
const host = lanMode ? "0.0.0.0" : process.env.HOST || "127.0.0.1";
const env = {
  ...process.env,
  HOST: host,
  API_HOST: host,
  ComSpec: process.env.ComSpec?.endsWith("cmd.exe") ? process.env.ComSpec : "C:\\Windows\\System32\\cmd.exe"
};

const children = [
  spawn(process.execPath, ["server/index.js"], { cwd: root, env, stdio: "inherit", shell: false }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", host, "--port", "5173"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: false
  })
];

function shutdown(code = 0) {
  for (const child of children) child.kill();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) shutdown(code);
  });
}
