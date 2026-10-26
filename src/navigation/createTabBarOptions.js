const createTabBarOptions = insets => {
  return {
    headerShown: false,
    tabBarActiveTintColor: '#000000',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: {
      height: 58 + insets.bottom,
      paddingTop: 7,
      paddingBottom: Math.max(insets.bottom, 8),
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
    },
  };
};

export default createTabBarOptions;
