import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '日付未設定';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy年MM月dd日', { locale: ja });
} 