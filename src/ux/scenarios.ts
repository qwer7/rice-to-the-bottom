export const playerScenarios = [
  ['entry', 'Вход в игру'], ['lobby', 'Лобби игрока'], ['trading', 'Торговля'],
  ['trading-limit', 'Торговля · лимит сделок'], ['trading-empty', 'Торговля · нет денег'], ['influence', 'Рыночная карта · выбор'],
  ['influence-selected', 'Рыночная карта · выбрана'], ['influence-exchanged', 'Рыночная карта · обмен использован'],
  ['influence-limit', 'Рыночная карта · все обмены использованы'], ['purchase', 'Покупка карты влияния'], ['purchase-selected', 'Покупка · карта выбрана'],
  ['victory-purchase', 'Покупка карты победы'], ['ready', 'Ход завершён'],
  ['reveal', 'Раскрытие карт'], ['finished', 'Партия завершена'],
  ['manage-lobby', 'Управление · лобби'], ['manage-playing', 'Управление · игра'], ['manage-finished', 'Управление · завершение'],
] as const
export const boardScenarios = [
  ['empty-lobby', 'Лобби · ожидание игроков'], ['lobby', 'Лобби · четыре игрока'],
  ['playing', 'Доска · начало игры'], ['playing-progress', 'Доска · игроки делают ходы'], ['connecting', 'Доска · подключение'], ['offline', 'Доска · нет связи'],
  ['reveal', 'Раскрытие карт'], ['finished', 'Победитель · итог'], ['tie', 'Ничья · итог'],
] as const
