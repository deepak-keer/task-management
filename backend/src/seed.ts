import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    status: String,
    avatar: { type: String, default: '' },
    theme: { type: String, default: 'light' },
    onlineStatus: { type: String, default: 'online' },
    notificationPrefs: {
      taskAssigned: { type: Boolean, default: true },
      commentAdded: { type: Boolean, default: true },
      mentioned: { type: Boolean, default: true },
      dueDateReminder: { type: Boolean, default: true },
    },
    recentlyViewed: { type: Array, default: [] },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastActiveAt: Date,
  }, { timestamps: true });

  const RolePermissionsSchema = new mongoose.Schema({
    role: { type: String, unique: true },
    features: {
      invite_members: { type: Boolean, default: true },
      remove_members: { type: Boolean, default: false },
      create_projects: { type: Boolean, default: true },
      delete_projects: { type: Boolean, default: false },
      archive_projects: { type: Boolean, default: false },
      assign_roles: { type: Boolean, default: false },
      view_analytics: { type: Boolean, default: true },
      manage_columns: { type: Boolean, default: true },
      create_tasks: { type: Boolean, default: true },
      delete_own_tasks: { type: Boolean, default: true },
      delete_any_task: { type: Boolean, default: false },
      move_tasks: { type: Boolean, default: true },
      assign_tasks: { type: Boolean, default: true },
      comment_on_tasks: { type: Boolean, default: true },
      view_all_projects: { type: Boolean, default: false },
      export_tasks: { type: Boolean, default: false },
      watch_tasks: { type: Boolean, default: true },
      upload_attachments: { type: Boolean, default: true },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedAt: { type: Date, default: Date.now },
    auditLog: { type: Array, default: [] },
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const RolePermissions = mongoose.models.RolePermissions || mongoose.model('RolePermissions', RolePermissionsSchema);

  // Create super admin
  const email = 'admin@taskflow.dev';
  const password = 'Admin@12345';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Super admin already exists: ${email}`);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await User.create({
      name: 'Super Admin',
      email,
      password: hashed,
      role: 'super_admin',
      status: 'active',
    });
    console.log(`✅ Super admin created:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ⚠️  Change this password immediately after first login!`);
  }

  // Seed role permissions
  for (const role of ['admin', 'member']) {
    const existing = await RolePermissions.findOne({ role });
    if (!existing) {
      await RolePermissions.create({ role });
      console.log(`✅ Default permissions seeded for role: ${role}`);
    } else {
      console.log(`Permissions already exist for role: ${role}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nSeeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
