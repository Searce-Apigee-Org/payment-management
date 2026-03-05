const buildSettlementInfo = (settlementInformation, headers, cxsRequest) => {
  return (settlementInformation || []).map((source) => {
    const target = {
      accountNumber: source.accountNumber ?? null,
      mobileNumber: source.mobileNumber ?? null,
      landlineNumber: source.landlineNumber ?? null,
      emailAddress: source.emailAddres?.trim() ?? null,
      transactionType: source.transactionType ?? null,
      requestType: source.requestType ?? null,
      amount: source.amount ?? null,
      referralCode: source.referralCode ?? null,
      accountName: source.accountName ?? null,
      accountType: source.accountType ?? null,
      billsType: source.billsType ?? null,
    };

    return target;
  });
};
