
import sequelize from '../config/db.js';
import User from './User.js';
import Post from './Post.js';
import Like from './Like.js';
import Follow from './Follow.js';
import Comment from './Comment.js';

const syncDb = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    await sequelize.sync({ force });
    console.log('Database synced.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

export {
  sequelize,
  User,
  Post,
  Like,
  Follow,
  Comment,
  syncDb,
};
