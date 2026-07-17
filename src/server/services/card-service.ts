import { Prisma } from "@prisma/client";
import * as cardsRepo from "@/server/repositories/cards";
import { toCardDto } from "@/server/serializers";
import type { CardDto } from "@/lib/types";

/**
 * Mục "その他/Khác": user tự đặt tên sản phẩm — ngoại lệ có chủ đích của
 * business-rules #13 (catalog chuẩn hóa chỉ áp cho Pokémon / One Piece).
 * Find-or-create theo (tên, category) để cùng một sản phẩm không sinh
 * nhiều entry; race check-then-insert được unique constraint của bảng
 * cards chặn ở DB → bắt P2002 và trả về bản ghi đã tồn tại.
 */
export async function createOtherProduct(
  name: string,
  category: string
): Promise<CardDto> {
  const existing = await cardsRepo.findOtherProduct(name, category);
  if (existing) return toCardDto(existing);
  try {
    return toCardDto(await cardsRepo.createOtherProduct(name, category));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await cardsRepo.findOtherProduct(name, category);
      if (raced) return toCardDto(raced);
    }
    throw e;
  }
}
