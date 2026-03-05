const validateEnrolledAccounts = async (req, uuid) => {
  const { findAccount } = req;
  const accounts = await findAccount(uuid);

  const enrolledAccounts = accounts?.accountList || [];

  if (!enrolledAccounts.length) {
    throw { type: 'ForbiddenToAccessAccount' };
  }

  let accountDetails = '';

  for (const account of enrolledAccounts) {
    accountDetails += `${account.segment}-${account.brand}-`;

    if (account.brandDetail) {
      if (account.brandDetail === 'GFiber Prepaid') {
        accountDetails += 'prepaidWired';
      } else {
        accountDetails += account.brandDetail;
      }
    }

    const matchByAccount =
      account.accountNumber && account.accountNumber === uuid;
    const matchByMobile = account.mobileNumber && account.mobileNumber === uuid;
    const matchByLandline =
      account.landlineNumber && account.landlineNumber === uuid;

    if (matchByAccount || matchByMobile || matchByLandline) {
      return accountDetails;
    }
  }

  throw { type: 'ForbiddenToAccessAccount' };
};

export { validateEnrolledAccounts };
