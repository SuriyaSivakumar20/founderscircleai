
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

class Follow extends Model {
  public id!: string;
  public followerId!: string;
  public followingId!: string;
}

Follow.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  followerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  followingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'Follow',
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followingId'],
    },
  ],
});

User.hasMany(Follow, { as: 'Followers', foreignKey: 'followingId' });
User.hasMany(Follow, { as: 'Following', foreignKey: 'followerId' });

Follow.belongsTo(User, { as: 'Follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'FollowingUser', foreignKey: 'followingId' });

export default Follow;
