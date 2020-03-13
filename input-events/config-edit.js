'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const QU = require('../lib/QuestUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig.fileName = fileName;

      let { eventStack, menuMap, def, none } = inputConfig;

      const optionConfig = Object.assign({
        toDelete: false,
      }, menuMap.get(fileName));
      const { type, config, configOptions, onExit, toDelete } = optionConfig;

      let options = [];

      configOptions(state, player, inputConfig, options);

      options.push({
        display: `Delete ${type}`,
        displayValues: ``,
        key: 'X',
        bottomMenu: true,
        onSelect: () => {
          optionConfig.toDelete = true;
          onExit ? onExit(optionConfig) : null;
          menuMap.delete(fileName);
          return socket.emit(eventStack.pop(), player, inputConfig);
        },
      });

      options.push(back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
