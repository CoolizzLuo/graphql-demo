const { gql, ForbiddenError, AuthenticationError } = require('apollo-server')


const typeDefs = gql`
  type Staff {
    id: ID!
    email: String!
    role: String!
  }

`