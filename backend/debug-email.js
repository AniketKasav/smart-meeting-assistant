// Quick diagnostic: check if we can find the host user from a meeting
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Meeting = require('./models/Meeting');
const User = require('./models/User');

(async () => {
  await connectDB();
  await new Promise(r => setTimeout(r, 1000));

  // Get latest meeting
  const meeting = await Meeting.findOne({}).sort({ createdAt: -1 }).lean();
  if (!meeting) { console.log('No meetings found'); process.exit(0); }

  console.log('\n=== MEETING ===');
  console.log('  meetingId:', meeting.meetingId);
  console.log('  title:', meeting.title);
  console.log('  host.userId:', meeting.host?.userId);
  console.log('  host.name:', meeting.host?.name);
  console.log('  host.userId type:', typeof meeting.host?.userId);

  // Try all lookup methods
  const byId = await User.findOne({ _id: meeting.host?.userId }).lean().catch(e => null);
  console.log('\n=== LOOKUP by _id ===');
  console.log('  Found:', byId ? `${byId.name} <${byId.email}>` : 'NOT FOUND');

  const byName = await User.findOne({ name: meeting.host?.name }).lean().catch(e => null);
  console.log('\n=== LOOKUP by name ===');
  console.log('  Found:', byName ? `${byName.name} <${byName.email}>` : 'NOT FOUND');

  // List all users
  const users = await User.find({}).select('_id name email').lean();
  console.log('\n=== ALL USERS ===');
  users.forEach(u => console.log(`  _id: ${u._id}  name: "${u.name}"  email: ${u.email}`));

  // Check action items
  if (meeting.summary?.actionItems?.length > 0) {
    console.log('\n=== ACTION ITEMS ===');
    meeting.summary.actionItems.forEach((item, i) => {
      console.log(`  ${i}: "${item.title}" status=${item.status} assignee="${item.assignee}"`);
    });
  } else {
    console.log('\nNo action items in this meeting');
  }

  mongoose.connection.close();
  process.exit(0);
})();
