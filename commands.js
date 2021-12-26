function leave(connection) {
  console.log("leaving")
  connection.destroy()
  connection = null;
}

module.exports = {
  leave: leave,
};
