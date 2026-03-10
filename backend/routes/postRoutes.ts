
import express from 'express';
import { createPost, getFeed, likePost, addComment } from '../controllers/postController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createPost);
router.get('/feed', authenticate, getFeed);
router.post('/:postId/like', authenticate, likePost);
router.post('/:postId/comment', authenticate, addComment);

export default router;
