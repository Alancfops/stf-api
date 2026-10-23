import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Dados inválidos.';
      throw new BadRequestException({
        statusCode: 400,
        message: firstIssue,
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          issue: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
