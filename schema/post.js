const { gql, ForbiddenError } = require('apollo-server')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  """
  貼文
  """
  type Post {
    "識別碼"
    id: ID!
    author: User
    title: String
    body: String
    likeGivers: [User]
    createdAt: String
  }

  extend type Query {
    posts: [Post]
    post(id: ID!): Post
  }

  input AddPostInput {
    title: String!
    body: String
  }

  extend type Mutation {
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
    deletePost(postId: ID!): Post
  }
`

const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
}

const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args;
  const { me, postModel } = context
  const isAuthor = postModel.findPostByPostId(Number(postId)).authorId === me.id
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
  return resolverFunc.applyFunc(parent, args, context);
}

const resolvers = {
  Query: {
    posts: (root, args, { postModel }) => postModel.getAllPosts(),
    post: (root, { id }, { postModel }) => postModel.findPostByPostId(Number(id))
  },
  Post: {
    author: (parent, args, { userModel }) => userModel.findUserByUserId(parent.authorId),
    likeGivers: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.likeGiverIds)
  },
  Mutation: {
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
  }
}

module.exports = {
  typeDefs,
  resolvers
};