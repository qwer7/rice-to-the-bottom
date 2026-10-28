import { describe, expect, it } from 'vitest'
import { addPlayer, createLobby, startGame, trade, endTrading, canBuy } from '../../supabase/functions/_shared/game'
const game = () => startGame(addPlayer(createLobby('a', 'Аня'), 'b', 'Борис'))
describe('Independent trading', () => {
  it('starts with 30 money and price 4', () => { const g = game(); expect(g.players[0].balance).toBe(30); expect(g.companies.every(c => c.price === 4)).toBe(true) })
  it('counts buys and sells against the same limit', () => {
    let g = trade(game(), 'b', 'BLUEWELL', 'buy')
    g = trade(g, 'b', 'BLUEWELL', 'sell'); g = trade(g, 'b', 'REDSTONE', 'buy')
    expect(g.players[1].balance).toBe(26); expect(g.players[1].tradesUsed).toBe(3)
    g = trade(g,'b','REDSTONE','sell'); expect(() => trade(g, 'b', 'REDSTONE', 'buy')).toThrow('четырёх'); expect(canBuy(g,'b','REDSTONE')).toBe(false)
  })
  it('allows one player to enter influence while others still trade', () => {
    const g = endTrading(game(), 'b')
    expect(g.players[1].stage).toBe('influence'); expect(g.players[0].stage).toBe('trading')
    expect(() => trade(g, 'b', 'BLUEWELL', 'buy')).toThrow()
    expect(trade(g, 'a', 'BLUEWELL', 'buy').players[0].portfolio.BLUEWELL).toBe(1)
  })
  it('rejects selling absent shares and overspending', () => {
    const g = game(); expect(() => trade(g,'a','REDSTONE','sell')).toThrow()
    g.players[0].balance = 0; expect(() => trade(g,'a','REDSTONE','buy')).toThrow()
  })
  it('supports 2–5 players and self-selected unique names', () => {
    let g = createLobby('a','  Саша  '); expect(() => startGame(g)).toThrow()
    for (let i = 1; i < 5; i++) g = addPlayer(g, String(i), `Игрок ${i}`)
    expect(startGame(g).players).toHaveLength(5); expect(g.players[0].name).toBe('Саша')
    expect(() => addPlayer(g,'six','Шестой')).toThrow()
    expect(() => addPlayer(createLobby('a','Саша'),'b','саша')).toThrow('занято')
    expect(() => addPlayer(startGame(addPlayer(createLobby('a','А'),'b','Б')),'c','В')).toThrow('началась')
  })
})
