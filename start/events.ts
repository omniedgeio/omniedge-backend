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

Event.on('db:query', (query) => {
  // if (Application.inProduction) {
  //   Logger.debug('sql: %s %o', query.sql, query.bindings)
  // } else {
  //   Database.prettyPrint(query)
  // }
})
