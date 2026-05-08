import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../theme';

export function PrimaryButton({ label, onPress, loading, style }) {
  return (
    <TouchableOpacity
      style={[styles.primary, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.primaryText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress, style }) {
  return (
    <TouchableOpacity
      style={[styles.secondary, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.greenMain,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondary: {
    backgroundColor: Colors.greenPale,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Colors.greenMain,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
});
