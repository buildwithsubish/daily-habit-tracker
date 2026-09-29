import mongoose, { Schema, Model } from 'mongoose';

/** Singleton lock to prevent concurrent first-admin bootstrap races. */
interface BootstrapLock {
  _id: string;
  lockedAt: Date;
  completedAt?: Date | null;
}

const BootstrapLockSchema = new Schema<BootstrapLock>({
  _id: { type: String, required: true },
  lockedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

const BootstrapLock: Model<BootstrapLock> =
  mongoose.models.BootstrapLock ||
  mongoose.model<BootstrapLock>('BootstrapLock', BootstrapLockSchema);

export const ADMIN_BOOTSTRAP_LOCK_ID = 'admin_setup';

export default BootstrapLock;