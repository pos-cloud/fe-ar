import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AccountId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().accountId as string;
});
