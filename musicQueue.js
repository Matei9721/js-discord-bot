module.exports = class musicQueue {
    constructor() {
        this.queue = [];
    }

    /**
     * Gets the queue in format required to show the queue in discord
     * @returns {Array} List of songs of format {title, url}
     */
    getQueue() {
        let result = []
        this.queue.forEach((song, index) => {
            result.push({ name: (index + 1) + ". " + song.metadata.title, value: song.metadata.url })
        })
        return result
    }

    /**
     * Pops the first song out of the queue
     * @returns {*} Song from the array
     */
    pop() {
        return this.queue.shift()
    }

    /**
     * Adds to the end of the queue one song
     * @param entry Song to be added to the queue
     */
    enqueue(entry) {
        this.queue.push(entry)
    }

    /**
     * Get the length of the queue
     * @returns {Number} Length of the queue
     */
    getSize() {
        return this.queue.length
    }

    /**
     * Give the first song of the queue without removing it
     * @returns {*} Song from the array
     */
    peek() {
        if (!this.queue.isEmpty) return this.queue[0]
    }

    /**
     * Give the last song of the queue without removing it
     * @returns {*} Song from the array
     */
    getLast() {
        return this.queue[this.getSize() - 1]
    }

    /**
     * Check if the queue is empty
     * @returns {Boolean} true if empty, false if it has elements
     */
    isEmpty() {
        return !this.queue.length
    }

    /**
     * Removes one element from the queue at given index
     * @param index Index of element to be removed
     */
    removeAt(index) {
        this.queue.splice(index, 1)
    }
}
