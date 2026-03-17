import { syncUserSettings } from '../utils/settingsSync';

describe('settingsSync', () => {
  it('delegates settings updates to the zustand updater', () => {
    const update = jest.fn();
    const updates = {
      notifications: {
        enabled: true,
      },
    };

    syncUserSettings(updates as never, update);

    expect(update).toHaveBeenCalledWith(updates);
  });
});
