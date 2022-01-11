import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import Plan from './Plan'

export default class PlanLimit extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public planId: string

  @column()
  public key: string

  @column()
  public defaultLimit: number

  @belongsTo(() => Plan)
  public plan: BelongsTo<typeof Plan>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
