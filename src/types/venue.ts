export interface Venue {
  id: string;
  name: string;
  type: 'church' | 'concert_hall' | 'other';
  address: string;
  organLocation: string;
  lastMaintenanceDate: string;
  defaultTemperature: number;
  defaultHumidity: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueFormData {
  name: string;
  type: 'church' | 'concert_hall' | 'other';
  address: string;
  organLocation: string;
  lastMaintenanceDate: string;
  defaultTemperature: number;
  defaultHumidity: number;
  remarks: string;
}

export const VENUE_TYPE_LABELS: Record<Venue['type'], string> = {
  church: '教堂',
  concert_hall: '音乐厅',
  other: '其他',
};

export const DEFAULT_VENUE_FORM_DATA: VenueFormData = {
  name: '',
  type: 'church',
  address: '',
  organLocation: '',
  lastMaintenanceDate: '',
  defaultTemperature: 22,
  defaultHumidity: 45,
  remarks: '',
};
