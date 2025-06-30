import StorageService from './StorageService';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  joinedDate: Date;
}

interface FamilyGroup {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  members: FamilyMember[];
}

interface PrayerStatus {
  date: string; // ISO format
  prayers: {
    fajr: 'prayed' | 'missed' | 'pending';
    dhuhr: 'prayed' | 'missed' | 'pending';
    asr: 'prayed' | 'missed' | 'pending';
    maghrib: 'prayed' | 'missed' | 'pending';
    isha: 'prayed' | 'missed' | 'pending';
  };
  userId: string;
}

/**
 * Web-compatible version of FamilySharingService that mocks family sharing functionality
 * for web testing without Firebase dependencies.
 */
class FamilySharingService {
  private isInitialized: boolean = false;
  private currentFamilyId: string | null = null;
  private familyName: string = '';
  private familyMembers: FamilyMember[] = [];
  private mockPrayerData: PrayerStatus[] = [];
  private unsubscribeCallback: (() => void) | null = null;

  async initialize() {
    console.log('FamilySharingService (Web): Initializing mock family service');
    
    // Check for stored family data
    const familyData = StorageService.getFamilyData();
    if (familyData) {
      this.currentFamilyId = familyData.id;
      this.familyName = familyData.name;
      this.familyMembers = familyData.members;
      console.log('FamilySharingService (Web): Loaded existing family');
    }
    
    // Generate mock prayer data if in a family
    if (this.currentFamilyId) {
      this.generateMockPrayerData();
    }
    
    this.isInitialized = true;
    return true;
  }

  private generateMockPrayerData() {
    // Generate last 100 days of prayer data for each family member
    const today = new Date();
    
    this.mockPrayerData = [];
    
    this.familyMembers.forEach(member => {
      for (let i = 0; i < 100; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        // 70% chance of praying, 30% chance of missing
        const prayedFajr = Math.random() < 0.7 ? 'prayed' : 'missed';
        const prayedDhuhr = Math.random() < 0.75 ? 'prayed' : 'missed';
        const prayedAsr = Math.random() < 0.8 ? 'prayed' : 'missed';
        const prayedMaghrib = Math.random() < 0.85 ? 'prayed' : 'missed';
        const prayedIsha = Math.random() < 0.75 ? 'prayed' : 'missed';
        
        this.mockPrayerData.push({
          date: date.toISOString().split('T')[0],
          prayers: {
            fajr: prayedFajr as 'prayed' | 'missed' | 'pending',
            dhuhr: prayedDhuhr as 'prayed' | 'missed' | 'pending',
            asr: prayedAsr as 'prayed' | 'missed' | 'pending',
            maghrib: prayedMaghrib as 'prayed' | 'missed' | 'pending',
            isha: prayedIsha as 'prayed' | 'missed' | 'pending',
          },
          userId: member.id,
        });
      }
    });
    
    console.log(`FamilySharingService (Web): Generated mock prayer data (${this.mockPrayerData.length} entries)`);
  }

  async createFamilyGroup(familyName: string = 'My Family'): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    // Generate random family ID
    const familyId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create mock family with current user as first member
    const currentUser = this.getMockUserProfile();
    
    const familyGroup: FamilyGroup = {
      id: familyId,
      name: familyName,
      createdBy: currentUser.id,
      createdAt: new Date(),
      members: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          joinedDate: new Date(),
        },
      ],
    };
    
    // Save family data
    StorageService.saveFamilyData(familyGroup);
    
    this.currentFamilyId = familyId;
    this.familyName = familyName;
    this.familyMembers = familyGroup.members;
    
    // Generate mock prayer data
    this.generateMockPrayerData();
    
    console.log(`FamilySharingService (Web): Created family group with ID ${familyId}`);
    return familyId;
  }

  async joinFamilyGroup(familyId: string): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    
    // For web testing, just create a new family with this ID and add some mock members
    const currentUser = this.getMockUserProfile();
    
    const mockMembers: FamilyMember[] = [
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        joinedDate: new Date(),
      },
      {
        id: 'member1',
        name: 'Ahmed',
        email: 'ahmed@example.com',
        joinedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        id: 'member2',
        name: 'Fatima',
        email: 'fatima@example.com',
        joinedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        id: 'member3',
        name: 'Omar',
        email: 'omar@example.com',
        joinedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];
    
    const familyGroup: FamilyGroup = {
      id: familyId,
      name: `Family Group ${familyId}`,
      createdBy: 'member1', // Mock creator
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      members: mockMembers,
    };
    
    // Save family data
    StorageService.saveFamilyData(familyGroup);
    
    this.currentFamilyId = familyId;
    this.familyName = familyGroup.name;
    this.familyMembers = mockMembers;
    
    // Generate mock prayer data
    this.generateMockPrayerData();
    
    console.log(`FamilySharingService (Web): Joined family group with ID ${familyId}`);
    return true;
  }

  async leaveFamilyGroup(): Promise<boolean> {
    if (!this.currentFamilyId) return false;
    
    // Just clear all stored data
    StorageService.clearFamilyData();
    
    this.currentFamilyId = null;
    this.familyName = '';
    this.familyMembers = [];
    this.mockPrayerData = [];
    
    console.log('FamilySharingService (Web): Left family group');
    return true;
  }

  async getFamilyStats(): Promise<any> {
    if (!this.currentFamilyId || this.familyMembers.length === 0) {
      return null;
    }
    
    // Calculate family stats from mock data
    const memberStats: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize stats for each member
    this.familyMembers.forEach(member => {
      memberStats[member.id] = {
        name: member.name,
        totalPrayers: 0,
        completedPrayers: 0,
        missedPrayers: 0,
        completionRate: 0,
        streak: 0,
        prayedToday: false,
      };
    });
    
    // Calculate stats from prayer data
    this.mockPrayerData.forEach(entry => {
      if (!memberStats[entry.userId]) return;
      
      const prayers = entry.prayers;
      const totalForDay = 5; // 5 prayers per day
      let completedForDay = 0;
      
      if (prayers.fajr === 'prayed') completedForDay++;
      if (prayers.dhuhr === 'prayed') completedForDay++;
      if (prayers.asr === 'prayed') completedForDay++;
      if (prayers.maghrib === 'prayed') completedForDay++;
      if (prayers.isha === 'prayed') completedForDay++;
      
      memberStats[entry.userId].totalPrayers += totalForDay;
      memberStats[entry.userId].completedPrayers += completedForDay;
      memberStats[entry.userId].missedPrayers += (totalForDay - completedForDay);
      
      // Check if this is today's entry
      if (entry.date === today && completedForDay > 0) {
        memberStats[entry.userId].prayedToday = true;
      }
    });
    
    // Calculate completion rates and streaks
    for (const memberId in memberStats) {
      const stats = memberStats[memberId];
      stats.completionRate = stats.totalPrayers > 0 
        ? stats.completedPrayers / stats.totalPrayers 
        : 0;
        
      // Calculate streak
      stats.streak = this.calculateStreak(memberId);
    }
    
    // Find top performer (by streak, then completion rate)
    let topPerformerId = this.familyMembers[0].id;
    for (const memberId in memberStats) {
      if (memberStats[memberId].streak > memberStats[topPerformerId].streak ||
          (memberStats[memberId].streak === memberStats[topPerformerId].streak &&
           memberStats[memberId].completionRate > memberStats[topPerformerId].completionRate)) {
        topPerformerId = memberId;
      }
    }
    
    // Calculate family averages
    const memberCount = this.familyMembers.length;
    const totalCompletionRates = Object.values(memberStats).reduce(
      (sum: number, stats: any) => sum + stats.completionRate, 0
    );
    const avgCompletionRate = totalCompletionRates / memberCount;
    
    const totalStreaks = Object.values(memberStats).reduce(
      (sum: number, stats: any) => sum + stats.streak, 0
    );
    const avgStreak = Math.round(totalStreaks / memberCount);
    
    const totalPrayers = Object.values(memberStats).reduce(
      (sum: number, stats: any) => sum + stats.completedPrayers, 0
    );
    
    // Result
    return {
      memberStats,
      topPerformer: {
        id: topPerformerId,
        name: memberStats[topPerformerId].name,
        streak: memberStats[topPerformerId].streak,
        completionRate: memberStats[topPerformerId].completionRate,
      },
      totalPrayers,
      completionRate: avgCompletionRate,
      averageStreak: avgStreak,
      bestStreak: Math.max(...Object.values(memberStats).map((s: any) => s.streak)),
    };
  }

  private calculateStreak(memberId: string): number {
    if (!this.mockPrayerData.length) return 0;
    
    // Filter prayer data for this member and sort by date (newest first)
    const memberPrayers = this.mockPrayerData
      .filter(entry => entry.userId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (!memberPrayers.length) return 0;
    
    let streak = 0;
    const today = new Date();
    
    // Check each day, starting from today
    for (let i = 0; i < 100; i++) { // check up to 100 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      // Find prayer entry for this day
      const entry = memberPrayers.find(p => p.date === dateStr);
      
      // If no entry or no prayers completed, streak ends
      if (!entry) break;
      
      const prayers = entry.prayers;
      const anyCompleted = 
        prayers.fajr === 'prayed' || 
        prayers.dhuhr === 'prayed' ||
        prayers.asr === 'prayed' ||
        prayers.maghrib === 'prayed' ||
        prayers.isha === 'prayed';
      
      if (!anyCompleted) break;
      
      // Increment streak
      streak++;
    }
    
    return streak;
  }

  subscribeToFamilyUpdates(callback: (members: FamilyMember[]) => void): () => void {
    console.log('FamilySharingService (Web): Setting up family updates subscription (mock)');
    
    // Store callback for later use
    this.unsubscribeCallback = () => {
      console.log('FamilySharingService (Web): Unsubscribed from family updates');
    };
    
    // Simulate initial update
    setTimeout(() => {
      callback(this.familyMembers);
    }, 500);
    
    return this.unsubscribeCallback;
  }

  updatePrayerStatus(date: string, prayer: string, status: 'prayed' | 'missed' | 'pending'): void {
    if (!this.currentFamilyId) return;
    
    const currentUser = this.getMockUserProfile();
    
    // Find existing entry or create new one
    const entry = this.mockPrayerData.find(
      p => p.date === date && p.userId === currentUser.id
    );
    
    if (entry) {
      // Update existing entry
      entry.prayers[prayer as keyof typeof entry.prayers] = status;
    } else {
      // Create new entry
      this.mockPrayerData.push({
        date,
        userId: currentUser.id,
        prayers: {
          fajr: prayer === 'fajr' ? status : 'pending',
          dhuhr: prayer === 'dhuhr' ? status : 'pending',
          asr: prayer === 'asr' ? status : 'pending',
          maghrib: prayer === 'maghrib' ? status : 'pending',
          isha: prayer === 'isha' ? status : 'pending',
        },
      });
    }
    
    console.log(`FamilySharingService (Web): Updated prayer status - ${date} ${prayer}: ${status}`);
  }

  private getMockUserProfile() {
    return {
      id: 'current-user',
      name: 'Current User',
      email: 'user@example.com',
      photoURL: undefined
    };
  }

  isInFamily(): boolean {
    return !!this.currentFamilyId;
  }

  getCurrentFamilyId(): string | null {
    return this.currentFamilyId;
  }

  getCurrentFamilyName(): string {
    return this.familyName;
  }

  getCurrentFamilyCode(): string {
    return this.currentFamilyId || '';
  }

  getFamilyCode(): string {
    return this.currentFamilyId || '';
  }

  getFamilyMembers(): FamilyMember[] {
    return this.familyMembers;
  }

  cleanup(): void {
    console.log('FamilySharingService (Web): Cleaning up');
    if (this.unsubscribeCallback) {
      this.unsubscribeCallback();
      this.unsubscribeCallback = null;
    }
  }
}

export default new FamilySharingService();
