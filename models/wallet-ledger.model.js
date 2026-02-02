import mongoose from 'mongoose';
const { Schema } = mongoose;

const walletLedgerSchema = new Schema({
    walletId: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit', 'refund'],
        required: true
    },
    transactionType: {
        type: String,
        enum: ['order_payment', 'order_cancellation', 'refund', 'referral_bonus', 'added_funds'],
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    }
}, { timestamps: true });

// Index for faster query performance on typical usage patterns
walletLedgerSchema.index({ userId: 1, createdAt: -1 });

const WalletLedger = mongoose.model('WalletLedger', walletLedgerSchema);
export default WalletLedger;