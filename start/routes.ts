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

import Route from "@ioc:Adonis/Core/Route";

Route.group(() => {
  Route.group(() => {
    Route.post("/register", "AuthController.register");
    Route.post("/login/google", "AuthController.loginWithGoogle");
    Route.post("/login/password", "AuthController.loginWithPassword");
    Route.post("/login/security-key", "AuthController.loginWithSecurityKey");
    Route.post("/reset-password/code", "AuthController.resetPasswordWithCode");
    Route.post(
      "/reset-password/verify",
      "AuthController.resetPasswordWithVerification"
    );

    // Features
    Route.post("/verify-email", "AuthController.verifyEmail");
  }).prefix("/auth");

  Route.group(() => {
    Route.get("/", "ProfileController.index");
    Route.put("/", "ProfileController.update");
    Route.put("/change-password", "ProfileController.changePassword");
  }).prefix("/profile");

  Route.group(() => {
    Route.post("/", "VirtualNetworksController.create");
    Route.get("/", "VirtualNetworksController.list");
    Route.get("/:id", "VirtualNetworksController.retrieve");
    Route.put("/:id", "VirtualNetworksController.update");
    Route.delete("/:id", "VirtualNetworksController.delete");
  }).prefix("/virtual-networks");

  Route.group(() => {
    Route.post("/", "DevicesController.create");
    Route.get("/", "DevicesController.list");
    Route.get("/:id", "DevicesController.retrieve");
    Route.put("/:id", "DevicesController.update");
    Route.delete("/:id", "DevicesController.delete");
  }).prefix("/devices");

  Route.group(() => {
    Route.post("/", "InvitationController.create");
    Route.get("/", "InvitationController.list");
    Route.put("/:id", "InvitationController.update");
    Route.delete("/:id", "InvitationController.delete");
  }).prefix("/invitations");

  Route.group(() => {
    Route.post("/", "UsersController.create");
    Route.get("/", "UsersController.list");
    Route.get("/:id", "UsersController.retrieve");
    Route.put("/:id", "UsersController.update");
    Route.delete("/:id", "UsersController.delete");
  }).prefix("/users");

  Route.group(() => {
    Route.post("/", "SecurityKeysController.create");
    Route.get("/", "SecurityKeysController.list");
    Route.put("/:id", "SecurityKeysController.update");
    Route.delete("/:id", "SecurityKeysController.delete");
  }).prefix("/security-keys")
    .middleware('auth');
}).prefix("/api");
