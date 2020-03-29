'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass } = require('../lib/StringUtil');
const { RoomDoors } = require('../lib/Constants');
const { booleanColors } = require('../lib/ColorUtil');
const OLC = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      const { entity, eventStack, menuMap, def, none } = inputConfig;
      const { exit, direction } = menuMap.get(fileName);
      def.doors = def.doors || {};
      const door = exit && def.doors[exit.roomId];
      const { lockedBy } = door || {};

      inputConfig.fileName = fileName;

      const options = [];

      options.push({
        key: '',
        display: `Exit: <b><yellow>${cap(direction)}</yellow></b> Door`
      });

      options.push({
        display: 'Create Door',
        displayValues: ``,
        key: '1',
        onSelect: (choice) => {
          def.doors[exit.roomId] = RoomDoors();
          return socket.emit(fileName, player, inputConfig);
        },
        hide: () => {
          return door;
        },
      });

      options.push({
        display: 'Key',
        displayValues: `<yellow>${lockedBy || none}</yellow>`,
        key: '2',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: lockedBy || none,
            params: {
              type: 'entityReference',
              entityType: 'item',
            },
            displayProperty: 'Item EntityReference',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          door.lockedBy = optionConfig.text;
        },
        hide: () => {
          return !door;
        },
      });

      // All Door Boolean Properties
      let i = 3;
      for (const [prop, value] of Object.entries(RoomDoors())) {
        if (value !== true && value !== false) {
          continue;
        }
        const evalProp = door && door[prop] ? door[prop] : value;
        const { open: o, close: c } = door && booleanColors(evalProp) || { open: '', close: '' };
        options.push({
          display: cap(prop),
          displayValues: door ? `${o}${cap(evalProp.toString())}${c}` : '',
          key: i.toString(),
          onSelect: () => {
            door[prop] = !evalProp;
            return socket.emit(fileName, player, inputConfig);
          },
          hide: () => {
            return !door;
          },
        });
        i++;
      }

      options.push({
        display: 'Purge Door',
        displayValues: '',
        key: 'x',
        bottomMenu: true,
        onSelect: (choice) => {
          if (door) {
            delete def.doors[exit.roomId];
            say(`${cap(direction)} Door Purged.`);
          }
          menuMap.delete(fileName);
          return socket.emit(eventStack.pop(), player, inputConfig);
        },
        hide: () => {
          return !door;
        },
      });

      options.push(OLC.back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
