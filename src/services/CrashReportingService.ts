import logger from '../utils/logger';

interface CrashlyticsClient {
  log: (message: string) => void;
  recordError: (error: Error) => void;
  setAttribute: (name: string, value: string) => void;
}

class CrashReportingService {
  private client: CrashlyticsClient | null | undefined;

  private getClient(): CrashlyticsClient | null {
    if (this.client !== undefined) {
      return this.client;
    }

    try {
      const crashlyticsModule = require('@react-native-firebase/crashlytics');
      const createClient = crashlyticsModule.default ?? crashlyticsModule;
      this.client = createClient();
    } catch (error) {
      logger.warn('[CrashReporting] Crashlytics unavailable:', error);
      this.client = null;
    }

    return this.client ?? null;
  }

  async preload(): Promise<void> {
    this.getClient();
  }

  log(message: string): void {
    const client = this.getClient();
    client?.log(message);
  }

  setAttribute(name: string, value: string): void {
    const client = this.getClient();
    client?.setAttribute(name, value);
  }

  recordError(error: Error): void {
    const client = this.getClient();
    client?.recordError(error);
  }

  recordGlobalError(error: Error, isFatal?: boolean): void {
    this.log(`Global error handler: isFatal=${isFatal}`);
    this.recordError(error);
  }
}

export default new CrashReportingService();
