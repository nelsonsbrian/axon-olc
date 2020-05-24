'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass } = require('../lib/StringUtil');
const { RoomExits } = require('../lib/Constants');
const OLC = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig.fileName = fileName;

      let { er, eventStack, menuMap, def, none } = inputConfig;

      const { direction } = menuMap.get(fileName);

      const exit = def.exits.find(ex => ex.direction === direction);
      const door = exit && def.doors && def.doors[exit.roomId];
      const exitRoom = exit && exit.roomId && state.RoomManager.getRoom(exit.roomId);
      // const exitRoomDoor = exitRoom && exitRoom.def.doors[er];
      const { roomId, leaveMessage = '' } = exit || {};

      let options = [];
      options.push({
        key: '',
        display: `Exit: <b><yellow>${cap(direction)}</yellow></b>`
      });

      options.push({
        display: 'Exit to',
        displayValues: roomId ? `${roomId} - ${exitRoom.title}` : none,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: roomId || none,
            params: {
              type: 'entityReference',
              entityType: 'room',
            },
            displayProperty: 'Room EntityReference',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          if (exit) {
            const exitIndex = def.exits.findIndex(ex => ex.direction === direction);
            def.exits.splice(exitIndex, 1);
          }
          if (optionConfig.text.length && optionConfig.text !== none) {
            const nextExit = RoomExits({
              roomId: optionConfig.text,
              direction,
              exit,
              leaveMessage,
            });
            def.exits.push(nextExit);
          }
        }
      });

      options.push({
        display: 'Leave Message',
        displayValues: `<yellow>${leaveMessage}</yellow>`,
        key: '2',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: leaveMessage,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Leave Message',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          exit.leaveMessage = optionConfig.text;
        }
      });

      // Door Menu
      options.push({
        display: 'Door',
        displayValues: door ? `<b><green>Closeable Door</green></b>` : none,
        key: '3',
        onSelect: () => {
          eventStack.push(fileName);
          menuMap.set('room-doors', {
            exit,
            direction
          });
          socket.emit('room-doors', player, inputConfig);
        },
        hide: () => {
          return !exit;
        },
      });

      options.push({
        display: 'Purge Exit',
        displayValues: '',
        key: 'x',
        bottomMenu: true,
        onSelect: (choice) => {
          if (exit) {
            const exitIndex = def.exits.findIndex(ex => ex.direction === direction);
            def.exits.splice(exitIndex, 1);
          }
          say(`${cap(direction)} Exit Purged.`);
          menuMap.delete(fileName);
          socket.emit(eventStack.pop(), player, inputConfig);
        },
        hide: () => {
          return !exit;
        },
      });

      options.push(OLC.back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
