import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

export default function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textMid,
    letterSpacing: 0.3,
  },
  action: {
    fontSize: Typography.xs,
    color: Colors.greenMain,
    fontWeight: '600',
  },
});
