'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { currencyType } = require('../lib/Constants');
const { booleanColors } = require('../lib/ColorUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig.fileName = fileName;

      let { entity, eventStack, menuMap, def, none } = inputConfig;

      const { vendorConfig, display, mercenary = false } = menuMap.get(fileName);
      const { cost, currency, hiredMessage, expiredMessage, duration, multiple, hireMyself, despawn } = vendorConfig;

      let options = [];
      options.push({
        key: '',
        display: `<b><yellow>${display}</yellow></b>`
      });

      options.push({
        display: 'Cost',
        displayValues: cost,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: cost,
            schema: Joi.number().integer().min(1).max(999999999).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          vendorConfig.cost = parseInt(optionConfig.text);
        }
      });

      const currencySelections = currencyType.map(currencyType => {
        return {
          display: `${cap(currencyType.toLowerCase().replace('_', ''))}`,
          currencyType,
        }
      });
      options.push({
        display: 'Currency',
        displayValues: currency,
        key: '2',
        onSelect: (choice) => {
          menuMap.set('select-one', {
            text: currency || '',
            selections: currencySelections,
            displayProperty: choice.display,
            columns: 1,
            required: true,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('select-one', player, inputConfig);
        },
        onExit: (optionConfig) => {
          vendorConfig.currency = optionConfig.selection.currencyType;
        },
      });

      options.push(back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
