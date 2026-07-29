/**
 * Đối tượng được bình luận: tin BÁN hoặc tin ĐĂNG MUA (v0.24.0 — người quan
 * tâm hỏi đáp công khai trước khi chào bán / kết nối).
 *
 * Để ở `lib` (module trung lập, KHÔNG "use client") vì cả server (repo,
 * service, route) lẫn client (component, api-client) đều dùng.
 */
export type CommentTargetKind = "listing" | "buy_order";

export type CommentTarget = { kind: CommentTargetKind; id: string };
