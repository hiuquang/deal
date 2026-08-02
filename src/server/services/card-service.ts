import { Prisma } from "@prisma/client";
import * as cardsRepo from "@/server/repositories/cards";
import { toCardDto } from "@/server/serializers";
import type { CardDto } from "@/lib/types";

/** Tra thẻ theo id; null nếu không có. Dùng cho metadata trang giá (SEO). */
export async function getById(id: string): Promise<CardDto | null> {
  const card = await cardsRepo.findCardById(id);
  return card ? toCardDto(card) : null;
}

/**
 * User tự thêm sản phẩm/thẻ khi catalog thiếu — mở cho MỌI game từ 0.12.1
 * (nới business-rules #13 theo quyết định chủ web; trước đó chỉ mục その他).
 * Entry tự thêm của pokemon/onepiece mang setCode CUSTOM/CUSTOM-BOX, tách khỏi
 * catalog chuẩn. Find-or-create theo (game, tên, category) để cùng một sản phẩm
 * không sinh nhiều entry; race check-then-insert được unique constraint của
 * bảng cards chặn ở DB → bắt P2002 và trả về bản ghi đã tồn tại.
 */
export async function createUserProduct(
  game: string,
  name: string,
  category: string
): Promise<CardDto> {
  const existing = await cardsRepo.findUserProduct(game, name, category);
  if (existing) return toCardDto(existing);
  try {
    return toCardDto(await cardsRepo.createUserProduct(game, name, category));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await cardsRepo.findUserProduct(game, name, category);
      if (raced) return toCardDto(raced);
    }
    throw e;
  }
}
