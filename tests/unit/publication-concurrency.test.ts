import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortablePlan } from "@/lib/schema/plan";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  put: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  del: vi.fn(),
}));

import { get, head, put, BlobPreconditionFailedError } from "@vercel/blob";
import { PublicationConflictError, updatePublication, type StoredPublication } from "@/lib/publications/server";

const mockedPut = vi.mocked(put);
const mockedGet = vi.mocked(get);
const mockedHead = vi.mocked(head);
const document: PortablePlan = { schemaVersion: 1, title: "Original", blocks: [], tasks: {} };

const existing: StoredPublication = {
  version: 1,
  id: "ipos-0123456789abcdef",
  title: "Original",
  document,
  managerHash: "a".repeat(64),
  createdAt: "2026-10-25T10:00:00.000Z",
  updatedAt: "2026-10-25T10:00:00.000Z",
};

function mockFreshRead(record: StoredPublication, etag = '"current"') {
  mockedGet.mockResolvedValue({
    blob: { etag },
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(record)));
        controller.close();
      },
    }),
  } as Awaited<ReturnType<typeof get>>);
}

describe("conditional published snapshot update", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("succeeds normally with the loaded ETag", async () => {
    mockedPut.mockResolvedValue({} as Awaited<ReturnType<typeof put>>);
    const result = await updatePublication(existing, '"original"', "Updated", document);
    expect(result.title).toBe("Updated");
    expect(mockedPut).toHaveBeenCalledOnce();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("retries a stale ETag once with HEAD metadata when the document is unchanged", async () => {
    mockedPut
      .mockRejectedValueOnce(new BlobPreconditionFailedError("ETag mismatch"))
      .mockResolvedValueOnce({} as Awaited<ReturnType<typeof put>>);
    mockFreshRead(existing);
    mockedHead.mockResolvedValue({ etag: '"current"' } as Awaited<ReturnType<typeof head>>);

    const result = await updatePublication(existing, '"stale"', "Updated", document);

    expect(result.title).toBe("Updated");
    expect(mockedPut).toHaveBeenCalledTimes(2);
    expect(mockedPut.mock.calls[0][2]).toMatchObject({ ifMatch: '"stale"', allowOverwrite: true });
    expect(mockedPut.mock.calls[1][2]).toMatchObject({ ifMatch: '"current"', allowOverwrite: true });
  });

  it("treats duplicate publication of the same content as a success", async () => {
    mockedPut.mockRejectedValueOnce(new BlobPreconditionFailedError("ETag mismatch"));
    mockFreshRead({ ...existing, title: "Updated", updatedAt: "2026-10-25T10:01:00.000Z" });
    const result = await updatePublication(existing, '"old"', "Updated", document);
    expect(result.title).toBe("Updated");
    expect(mockedHead).not.toHaveBeenCalled();
    expect(mockedPut).toHaveBeenCalledOnce();
  });

  it("never overwrites another editor's changes", async () => {
    mockedPut.mockRejectedValueOnce(new BlobPreconditionFailedError("ETag mismatch"));
    mockFreshRead({ ...existing, title: "A newer version", updatedAt: "2026-10-25T10:01:00.000Z" });
    await expect(updatePublication(existing, '"old"', "Updated", document)).rejects.toBeInstanceOf(PublicationConflictError);
    expect(mockedHead).not.toHaveBeenCalled();
    expect(mockedPut).toHaveBeenCalledOnce();
  });

  it("reports a conflict when a second conditional write fails", async () => {
    mockedPut.mockRejectedValue(new BlobPreconditionFailedError("ETag mismatch"));
    mockFreshRead(existing);
    mockedHead.mockResolvedValue({ etag: '"current"' } as Awaited<ReturnType<typeof head>>);
    await expect(updatePublication(existing, '"stale"', "Updated", document)).rejects.toBeInstanceOf(PublicationConflictError);
    expect(mockedPut).toHaveBeenCalledTimes(2);
  });
});
