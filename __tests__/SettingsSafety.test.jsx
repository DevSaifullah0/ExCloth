/* eslint-env jest */

import React from 'react';

import {
  Linking,
} from 'react-native';

import ReactTestRenderer from 'react-test-renderer';

import HelpSupport from '../src/screens/settings/HelpSupport';
import PolicyDetails from '../src/screens/settings/PolicyDetails';
import Preferences from '../src/screens/settings/Preferences';


const navigation = {
  goBack:
    jest.fn(),
};


const renderToText =
  renderer =>
    JSON.stringify(
      renderer.toJSON(),
    );


describe(
  'settings safety states',
  () => {
    test(
      'shows only app-wide supported preferences',
      () => {
        let renderer;


        ReactTestRenderer.act(
          () => {
            renderer =
              ReactTestRenderer.create(
                <Preferences
                  navigation={
                    navigation
                  }
                />,
              );
          },
        );


        const output =
          renderToText(
            renderer,
          );


        expect(
          output,
        ).toContain('Light');

        expect(
          output,
        ).toContain('English');

        expect(
          output,
        ).not.toContain('Dark');

        expect(
          output,
        ).not.toContain('Urdu');


        ReactTestRenderer.act(
          () => {
            renderer.unmount();
          },
        );
      },
    );


    test(
      'does not present unpublished policy copy as final',
      () => {
        let renderer;


        ReactTestRenderer.act(
          () => {
            renderer =
              ReactTestRenderer.create(
                <PolicyDetails
                  navigation={
                    navigation
                  }
                  route={{
                    params: {
                      policy:
                        'privacy',
                    },
                  }}
                />,
              );
          },
        );


        const output =
          renderToText(
            renderer,
          );


        expect(
          output,
        ).toContain(
          'Document unavailable',
        );

        expect(
          output,
        ).not.toContain(
          'product draft',
        );

        expect(
          output,
        ).not.toContain(
          '17 August 2026',
        );


        ReactTestRenderer.act(
          () => {
            renderer.unmount();
          },
        );
      },
    );


    test(
      'fails safely when support email is not configured',
      async () => {
        const openUrl =
          jest.spyOn(
            Linking,
            'openURL',
          ).mockResolvedValue();

        let renderer;


        ReactTestRenderer.act(
          () => {
            renderer =
              ReactTestRenderer.create(
                <HelpSupport
                  navigation={
                    navigation
                  }
                />,
              );
          },
        );


        await ReactTestRenderer.act(
          async () => {
            await renderer.root
              .findByProps({
                testID:
                  'contact-support-button',
              })
              .props.onPress();
          },
        );


        expect(
          renderToText(
            renderer,
          ),
        ).toContain(
          'Support Unavailable',
        );

        expect(
          openUrl,
        ).not.toHaveBeenCalled();


        ReactTestRenderer.act(
          () => {
            renderer.unmount();
          },
        );

        openUrl.mockRestore();
      },
    );
  },
);
