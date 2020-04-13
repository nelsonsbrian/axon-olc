'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { itemSlots } = require('../lib/Constants');
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
      def.metadata = def.metadata || {};

      let options = [];
      options.push({
        display: 'Keywords',
        displayValues: `<yellow>${def.keywords.join(' ')}</yellow>`,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.keywords,
            schema: Joi.string().min(3).max(30),
            displayProperty: 'Npc Keywords',
            onExit: choice.onExit,
            required: true,
          });
          eventStack.push(fileName);
          socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.keywords = optionConfig.text.split(',').join(' ').split(' ').filter(Boolean);
        }
      });

      options.push({
        display: 'Name',
        displayValues: `<yellow>${def.name}</yellow>`,
        key: '2',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.name,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Npc Name',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.name = optionConfig.text;
        }
      });

      options.push({
        display: 'Long Description',
        displayValues: `\r\n` + DU.editorTextDisplayValue(def.description),
        key: '3',
        onSelect: (choice) => {
          menuMap.set('editor-text', {
            text: def.description,
            params: {
              min: 0,
              max: 2100
            },
            displayProperty: 'Long Description',
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

      const level = def.level || 1;
      options.push({
        display: 'Level',
        displayValues: level,
        key: '4',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: level,
            schema: Joi.number().integer().min(1).max(100).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          const inputLevel = parseInt(optionConfig.text);
          def.level = inputLevel;
        },
      });

      options.push({
        display: 'Attributes',
        displayValues: '',
        key: 'A',
        onSelect: () => {
          inputConfig.menuMap.set('npc-attributes', {
            // no-op
          });
          eventStack.push(fileName);
          player.socket.emit('npc-attributes', player, inputConfig);
        }
      });

      // def.behaviors = def.behaviors || {};
      // const behaviorSelections = [...state.MobBehaviorManager.behaviors.keys()].filter(key => {
      //   return ( // only allow !required behaviors and non-class behaviors
      //     key !== 'combat' &&
      //     key !== 'group' &&
      //     !classSelections.some(sel => sel.cls === key)
      //   );
      // });
      // const behaviorKeys = [...Object.keys(def.behaviors)];
      // options.push({
      //   display: 'Behaviors',
      //   displayValues: `${behaviorKeys.length ? behaviorKeys.join(' ') : none}`,
      //   key: 'b',
      //   onSelect: (choice) => {
      //     menuMap.set('behaviors', {
      //       manager: state.MobBehaviorManager,
      //       clearAll: false,
      //       selections: behaviorSelections
      //     });
      //     eventStack.push(fileName);
      //     socket.emit('behaviors', player, inputConfig);
      //   },
      // });

      const vendor = def.metadata.vendor || {};
      options.push({
        display: 'Vendor',
        displayValues: vendor && vendor.items ? Object.keys(vendor.items).length : none,
        key: 'D',
        onSelect: (choice) => {
          def.metadata.vendor = def.metadata.vendor || { items: {} };
          menuMap.set('vendor', {
            // no-op
          });
          eventStack.push(fileName);
          player.socket.emit('vendor', player, inputConfig);
        }
      });

      const equipment = def.equipment || {};
      const equipmentMap = new Map();
      itemSlots.forEach(key => equipmentMap.set(key, equipment[key] && equipment[key].entityReference || null));
      console.log(equipment);
      options.push({
        display: 'Equipment',
        displayValues: Object.keys(equipment).length || none,
        key: 'E',
        onSelect: (choice) => {
          menuMap.set('equipment', {
            equipmentMap,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('equipment', player, inputConfig);
        },
        onExit: () => {
          const updatedSlots = {};
          [...equipmentMap.entries()].forEach(([slot, itemEr]) => {
            if (itemEr) {
              updatedSlots[slot] = itemEr;
            }
          });
          def.equipment = updatedSlots;
        }
      });

      const quests = def.quests || [];
      options.push({
        display: 'Quests',
        displayValues: quests.length || none,
        key: 'F',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...quests],
            displayProperty: choice.display,
            getCurrent: (er) => state.QuestFactory.get(er),
            currentDisplay: (foundDef) => foundDef ? `Lvl${foundDef.config.level} ${foundDef.config.title}` : 'No Info',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'quest',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.quests = [...optionConfig.current];
        }
      });

      const items = def.items || [];
      options.push({
        display: 'Items',
        displayValues: items.length || none,
        key: 'I',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...items],
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
          def.items = [...optionConfig.current];
        }
      });

      // Quit Option
      options.push(quit(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };

};
