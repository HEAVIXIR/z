/* ============================================================
   HEAVIX — Background Job Queue (P1-19)
   HEAVIX-AUDIT-2026-09-20.md §10
   HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 19 (Background jobs)
   ------------------------------------------------------------
   Minimal in-process background job queue for dev/preview.

   Design goals:
     • AI and scraping MUST NOT block the main request lifecycle.
     • Simple, zero external dependencies (no Redis / BullMQ for dev).
     • Idempotent handler registration.
     • Status queryable per job-id for admin observability.
     • Stats exposed for the /admin/jobs dashboard.

   Non-goals (acceptable for dev, MUST be replaced for production):
     • No persistence — jobs are lost on process restart. Acceptable
       for dev/preview because every job here is also re-runnable
       manually from the admin UI.
     • No retries / backoff — handlers swallow their own errors and
       log them. The queue just marks the job FAILED.
     • No concurrency control — jobs run serially via a single
       microtask chain. Concurrency is not needed at dev volumes and
       keeps the implementation trivial.
     • No priority pre-emption — `priority` is recorded but jobs are
       processed FIFO within the same priority bucket. (Higher
       priority = lower number, Unix-nice style, but the dev queue
       does not reorder in-flight queues.)

   Public contract:
     • enqueue(job)              → jobId: string
     • registerHandler(type, fn) → void (idempotent, last-write-wins)
     • getJobStatus(jobId)       → { status, error? }
     • getQueueStats()           → { pending, running, done, failed }
     • listRegisteredTypes()     → string[]
     • listRecentJobs(limit?)    → Array<JobRecord> (most-recent first)

   For production: replace the in-memory Map with Redis (BullMQ) or
   a Postgres-backed queue (pg-boss). The public contract above is
   the stable interface callers depend on — swapping the backing
   store must not change it.
   ============================================================ */

export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface JobRecord {
  id: string;
  type: string;
  payload: unknown;
  priority: number;
  status: JobStatus;
  error?: string;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export type JobHandler = (payload: any) => Promise<void>;

interface InternalJob extends JobRecord {
  /** Promise resolve + reject pair — used by the processing loop. */
  _resolve?: () => void;
  _reject?: (err: unknown) => void;
}

/* ── Module-level state ─────────────────────────────────────────
   A single global Map keeps the queue + history bounded across all
   callers in the same Node process. The Next.js dev server runs in
   a single process so this is sufficient for dev/preview.
   ============================================================ */

const handlers = new Map<string, JobHandler>();
const pending: InternalJob[] = [];
const running = new Map<string, InternalJob>();
const history: InternalJob[] = [];

/** Cap history so the Map does not grow unboundedly. */
const HISTORY_CAP = 200;

/** Tracks whether the processing loop is currently scheduled. */
let processingScheduled = false;

/** Monotonic counter for job ids (combined with a short random suffix
 *  to avoid collisions across process restarts during HMR). */
let jobCounter = 0;

function generateJobId(): string {
  jobCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `job_${Date.now().toString(36)}_${jobCounter}_${rand}`;
}

/* ── Public API ──────────────────────────────────────────────── */

export interface EnqueueParams {
  type: string;
  payload?: any;
  /** Lower number = higher priority (Unix-nice style). Default 0. */
  priority?: number;
}

/**
 * Enqueue a background job. Returns the job id synchronously.
 *
 * The job runs as soon as the event loop is free — typically via
 * `queueMicrotask` so the caller's HTTP response is flushed first.
 *
 * If no handler is registered for `type` the job is enqueued anyway
 * and will be marked FAILED when the loop tries to process it. This
 * keeps the contract simple — the caller does not have to handle
 * a sync error from `enqueue`.
 */
export function enqueue(params: EnqueueParams): string {
  const id = generateJobId();
  const job: InternalJob = {
    id,
    type: params.type,
    payload: params.payload ?? null,
    priority: typeof params.priority === "number" ? params.priority : 0,
    status: "PENDING",
    enqueuedAt: Date.now(),
  };
  pending.push(job);
  history.push(job);
  // Trim oldest entries when over cap (keep the most-recent HISTORY_CAP).
  if (history.length > HISTORY_CAP) {
    history.splice(0, history.length - HISTORY_CAP);
  }
  scheduleProcessing();
  return id;
}

/**
 * Register a handler for a job type. Idempotent — re-registering
 * the same type replaces the handler (last-write-wins).
 */
export function registerHandler(type: string, handler: JobHandler): void {
  if (typeof type !== "string" || !type.trim()) {
    throw new Error("registerHandler: type must be a non-empty string");
  }
  if (typeof handler !== "function") {
    throw new Error(`registerHandler: handler for "${type}" is not a function`);
  }
  handlers.set(type, handler);
}

/** Returns the list of registered job types (sorted alphabetically). */
export function listRegisteredTypes(): string[] {
  return Array.from(handlers.keys()).sort((a, b) => a.localeCompare(b));
}

/**
 * Look up the status of a job by id. Returns `null` if the job id
 * is unknown (e.g. process restarted since enqueue).
 */
export function getJobStatus(
  jobId: string,
): { status: JobStatus; error?: string } | null {
  const job = history.find((j) => j.id === jobId);
  if (!job) return null;
  return { status: job.status, error: job.error };
}

/** Aggregate counts for the /admin/jobs dashboard. */
export function getQueueStats(): {
  pending: number;
  running: number;
  done: number;
  failed: number;
} {
  let done = 0;
  let failed = 0;
  for (const j of history) {
    if (j.status === "DONE") done += 1;
    else if (j.status === "FAILED") failed += 1;
  }
  return {
    pending: pending.length,
    running: running.size,
    done,
    failed,
  };
}

/**
 * Return recent job records (most-recent first). Used by the admin
 * dashboard to show what just happened.
 */
export function listRecentJobs(limit = 50): JobRecord[] {
  const safeLimit = Math.max(1, Math.min(200, limit));
  // Slice from the end (most-recent) and reverse to newest-first.
  const slice = history.slice(-safeLimit).reverse();
  return slice.map(stripInternal);
}

/** Reset all queue state — used by tests. NOT for production use. */
export function __resetForTests(): void {
  handlers.clear();
  pending.length = 0;
  running.clear();
  history.length = 0;
  jobCounter = 0;
  processingScheduled = false;
}

/* ── Internal: processing loop ───────────────────────────────── */

function scheduleProcessing(): void {
  if (processingScheduled) return;
  processingScheduled = true;
  // queueMicrotask keeps this off the caller's stack so the HTTP
  // response can flush first. setImmediate would also work but
  // queueMicrotask is faster and sufficient for dev.
  queueMicrotask(() => {
    processingScheduled = false;
    void processNext();
  });
}

async function processNext(): Promise<void> {
  // Sort pending by priority (lower number = higher priority) then
  // by enqueue time (FIFO within same priority).
  if (pending.length > 1) {
    pending.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  const job = pending.shift();
  if (!job) return;

  const handler = handlers.get(job.type);
  running.set(job.id, job);
  job.status = "RUNNING";
  job.startedAt = Date.now();

  if (!handler) {
    job.status = "FAILED";
    job.error = `No handler registered for job type "${job.type}"`;
    job.finishedAt = Date.now();
    running.delete(job.id);
    console.error(`[queue] ${job.error}`);
    // Keep the loop going if more jobs are queued.
    if (pending.length > 0) scheduleProcessing();
    return;
  }

  try {
    await handler(job.payload);
    job.status = "DONE";
    job.finishedAt = Date.now();
  } catch (err: unknown) {
    job.status = "FAILED";
    job.error = err instanceof Error ? err.message : String(err);
    job.finishedAt = Date.now();
    console.error(`[queue] job ${job.id} (${job.type}) failed:`, err);
  } finally {
    running.delete(job.id);
  }

  if (pending.length > 0) scheduleProcessing();
}

/** Strip the internal _resolve/_reject fields from a job record. */
function stripInternal(j: InternalJob): JobRecord {
  return {
    id: j.id,
    type: j.type,
    payload: j.payload,
    priority: j.priority,
    status: j.status,
    error: j.error,
    enqueuedAt: j.enqueuedAt,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  };
}
