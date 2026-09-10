import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tracked = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
});
if (tracked.status !== 0) {
  console.error(tracked.stderr || "Could not list tracked files.");
  process.exit(1);
}

// Construct provider signatures from fragments so this guard does not flag
// its own source. These are intentionally conservative high-confidence rules.
const rules = [
  ["Webhook signing secret", new RegExp(["whsec", "[A-Za-z0-9+/=_-]{24,}"].join("_"), "g")],
  ["Resend API key", new RegExp(["re", "[A-Za-z0-9_-]{24,}"].join("_"), "g")],
  ["GitHub token", new RegExp(["gh[pousr]", "[A-Za-z0-9]{30,}"].join("_"), "g")],
  ["AWS access key", new RegExp(["AKIA", "[A-Z0-9]{16}"].join(""), "g")],
  [
    "Private key",
    new RegExp(
      [
        "-----BEGIN ",
        "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "[\\s\\S]{80,}?",
        "-----END ",
        "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
      ].join(""),
      "g",
    ),
  ],
];

const findings = [];
for (const file of tracked.stdout.split("\0").filter(Boolean)) {
  // Generated Prisma engines contain minified internal symbols that can look
  // like provider keys; source and configuration remain fully scanned.
  if (file.replaceAll("\\", "/").startsWith("packages/db/generated/")) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push(`${file}:${line} ${name}`);
    }
  }
}

if (findings.length) {
  console.error("Potential committed credentials found:\n" + findings.join("\n"));
  process.exit(1);
}

console.log("No provider-shaped credentials found in tracked files.");
