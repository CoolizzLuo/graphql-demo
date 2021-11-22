require('dotenv').config()
const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)
const SECRET = process.env.SECRET
const { userModel, postModel } = require('./models')

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
const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args;
  const { me, postModel } = context
  const isAuthor = postModel.findPostByPostId(Number(postId)).authorId === me.id
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
  return resolverFunc.applyFunc(parent, args, context);
}
const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds)
const createToken = ({ id, email, name }, secret) => jwt.sign({ id, email, name }, secret, {
  expiresIn: '1d'
});
const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
};

const resolvers = {
  Query: {
    hello: () => "world",
    me: isAuthenticated((root, args, { me, userModel }) => {
      return userModel.findUserByUserId(me.id)
    }),
    users: (root, args, { userModel }) => userModel.getAllUsers(),
    user: (root, { name }, { userModel }) => userModel.findUserByName(name),
    posts: (root, args, { postModel }) => postModel.getAllPosts(),
    post: (root, { id }, { postModel }) => postModel.findPostByPostId(Number(id))
  },
  User: {
    posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
    friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || [])
  },
  Post: {
    author: (parent, args, { userModel }) => userModel.findUserByUserId(parent.authorId),
    likeGivers: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.likeGiverIds)
  },
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me, userModel }) => {
      // 過濾空值
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return userModel.updateUserInfo(me.id, data);
    }),
    addFriend: isAuthenticated((parent, { userId }, { me: { id: meId, userModel } }) => {
      const me = userModel.findUserByUserId(meId);
      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = userModel.findUserByUserId(userId);
      const newMe = userModel.updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId)
      });
      userModel.updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

      return newMe;
    }),
    addPost: isAuthenticated((parent, { input }, { me, postModel }) => {
      const { title, body } = input;
      return postModel.addPost({ authorId: me.id, title, body });
    }),
    likePost: isAuthenticated((parent, { postId }, { me, postModel }) => {

      const post = postModel.findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return postModel.updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }
      return postModel.updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    }),
    deletePost: isAuthenticated(
      isPostAuthor((root, { postId }, { me, postModel }) => postModel.deletePost(postId))
    ),
    signUp: async (root, { name, email, password }, { saltRounds, userModel }) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = users.some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, saltRounds)
      // 3. 建立新 user
      return userModel.addUser({ name, email, password: hashedPassword });
    },
    login: async (root, { email, password }, { secret, userModel }) => {
      const user = userModel.getAllUsers().find(user => user.email === email)
      if (!user) throw new Error('Email Account Not Exists')

      const passwordIsValid = await bcrypt.compare(password, user.password)
      if (!passwordIsValid) throw new AuthenticationError('Wrong Password')

      return { token: await createToken(user, secret) }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const context = {
      secret: SECRET,
      saltRounds: SALT_ROUNDS,
      userModel,
      postModel
    };
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