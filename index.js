const { ApolloServer, gql } = require('apollo-server');

// 1. 加入假資料
const users = [
  {
    id: 1,
    name: 'Fong',
    age: 23
  },
  {
    id: 2,
    name: 'Kevin',
    age: 40
  },
  {
    id: 3,
    name: 'Mary',
    age: 18
  }
];

// The GraphQL schema
// 2. 新增 User type 、在 Query 中新增 me field
const typeDefs = gql`
  """
  使用者資訊
  """
  type User {
    id: ID!
    name: String
    age: Int
    friends: [User]
  }
  
  type Query {
    hello: String
    me: User
    users: User
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    // 3. 加上 me 的 resolver (一定要在 Query 中喔)
    me: () => users[0]
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});