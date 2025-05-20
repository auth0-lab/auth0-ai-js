#!/usr/bin/env node
import { promises as fs, statSync } from "fs";
import path from "path";
import process from "node:process";

const COMPONENTS_DIR = path.join(import.meta.dirname, "../templates");

const componentLocations = [
  path.join(process.cwd(), "components"),
  path.join(process.cwd(), "src", "components"),
];

const baseComponentsDir =
  componentLocations.find((dir) => {
    try {
      return statSync(dir).isDirectory();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      return false;
    }
  }) ?? componentLocations[0];

const TARGET_DIR = path.join(baseComponentsDir, "auth0-ai");

async function syncDir(srcDir, destDir) {
  try {
    await fs.access(srcDir); // Ensure source directory exists
  } catch {
    throw new Error(`Source directory "${srcDir}" does not exist.`);
  }

  try {
    await fs.mkdir(destDir, { recursive: true }); // Ensure destination directory exists
  } catch (err) {
    console.error(`Error creating destination directory "${destDir}":`, err);
    throw err;
  }

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      try {
        await fs.stat(destPath); // Check if file/directory exists
        console.log(`Skipped file (exists): ${destPath}`);
      } catch {
        if (entry.isDirectory()) {
          await syncDir(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
          console.log(`📄 Copied: ${path.relative(process.cwd(), destPath)}`);
        }
      }
    })
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(
      "❌ You must specify a component name. Example: npx @auth0/ai-components add button"
    );
    process.exit(1);
  }

  if (args[0] !== "add") {
    console.log(
      "❌ Invalid command. Example: npx @auth0/ai-components add button"
    );
    process.exit(1);
  }

  const components = args.slice(1);

  const allowedComponents = (await fs.readdir(COMPONENTS_DIR)).filter(
    (f) => f !== "util"
  );

  if (!components.every((arg) => allowedComponents.includes(arg))) {
    console.log(
      "❌ Invalid component name. Allowed components:",
      allowedComponents.join(", ")
    );
    process.exit(1);
  }

  console.log(`🚀 Syncing components: ${components.join(", ")}`);

  await syncDir(
    path.join(COMPONENTS_DIR, "util"),
    path.join(TARGET_DIR, "util")
  );

  for (const component of components) {
    await syncDir(
      path.join(COMPONENTS_DIR, component),
      path.join(TARGET_DIR, component)
    );
  }

  const { devDependencies } = JSON.parse(
    await fs.readFile(
      path.join(import.meta.dirname, "..", "package.json"),
      "utf-8"
    )
  );
  const recommendedDependencies = Object.keys(devDependencies).filter(
    (d) => d !== "react" && d !== "typescript" && !d.startsWith("@types/")
  );

  console.log("✅ Done!");
  console.log(`👉 Run \`npm install ${recommendedDependencies.join(" ")}\``);
}

main();
