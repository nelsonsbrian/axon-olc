'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { quit } = require('../lib/OlcOptions');
const { capitalize: cap } = require('../lib/StringUtil');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig = Object.assign({
        menuMap: new Map(),
        eventStack: [],
        none: `<red>None</red>`,
      }, inputConfig);
      inputConfig.fileName = fileName;

      let { eventStack, menuMap, def, none } = inputConfig;

      let options = [];

      options.push({
        key: '',
        display: `Area Editor`
      })

      // options.push({
      //   display: 'Respawn',
      //   displayValues: def.respawnInterval + " minutes",
      //   key: 'l',
      //   onSelect: (choice) => {
      //     menuMap.set('input-text', {
      //       text: def.respawnInterval || 60,
      //       schema: Joi.number().integer().min(1).max(360).required(),
      //       displayProperty: `Respawn Time (minutes)`,
      //       onExit: choice.onExit,
      //     });
      //     eventStack.push(fileName);
      //     player.socket.emit('input-text', player, inputConfig);
      //   },
      //   onExit: (optionConfig) => {
      //     def.respawnInterval = parseInt(optionConfig.text);
      //   }
      // });

      // Quit Option
      options.push(quit(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
