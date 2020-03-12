'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { itemSlots } = require('../lib/Constants');
const { booleanColors } = require('../lib/ColorUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { none, menuMap, eventStack, def, entity } = inputConfig;
      const { equipmentMap } = menuMap.get(fileName);
      inputConfig.fileName = fileName;

      let options = [];

      options.push({
        key: '',
        display: `Equipment:`
      });

      [...equipmentMap.entries()].forEach(([slot, itemEr], i) => {
        const foundDef = state.ItemFactory.getDefinition(itemEr);
        const name = foundDef ? foundDef.name : '';
        const level = foundDef ? `Lvl: ${foundDef.metadata.level}` : 'None';
        const er = itemEr ? `<b><magenta>${itemEr}</magenta></b>` : none;
        options.push({
          display: cap(slot),
          displayValues: `${er} ${level} ${name} `,
          key: (i + 1).toString(),
          onSelect: (choice) => {
            menuMap.set('input-text', {
              text: itemEr || none,
              params: {
                type: 'entityReference',
                entityType: 'item',
              },
              displayProperty: `${slot} - Item Entity Reference`,
              onExit: choice.onExit,
            });
            eventStack.push(fileName);
            socket.emit('input-text', player, inputConfig);
          },
          onExit: (optionConfig) => {
            if (optionConfig.text.length) {
              equipmentMap.set(slot, optionConfig.text)
            } else {
              equipmentMap.set(slot, null)
            }
          }
        });

      })

      options.push(back(player, inputConfig));

      DU.showMenu(player, inputConfig, options);

    }
  };
};
