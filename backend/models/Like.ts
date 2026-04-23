
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Post from './Post.js';

class Like extends Model {
  public id!: string;
  public userId!: string;
  public postId!: string;
}

Like.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Post,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'Like',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'postId'],
    },
  ],
});

User.hasMany(Like, { foreignKey: 'userId' });
Like.belongsTo(User, { foreignKey: 'userId' });

Post.hasMany(Like, { foreignKey: 'postId' });
Like.belongsTo(Post, { foreignKey: 'postId' });

export default Like;
