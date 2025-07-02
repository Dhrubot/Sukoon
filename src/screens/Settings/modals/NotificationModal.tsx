// src/screens/Settings/modals/NotificationModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import NotificationSettings from '../../../components/settings/NotificationSettings';
import { UserSettings } from '../../../types';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  userSettings,
  onUpdateSettings,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notification Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <NotificationSettings 
            userSettings={userSettings}
            onUpdateSettings={onUpdateSettings}
          />
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  modalClose: {
    fontSize: 16,
    color: '#1B5E3F',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
});