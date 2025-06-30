import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import StorageService from './StorageService';
import { FamilyMember, FamilyGroup, FamilyPrayerStatus, FamilyChallenge } from '../types';

class FamilySharingService {
  private familyGroupId: string | null = null;
  private familyMembers: FamilyMember[] = [];
  private unsubscribers: (() => void)[] = [];

  async initialize() {
    try {
      // Check if user has premium with family sharing
      const isPremium = await StorageService.isPremiumActive();
      const features = StorageService.getPremiumFeatures();
      
      if (!isPremium || !features.familySharing) {
        return false;
      }

      // Get or create user account
      await this.ensureUserAuthenticated();
      
      // Load family group
      await this.loadFamilyGroup();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize family sharing:', error);
      return false;
    }
  }

  private async ensureUserAuthenticated() {
    const currentUser = auth().currentUser;
    
    if (!currentUser) {
      // Anonymous auth for family sharing
      await auth().signInAnonymously();
    }
  }

  async createFamilyGroup(groupName: string): Promise<string> {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const familyGroup: FamilyGroup = {
        id: '',
        name: groupName,
        createdBy: userId,
        createdAt: new Date(),
        members: [{
          id: userId,
          name: StorageService.getUserSettings()?.name || 'Me',
          role: 'parent',
          joinedAt: new Date(),
          avatar: this.generateAvatar(userId),
        }],
        inviteCode: this.generateInviteCode(),
        settings: {
          shareLocation: false,
          sharePrayerTimes: true,
          shareAchievements: true,
          allowChallenges: true,
        },
      };

      const docRef = await firestore()
        .collection('familyGroups')
        .add(familyGroup);

      familyGroup.id = docRef.id;
      this.familyGroupId = docRef.id;

      // Update user document
      await firestore()
        .collection('users')
        .doc(userId)
        .set({
          familyGroupId: docRef.id,
          updatedAt: new Date(),
        }, { merge: true });

      return docRef.id;
    } catch (error) {
      console.error('Failed to create family group:', error);
      throw error;
    }
  }

  async joinFamilyGroup(inviteCode: string, memberName: string, role: 'parent' | 'child' = 'child'): Promise<boolean> {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Find family group by invite code
      const querySnapshot = await firestore()
        .collection('familyGroups')
        .where('inviteCode', '==', inviteCode)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        throw new Error('Invalid invite code');
      }

      const familyDoc = querySnapshot.docs[0];
      const familyData = familyDoc.data() as FamilyGroup;

      // Check if already a member
      if (familyData.members.some(m => m.id === userId)) {
        throw new Error('Already a member of this family');
      }

      // Add new member
      const newMember: FamilyMember = {
        id: userId,
        name: memberName,
        role,
        joinedAt: new Date(),
        avatar: this.generateAvatar(userId),
      };

      await familyDoc.ref.update({
        members: firestore.FieldValue.arrayUnion(newMember),
      });

      // Update user document
      await firestore()
        .collection('users')
        .doc(userId)
        .set({
          familyGroupId: familyDoc.id,
          updatedAt: new Date(),
        }, { merge: true });

      this.familyGroupId = familyDoc.id;
      return true;
    } catch (error) {
      console.error('Failed to join family group:', error);
      throw error;
    }
  }

  async loadFamilyGroup() {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return null;

      // Get user's family group ID
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();
      if (!userData?.familyGroupId) return null;

      this.familyGroupId = userData.familyGroupId;

      // Subscribe to family group updates
      this.subscribeToFamilyUpdates();

      return this.familyGroupId;
    } catch (error) {
      console.error('Failed to load family group:', error);
      return null;
    }
  }

  private subscribeToFamilyUpdates() {
    if (!this.familyGroupId) return;

    // Subscribe to family members' prayer status
    const unsubscribe = firestore()
      .collection('familyGroups')
      .doc(this.familyGroupId)
      .onSnapshot((doc) => {
        if (doc.exists()) {
          const data = doc.data() as FamilyGroup;
          this.familyMembers = data.members;
        }
      });

    this.unsubscribers.push(unsubscribe);
  }

  async updateMyPrayerStatus(prayerName: string, status: 'prayed' | 'missed', location?: { lat: number; lng: number }) {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId || !this.familyGroupId) return;

      const today = new Date().toISOString().split('T')[0];
      const statusUpdate: FamilyPrayerStatus = {
        userId,
        date: today,
        prayers: {
          [prayerName]: {
            status,
            time: new Date(),
            location,
          },
        },
      };

      // Update in family prayer status collection
      await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('prayerStatus')
        .doc(`${userId}_${today}`)
        .set(statusUpdate, { merge: true });
    } catch (error) {
      console.error('Failed to update prayer status:', error);
    }
  }

  async getFamilyPrayerStatus(date: Date = new Date()): Promise<FamilyPrayerStatus[]> {
    try {
      if (!this.familyGroupId) return [];

      const dateStr = date.toISOString().split('T')[0];
      const snapshot = await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('prayerStatus')
        .where('date', '==', dateStr)
        .get();

      return snapshot.docs.map(doc => doc.data() as FamilyPrayerStatus);
    } catch (error) {
      console.error('Failed to get family prayer status:', error);
      return [];
    }
  }

  async createFamilyChallenge(challenge: Omit<FamilyChallenge, 'id' | 'createdAt'>): Promise<string> {
    try {
      if (!this.familyGroupId) throw new Error('No family group');

      const newChallenge: FamilyChallenge = {
        ...challenge,
        id: '',
        createdAt: new Date(),
        progress: {},
      };

      // Initialize progress for all members
      this.familyMembers.forEach(member => {
        newChallenge.progress[member.id] = {
          current: 0,
          completed: false,
        };
      });

      const docRef = await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('challenges')
        .add(newChallenge);

      return docRef.id;
    } catch (error) {
      console.error('Failed to create family challenge:', error);
      throw error;
    }
  }

  async updateChallengeProgress(challengeId: string, progress: number) {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId || !this.familyGroupId) return;

      await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('challenges')
        .doc(challengeId)
        .update({
          [`progress.${userId}.current`]: progress,
          [`progress.${userId}.completed`]: progress >= 100,
          [`progress.${userId}.completedAt`]: progress >= 100 ? new Date() : null,
        });
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }
  }

  async getActiveChallenges(): Promise<FamilyChallenge[]> {
    try {
      if (!this.familyGroupId) return [];

      const now = new Date();
      const snapshot = await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('challenges')
        .where('endDate', '>', now)
        .get();

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as FamilyChallenge));
    } catch (error) {
      console.error('Failed to get active challenges:', error);
      return [];
    }
  }

  async sendPrayerReminder(memberId: string, prayerName: string, message?: string) {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId || !this.familyGroupId) return;

      const reminder = {
        from: userId,
        to: memberId,
        prayerName,
        message: message || `Don't forget ${prayerName} prayer! 🤲`,
        sentAt: new Date(),
        read: false,
      };

      await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('reminders')
        .add(reminder);
    } catch (error) {
      console.error('Failed to send prayer reminder:', error);
    }
  }

  async getFamilyStats(period: 'week' | 'month' = 'week'): Promise<{
    memberStats: { [memberId: string]: { completion: number; streak: number } };
    topPerformer: FamilyMember | null;
    familyAverage: number;
  }> {
    try {
      if (!this.familyGroupId) {
        return { memberStats: {}, topPerformer: null, familyAverage: 0 };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : 30));

      // Get prayer status for the period
      const snapshot = await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('prayerStatus')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .get();

      const memberStats: { [memberId: string]: { completion: number; streak: number; total: number } } = {};

      // Calculate stats
      snapshot.docs.forEach(doc => {
        const data = doc.data() as FamilyPrayerStatus;
        if (!memberStats[data.userId]) {
          memberStats[data.userId] = { completion: 0, streak: 0, total: 0 };
        }

        const prayers = Object.values(data.prayers || {});
        const prayed = prayers.filter(p => p.status === 'prayed').length;
        memberStats[data.userId].total += 5; // 5 prayers per day
        memberStats[data.userId].completion += prayed;
      });

      // Calculate completion rates and find top performer
      let topPerformer: FamilyMember | null = null;
      let highestRate = 0;
      let totalCompletion = 0;
      let memberCount = 0;

      Object.entries(memberStats).forEach(async ([memberId, stats]) => {
        const rate = stats.total > 0 ? (stats.completion / stats.total) * 100 : 0;
        totalCompletion += rate;
        memberCount++;

        if (rate > highestRate) {
          highestRate = rate;
          topPerformer = this.familyMembers.find(m => m.id === memberId) || null;
        }

        memberStats[memberId] = {
          completion: Math.round(rate),
          streak: await this.calculateStreak(memberId), 
          total: stats.total,
        };
      });

      const familyAverage = memberCount > 0 ? Math.round(totalCompletion / memberCount) : 0;

      return { 
        memberStats: memberStats as any, 
        topPerformer, 
        familyAverage 
      };
    } catch (error) {
      console.error('Failed to get family stats:', error);
      return { memberStats: {}, topPerformer: null, familyAverage: 0 };
    }
  }

  private async calculateStreak(memberId: string): Promise<number> {
    try {
      if (!this.familyGroupId) return 0;
      
      const today = new Date();
      // Look back up to 100 days to find streak (reasonable limit)
      const oldestDate = new Date();
      oldestDate.setDate(oldestDate.getDate() - 100);
      
      const snapshot = await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .collection('prayerStatus')
        .where('userId', '==', memberId)
        .where('date', '<=', today.toISOString().split('T')[0])
        .where('date', '>=', oldestDate.toISOString().split('T')[0])
        .orderBy('date', 'desc') // Most recent first
        .get();
      
      if (snapshot.empty) return 0;
      
      // Convert to array of objects with date and prayed status
      const prayerDays = snapshot.docs.map(doc => {
        const data = doc.data() as FamilyPrayerStatus;
        const prayers = Object.values(data.prayers || {});
        const hasCompletedPrayer = prayers.some(p => p.status === 'prayed');
        return {
          date: data.date,
          prayed: hasCompletedPrayer
        };
      });
      
      // Sort by date descending (newest first)
      prayerDays.sort((a, b) => b.date.localeCompare(a.date));
      
      // Check if today has a prayer record
      const todayStr = today.toISOString().split('T')[0];
      const hasTodayRecord = prayerDays.some(day => day.date === todayStr);
      
      if (!hasTodayRecord || !prayerDays[0].prayed) {
        // If no prayer today or missed today's prayer, check yesterday onwards
        return this.countConsecutiveDays(prayerDays, 1); // Start from yesterday
      }
      
      // Count consecutive days including today
      return this.countConsecutiveDays(prayerDays, 0);
      
    } catch (error) {
      console.error('Failed to calculate streak:', error);
      return 0;
    }
  }

  private countConsecutiveDays(prayerDays: Array<{date: string, prayed: boolean}>, startIdx: number): number {
    let streak = 0;
    let currentDate = new Date();
    
    // If starting from yesterday
    if (startIdx > 0) {
      currentDate.setDate(currentDate.getDate() - startIdx);
    }
    
    for (let i = startIdx; i < prayerDays.length; i++) {
      const expectedDateStr = currentDate.toISOString().split('T')[0];
      const prayerDay = prayerDays[i];
      
      // Check if this is the expected date and prayer was completed
      if (prayerDay.date === expectedDateStr && prayerDay.prayed) {
        streak++;
        // Move to the next expected day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Break streak if day is missing or prayer was missed
        break;
      }
    }
    
    return streak;
  }

  private generateAvatar(userId: string): string {
    // Generate a consistent avatar based on user ID
    const avatars = ['👦', '👧', '🧑', '👨', '👩', '🧔', '👳‍♂️', '👳‍♀️'];
    const index = userId.charCodeAt(0) % avatars.length;
    return avatars[index];
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getFamilyMembers(): FamilyMember[] {
    return this.familyMembers;
  }

  getFamilyGroupId(): string | null {
    return this.familyGroupId;
  }

  async leaveFamilyGroup() {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId || !this.familyGroupId) return;

      // Remove from family group
      await firestore()
        .collection('familyGroups')
        .doc(this.familyGroupId)
        .update({
          members: firestore.FieldValue.arrayRemove(
            this.familyMembers.find(m => m.id === userId)
          ),
        });

      // Update user document
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          familyGroupId: firestore.FieldValue.delete(),
        });

      this.cleanup();
    } catch (error) {
      console.error('Failed to leave family group:', error);
    }
  }

  cleanup() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    this.familyGroupId = null;
    this.familyMembers = [];
  }
}

export default new FamilySharingService();