import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '../theme';

const variants = {
  green:  { bg: Colors.greenPale,  text: Colors.greenMain },
  red:    { bg: '#FDEDEC',         text: Colors.appleRed  },
  blue:   { bg: Colors.skyLight,   text: Colors.skyBlue   },
  gold:   { bg: Colors.goldLight,  text: Colors.gold      },
  brown:  { bg: '#FAF0E6',         text: Colors.brown     },
};

export default function Tag({ label, variant = 'green', style }) {
  const v = variants[variant] || variants.green;
  return (
    <View style={[styles.tag, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
});
