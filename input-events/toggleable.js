'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, Logger } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { menuMap, eventStack } = inputConfig;
      const optionConfig = Object.assign({
        showTitle: true,
        displayProperty: 'Message',
        headerMessage: '',
        current: new Set(),
        selections: new Set(),
        returnToOriginal: true,
        clearAll: true,
        columns: 2,
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      inputConfig.fileName = fileName;
      let { current, selections, entity, displayProperty, onExit, showTitle, columns, clearAll, headerMessage } = optionConfig;

      const options = [];

      if (headerMessage.length) {
        headerMessage.split('\r\n').forEach(msg => {
          options.push({
            key: '',
            display: msg,
          });
        })
      }

      [...selections].forEach((sel, i) => {
        options.push({
          display: sel,
          key: (i + 1).toString(),
          columns,
          onSelect: () => {
            if (current.has(sel)) {
              current.delete(sel);
            } else {
              current.add(sel);
            }
            socket.emit(fileName, player, inputConfig);
          }
        });
      });

      if (clearAll) {
        options.push({
          display: 'Clear All',
          key: 'X',
          bottomMenu: true,
          onSelect: () => {
            optionConfig.current = new Set();
            socket.emit(fileName, player, inputConfig);
          }
        });
      }

      options.push(back(player, inputConfig));

      const disp = current.size ? [...current].join(' ') : 'None';
      options.push({
        key: '',
        display: `\r\n<cyan>|</cyan>\r\n<cyan>|</cyan> Current: <green>${disp}</green>`
      });

      DU.showMenu(player, inputConfig, options);

    }
  };
};
