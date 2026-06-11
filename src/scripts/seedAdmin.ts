import { connectDB } from '../config/db';
import { User } from '../models/User';
import { hashPassword } from '../services/auth.service';

async function seed() {
  await connectDB();
  const existing = await User.findOne({ email: 'admin@safarx.com' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }
  const password = await hashPassword('admin123');
  await User.create({
    email: 'admin@safarx.com',
    username: 'admin',
    password,
    fullName: 'SafarX Admin',
    role: 'admin',
    activeRole: 'admin',
    isAdmin: true,
    isEmailVerified: true,
    kycStatus: 'approved',
  });
  console.log('Admin seeded: admin@safarx.com / admin123');
  process.exit(0);
}

seed().catch(console.error);
