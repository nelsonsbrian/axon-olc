'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass } = require('../lib/StringUtil');
const { toDirections } = require('../lib/Constants');
const { quit } = require('../lib/OlcOptions');

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
        display: 'Title',
        displayValues: `<yellow>${def.title}</yellow>`,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.title,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Room Title',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.title = optionConfig.text;
        }
      });

      options.push({
        display: 'Description',
        displayValues: `\r\n` + DU.editorTextDisplayValue(def.description),
        key: '2',
        onSelect: (choice) => {
          menuMap.set('editor-text', {
            text: def.description,
            params: {
              min: 0,
              max: 2100
            },
            displayProperty: 'Description',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('editor-text', player, inputConfig);
        },
        onExit: (optionConfig, cmd) => {
          if (cmd === '@s') {
            def.description = optionConfig.text;
          }
        }
      });

      // All Exits
      [...Object.keys(toDirections)].forEach((direction, i) => {
        const exit = def.exits.find(ex => ex.direction === direction);
        const exitRoom = exit && state.RoomManager.getRoom(exit.roomId);
        options.push({
          display: cap(direction),
          displayValues: (exit && `${exit.roomId} - ${exitRoom.title}`) || none,
          key: String.fromCharCode(65 + i), // 65=A
          onSelect: () => {
            inputConfig.menuMap.set('room-exit', {
              direction,
            });
            eventStack.push(fileName);
            player.socket.emit('room-exit', player, inputConfig);
          }
        });
      });

      const items = def.items || [];
      options.push({
        display: 'Default Items',
        displayValues: items.length || none,
        key: 'N',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...items],
            displayProperty: choice.display,
            getCurrent: (er) => state.ItemFactory.getDefinition(er),
            currentDisplay: (foundDef) => foundDef ? foundDef.name : '',
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
          def.items = [...optionConfig.current];
        }
      });

      const npcs = def.npcs || [];
      options.push({
        display: 'Default Npcs',
        displayValues: npcs.length || none,
        key: 'N',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...npcs],
            displayProperty: choice.display,
            getCurrent: (er) => state.MobFactory.getDefinition(er),
            currentDisplay: (foundDef) => foundDef ? `${foundDef.level ? `Lvl${foundDef.level}` : ''} ${foundDef.name || ''}` : '',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'npc',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.npcs = [...optionConfig.current];
        }
      });

      // Quit Option
      options.push(quit(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
