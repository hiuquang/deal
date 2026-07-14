import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createMessageSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as chatService from "@/server/services/chat-service";

export const GET = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const after = req.nextUrl.searchParams.get("after") ?? undefined;
    const messages = await chatService.getMessages(user.id, id, after);
    return NextResponse.json({ messages });
  }
);

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const input = createMessageSchema.parse(await req.json());
    const message = await chatService.sendMessage(user.id, id, input.body);
    return NextResponse.json({ message }, { status: 201 });
  }
);
