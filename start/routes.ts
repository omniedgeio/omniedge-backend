/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/register', 'AuthController.register')
    Route.post('/register/resend', 'AuthController.resendVerifyEmail')
    Route.get('/register/activate', 'AuthController.activateAccount')
    Route.post('/login/google', 'AuthController.loginWithGoogle')
    Route.post('/login/password', 'AuthController.loginWithPassword')
    Route.post('/login/security-key', 'AuthController.loginWithSecurityKey')
    Route.post('/reset-password/code', 'AuthController.resetPasswordWithCode')
    Route.post('/reset-password/verify', 'AuthController.resetPasswordWithVerification')

    // Features
    Route.post('/verify-email', 'AuthController.verifyEmail')
  }).prefix('/auth')

  Route.group(() => {
    Route.group(() => {
      Route.get('/', 'ProfileController.index')
      Route.put('/', 'ProfileController.update')
      Route.put('/change-password', 'ProfileController.changePassword')
    }).prefix('/profile')

    Route.group(() => {
      Route.post('/', 'VirtualNetworksController.create')
      Route.get('/', 'VirtualNetworksController.list')
      Route.get('/:id', 'VirtualNetworksController.retrieve')
      Route.put('/:id', 'VirtualNetworksController.update')
      Route.delete('/:id', 'VirtualNetworksController.delete')

      Route.group(() => {
        Route.get('/', 'VirtualNetworksController.listUsers')
        Route.put('/:user_id', 'VirtualNetworksController.updateUser')
        Route.delete('/:user_id', 'VirtualNetworksController.deleteUser')
      }).prefix('/:id/users')

      Route.group(() => {
        Route.get('/', 'VirtualNetworksController.listDevices')
        Route.delete('/:device_id', 'VirtualNetworksController.deleteDevice')
      }).prefix('/:id/devices')

      Route.group(() => {
        Route.post('/', 'VirtualNetworksController.createInvitation')
        Route.get('/', 'VirtualNetworksController.listInvitations')
        Route.delete('/:invitation_id', 'VirtualNetworksController.deleteInvitation')
      }).prefix('/:id/invitations')
    }).prefix('/virtual-networks')

    Route.group(() => {
      Route.post('/', 'DevicesController.register')
      Route.get('/', 'DevicesController.list')
      Route.get('/:id', 'DevicesController.retrieve')
      Route.put('/:id', 'DevicesController.update')
      Route.delete('/:id', 'DevicesController.delete')

      Route.group(() => {
        Route.get('/', 'DevicesController.listVirtualNetworks')
      }).prefix('/:id/virtual-networks')
    }).prefix('/devices')

    Route.group(() => {
      Route.post('/', 'SecurityKeysController.create')
      Route.get('/', 'SecurityKeysController.list')
      Route.put('/:id', 'SecurityKeysController.update')
      Route.delete('/:id', 'SecurityKeysController.delete')
    }).prefix('/security-keys')

    Route.group(() => {
      Route.get('/', 'ServersController.list')
    }).prefix('servers')
  }).middleware('auth')
}).prefix('/api')
