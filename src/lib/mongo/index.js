'use strict'

let BaseQueryService = require('./baseQuery.service')
let BaseService = require('./base.service')
let AutoIncrementIdService = require('./autoIncrementId.service')
let promisify = require('./promisify')

let mongo = require('mongoskin')
let autoIncrementIdService

function init (logger, connectionString) {
  let db

  promisify(logger, mongo)

  db = mongo.db(connectionString, { auto_reconnect: true })
  logger.info(`Connecting to mongodb: ${connectionString}`)

  db.on('close', (err) => {
    if (err) {
      logger.error(err, `Lost connection with mongodb: ${connectionString}`)
    } else {
      logger.warn(`Closed connection with mongodb: ${connectionString}`)
    }
  })

  db.on('connected', (err) => {
    if (err) {
      logger.error(err)
    } else {
      logger.info(`Connected to mongodb: ${connectionString}`)
    }
  })

  db.createQueryService = function (collectionName) {
    let collection = db.collection(collectionName, {})
    return new BaseQueryService(collection)
  }

  autoIncrementIdService = new AutoIncrementIdService(db)
  db.createService = function (collectionName, validateSchema, options) {
    let collection

    options = options || {}

    if (validateSchema) {
      options.validateSchema = validateSchema
    }

    collection = db.collection(collectionName, {})
    let baseService = new BaseService(logger, collection, options)
    baseService.getNextId = () => {
      return autoIncrementIdService.getNextId(collectionName)
    }

    return baseService
  }

  return db
}

module.exports = init
