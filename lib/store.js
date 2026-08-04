import { promises as fs } from "fs";
import path from "path";

/**
 * File-based storage. Responses live in data/responses.json inside the repo,
 * so localhost works with zero setup and the results ship with the code.
 * Writes are serialized through a queue and go temp-file-then-rename, so a
 * crash mid-write can never truncate the real file.
 *
 * Needs a persistent disk, so deploy to a Node host (VPS, Railway, Fly),
 * not serverless.
 */

const FILE = path.join(process.cwd(), "data", "responses.json");

let queue = Promise.resolve();
const serialize = (job) => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

export async function readResponses() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    if (e.code === "ENOENT") return [];
    // corrupted file: fail the request rather than letting a later write clobber it
    throw e;
  }
}

export function appendResponse(row) {
  return serialize(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const rows = await readResponses();
    const duplicate = rows.some((r) => r.response_id === row.response_id);
    if (!duplicate) {
      rows.push(row);
      const tmp = FILE + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(rows, null, 2) + "\n");
      await fs.rename(tmp, FILE);
    }
    return { rows, duplicate };
  });
}
