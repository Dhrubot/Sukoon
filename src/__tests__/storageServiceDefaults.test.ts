import StorageService from '../services/StorageService';

describe('StorageService defaults', () => {
  it('defaults new users to gentle reminders with follow-up reminders disabled', () => {
    const settings = StorageService.getDefaultSettings();

    expect(settings.notifications.intensity).toBe('gentle');
    expect(settings.notifications.postPrayerCheck).toBe(false);
    expect(settings.habitBuilder.enabled).toBe(false);
    expect(settings.habitBuilder.persistentReminders.enabled).toBe(false);
    expect(settings.habitBuilder.gracePeriodWarning.enabled).toBe(false);
  });
});
