/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';
import usePushNotifications from '../src/hooks/usePushNotifications';


jest.mock(
  '../src/navigation/RootNavigator',
  () => {
    const ReactModule =
      require('react');

    const {
      View,
    } = require('react-native');


    return function RootNavigatorMock() {
      return ReactModule.createElement(
        View,
        {
          testID:
            'root-navigator',
        },
      );
    };
  },
);


jest.mock(
  '../src/hooks/usePushNotifications',
  () => jest.fn(),
);


test(
  'renders the app shell and starts push notification setup',
  async () => {
    let renderer;


    await ReactTestRenderer.act(
      async () => {
        renderer =
          ReactTestRenderer.create(
            <App />,
          );

        await Promise.resolve();
      },
    );


    expect(
      renderer.root.findByProps({
        testID:
          'root-navigator',
      }),
    ).toBeTruthy();

    expect(
      usePushNotifications,
    ).toHaveBeenCalledTimes(1);


    ReactTestRenderer.act(
      () => {
        renderer.unmount();
      },
    );
  },
);
