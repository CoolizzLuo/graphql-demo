require('dotenv').config()
const { ApolloServer } = require('apollo-server')
const jwt = require('jsonwebtoken')
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)
const SECRET = process.env.SECRET
const { userModel, postModel } = require('./models')
const { typeDefs, resolvers } = require('./schema')


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