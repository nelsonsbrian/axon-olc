'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, ItemType } = require('ranvier');
const DU = require('../lib/DisplayUtil');

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
        current: '',
        text: '',
        selections: [],
        returnToOriginal: false,
        columns: 2,
        required: true,
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      inputConfig.fileName = fileName;
      let { current, selections, entity, displayProperty, onExit, showTitle, columns, text, required } = optionConfig;

      const options = [];

      options.push({
        key: '',
        display: `<b><yellow>Select ${displayProperty}:</yellow></b>  Current: ${text}`
      });

      let i = 1;
      [...selections].forEach(sel => {

        if (sel.options && sel.options.length) {
          sel.options.forEach(insertedOption => {
            insertedOption.key = insertedOption.key || i.toString();
            options.push(insertedOption);
            i++;
          })
        } else {

          options.push({
            display: sel.display || sel.name,
            key: (i).toString(),
            columns,
            openCol: sel.open,
            closeCol: sel.close,
            onSelect: (choice) => {
              optionConfig.selection = sel;
              onExit(optionConfig);
              menuMap.delete(fileName);
              socket.emit(eventStack.pop(), player, inputConfig);
            }
          });
          i++;

        }
      });

      if (!required) {
        options.push({
          display: 'Clear',
          key: 'x',
          columns,
          bottomMenu: true,
          onSelect: (choice) => {
            optionConfig.selection = null;
            onExit(optionConfig);
            menuMap.delete(fileName);
            socket.emit(eventStack.pop(), player, inputConfig);
          }
        });
      }

      DU.showMenu(player, inputConfig, options);

    }
  };
};
