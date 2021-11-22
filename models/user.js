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

module.exports = {
  getAllUsers: () => users,
  findUserByUserId: userId => users.find(user => user.id === Number(userId)),
  filterUsersByUserIds: userIds => users.filter(user => userIds.includes(user.id)),
  findUserByName: name => users.find(user => user.name === name),
  updateUserInfo: (userId, data) => Object.assign(findUserByUserId(userId), data),
  addUser: ({ name, email, password }) => (
    users[users.length] = {
      id: users[users.length - 1].id + 1,
      name,
      email,
      password
    }
  )
}