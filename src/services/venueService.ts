import type { Venue, VenueFormData } from '../types/venue';

const STORAGE_KEY = 'organ_tuning_venues';

export const venueService = {
  getAll(): Venue[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const initialData: Venue[] = [
        {
          id: '1',
          name: 'St.Mary 教堂',
          type: 'church',
          address: '上海市徐汇区漕溪北路595号',
          organLocation: '教堂正厅东侧阁楼',
          lastMaintenanceDate: '2026-05-15',
          defaultTemperature: 21,
          defaultHumidity: 48,
          remarks: '管风琴为1985年德国建造，共3层手键盘',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-05-15T00:00:00Z',
        },
        {
          id: '2',
          name: '上海音乐厅',
          type: 'concert_hall',
          address: '上海市黄浦区延安东路523号',
          organLocation: '舞台后方中央',
          lastMaintenanceDate: '2026-04-20',
          defaultTemperature: 23,
          defaultHumidity: 45,
          remarks: '用于管风琴音乐会演出，每月定期维护',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-04-20T00:00:00Z',
        },
        {
          id: '3',
          name: 'Abbey Room 演奏厅',
          type: 'other',
          address: '北京市朝阳区建国路88号',
          organLocation: '演奏厅左侧',
          lastMaintenanceDate: '2026-06-01',
          defaultTemperature: 22,
          defaultHumidity: 43,
          remarks: '小型演奏厅，管风琴为练习用途',
          createdAt: '2026-03-15T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(data);
  },

  getById(id: string): Venue | undefined {
    const venues = this.getAll();
    return venues.find((v) => v.id === id);
  },

  create(formData: VenueFormData): Venue {
    const venues = this.getAll();
    const now = new Date().toISOString();
    const newVenue: Venue = {
      ...formData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    venues.push(newVenue);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
    return newVenue;
  },

  update(id: string, formData: VenueFormData): Venue | undefined {
    const venues = this.getAll();
    const index = venues.findIndex((v) => v.id === id);
    if (index === -1) return undefined;

    const updatedVenue: Venue = {
      ...venues[index],
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    venues[index] = updatedVenue;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
    return updatedVenue;
  },

  delete(id: string): boolean {
    const venues = this.getAll();
    const filtered = venues.filter((v) => v.id !== id);
    if (filtered.length === venues.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getVenueNames(): { id: string; name: string }[] {
    return this.getAll().map((v) => ({ id: v.id, name: v.name }));
  },
};
