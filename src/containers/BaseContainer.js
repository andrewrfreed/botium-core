const util = require('util')
const async = require('async')
const rimraf = require('rimraf')
const debug = require('debug')('BaseContainer')

const Capabilities = require('../Capabilities')
const Queue = require('../helpers/Queue')

module.exports = class BaseContainer {
  constructor (tempDirectory, repo, caps, envs) {
    this.repo = repo
    this.caps = Object.assign({}, caps)
    this.envs = Object.assign({}, envs)
    this.tempDirectory = tempDirectory
    this.cleanupTasks = []
    this.queues = {}
  }

  Validate () {
    return Promise.resolve()
  }

  Build () {
    return Promise.resolve(this)
  }

  Start () {
    return Promise.resolve(this)
  }

  UserSaysText (msg) {
    return Promise.resolve(this)
  }

  UserSays (msg) {
    return Promise.resolve(this)
  }

  WaitBotSays (timeoutMillis = 5000) {
    if (!this.queues.default) {
      this.queues.default = new Queue()
    }

    return new Promise((resolve, reject) => {
      this.queues.default.pop(timeoutMillis)
        .then((botMsg) => {
          resolve(botMsg)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  WaitBotSaysText (timeoutMillis = 5000) {
    return new Promise((resolve, reject) => {
      this.WaitBotSays(timeoutMillis)
        .then((botMsg) => {
          resolve(botMsg.messageText)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  Restart () {
    return new Promise((resolve, reject) => {
      this.Stop()
        .then(() => this.Start())
        .then(() => resolve())
        .catch((err) => reject(err))
    })
  }

  Stop () {
    return Promise.resolve(this)
  }

  Clean () {
    return new Promise((resolve, reject) => {
      async.series([

        (rimraffed) => {
          if (this.caps[Capabilities.CLEANUPTEMPDIR]) {
            rimraf(this.tempDirectory, (err) => {
              if (err) debug(`Cleanup temp dir ${this.tempDirectory} failed: ${util.inspect(err)}`)
              rimraffed()
            })
          } else {
            rimraffed()
          }
        },

        (cleanupTasksDone) => {
          if (this.cleanupTasks) {
            async.series(
              this.cleanupTasks.map((task) => {
                return (cb) => {
                  task((err) => {
                    if (err) debug(`Cleanup failed: ${util.inspect(err)}`)
                    cb()
                  })
                }
              }),
              () => {
                cleanupTasksDone()
              }
            )
          } else {
            cleanupTasksDone()
          }
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        resolve()
      })
    })
  }

  _AssertCapabilityExists (cap, reject) {
    if (!this.caps[cap]) {
      throw new Error(`Capability property ${cap} not set`)
    }
  }

  _QueueBotSays (botMsg) {
    if (!this.queues.default) {
      this.queues.default = new Queue()
    }

    this.queues.default.push(botMsg)
  }
}
