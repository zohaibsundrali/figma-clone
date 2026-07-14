import { prisma } from "./prisma";

/** Record a sharing/permission change. Never throws into the request path. */
export async function auditShare(entry: {
  fileId: string;
  actorId: string;
  actorName?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.shareAuditLog.create({
      data: {
        fileId: entry.fileId,
        actorId: entry.actorId,
        actorName: entry.actorName ?? null,
        action: entry.action,
        target: entry.target ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", entry.action, err);
  }
}
