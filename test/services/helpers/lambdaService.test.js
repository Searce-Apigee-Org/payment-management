import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import sinon from 'sinon';

const lab = Lab.script();
const { describe, it, before } = lab;
export { lab };

const buildLambdaConfig = () => ({
  region: 'ap-southeast-1',
  buyLoad: {
    resource: '/v1/paymentManagement/topUp/{customerId}',
    arn: 'arn:buyLoad',
  },
  paymentStatusCallback: { arn: 'arn:paymentStatusCallback' },
  prepaidFiberServiceOrders: {
    arn: 'arn:prepaidFiberServiceOrders',
    path: '/v1/serviceOrdering/fiber/orders',
  },
  prepaidFiberRepairOrders: {
    arn: 'arn:prepaidFiberRepairOrders',
    path: '/v1/workforceManagement/prepaidFiber/repairOrders',
  },
  purchasePromo: {
    arn: 'arn:purchasePromo',
    path: '/v1/productOrdering',
  },
  createPromoVouchers: { arn: 'arn:createPromoVouchers' },
  ecPayProcessTransaction: { arn: 'arn:ecPayProcessTransaction' },
  paymentSendEmail: { arn: 'arn:paymentSendEmail' },
  processCSPayment: { arn: 'arn:processCSPayment' },
  addAccountQuest: { arn: 'arn:addAccountQuest' },
  createPolicy: { arn: 'arn:createPolicy' },
  loyaltyPointsSimulator: { arn: 'arn:loyaltyPointsSimulator' },
});

let lambdaService;

before(async () => {
  lambdaService = await esmock(
    '../../../src/services/helpers/lambdaService.js',
    {
      '../../../convict/config.js': {
        config: {
          get: (key) => {
            // In production we call config.get('lambda') and config.get('NODE_ENV').
            if (key === 'lambda') {
              return buildLambdaConfig();
            }

            if (key === 'NODE_ENV') {
              return 'lambda';
            }

            throw new Error(`Unexpected config.get key in test: ${key}`);
          },
        },
      },
    }
  );
});

describe('Helpers :: lambdaService', () => {
  it('buyLoadLambda invokes lambda with expected payload (resource + pathParameters)', async () => {
    const invokeLambda = sinon.stub().resolves();

    await lambdaService.buyLoadLambda({
      invokeLambda,
      payload: { mobileNumber: '0917', amount: 10 },
    });

    expect(invokeLambda.calledOnce).to.equal(true);

    const [arn, invocationType, payload, region, logType] =
      invokeLambda.firstCall.args;

    expect(arn).to.equal('arn:buyLoad');
    expect(invocationType).to.equal('Event');
    expect(region).to.equal('ap-southeast-1');
    expect(logType).to.equal(false);

    expect(payload.httpMethod).to.equal('POST');
    expect(payload.resource).to.equal(
      '/v1/paymentManagement/topUp/{customerId}'
    );
    expect(payload.pathParameters).to.equal({ customerId: '0917' });
    expect(payload.body).to.equal(
      JSON.stringify({ mobileNumber: '0917', amount: 10 })
    );
  });

  it('paymentStatusCallbackLambda invokes lambda with expected payload', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { tokenPaymentId: 'PAY123', status: 'SUCCESS' };

    await lambdaService.paymentStatusCallbackLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:paymentStatusCallback');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('prepaidFiberServiceOrdersLambda invokes lambda with expected path', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { orderId: '1' };

    await lambdaService.prepaidFiberServiceOrdersLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:prepaidFiberServiceOrders');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      path: '/v1/serviceOrdering/fiber/orders',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('prepaidFiberRepairOrdersLambda invokes lambda with expected path', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { orderId: '2' };

    await lambdaService.prepaidFiberRepairOrdersLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:prepaidFiberRepairOrders');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      path: '/v1/workforceManagement/prepaidFiber/repairOrders',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('purchasePromoLambda invokes lambda with expected path', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { keyword: 'PROMO', mobileNumber: '0917' };

    await lambdaService.purchasePromoLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:purchasePromo');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      path: '/v1/productOrdering',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('createPromoVouchersLambda invokes lambda with expected payload', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { tokenPaymentId: 'PAY123', vouchers: [] };

    await lambdaService.createPromoVouchersLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:createPromoVouchers');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('ecPayProcessTransactionLambda invokes lambda with expected payload', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { transactionId: '1' };

    await lambdaService.ecPayProcessTransactionLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:ecPayProcessTransaction');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('paymentSendEmailLambda invokes lambda with shaped body (tokenPaymentId + ipAddress)', async () => {
    const invokeLambda = sinon.stub().resolves();

    await lambdaService.paymentSendEmailLambda({
      invokeLambda,
      payload: {
        tokenPaymentId: 'PAY123',
        ipAddress: '1.1.1.1',
        extra: 'ignored',
      },
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:paymentSendEmail');
    expect(invocationType).to.equal('Event');

    expect(payload.httpMethod).to.equal('POST');
    expect(payload.body).to.equal(
      JSON.stringify({ tokenPaymentId: 'PAY123', ipAddress: '1.1.1.1' })
    );
  });

  it('processCSPaymentLambda invokes lambda with expected payload', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { accountNumber: '123' };

    await lambdaService.processCSPaymentLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:processCSPayment');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('createPolicyLambda invokes lambda with expected payload', async () => {
    const invokeLambda = sinon.stub().resolves();
    const bodyPayload = { policyId: 'P1' };

    await lambdaService.createPolicyLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:createPolicy');
    expect(invocationType).to.equal('Event');
    expect(payload).to.equal({
      httpMethod: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  });

  it('addAccountQuestLambda forwards raw payload to invokeLambda (no body wrapping)', async () => {
    const invokeLambda = sinon.stub().resolves();
    const rawPayload = { uuid: 'user-1', questType: 'PayBills' };

    await lambdaService.addAccountQuestLambda({
      invokeLambda,
      payload: rawPayload,
    });

    const [arn, invocationType, payload] = invokeLambda.firstCall.args;
    expect(arn).to.equal('arn:addAccountQuest');
    expect(invocationType).to.equal('RequestResponse');
    expect(payload).to.equal(rawPayload);
  });

  it('loyaltyPointsSimulatorLambda wraps payload with httpMethod + JSON string body and returns invoke result', async () => {
    const invokeLambda = sinon
      .stub()
      .resolves({ StatusCode: 200, Payload: '"ok"' });

    const bodyPayload = { mobileNumber: '0917', requestType: 'BuyPromo' };

    const res = await lambdaService.loyaltyPointsSimulatorLambda({
      invokeLambda,
      payload: bodyPayload,
    });

    expect(res).to.equal({ StatusCode: 200, Payload: '"ok"' });
    expect(invokeLambda.calledOnce).to.equal(true);

    const [arn, invocationType, payload, region, logType] =
      invokeLambda.firstCall.args;

    expect(arn).to.equal('arn:loyaltyPointsSimulator');
    expect(invocationType).to.equal('RequestResponse');
    expect(region).to.equal('ap-southeast-1');
    expect(logType).to.equal(false);
    expect(payload).to.equal({
      body: JSON.stringify(bodyPayload),
    });
  });
});
