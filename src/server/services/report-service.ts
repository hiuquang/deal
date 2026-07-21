import { ApiError } from "@/server/errors";
import * as reportsRepo from "@/server/repositories/reports";
import * as ratingsRepo from "@/server/repositories/ratings";

/** MVP: chỉ ghi nhận report — chưa có admin dashboard xử lý. */
export async function report(
  reporterId: string,
  input: { reportedUserId: string; listingId?: string | null; reason: string }
): Promise<void> {
  if (input.reportedUserId === reporterId) {
    throw new ApiError(409, "SELF_REPORT", "Không thể tự báo cáo chính mình.");
  }
  const target = await ratingsRepo.findUserById(input.reportedUserId);
  if (!target) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy người dùng.");
  }
  await reportsRepo.createReport({
    reporterId,
    reportedUserId: input.reportedUserId,
    listingId: input.listingId ?? null,
    reason: input.reason,
  });
  console.log(`[report] ${reporterId} reported ${input.reportedUserId}`);
}
