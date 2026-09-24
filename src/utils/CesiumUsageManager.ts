export class CesiumUsageManager {
  private static readonly MAX_USAGE_PER_DAY = 20;
  private static readonly STORAGE_KEY_DATE = "cesium_last_used";
  private static readonly STORAGE_KEY_COUNT = "cesium_usage_count";

  static canUseCesium(): boolean {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(this.STORAGE_KEY_DATE);

    if (storedDate !== today) {
      this.resetDailyUsage();
      return true;
    }

    const currentUsage = this.getCurrentUsage();
    return currentUsage < this.MAX_USAGE_PER_DAY;
  }

  static incrementUsage(): void {
    const today = new Date().toDateString();
    localStorage.setItem(this.STORAGE_KEY_DATE, today);
    const currentUsage = this.getCurrentUsage();
    localStorage.setItem(this.STORAGE_KEY_COUNT, (currentUsage + 1).toString());
  }

  static getCurrentUsage(): number {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(this.STORAGE_KEY_DATE);
    if (storedDate !== today) return 0;
    return parseInt(localStorage.getItem(this.STORAGE_KEY_COUNT) || "0", 10);
  }

  static getDailyLimit(): number {
    return this.MAX_USAGE_PER_DAY;
  }

  static getUsageInfo(): {
    current: number;
    limit: number;
    percentage: number;
    remaining: number;
  } {
    const current = this.getCurrentUsage();
    const limit = this.MAX_USAGE_PER_DAY;
    const percentage = (current / limit) * 100;
    const remaining = Math.max(0, limit - current);

    return { current, limit, percentage, remaining };
  }

  private static resetDailyUsage(): void {
    const today = new Date().toDateString();
    localStorage.setItem(this.STORAGE_KEY_DATE, today);
    localStorage.setItem(this.STORAGE_KEY_COUNT, "0");
  }
}
