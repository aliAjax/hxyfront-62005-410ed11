import type { Stop, StopFormData, StopCategory } from '../types/stops';

const STORAGE_KEY = 'organ_tuning_stops';

export const stopService = {
  getAll(): Stop[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const initialData: Stop[] = [
        {
          id: '1',
          name: 'Principal',
          category: 'principal',
          footMark: "8'",
          remarks: '主音栓，最基础的管风琴音栓，音色明亮饱满',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '2',
          name: 'Principal',
          category: 'principal',
          footMark: "4'",
          remarks: '高音主音栓',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '3',
          name: 'Trumpet',
          category: 'reed',
          footMark: "8'",
          remarks: '小号音栓，簧片类，音色激昂',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '4',
          name: 'Oboe',
          category: 'reed',
          footMark: "8'",
          remarks: '双簧管音栓，音色柔美',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '5',
          name: 'Mixture',
          category: 'mixture',
          footMark: "2' + 1 1/3'",
          remarks: '混合音栓，由多排音管组成，增加音色亮度',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '6',
          name: 'Cymbel',
          category: 'mixture',
          footMark: 'Cymbel',
          remarks: '辛巴尔混合音栓，用于强化高音区',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '7',
          name: 'Bourdon',
          category: 'bourdon',
          footMark: "16'",
          remarks: '低音管音栓，音色浑厚柔和',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '8',
          name: 'Subbass',
          category: 'bourdon',
          footMark: "32'",
          remarks: '超低音管，用于大型管风琴',
          createdAt: '2026-01-10T00:00:00Z',
          updatedAt: '2026-01-10T00:00:00Z',
        },
        {
          id: '9',
          name: 'Gedackt',
          category: 'principal',
          footMark: "8'",
          remarks: '木管盖塞音栓，音色柔和含蓄',
          createdAt: '2026-01-15T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
        },
        {
          id: '10',
          name: 'Clarinet',
          category: 'reed',
          footMark: "8'",
          remarks: '单簧管音栓，温暖圆润的音色',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: '11',
          name: 'Scharff',
          category: 'mixture',
          footMark: 'Scharff',
          remarks: '沙尔夫混合音栓，尖锐明亮',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: '12',
          name: 'Violon',
          category: 'principal',
          footMark: "16'",
          remarks: '大提琴音色的低音主音栓',
          createdAt: '2026-02-10T00:00:00Z',
          updatedAt: '2026-02-10T00:00:00Z',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(data);
  },

  getById(id: string): Stop | undefined {
    const stops = this.getAll();
    return stops.find((s) => s.id === id);
  },

  getByCategory(category: StopCategory): Stop[] {
    return this.getAll().filter((s) => s.category === category);
  },

  create(formData: StopFormData): Stop {
    const stops = this.getAll();
    const now = new Date().toISOString();
    const newStop: Stop = {
      ...formData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    stops.push(newStop);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
    return newStop;
  },

  update(id: string, formData: StopFormData): Stop | undefined {
    const stops = this.getAll();
    const index = stops.findIndex((s) => s.id === id);
    if (index === -1) return undefined;

    const updatedStop: Stop = {
      ...stops[index],
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    stops[index] = updatedStop;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
    return updatedStop;
  },

  delete(id: string): boolean {
    const stops = this.getAll();
    const filtered = stops.filter((s) => s.id !== id);
    if (filtered.length === stops.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getDisplayLabel(stop: Stop): string {
    return stop.footMark ? `${stop.name} ${stop.footMark}` : stop.name;
  },

  getAllDisplayLabels(): { id: string; label: string; category: StopCategory }[] {
    return this.getAll().map((s) => ({
      id: s.id,
      label: this.getDisplayLabel(s),
      category: s.category,
    }));
  },
};
