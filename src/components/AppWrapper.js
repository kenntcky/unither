import React, { useState } from 'react';
import { View } from 'react-native';
import SplashScreen from './SplashScreen';

function AppWrapper({ children }) {
  const [isSplashDone, setIsSplashDone] = useState(false);

  const handleSplashFinish = () => {
    setIsSplashDone(true);
  };

  if (!isSplashDone) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}

export default AppWrapper; 