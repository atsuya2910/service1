import { z } from 'zod';

export const MAX_TAGS = 5;

export const trySchema = z.object({
  title: z
    .string()
    .min(1, '必須項目です')
    .max(100, '100文字以内で入力してください'),
  description: z
    .string()
    .min(1, '必須項目です')
    .max(1000, '1000文字以内で入力してください'),
  needSupporter: z.boolean(),
  tags: z.array(z.string()).max(MAX_TAGS, '最大5個までのタグを設定できます'),
});

export type TryInput = z.infer<typeof trySchema>; 