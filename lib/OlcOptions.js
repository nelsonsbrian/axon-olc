'use strict';

const { EventUtil } = require('ranvier');
const DU = require('./DisplayUtil');

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
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);
  const { none, menuMap, eventStack, def, fileName, save } = inputConfig;
  const optionConfig = menuMap.get(fileName) || {};

  const { display = 'Quit', key = 'q' } = config;

  return {
    display,
    displayValues: '',
    key: key.toString(),
    bottomMenu: true,
    onSelect: () => {
      menuMap.set('confirm', {
        displayProperty: 'Body',
        confirm: () => {
          say(`<b><green>Changes saved to memory.</green></b>`);
          DU.leaveOLC(player);
          save && save(inputConfig);
          return socket.emit('commands', player);
        },
        deny: () => {
          say(`<red>Changes <b>NOT</b> saved.</red>`);
          DU.leaveOLC(player);
          return socket.emit('commands', player);
        },
        cancel: () => {
          say(`<b><green>Back to Editing.</green></b>`);
          return socket.emit(fileName, player, inputConfig);
        },
      });
      optionConfig && optionConfig.onExit ? optionConfig.onExit(optionConfig) : null;
      return player.socket.emit('confirm', player, inputConfig);
    }
  };
};