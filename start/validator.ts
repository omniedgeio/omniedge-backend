/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import { validator } from '@ioc:Adonis/Core/Validator'
import isValidHostname from 'is-valid-hostname'

validator.rule('hostname', (value, _, options) => {
  if (typeof value !== 'string') {
    return
  }

  if (!isValidHostname(value)) {
    options.errorReporter.report(options.pointer, 'hostname', 'Invalid hostname', options.arrayExpressionPointer)
  }
})
