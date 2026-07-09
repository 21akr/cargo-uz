import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';
import { validateInitData } from './telegram-auth.util';

/**
 * Authenticates a request as a Telegram Mini App user.
 * The Mini App sends `Authorization: tma <initData>` (or x-telegram-init-data).
 * In local dev, set DEV_TG_USER_ID to bypass and act as a fixed user.
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const app = this.config.get<AppConfig>('app')!;

    if (app.devTgUserId) {
      req.tgUser = { id: Number(app.devTgUserId) };
      return true;
    }

    const raw = req.headers['authorization'] || req.headers['x-telegram-init-data'] || '';
    const initData = String(raw).replace(/^tma\s+/i, '');
    const user = validateInitData(initData, app.botToken);
    if (!user) throw new UnauthorizedException('Invalid Telegram initData');

    req.tgUser = user;
    return true;
  }
}
