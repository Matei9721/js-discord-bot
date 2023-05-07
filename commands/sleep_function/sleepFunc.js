//Function used to wait for a given number of seconds 
//Used to wait before deleting a message
module.exports = function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}