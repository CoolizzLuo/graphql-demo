const { gql, ForbiddenError, AuthenticationError } = require('apollo-server')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    age: Int
    friends: [User]
    posts: [Post]
  }

  extend type Query {
    me: User
    users: [User]
    user(name: String!): User
  }

  input UpdateMyInfoInput {
    name: String
    age: Int
  }

  type Token {
    token: String!
  }

  extend type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addFriend(userId: ID!): User
    signUp(name: String, email: String!, password: String!): User
    login(email: String!, password: String!): Token
  }
`

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
    me: isAuthenticated((root, args, { me, userModel }) =>
      userModel.findUserByUserId(me.id)
    ),
    users: (root, args, { userModel }) => userModel.getAllUsers(),
    user: (root, { name }, { userModel }) => userModel.findUserByName(name)
  },
  User: {
    posts: (parent, args, { postModel }) =>
      postModel.filterPostsByUserId(parent.id),
    friends: (parent, args, { userModel }) =>
      userModel.filterUsersByUserIds(parent.friendIds || [])
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
}

module.exports = {
  typeDefs,
  resolvers
}