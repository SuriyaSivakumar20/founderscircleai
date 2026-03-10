
# FoundersCircle API Documentation

## Base URL
`http://localhost:3000/api`

## Authentication

### Register
`POST /auth/register`
- Body: `email`, `password`, `name`, `role`, `industry`, `description`, `avatar`, `website`
- Response: `{ user, token }`

### Login
`POST /auth/login`
- Body: `email`, `password`
- Response: `{ user, token }`

### Get Current User
`GET /auth/me`
- Headers: `Authorization: Bearer <token>`
- Response: `User object`

## Posts

### Create Post
`POST /posts`
- Headers: `Authorization: Bearer <token>`
- Body: `content`, `image` (optional)
- Response: `Post object with author`

### Get Feed
`GET /posts/feed?page=1&limit=10`
- Headers: `Authorization: Bearer <token>`
- Response: `{ posts, total, page, totalPages }`

### Like/Unlike Post
`POST /posts/:postId/like`
- Headers: `Authorization: Bearer <token>`
- Response: `{ message: 'Liked' | 'Unliked' }`

### Add Comment
`POST /posts/:postId/comment`
- Headers: `Authorization: Bearer <token>`
- Body: `content`
- Response: `Comment object with author`

## Users

### Get Profile
`GET /users/:id`
- Headers: `Authorization: Bearer <token>`
- Response: `User object with posts, followers, following`

### Update Profile
`PUT /users/profile`
- Headers: `Authorization: Bearer <token>`
- Body: `name`, `industry`, `description`, `avatar`, `website`
- Response: `Updated User object`

### Follow/Unfollow User
`POST /users/:id/follow`
- Headers: `Authorization: Bearer <token>`
- Response: `{ message: 'Followed' | 'Unfollowed' }`

## Real-time (Socket.IO)

### Events
- `register(userId)`: Register socket with user ID
- `send_message({ senderId, receiverId, text })`: Send a private message
- `receive_message`: Listen for incoming messages

## How to run locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file based on `.env.example`:
   ```env
   JWT_SECRET=your-secret-key
   SEED_DB=true
   ```
   Setting `SEED_DB=true` will populate the database with 50 mock users and posts on the first run.

3. **Start the server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000`.

4. **Database**:
   The application uses SQLite. The database file will be created at `database.sqlite` in the root directory.
