'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, ItemType } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { itemSlots } = require('../lib/Constants');
// const DefaultAttributes = require(bundlesPath + 'exile-lib/lib/DefaultAttributes');
const { booleanColors } = require(bundlesPath + 'exile-lib/lib/ColorUtil');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      const { entity, eventStack, menuMap, area, none } = inputConfig;
      let def = inputConfig.def;
      const { } = menuMap.get(fileName);

      inputConfig.fileName = fileName;

      if (!def.metadata.stats) { def.metadata.stats = {} }

      const options = [];

      options.push({
        key: '',
        display: `<b><yellow>Stats:</yellow></b>`
      });

      const statsArr = Object.keys(def.metadata.stats || {});
      statsArr.forEach((attr, i) => {

        const statValue = def.metadata.stats[attr] || 0;
        const scaledValue = scaled.metadata && scaled.metadata.stats[attr] || '-';
        options.push({
          display: cap(attr),
          displayValues: sprintf(`Def Input: %-3s Scaled: %-3s`, statValue, scaledValue),
          key: (i + 1).toString(),
          onSelect: (choice) => {
            menuMap.set('input-text', {
              text: statValue + ` (-1 will delete stat)`,
              schema: Joi.number().integer().min(-1).max(999).required(),
              displayProperty: choice.display,
              onExit: choice.onExit,
            });
            eventStack.push(fileName);
            player.socket.emit('input-text', player, inputConfig);
          },
          onExit: (optionConfig) => {
            const inputStatValue = parseInt(optionConfig.text);
            if (inputStatValue === -1) {
              delete def.metadata.stats[attr];
            }
            def.metadata.stats[attr] = inputStatValue;
          }
        });
      });

      const attributes = DefaultAttributes.itemAtt;
      const stats = def.metadata.stats || {};
      options.push({
        display: 'Add Stats',
        displayValues: '',
        key: '+',
        bottomMenu: true,
        onSelect: (choice) => {
          menuMap.set('toggleable', {
            current: new Set([...Object.keys(stats)]),
            selections: new Set([...attributes]),
            displayProperty: choice.display,
            columns: 4,
            minWidth: 5,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('toggleable', player, inputConfig);
        },
        onExit: (optionConfig) => {
          [...optionConfig.current].forEach(attr => {
            def.metadata.stats[attr] = def.metadata.stats[attr] || 1;
          });
          console.log(optionConfig.current);
        }
      });

      options.push(OLC.back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);


      inputConfig.menuMap.set(fileName, {
        scaled: {},
      });

    }
  };

};
