
import sequelize from '../config/db';
import User from './User';
import Post from './Post';
import Like from './Like';
import Follow from './Follow';
import Comment from './Comment';

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
