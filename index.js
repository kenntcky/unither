/**
 * @format
 */

import React from 'react';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import AppWrapper from './src/components/AppWrapper';

const RootComponent = () => {
  return (
    <AppWrapper>
      <App />
    </AppWrapper>
  );
};

AppRegistry.registerComponent(appName, () => RootComponent);
