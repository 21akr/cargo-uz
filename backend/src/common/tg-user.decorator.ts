import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TmaUser } from './telegram-auth.util';

/** Injects the authenticated Telegram user attached by TelegramAuthGuard. */
export const TgUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TmaUser => {
    return ctx.switchToHttp().getRequest().tgUser;
  },
);
