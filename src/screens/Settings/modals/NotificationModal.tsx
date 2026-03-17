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
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

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
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Reminder Settings</Text>
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
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.settings.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.settings.modalBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  modalClose: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.settings.modalClose,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  modalBody: {
    flex: 1,
  },
});
