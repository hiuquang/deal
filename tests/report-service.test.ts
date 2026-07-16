/**
 * Test report-service — guard tự-report và mục tiêu không tồn tại.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/reports", () => ({
  createReport: vi.fn(),
}));
vi.mock("@/server/repositories/ratings", () => ({
  findUserById: vi.fn(),
}));

import * as reportsRepo from "@/server/repositories/reports";
import * as ratingsRepo from "@/server/repositories/ratings";
import * as reportService from "@/server/services/report-service";


beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ratingsRepo.findUserById).mockResolvedValue({ id: "u2" } as never);
});

describe("reportService.report", () => {
  it("409 SELF_REPORT khi tự tố cáo mình", async () => {
    await expectApiError(
      reportService.report("u1", { reportedUserId: "u1", reason: "spam" }),
      "SELF_REPORT"
    );
    expect(reportsRepo.createReport).not.toHaveBeenCalled();
  });

  it("404 NOT_FOUND khi user bị tố cáo không tồn tại", async () => {
    vi.mocked(ratingsRepo.findUserById).mockResolvedValue(null);
    await expectApiError(
      reportService.report("u1", { reportedUserId: "ghost", reason: "spam" }),
      "NOT_FOUND"
    );
    expect(reportsRepo.createReport).not.toHaveBeenCalled();
  });

  it("hợp lệ → ghi report với listingId null khi không truyền", async () => {
    await reportService.report("u1", { reportedUserId: "u2", reason: "詐欺の疑い" });
    expect(reportsRepo.createReport).toHaveBeenCalledWith({
      reporterId: "u1",
      reportedUserId: "u2",
      listingId: null,
      reason: "詐欺の疑い",
    });
  });

  it("giữ listingId khi có truyền", async () => {
    await reportService.report("u1", { reportedUserId: "u2", listingId: "l9", reason: "x" });
    expect(reportsRepo.createReport).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: "l9" })
    );
  });
});
