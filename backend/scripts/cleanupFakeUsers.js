import dotenv from 'dotenv';
import connectDB from '../db.js';
import { User } from '../models/user.model.js';
import { Post } from '../models/post.model.js';
import { Comment } from '../models/comment.model.js';

dotenv.config();

const ALLOWLIST = ['sium', 'shihab', 'imtiaz', 'muaz'];

const isRealUser = (username = '') => {
  const clean = String(username).toLowerCase().trim();
  return ALLOWLIST.includes(clean);
};

async function run() {
  await connectDB();

  const users = await User.find({}).select('_id username email');
  const fakeUsers = users.filter((u) => !isRealUser(u.username));

  console.log(`Found ${users.length} total users; removing ${fakeUsers.length} fake users.`);

  let removedUsers = 0;
  let removedPosts = 0;
  let removedComments = 0;

  for (const user of fakeUsers) {
    const postIds = (await Post.find({ author: user._id }).select('_id')).map((p) => p._id);

    if (postIds.length) {
      const postDel = await Post.deleteMany({ _id: { $in: postIds } });
      const commentDelForPosts = await Comment.deleteMany({ post: { $in: postIds } });
      removedPosts += postDel.deletedCount || 0;
      removedComments += commentDelForPosts.deletedCount || 0;

      await User.updateMany({}, { $pull: { bookmarks: { $in: postIds } } });
    }

    const commentDelByUser = await Comment.deleteMany({ author: user._id });
    removedComments += commentDelByUser.deletedCount || 0;

    await User.updateMany({}, { $pull: { followers: user._id, following: user._id } });

    await User.deleteOne({ _id: user._id });
    removedUsers += 1;
    console.log(`Deleted user ${user.username} (${user.email || 'no email'})`);
  }

  console.log('Cleanup summary:', {
    removedUsers,
    removedPosts,
    removedComments,
  });

  process.exit(0);
}

run().catch((err) => {
  console.error('Cleanup failed', err);
  process.exit(1);
});
