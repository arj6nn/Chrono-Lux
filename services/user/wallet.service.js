import Wallet from '../../models/wallet.model.js';
import WalletLedger from '../../models/wallet-ledger.model.js';

/**
 * Ensures a user has a wallet. If not, creates one.
 */
export const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }
  return wallet;
};

/**
 * Credits money to a user's wallet
 */
export const creditWallet = async (userId, amount, transactionType, reason, orderId = null) => {
  const wallet = await getOrCreateWallet(userId);

  wallet.balance += Number(amount);
  await wallet.save();

  await WalletLedger.create({
    walletId: wallet._id,
    userId,
    amount,
    type: 'credit',
    transactionType,
    reason,
    orderId
  });

  return wallet;
};

/**
 * Debits money from a user's wallet
 */
export const debitWallet = async (userId, amount, transactionType, reason, orderId = null) => {
  const wallet = await getOrCreateWallet(userId);

  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance -= Number(amount);
  await wallet.save();

  await WalletLedger.create({
    walletId: wallet._id,
    userId,
    amount,
    type: 'debit',
    transactionType,
    reason,
    orderId
  });

  return wallet;
};

/**
 * Gets wallet balance and transaction history with pagination
 */
export const getWalletDetails = async (userId, page = 1, limit = 3) => {
  const wallet = await getOrCreateWallet(userId);

  const skip = (page - 1) * limit;
  const totalTransactions = await WalletLedger.countDocuments({ userId });
  const transactions = await WalletLedger.find({ userId })
    .populate('orderId', 'orderId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    balance: wallet.balance,
    transactions,
    currentPage: page,
    totalPages: Math.ceil(totalTransactions / limit),
    totalTransactions
  };
};