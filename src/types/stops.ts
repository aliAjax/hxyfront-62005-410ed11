export type StopCategory = 'principal' | 'reed' | 'mixture' | 'bourdon';

export interface Stop {
  id: string;
  name: string;
  category: StopCategory;
  footMark: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface StopFormData {
  name: string;
  category: StopCategory;
  footMark: string;
  remarks: string;
}

export const STOP_CATEGORY_LABELS: Record<StopCategory, string> = {
  principal: '主音栓',
  reed: '簧片音栓',
  mixture: '混合音栓',
  bourdon: '低音管',
};

export const STOP_CATEGORY_COLORS: Record<StopCategory, string> = {
  principal: '#854d0e',
  reed: '#dc2626',
  mixture: '#0ea5e9',
  bourdon: '#475569',
};

export const DEFAULT_STOP_FORM_DATA: StopFormData = {
  name: '',
  category: 'principal',
  footMark: '',
  remarks: '',
};

export const COMMON_FOOT_MARKS = [
  "32'",
  "16'",
  "10 2/3'",
  "8'",
  "5 1/3'",
  "4'",
  "2 2/3'",
  "2'",
  "1 3/5'",
  "1 1/3'",
  "1'",
  "Scharff",
  "Cymbel",
];
