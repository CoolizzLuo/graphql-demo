require('dotenv').config()
const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)
const SECRET = process.env.SECRET

const users = [
  {
    id: 1,
    email: 'fong@test.com',
    password: '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO', // 123456
    name: 'Fong',
    age: 23,
    friendIds: [2, 3]
  },
  {
    id: 2,
    email: 'kevin@test.com',
    password: '$2b$04$uy73IdY9HVZrIENuLwZ3k./0azDvlChLyY1ht/73N4YfEZntgChbe', // 123456
    name: 'Kevin',
    age: 40,
    friendIds: [1]
  },
  {
    id: 3,
    email: 'mary@test.com',
    password: '$2b$04$UmERaT7uP4hRqmlheiRHbOwGEhskNw05GHYucU73JRf8LgWaqWpTy', // 123456
    name: 'Mary',
    age: 18,
    friendIds: [1]
  }
];

const posts = [
  {
    id: 1,
    authorId: 1,
    title: 'Hello World',
    body: 'This is my first post',
    likeGiverIds: [1, 2],
    createdAt: '2018-10-22T01:40:14.941Z'
  },
  {
    id: 2,
    authorId: 2,
    title: 'Nice Day',
    body: 'Hello My Friend!',
    likeGiverIds: [1],
    createdAt: '2018-10-24T01:40:14.941Z'
  }
];


const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
};


const typeDefs = gql`
  type Query {
    "測試用 Hello World"
    hello: String
    "取得目前使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "依照名字取得特定使用者"
    user(name: String!): User
    "取得所有貼文"
    posts: [Post]
    "依照 id 取得特定貼文"
    post(id: ID!): Post
  }

  """
  使用者
  """
  type User {
    "識別碼"
    id: ID!
    "帳號 email"
    email: String!
    "名字"
    name: String
    "年齡"
    age: Int
    "朋友"
    friends: [User]
    "貼文"
    posts: [Post]
  }

  """
  貼文
  """
  type Post {
    "識別碼"
    id: ID!
    "作者"
    author: User
    "標題"
    title: String
    "內容"
    body: String
    "按讚者"
    likeGivers: [User]
    "建立時間 (ISO 格式)"
    createdAt: String
  }

  input UpdateMyInfoInput {
    name: String
    age: Int
  }

  input AddPostInput {
    title: String!
    body: String
  }

  type Token {
    token: String!
  }

  type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addFriend(userId: ID!): User
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
    deletePost(postId: ID!): Post
    signUp(name: String, email: String!, password: String!): User
    login (email: String!, password: String!): Token
  }
`;

// helper functions
const filterPostsByUserId = userId => posts.filter(post => userId === post.authorId);
const filterUsersByUserIds = userIds => users.filter(user => userIds.includes(user.id));
const findUserByUserId = userId => users.find(user => user.id === Number(userId));
const findUserByName = name => users.find(user => user.name === name);
const findPostByPostId = postId => posts.find(post => post.id === Number(postId));
const updateUserInfo = (userId, data) => Object.assign(findUserByUserId(userId), data);
const addPost = ({ authorId, title, body }) => {
  posts[posts.length] = {
    id: posts[posts.length - 1].id + 1,
    authorId,
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
  };
};
const updatePost = (postId, data) => Object.assign(findPostByPostId(postId), data);
const deletePost = (postId) => posts.splice(posts.findIndex(post => post.id === postId), 1)[0];
const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args;
  const { me } = context;
  const isAuthor = findPostByPostId(postId).authorId === me.id;
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
  return resolverFunc.applyFunc(parent, args, context);
}
const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds)
const addUser = ({ name, email, password }) => (
  users[users.length] = {
    id: users[users.length - 1].id + 1,
    name,
    email,
    password
  }
);
const createToken = ({ id, email, name }, secret) => jwt.sign({ id, email, name }, secret, {
  expiresIn: '1d'
});

const resolvers = {
  Query: {
    hello: () => "world",
    me: isAuthenticated((root, args, { me }) => {
      return findUserByUserId(me.id)
    }),
    users: () => users,
    user: (root, { name }, context) => findUserByName(name),
    posts: () => posts,
    post: (root, { id }, context) => findPostByPostId(id)
  },
  User: {
    posts: (parent, args, context) => filterPostsByUserId(parent.id),
    friends: (parent, args, context) => filterUsersByUserIds(parent.friendIds || [])
  },
  Post: {
    author: (parent, args, context) => findUserByUserId(parent.authorId),
    likeGivers: (parent, args, context) => filterUsersByUserIds(parent.likeGiverIds)
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me }) => {
      // 過濾空值
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return updateUserInfo(me.id, data);
    }),
    addFriend: isAuthenticated((parent, { userId }, { me: { id: meId } }) => {
      const me = findUserByUserId(meId);
      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = findUserByUserId(userId);
      const newMe = updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId)
      });
      updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

      return newMe;
    }),
    addPost: isAuthenticated((parent, { input }, { me }) => {
      const { title, body } = input;
      return addPost({ authorId: me.id, title, body });
    }),
    likePost: isAuthenticated((parent, { postId }, { me }) => {

      const post = findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }
      return updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    }),
    deletePost: isAuthenticated(
      isPostAuthor((root, { postId }, { me }) => deletePost(postId))
    ),
    signUp: async (root, { name, email, password }, { saltRounds }) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = users.some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, saltRounds)
      // 3. 建立新 user
      return addUser({ name, email, password: hashedPassword });
    },
    login: async (root, { email, password }, { saltRounds }) => {
      // 1. 透過 email 找到相對應的 user
      const user = users.find(user => user.email === email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password)
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user, secret) }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const context = { secret: SECRET, saltRounds: SALT_ROUNDS };
    const token = req.headers['x-token'];
    if (token) {
      try {
        const me = await jwt.verify(token, SECRET);
        return { ...context, me }
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    return context;
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});