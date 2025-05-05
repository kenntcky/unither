import React from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A container component for screens that automatically handles bottom tab bar spacing
 * 
 * @param {Object} props Component props
 * @param {ReactNode} props.children Content to render
 * @param {Object} props.style Additional style for the container
 * @param {boolean} props.scroll Whether to wrap content in ScrollView (default: false)
 * @param {Object} props.contentContainerStyle Style for ScrollView contentContainerStyle
 * @param {boolean} props.withTabBarSpacing Whether to add bottom spacing for tab bar (default: true)
 */
const ScreenContainer = ({ 
  children, 
  style, 
  scroll = false, 
  contentContainerStyle, 
  withTabBarSpacing = true,
  ...props 
}) => {
  const insets = useSafeAreaInsets();
  
  // Add bottom padding to account for tab bar (approximately 75px)
  const bottomSpacing = withTabBarSpacing ? 75 : 0;
  
  if (scroll) {
    return (
      <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            withTabBarSpacing && { paddingBottom: bottomSpacing },
            contentContainerStyle
          ]}
          showsVerticalScrollIndicator={false}
          {...props}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView 
      style={[
        styles.container, 
        withTabBarSpacing && { paddingBottom: bottomSpacing },
        style
      ]} 
      edges={['top', 'left', 'right']}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
});

export default ScreenContainer; 