import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { trackError } from "@/lib/error-tracking";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/admin/backup
   --------------------------------
   Admin-only. Triggers an immediate SQLite backup by shelling
   out to scripts/backup.sh. Returns the filename of the new
   backup (basename) so the admin UI can display it.

   The backup script:
     • copies db/custom.db to db/backups/custom-YYYYMMDD-HHMMSS.db
     • rotates, keeping the last 10 backups

   This endpoint runs the backup SYNCHRONOUSLY — fine for a 2MB
   DB (sub-second). For a large DB, move to a queue + return
   202 Accepted. */
export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, "scripts", "backup.sh");

    // Guard: refuse if the script isn't on disk (e.g. dev env
    // where scripts/ hasn't been created yet).
    try {
      await fs.access(scriptPath);
    } catch {
      return NextResponse.json(
        { error: "backup.sh not found at " + scriptPath },
        { status: 500 },
      );
    }

    const { stdout, stderr } = await execFileAsync("bash", [scriptPath], {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });

    // Parse the new backup filename from stdout. The script logs
    // "[backup] OK: <abs path> (<size>)" on success.
    const okLine = stdout
      .split("\n")
      .find((l) => l.startsWith("[backup] OK:"));
    const absPath = okLine ? okLine.replace("[backup] OK:", "").trim().split(" ")[0] : null;
    const filename = absPath ? path.basename(absPath) : null;

    if (!filename) {
      return NextResponse.json(
        {
          ok: false,
          error: "Backup completed but filename could not be parsed",
          stdout,
          stderr,
        },
        { status: 500 },
      );
    }

    await logAudit({
      actorType: "ADMIN",
      action: "backup.create",
      entityType: "Database",
      reason: `Manual DB backup: ${filename}`,
    });

    return NextResponse.json({
      ok: true,
      filename,
      path: absPath,
      stdout: stdout.trim(),
    });
  } catch (err: any) {
    trackError(err, { endpoint: "POST /api/admin/backup" });
    return NextResponse.json(
      {
        error: err?.message ?? "Server error",
        stderr: err?.stderr ?? null,
        stdout: err?.stdout ?? null,
      },
      { status: 500 },
    );
  }
}
