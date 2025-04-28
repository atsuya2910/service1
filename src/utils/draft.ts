import { TryInput } from '@/types/try';

export interface DraftTry {
  title: string;
  description: string;
  needSupporter: boolean;
  tags: string[];
  images: { preview: string; name: string; type: string }[];
  lastModified: number;
}

const DRAFT_KEY = 'tryfield_draft';

export const saveDraft = (data: DraftTry) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
};

export const loadDraft = (): DraftTry | null => {
  const draft = localStorage.getItem(DRAFT_KEY);
  return draft ? JSON.parse(draft) : null;
};

export const deleteDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};

export const hasDraft = (): boolean => {
  return localStorage.getItem(DRAFT_KEY) !== null;
}; 