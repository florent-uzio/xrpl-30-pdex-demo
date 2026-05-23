import { Client } from 'xrpl'
import { NETWORK_URL } from './mockState'

export const xrplClient = new Client(NETWORK_URL)
