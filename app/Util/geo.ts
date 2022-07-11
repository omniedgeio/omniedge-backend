import geoip from 'geoip-lite'
import Logger from '@ioc:Adonis/Core/Logger'
import { Country } from 'Contracts/enum'


export function ip2Country(ip): Country {
  Logger.debug('request ip is %s', ip)
  const location = geoip.lookup(ip)
  let countryCode = Country.UnitedStatesEast
  if (location && [Country.Singapore, Country.Indonesia, Country.Malaysia].find(x => x == location.country) != null) {
    countryCode = Country.Singapore
  } else if (location && [Country.Japan, Country.Korea].find(x => x == location.country) != null) {
    countryCode = Country.Japan
  } else if (location && [Country.India].find(x => x == location.country) != null) {
    countryCode = Country.India
  } else if (location && [Country.India].find(x => x == location.country) != null) {

  } else if (location && location.timezone.includes('Asia')) {
    countryCode = Country.HongKong
  }

  if (location && [Country.Colombia, Country.Venezuela, Country.Ecuador, Country.Guyana, Country.FrenchGuiana, Country.Suriname, Country.Peru,
    Country.Bolivia, Country.Chile, Country.Paraguay, Country.Brazil, Country.Argentina, Country.Uruguay].find(x => x == location.country)) {
    countryCode = Country.Brazil
  } else if (location && location.timezone == 'America/New_York') {
    countryCode = Country.UnitedStatesEast
  } else if (location && location.timezone == 'America/Chicago') {
    countryCode = Country.UnitedStatesEast
  } else if (location && location.timezone == 'America/Phoenix') {
    countryCode = Country.UnitedStatesWest
  } else if (location && location.timezone == 'America/Denver') {
    countryCode = Country.UnitedStatesWest
  } else if (location && location.timezone == 'America/Los_Angeles') {
    countryCode = Country.UnitedStatesWest
  } else if (location && location.country == Country.UnitedStates) {
    countryCode = Country.UnitedStatesWest
  } else if (location && location.timezone.includes('America')) {
    countryCode = Country.UnitedStatesEast
  }

  if (location && [Country.Italy, Country.Spain, Country.Portugal, Country.Greece, Country.Turkey].find(x => x == location.country) != null) {
    countryCode = Country.Italy
  } else if (location && location.timezone.includes('Europe')) {
    countryCode = Country.Germany
  }

  if (location && location.timezone.includes('Africa')) {
    countryCode = Country.Germany
  }

  if (location && location.timezone.includes('Australia')) {
    countryCode = Country.Australia
  }
  return countryCode

}
