const cp = require('child_process')

// Execute this command
const exec = (command) => new Promise((resolve, reject) => {
  // console.log(command)
  cp.exec(command, (error, stdout) => {
    if (error) reject(error)
    resolve(stdout)
  })
})

// Get the database parameters
function getDbParams (dbConfig) {
  const { host, password, user } = dbConfig.connection
  return [user && `-u${user}`, host && `-h${host}`, password && `-p${password}`]
    .filter(Boolean)
    .join(' ')
}

// Dump the schema from the database into a file
function dumpSchema (dbConfig) {
  // Dump the schema from the DB
  const { database } = dbConfig.connection
  const { filename } = dbConfig.schema
  const dbParams = getDbParams(dbConfig)
  return exec(
    `mysqldump ${dbParams} --no-data --routines ${database} | sed "s/DEFINER=[^ ]* / /" > ${filename}`
  )
}

// Load the schema into the database
function loadSchema (dbConfig) {
  const { database } = dbConfig.connection
  const { filename } = dbConfig.schema
  const dbParams = getDbParams(dbConfig)
  return exec(`mysql ${dbParams} ${database} < ${filename}`)
}

// Drop the current schema
function dropSchema (dbConfig) {
  const { database } = dbConfig.connection
  const dbParams = getDbParams(dbConfig)
  return exec(`mysql ${dbParams} -e "DROP DATABASE IF EXISTS ${database};"`)
}

// Create the current schema
function createSchema (dbConfig) {
  const { database } = dbConfig.connection
  const dbParams = getDbParams(dbConfig)
  return exec(
    `mysql ${dbParams} -e "CREATE DATABASE IF NOT EXISTS ${database};"`
  )
}

async function resetSchema (dbConfig) {
  await dropSchema(dbConfig)
  await createSchema(dbConfig)
  await loadSchema(dbConfig)
}

module.exports = {
  createSchema,
  dropSchema,
  dumpSchema,
  loadSchema,
  resetSchema
}
