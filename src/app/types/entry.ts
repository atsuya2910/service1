import { z } from 'zod';

export const entrySchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  introduction: z.string().min(1, '自己紹介は必須です').max(1000, '自己紹介は1000文字以内で入力してください'),
  userId: z.string(),
  tryId: z.string(),
});

export type Entry = z.infer<typeof entrySchema> & {
  createdAt: Date;
};

export type EntryFormData = z.infer<typeof entrySchema>; 