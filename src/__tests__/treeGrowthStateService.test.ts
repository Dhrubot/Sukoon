describe('TreeGrowthStateService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadService(initialRaw?: string) {
    jest.resetModules();

    const storage = new Map<string, string>();
    if (initialRaw !== undefined) {
      storage.set('treeGrowthState', initialRaw);
    }

    const getString = jest.fn((key: string) => storage.get(key));
    const set = jest.fn((key: string, value: string) => {
      storage.set(key, value);
    });
    const remove = jest.fn((key: string) => {
      storage.delete(key);
    });

    jest.doMock('../services/StorageAdapter', () => ({
      createStorage: jest.fn(() => ({
        getString,
        set,
        remove,
      })),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/TreeGrowthStateService').default;
    return { service, storage, mocks: { getString, set, remove } };
  }

  it('returns defaults when storage is empty or invalid and reports state existence', () => {
    const empty = loadService();
    expect(empty.service.getState()).toMatchObject({
      totalLifetimeReflections: 0,
      stage: 'seedling',
    });
    expect(empty.service.hasState()).toBe(false);

    const invalid = loadService('not-json');
    expect(invalid.service.getState()).toMatchObject({
      totalLifetimeReflections: 0,
      stage: 'seedling',
    });
    expect(invalid.service.hasState()).toBe(true);
  });

  it('records reflections additively and bootstraps aggregate tree state from plants', () => {
    const { service, storage } = loadService();

    const reflected = service.recordReflection('Fajr', 5, '2026-03-18');
    expect(reflected.totalLifetimeReflections).toBe(1);
    expect(reflected.branchLifetimeLeaves.Fajr).toBe(1);
    expect(reflected.lifetimeBlooms).toBe(1);
    expect(reflected.firstReflectionDate).toBe('2026-03-18');

    const bootstrapped = service.bootstrapFromExistingData([
      {
        prayer: 'Dhuhr',
        mood: 4,
        growthStage: 'bloom',
        date: '2026-03-10',
      },
      {
        prayer: 'Asr',
        mood: 2,
        growthStage: 'sprout',
        date: '2026-03-08',
      },
    ]);

    expect(bootstrapped.totalLifetimeReflections).toBe(2);
    expect(bootstrapped.branchLifetimeLeaves.Dhuhr).toBe(1);
    expect(bootstrapped.branchLifetimeLeaves.Asr).toBe(1);
    expect(bootstrapped.lifetimeBlooms).toBe(1);
    expect(bootstrapped.firstReflectionDate).toBe('2026-03-08');
    expect(storage.has('treeGrowthState')).toBe(true);
  });

  it('migrates unknown versions back to defaults', () => {
    const { service } = loadService(JSON.stringify({
      version: 999,
      totalLifetimeReflections: 50,
      g: 0.5,
      stage: 'growing',
      branchLifetimeLeaves: { Fajr: 5, Dhuhr: 5, Asr: 5, Maghrib: 5, Isha: 5 },
      lifetimeBlooms: 10,
      firstReflectionDate: '2026-01-01',
      lastUpdated: '2026-03-18T00:00:00.000Z',
    }));

    expect(service.getState()).toMatchObject({
      totalLifetimeReflections: 0,
      stage: 'seedling',
      lifetimeBlooms: 0,
    });
  });
});
