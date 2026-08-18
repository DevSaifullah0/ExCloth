/* eslint-env jest */

import {
  buildSupportEmailUrl,
  getSafeHttpsUrl,
  normalizeSupportEmail,
} from '../src/utils/externalLinks';


describe(
  'external link helpers',
  () => {
    test(
      'builds an encoded support email URL',
      () => {
        expect(
          buildSupportEmailUrl(
            ' support@example.com ',
            {
              subject:
                'Order #123',
              body:
                'Please help\nThanks',
            },
          ),
        ).toBe(
          'mailto:support@example.com?subject=Order%20%23123&body=Please%20help%0AThanks',
        );
      },
    );


    test.each([
      undefined,
      '',
      'support',
      'support@example',
      'support@example.com\r\nBcc:attacker@example.com',
    ])(
      'rejects an invalid support recipient: %p',
      value => {
        expect(
          normalizeSupportEmail(
            value,
          ),
        ).toBeNull();

        expect(
          buildSupportEmailUrl(
            value,
          ),
        ).toBeNull();
      },
    );


    test(
      'accepts only credential-free HTTPS policy links',
      () => {
        expect(
          getSafeHttpsUrl(
            'https://example.com/legal/privacy',
          ),
        ).toBe(
          'https://example.com/legal/privacy',
        );

        expect(
          getSafeHttpsUrl(
            'http://example.com/privacy',
          ),
        ).toBeNull();

        expect(
          getSafeHttpsUrl(
            [
              'javascript',
              ':alert(1)',
            ].join(''),
          ),
        ).toBeNull();

        expect(
          getSafeHttpsUrl(
            'https://user:password@example.com/privacy',
          ),
        ).toBeNull();
      },
    );
  },
);
