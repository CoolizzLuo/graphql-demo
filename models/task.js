const tasks = [
  {
    id: 1,
    authorId: 4,
    title: 'Hello World',
    content: 'This is my first post',
    userIds: [1, 2],
    createdAt: '2021-11-22T01:40:14.941Z'
  },
  {
    id: 2,
    authorId: 2,
    title: 'Nice Day',
    content: 'Hello My Friend!',
    userIds: [1],
    createdAt: '2021-11-23T01:40:14.941Z'
  }
];

module.exports = {
  getAllTask: () => tasks,
  findTaskById: id => tasks.find(task => task.id === Number(id)),
  filterTaskByUserId: userId => tasks.filter(task => userId === task.authorId),
  filterTaskByStaffId: staffId => { },
  addPost: ({ authorId, title, body }) => {
    posts[posts.length] = {
      id: posts[posts.length - 1].id + 1,
      authorId,
      title,
      body,
      likeGiverIds: [],
      createdAt: new Date().toISOString()
    };
  },
  updatePost: (postId, data) => Object.assign(findPostByPostId(postId), data),
  deletePost: (postId) => posts.splice(posts.findIndex(post => post.id === postId), 1)[0],
}