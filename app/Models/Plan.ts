import { BaseModel, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import { DateTime } from 'luxon'
import PlanLimit from './PlanLimit'

export default class Plan extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column()
  public slug: string

  @column()
  public title: string

  @column()
  public stripePriceId: string

  @hasMany(() => PlanLimit)
  public limits: HasMany<typeof PlanLimit>

  @hasMany(() => User)
  public users: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
