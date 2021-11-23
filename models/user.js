const users = [
  {
    id: 1,
    email: 'raydu@test.com',
    password: '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO', // 123456
    name: '阿低',
  },
  {
    id: 2,
    email: 'tgop@test.com',
    password: '$2b$04$uy73IdY9HVZrIENuLwZ3k./0azDvlChLyY1ht/73N4YfEZntgChbe', // 123456
    name: '那群人',
  },
  {
    id: 3,
    email: 'nwfw@test.com',
    password: '$2b$04$UmERaT7uP4hRqmlheiRHbOwGEhskNw05GHYucU73JRf8LgWaqWpTy', // 123456
    name: '下班不要看',
    age: 18,
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