function leave(connection) {
  console.log("leaving")
  connection.destroy()
}

module.exports = {
  leave: leave,
};
