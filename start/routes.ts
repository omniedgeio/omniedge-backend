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
    Route.group(() => {
      Route.post('/register', 'AuthController.register')
      Route.post('/register/resend', 'AuthController.resendVerifyEmail')
      Route.get('/register/activate', 'AuthController.activateAccount')
      Route.post('/login/google', 'AuthController.loginWithGoogle')
      Route.post('/login/password', 'AuthController.loginWithPassword')
      Route.post('/login/security-key', 'AuthController.loginWithSecurityKey')
      Route.post('/reset-password/code', 'AuthController.forgetPassword')
      Route.post('/reset-password/verify', 'AuthController.resetPasswordWithVerification')
      Route.post('/refresh','AuthController.refresh')

      // Features
      Route.post('/verify-email', 'AuthController.verifyEmail')
    }).prefix('/auth')

    Route.group(() => {
      Route.group(() => {
        Route.get('/', 'ProfilesController.index')
        Route.put('/', 'ProfilesController.update')
        Route.put('/change-password', 'ProfilesController.changePassword')
      }).prefix('/profile')

      Route.group(() => {
        Route.post('/', 'VirtualNetworksController.create')
        Route.get('/', 'VirtualNetworksController.list')
        Route.get('/all/list', 'v1/VirtualNetworksController.list')
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
          Route.post('/:device_id', 'VirtualNetworksController.joinDevice')
        }).prefix('/:id/devices')

        Route.group(() => {
          Route.post('/', 'VirtualNetworksController.createInvitation')
          Route.get('/', 'VirtualNetworksController.listInvitations')
          Route.delete('/:invitation_id', 'VirtualNetworksController.deleteInvitation')
        }).prefix('/:id/invitations')
      }).prefix('/virtual-networks')

      Route.group(() => {
        Route.post('/', 'InvitationsController.create')
        Route.get('/', 'InvitationsController.list')
        Route.put('/:invitation_id', 'InvitationsController.update')
      }).prefix('/invitations')

      Route.group(() => {
        Route.post('/', 'DevicesController.register')
        Route.get('/', 'DevicesController.list')
        Route.get('/:id', 'DevicesController.retrieve')
        Route.put('/:id', 'DevicesController.update')
        Route.delete('/:id', 'DevicesController.delete')
      }).prefix('/devices')

      Route.group(() => {
        Route.post('/', 'SecurityKeysController.create')
        Route.get('/', 'SecurityKeysController.list')
        Route.get('/:id', 'SecurityKeysController.retrieve')
        Route.put('/:id', 'SecurityKeysController.update')
        Route.delete('/:id', 'SecurityKeysController.delete')
      }).prefix('/security-keys')

      Route.group(() => {
        Route.get('/', 'ServersController.list')
      }).prefix('servers')

      Route.group(() => {
        Route.post('/portal-session', 'PaymentsController.createPortalSession')
        Route.post('/checkout-session', 'PaymentsController.createCheckoutSession')
      }).prefix('/payment')

      // For v1.api
      Route.post('/auth/login/session/notify', 'v1/AuthController.notifySession')
    }).middleware('auth')

    Route.group(() => {
      Route.post('/webhook', 'PaymentsController.stripeWebhook')
    }).prefix('/payment')
  }).prefix('/v2')

  /* -------------------------------------------------------------------------- */
  /*                                   V1 API                                   */
  /* -------------------------------------------------------------------------- */
  Route.group(() => {
    Route.group(() => {
      Route.post('/register', 'AuthController.register')
      Route.get('/register/activate', 'AuthController.activateAccount')
      Route.post('/login/google', 'v1/AuthController.loginWithGoogle')
      Route.post('/login/password', 'v1/AuthController.loginWithPassword')
      Route.post('/login/security-key', 'v1/AuthController.loginWithSecurityKey')
      Route.post('/reset-password/code', 'AuthController.forgetPassword')
      Route.post('/reset-password/verify', 'AuthController.resetPasswordWithVerification')
      Route.post('/refresh','AuthController.refresh')


      Route.get('/login/session', 'v1/AuthController.generateSession')
    }).prefix('/auth')

    Route.group(() => {
      Route.group(() => {
        Route.get('/profile', 'ProfilesController.index')
        Route.post('/profile', 'ProfilesController.update')
        Route.put('/auth/change-password', 'ProfilesController.changePassword')
      }).prefix('/user')

      Route.group(() => {
        Route.post('/', 'VirtualNetworksController.create')
        Route.get('/', 'v1/VirtualNetworksController.list')
        Route.get('/:id', 'v1/VirtualNetworksController.retrieve')
        Route.put('/:id', 'VirtualNetworksController.update')
        Route.delete('/:id', 'VirtualNetworksController.delete')

        Route.group(() => {
          Route.delete('/:user_id', 'VirtualNetworksController.deleteUser')
        }).prefix('/:id/users')

        Route.group(() => {
          Route.delete('/:device_id', 'VirtualNetworksController.deleteDevice')
          Route.post('/:device_id/join', 'VirtualNetworksController.joinDevice')
        }).prefix('/:id/devices')
      }).prefix('/virtual-networks')

      // Route.group(() => {
      //   Route.post('/', 'InvitationsController.create')
      //   Route.get('/', 'InvitationsController.list')
      //   Route.delete('/:invitation_id', 'InvitationsController.delete')
      // }).prefix('/invitations')

      Route.group(() => {
        Route.post('/register', 'DevicesController.register')
        Route.get('/', 'v1/DevicesController.list')
        Route.get('/:id', 'DevicesController.retrieve')
        Route.put('/:id', 'DevicesController.update')
        Route.delete('/:id', 'DevicesController.delete')
      }).prefix('/devices')

      Route.post('/auth/login/session/notify', 'v1/AuthController.notifySession')
    }).middleware('auth')
  }).prefix('/v1')
}).prefix('/api')

Route.group(() => {
  Route.get('/plan/count', 'AdminsController.planCount')
  Route.get('/user/count', 'AdminsController.userCount')
  Route.get('/device/count', 'AdminsController.deviceCount')
  Route.get('/vn/count', 'AdminsController.virtualNetworkCount')
  Route.get('/user/info', 'AdminsController.userInfo')
})
  .prefix('/api/v2/admin')
  .middleware('admin-auth')
