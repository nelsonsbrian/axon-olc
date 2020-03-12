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
      inputConfig.fileName = fileName;

      const { none, menuMap, eventStack, def } = inputConfig;

      let options = [];

      const items = def.metadata.vendor.items || {};
      const itemKeys = Object.keys(items);

      let i = 1;
      if (itemKeys.length) {
        options.push({
          key: '',
          display: `<b><yellow>Items:</yellow></b>`,
        });
      }
      for (const [er, vendorConfig] of Object.entries(items)) {
        const itemDef = state.ItemFactory.getDefinition(er);
        const display = `${itemDef.level ? `Lvl${itemDef.level}` : ''} ${itemDef.name || ''}`;
        options.push({
          display,
          displayValues: ``,
          key: (i.toString()),
          onSelect: () => {
            inputConfig.menuMap.set('vendor-editor', {
              display,
              vendorConfig
            });
            eventStack.push(fileName);
            player.socket.emit('vendor-editor', player, inputConfig);
          }
        });
        i++;
      }

      const enterMessage = def.metadata.vendor.enterMessage || '';
      options.push({
        display: 'Enter Message',
        displayValues: `<yellow>${enterMessage}</yellow>`,
        key: 'A',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: enterMessage,
            schema: Joi.string().empty('').min(1).max(125).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.vendor.enterMessage = optionConfig.text;
        }
      });

      const leaveMessage = def.metadata.vendor.leaveMessage || '';
      options.push({
        display: 'Leave Message',
        displayValues: `<yellow>${leaveMessage}</yellow>`,
        key: 'B',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: leaveMessage,
            schema: Joi.string().empty('').min(1).max(125).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.vendor.leaveMessage = optionConfig.text;
        }
      });

      options.push({
        display: 'Add Items',
        displayValues: itemKeys.length || none,
        key: '+',
        bottomMenu: true,
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: itemKeys,
            displayProperty: choice.display,
            getCurrent: (er) => state.ItemFactory.getDefinition(er),
            currentDisplay: (foundDef) => foundDef ? `${foundDef.level ? `Lvl${foundDef.level}` : ''} ${foundDef.name || ''}` : '',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'item',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          const newConfig = {};
          [...optionConfig.current].forEach(itemER => {
            const exists = items.hasOwnProperty(itemER);
            if (!exists) {
              newConfig[itemER] = { cost: 50, currency: 'gold' };
            } else {
              newConfig[itemER] = items[itemER];
            }
          });
          def.metadata.vendor.items = newConfig;
        }
      });

      options.push({
        display: 'Delete Vendor',
        displayValues: '',
        key: 'x',
        bottomMenu: true,
        onSelect: (choice) => {
          delete def.metadata.vendor;
          say(`${cap(direction)} Vendor Purged.`);
          menuMap.delete(fileName);
          socket.emit(eventStack.pop(), player, inputConfig);
        }
      });

      options.push(back(player, inputConfig));

      DU.showMenu(player, inputConfig, options);

    }
  };
};
