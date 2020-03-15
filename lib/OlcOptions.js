'use strict';

exports.back = function (player, inputConfig, config = {}) {
  const socket = player.socket;
  const { none, menuMap, eventStack, def, fileName } = inputConfig;
  const optionConfig = menuMap.get(fileName) || {};

  const { display = 'Back', key = '0' } = config;

  return {
    display,
    displayValues: '',
    key: key.toString(),
    bottomMenu: true,
    onSelect: () => {
      optionConfig && optionConfig.onExit ? optionConfig.onExit(optionConfig) : null;
      menuMap.delete(fileName);
      socket.emit(eventStack.pop(), player, inputConfig);
    }
  };
};

exports.quit = function (player, inputConfig, config = {}) {
  const socket = player.socket;
  const { none, menuMap, eventStack, def, fileName } = inputConfig;
  const optionConfig = menuMap.get(fileName) || {};

  const { display = 'Quit', key = 'q' } = config;

  return {
    display,
    displayValues: '',
    key: key.toString(),
    bottomMenu: true,
    onSelect: () => {
      optionConfig && optionConfig.onExit ? optionConfig.onExit(optionConfig) : null;
      eventStack.push(fileName);
      player.socket.emit('exit-olc', player, inputConfig);
    }
  };
};