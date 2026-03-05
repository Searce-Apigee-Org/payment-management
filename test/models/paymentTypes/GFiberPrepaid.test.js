import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { validateGFiberRequest } from '../../../src/models/paymentTypes/GFiberPrepaid.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Util :: RequestValidator :: GFiberValidator :: validateGFiberRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = {
      accountNumber: '1234567890',
      emailAddress: 'test@example.com',
      amount: 500,
      transactionType: 'N',
      requestType: 'BBPrepaidRepair',
      createOrderExternal: [
        {
          accountId: 'ACC123',
          targetType: 1,
          entityIds: [
            { id: 'E1', type: 'Router' },
            { id: 'E2', type: 'Modem' },
          ],
          appointmentBooking: [
            {
              notes: 'Fix wiring issue',
              orderId: 'ORD001',
              orderActionId: 'ACT001',
              preferredAppointmentSlot: {
                date: '2025-11-07',
                slot: '9AM-11AM',
              },
            },
          ],
        },
      ],
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw InsufficientParameters when accountNumber missing', async () => {
    delete validPayload.accountNumber;
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InsufficientParameters when createOrderExternal missing', async () => {
    delete validPayload.createOrderExternal;
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when transactionType is invalid', async () => {
    validPayload.transactionType = 'X';
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters when entityIds missing inside createOrderExternal', async () => {
    delete validPayload.createOrderExternal[0].entityIds;
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InsufficientParameters when appointmentBooking missing for non-BBPrepaidPromo', () => {
    delete validPayload.createOrderExternal[0].appointmentBooking;
    try {
      validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should pass when requestType is BBPrepaidPromo and appointmentBooking omitted', () => {
    validPayload.requestType = 'BBPrepaidPromo';
    delete validPayload.createOrderExternal[0].appointmentBooking;
    validateGFiberRequest(validPayload);
  });

  it('should throw InvalidParameter when appointmentBooking has unknown field', async () => {
    validPayload.createOrderExternal[0].appointmentBooking[0].extra = 'oops';
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters when appointmentBooking slot missing', async () => {
    delete validPayload.createOrderExternal[0].appointmentBooking[0]
      .preferredAppointmentSlot.slot;
    try {
      await validateGFiberRequest(validPayload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });
});
