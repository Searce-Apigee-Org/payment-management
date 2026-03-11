import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import * as commonSchemas from '../../../src/validations/v2/commonSchemas.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Validation :: commonSchemas', () => {
  describe('entityIdsSchema', () => {
    it('should pass with valid entityIds', () => {
      const input = [
        { id: 'E1', type: 'ACCOUNT' },
        { id: 'E2', type: 'USER' },
      ];
      const { error } = commonSchemas.entityIdsSchema.validate(input);
      expect(error).to.not.exist();
    });

    it('should fail when id or type is missing', () => {
      const input = [{ id: 'E1' }];
      const { error } = commonSchemas.entityIdsSchema.validate(input);
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      expect(messages.some((m) => m.includes('type'))).to.be.true();
    });
  });

  describe('transactionProfileSchema', () => {
    it('should pass for valid profile', () => {
      const profile = {
        lastName: 'Doe',
        firstName: 'Jane',
        email: 'jane@globe.com.ph',
        dateOfBirth: '1990-01-01',
      };
      const { error } =
        commonSchemas.transactionProfileSchema.validate(profile);
      expect(error).to.not.exist();
    });

    it('should fail if transactionType=S and dateOfBirth missing', () => {
      const payload = {
        breakdown: [
          {
            transactionType: 'S',
            transactions: [
              {
                transactionProfile: {
                  lastName: 'Doe',
                  firstName: 'Jane',
                  email: 'jane@globe.com.ph',
                },
                amount: 100,
              },
            ],
          },
        ],
      };

      const { error } = commonSchemas.settlementInfoSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();

      const detailsString = JSON.stringify(error.details);
      expect(detailsString).to.include('dateOfBirth');
    });
  });

  describe('transactionSchema', () => {
    it('should pass for valid BuyLoad transaction', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'BuyLoad',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            { amount: 100, keyword: 'LOAD10', serviceId: '1234', wallet: 'A' },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.not.exist();
    });

    it('should fail if amount has too many decimal places', () => {
      const { error } = commonSchemas.transactionSchema.validate(
        { amount: 10.999 },
        { prefs: { abortEarly: false } }
      );
      expect(error).to.exist();

      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(error.details.some((d) => d.type === 'any.invalid')).to.be.true();
    });

    it('should fail for empty transaction object', () => {
      const { error } = commonSchemas.transactionSchema.validate(
        {},
        { prefs: { abortEarly: false } }
      );
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      expect(messages.some((m) => m.includes('is required'))).to.be.true();
    });

    it('should fail if amount is 0 and transactionType is invalid', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyLoad',
          transactions: [{ amount: 0, keyword: 'LOAD10', serviceId: '1234' }],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message.toString()
      );
      expect(
        messages.some((m) => m.includes('amount is required'))
      ).to.be.true();
    });

    it('should fail for BuyLoad/BuyPromo missing amount', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'BuyLoad',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [{ keyword: 'LOAD10', serviceId: '1234', wallet: 'A' }],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message.toString()
      );
      expect(
        messages.some((m) => m.includes('amount is required'))
      ).to.be.true();
    });

    it('should fail for BuyLoad missing keyword/param/wallet', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'BuyLoad',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              serviceId: '1234',
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some(
          (m) =>
            m.includes('keyword') || m.includes('param') || m.includes('wallet')
        )
      ).to.be.true();
    });

    it('should fail for BuyPromo missing keyword/param/wallet', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'BuyPromo',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some(
          (m) =>
            m.includes('keyword') || m.includes('param') || m.includes('wallet')
        )
      ).to.be.true();
    });

    it('should fail for BuyLoad with param or requestType BuyPromo missing serviceId', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'BuyPromo',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              param: 'PROMO1',
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some((m) => m.includes('serviceId is required'))
      ).to.be.true();
    });

    it('should fail for BuyRoaming missing serviceId/keyword', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyRoaming',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some(
          (m) =>
            m.includes('serviceId is required') ||
            m.includes('keyword is required')
        )
      ).to.be.true();
    });

    it('should fail for transactionType O or S missing transactionProfile', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [{ amount: 100 }], // missing transactionProfile
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some((m) => m.includes('transactionProfile is required'))
      ).to.be.true();
    });

    it('should fail for Oona transactionProfile missing mobileNumber', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              oonaSkus: ['oonaCompTravel-123'],
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
              },
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(messages.some((m) => m.includes('mobileNumber'))).to.be.true();
    });

    it('should fail if transactionProfile missing for O transactionType', () => {
      const payload = [
        {
          transactionType: 'O',
          requestType: 'BuyPromo',
          amount: 0,
          transactions: [
            {
              amount: 0,
              serviceId: '1234',
              param: 'PROMO1',
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const hasRequiredError =
        error.details.some((d) => d.type === 'any.required') ||
        error.details.some((d) =>
          d.context?.message?.includes('transactionProfile')
        );

      expect(hasRequiredError).to.be.true();
    });

    it('should fail for ChangeSim missing transactionId', () => {
      const payload = [
        {
          transactionType: 'N',
          requestType: 'ChangeSim',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );

      expect(
        messages.some((m) =>
          m.includes('transactionId is required for ChangeSim')
        )
      ).to.be.true();
    });

    it('should fail for Oona transactionProfile missing startDate', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              oonaSkus: ['oonaCompTravel-123'],
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
              },
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(messages.some((m) => m.includes('startDate'))).to.be.true();
    });

    it('should fail for Oona transactionProfile missing endDate', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              oonaSkus: ['oonaCompTravel-123'],
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
                startDate: '2024-01-01',
              },
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(messages.some((m) => m.includes('endDate'))).to.be.true();
    });

    it('should fail for Oona and amount is 0 if serviceId and param are missing', () => {
      const payload = [
        {
          transactionType: 'O',
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 0,
              oonaSkus: ['oonaCompTravel-123'],
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
                startDate: '2024-01-01',
                endDate: '2025-12-31',
              },
            },
          ],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some((m) =>
          m.includes(
            'serviceId and param field combination is required when transactionType is O and amount is 0'
          )
        )
      ).to.be.true();
    });
  });

  describe('breakdownSchema', () => {
    it('should pass for valid BuyLoad breakdown', () => {
      const payload = [
        {
          accountId: '1234567890',
          mobileNumber: '639171234567',
          amount: 100,
          transactionType: 'G',
          requestType: 'BuyLoad',
          transactions: [
            {
              amount: 100,
              keyword: 'LOAD10',
              serviceId: '1234',
              wallet: 'A',
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.not.exist();
    });

    it('should fail if more than one of accountId, mobileNumber, landlineNumber is present for PayBills', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'PayBills',
          amount: 100,
          accountId: '1234567890',
          mobileNumber: '639171234567',
          landlineNumber: '021234567',
          transactions: [{ amount: 100 }],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      const hasSpecific = messages.some((m) =>
        m.includes(
          'One of accountId, mobileNumber, or landlineNumber is required'
        )
      );
      const hasGeneric = messages.some((m) => m.includes('is required'));
      expect(hasSpecific || hasGeneric).to.be.true();
    });

    it('should fail if none of accountId, mobileNumber, landlineNumber is present for PayBills', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'PayBills',
          amount: 100,
          transactions: [{ amount: 100 }],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      const hasSpecific = messages.some((m) =>
        m.includes(
          'One of accountId, mobileNumber, or landlineNumber is required'
        )
      );
      const hasGeneric = messages.some((m) => m.includes('is required'));
      expect(hasSpecific || hasGeneric).to.be.true();
    });

    it('should fail if both accountId and mobileNumber are missing for non-PayBills transactionType', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyPromo',
          amount: 100,
          transactions: [{ amount: 100, param: 'PROMO1', serviceId: '1234' }],
        },
      ];
      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      const hasSpecific = messages.some((m) =>
        m.includes('accountId or mobileNumber is required')
      );
      const hasGeneric = messages.some((m) => m.includes('is required'));
      expect(hasSpecific || hasGeneric).to.be.true();
    });

    it('should fail if amount missing for transactionType G', () => {
      const payload = [
        {
          mobileNumber: '639171234567',
          transactionType: 'G',
          requestType: 'BuyLoad',
          transactions: [{ amount: 100, keyword: 'LOAD10', serviceId: '1234' }],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      expect(error).to.exist();

      const hasAmountError =
        error.details.some((d) => d.type === 'any.required') ||
        error.details.some((d) =>
          d.context?.message?.includes('amount is required')
        );

      expect(hasAmountError).to.be.true();
    });

    it('should fail if mobileNumber/accountId/landlineNumber is missing for transactionType G reqType PayBills', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'PayBills',
          amount: 100,
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const Err =
        error.details.some((d) => d.type === 'any.required') ||
        error.details.some((d) =>
          d.context?.message?.includes(
            'One of accountId, mobileNumber, or landlineNumber is required'
          )
        );

      expect(Err).to.be.true();
    });

    it('should fail if mobileNumber/accountId/landlineNumber is missing for transactionType G', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyPromo',
          amount: 100,
          transactions: [{ amount: 100, param: 'LOAD10', serviceId: '1234' }],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const Err =
        error.details.some((d) => d.type === 'any.required') ||
        error.details.some((d) =>
          d.context?.message?.includes('accountId or mobileNumber is required')
        );

      expect(Err).to.be.true();
    });

    it('should fail if S and O are combined', () => {
      const payload = [
        {
          transactionType: 'S',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              transactionProfile: {
                lastName: 'Doe',
                firstName: 'Jane',
                email: 'jane@globe.com.ph',
                dateOfBirth: '1990-01-01',
              },
            },
          ],
        },
        {
          transactionType: 'O',
          amount: 200,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 200,
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
                startDate: '2024-01-01',
                endDate: '2024-01-05',
              },
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();

      const hasSOError =
        error.details.some((d) => d.type === 'any.invalid') ||
        error.details.some((d) =>
          d.context?.message?.includes('S and O cannot be combined')
        );

      expect(hasSOError).to.be.true();
    });

    it('should fail if no transaction when transaction is S or O', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 200,
          mobileNumber: '639171234567',
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(messages.some((m) => m.includes('is required'))).to.be.true();
    });

    it('should fail if no breakdown aside from Singlife breakdown', () => {
      const payload = [
        {
          transactionType: 'S',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              transactionProfile: {
                lastName: 'Doe',
                firstName: 'Jane',
                email: 'jane@globe.com.ph',
                dateOfBirth: '1990-01-01',
              },
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.exist();
      const messages = error.details.map(
        (d) => d.context?.message || d.message || ''
      );
      expect(
        messages.some((m) =>
          m.includes(
            'If transactionType S is present, at least one transaction must have transactionType G or N'
          )
        )
      ).to.be.true();
    });

    it('should pass when transactionType S is combined with G', () => {
      const payload = [
        {
          transactionType: 'S',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              transactionProfile: {
                lastName: 'Doe',
                firstName: 'Jane',
                email: 'jane@globe.com.ph',
                dateOfBirth: '1990-01-01',
              },
            },
          ],
        },
        {
          transactionType: 'G',
          requestType: 'BuyLoad',
          amount: 50,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 50,
              keyword: 'LOAD10',
              serviceId: '1234',
              wallet: 'A',
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.not.exist();
    });

    it('should pass when transactionType S is combined with N', () => {
      const payload = [
        {
          transactionType: 'S',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              transactionProfile: {
                lastName: 'Doe',
                firstName: 'Jane',
                email: 'jane@globe.com.ph',
                dateOfBirth: '1990-01-01',
              },
            },
          ],
        },
        {
          transactionType: 'N',
          requestType: 'BuyLoad',
          amount: 50,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 50,
              keyword: 'LOAD10',
              serviceId: '1234',
              wallet: 'A',
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.not.exist();
    });

    it('should pass when no S transactionType exists', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyLoad',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              keyword: 'LOAD10',
              serviceId: '1234',
              wallet: 'A',
            },
          ],
        },
        {
          transactionType: 'O',
          amount: 200,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 200,
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
                startDate: '2024-01-01',
                endDate: '2024-01-05',
              },
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.not.exist();
    });

    it('should pass when only O transactionType exists', () => {
      const payload = [
        {
          transactionType: 'O',
          amount: 200,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 200,
              transactionProfile: {
                lastName: 'Smith',
                firstName: 'John',
                email: 'john@globe.com.ph',
                mobileNumber: '639171234567',
                startDate: '2024-01-01',
                endDate: '2024-01-05',
              },
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.not.exist();
    });

    it('should pass when only G transactionType exists', () => {
      const payload = [
        {
          transactionType: 'G',
          requestType: 'BuyLoad',
          amount: 100,
          mobileNumber: '639171234567',
          transactions: [
            {
              amount: 100,
              keyword: 'LOAD10',
              serviceId: '1234',
              wallet: 'A',
            },
          ],
        },
      ];

      const { error } = commonSchemas.breakdownSchema.validate(payload, {
        prefs: { abortEarly: false },
      });

      expect(error).to.not.exist();
    });
  });

  describe('settlementInfoSchema', () => {
    it('should pass when valid breakdown provided', () => {
      const payload = {
        breakdown: [
          {
            accountId: '1234567890',
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 100,
            transactions: [
              { amount: 100, keyword: 'LOAD10', serviceId: '1234' },
            ],
          },
        ],
      };

      const { error } = commonSchemas.settlementInfoSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.not.exist();
    });

    it('should fail when breakdown missing', () => {
      const payload = {};
      const { error } = commonSchemas.settlementInfoSchema.validate(payload, {
        prefs: { abortEarly: false },
      });
      expect(error).to.exist();
      const messages = error.details.map((d) => d.message);
      expect(messages.some((m) => m.includes('breakdown'))).to.be.true();
    });
  });
});
