/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import Event from '@ioc:Adonis/Core/Event'
import Database from '@ioc:Adonis/Lucid/Database'
import Application from '@ioc:Adonis/Core/Application'
import Logger from '@ioc:Adonis/Core/Logger'

Event.on('db:query', (query) => {
  if (Application.inProduction) {
    Logger.debug('sql: %s %o', query.sql, query.bindings)
  } else {
    Database.prettyPrint(query)
  }
})


