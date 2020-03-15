'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, ItemType } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { itemSlots, itemQuality } = require('../lib/Constants');
const { booleanColors } = require('../lib/ColorUtil');
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
            displayProperty: 'Item Keywords',
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
            displayProperty: 'Item Name',
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
        display: 'Look Description',
        displayValues: `<yellow>${def.roomDesc}</yellow>`,
        key: '3',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.roomDesc,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Look Description',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.roomDesc = optionConfig.text;
        }
      });

      options.push({
        display: 'Long Description',
        displayValues: `\r\n` + DU.editorTextDisplayValue(def.description),
        key: '4',
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

      // def.behaviors = def.behaviors || {};
      // const behaviorKeys = [...Object.keys(def.behaviors)];
      // options.push({
      //   display: 'Behaviors',
      //   displayValues: `${behaviorKeys.length ? behaviorKeys.join(' ') : none}`,
      //   key: 'b',
      //   onSelect: (choice) => {
      //     menuMap.set('behaviors', {
      //       manager: state.ItemBehaviorManager,
      //     });
      //     eventStack.push(fileName);
      //     player.socket.emit('behaviors', player, inputConfig);
      //   },
      // });

      const itemTypeSelections = Object.keys(ItemType).map(type => {
        return {
          display: `${cap(type.toLowerCase().replace('_', ' '))}`,
          type,
          order: type,
        }
      });
      options.push({
        display: `Item Type`,
        displayValues: def.type,
        key: 'T',
        onSelect: (choice) => {
          menuMap.set('select-one', {
            text: def.type || '',
            selections: itemTypeSelections,
            columns: 2,
            minWidth: 8,
            displayProperty: `Item Type`,
            required: true,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('select-one', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.type = optionConfig.selection.type;

          // Set defaults to other properties based on the ItemType selected.
          if (ItemType[def.type] === ItemType.ARMOR) {
            def.metadata.slot = 'head';
            def.metadata.stats = {};
          }
          if (ItemType[def.type] === ItemType.WEAPON) {
            def.metadata.slot = 'wield';
            def.metadata.maxDamage = 10.0;
            def.metadata.minDamage = 5.0;
            def.metadata.speed = 2.0;
            def.metadata.stats = {};
          }
          if (ItemType[def.type] === ItemType.CONTAINER) {
            def.metadata.maxItems = 1;
            def.items = [];
          }
        }
      });

      const level = def.metadata.level || 1;
      options.push({
        display: 'Level',
        displayValues: level,
        key: 'C',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: level,
            schema: Joi.number().integer().min(0).max(100).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.level = parseInt(optionConfig.text);
        }
      });

      const itemLevel = def.metadata.itemLevel || 1;
      options.push({
        display: 'ItemLevel',
        displayValues: itemLevel,
        key: 'D',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: itemLevel,
            schema: Joi.number().integer().min(0).max(100).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.itemLevel = parseInt(optionConfig.text);
        }
      });


      const qualitySelections = itemQuality.map(quality => {
        return {
          display: `${cap(quality)}`,
          quality,
        }
      });
      const quality = def.metadata.quality || 'common';
      options.push({
        display: `Quality`,
        displayValues: quality,
        key: 'E',
        onSelect: (choice) => {
          menuMap.set('select-one', {
            text: quality,
            selections: qualitySelections,
            columns: 1,
            displayProperty: `Item Quality`,
            required: true,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('select-one', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.quality = optionConfig.selection.quality;
        }
      });

      const noPickup = (typeof def.metadata.noPickup === "boolean") ? def.metadata.noPickup : false;
      const { open: o, close: c } = booleanColors(noPickup) || { open: '', close: '' };
      options.push({
        display: 'NoPickup',
        displayValues: `${o}${cap(noPickup.toString())}${c}`,
        key: 'F',
        onSelect: () => {
          def.metadata.noPickup = !def.metadata.noPickup;
          return socket.emit(fileName, player, inputConfig);
        }
      });

      const slotSelections = itemSlots.map(slot => {
        return {
          display: cap(slot),
          slot,
        }
      });
      const slot = def.metadata.slot || '';
      options.push({
        display: 'Slot',
        displayValues: slot || none,
        key: 'G',
        onSelect: (choice) => {
          menuMap.set('select-one', {
            text: slot,
            selections: slotSelections,
            columns: 2,
            minWidth: 10,
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('select-one', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.slot = optionConfig.selection.slot;
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.ARMOR && ItemType[def.type] !== ItemType.WEAPON) {
            delete def.metadata.slot;
            return true;
          }
        },
      });


      const items = def.items || [];
      options.push({
        display: 'Default Items',
        displayValues: items.length || none,
        key: 'i',
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
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.CONTAINER) {
            delete def.items;
            return true;
          }
        },
      });

      const maxItems = def.maxItems || 1;
      options.push({
        display: 'Max Items',
        displayValues: maxItems,
        key: 'M',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: maxItems,
            schema: Joi.number().integer(1).min(1).max(100).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.maxItems = parseInt(optionConfig.text);
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.CONTAINER) {
            delete def.maxItems;
            return true;
          }
        }
      });

      const minDamage = def.metadata.minDamage || 1;
      options.push({
        display: 'Min Damage',
        displayValues: minDamage,
        key: 'M',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: minDamage,
            schema: Joi.number().precision(1).min(1).max(999).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.minDamage = parseFloat(optionConfig.text)
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.WEAPON) {
            delete def.minDamage;
            return true;
          }
        }
      });

      const maxDamage = def.metadata.maxDamage || 1;
      options.push({
        display: 'Max Damage',
        displayValues: maxDamage,
        key: 'N',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: maxDamage,
            schema: Joi.number().precision(1).min(1).max(999).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.maxDamage = parseFloat(optionConfig.text);
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.WEAPON) {
            delete def.maxDamage;
            return true;
          }
        }
      });

      const speed = def.metadata.speed || 3;
      options.push({
        display: 'Speed',
        displayValues: speed,
        key: 'O',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: speed,
            schema: Joi.number().precision(1).min(1.0).max(4.0).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          const inputSpeed = parseFloat(optionConfig.text);
          def.metadata.speed = inputSpeed;
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.WEAPON) {
            delete def.metadata.speed;
            return true;
          }
        }
      });

      // TODO: The bundlemanger ends up naming the scripts as entity referencess,
      // Example, script of 'ranvier-blade' is named 'limbo:bladeofranvier' in the behaviorManager.
      // So will need to figure this out to be able to assign scripts, unless we free form text it.
      // const scriptSelections = [...state.ItemFactory.scripts.behaviors.keys()].map(script => {
      //   return {
      //     display: cap(script),
      //     script,
      //   }
      // });
      // const script = def.script || '';
      // options.push({
      //   display: 'Script',
      //   displayValues: script || none,
      //   key: 'S',
      //   onSelect: (choice) => {
      //     menuMap.set('select-one', {
      //       text: script,
      //       selections: scriptSelections,
      //       columns: 3,
      //       minWidth: 10,
      //       displayProperty: choice.display,
      //       onExit: choice.onExit,
      //     });
      //     eventStack.push(fileName);
      //     player.socket.emit('select-one', player, inputConfig);
      //   },
      //   onExit: (optionConfig) => {
      //     def.script = optionConfig.selection.script;
      //   }
      // });

      options.push({
        display: 'Stats',
        displayValues: '',
        key: 'S',
        onSelect: () => {
          inputConfig.menuMap.set('item-stats', {
            // no-op
          });
          eventStack.push(fileName);
          player.socket.emit('item-stats', player, inputConfig);
        },
        hide: () => {
          if (ItemType[def.type] !== ItemType.ARMOR && ItemType[def.type] !== ItemType.WEAPON) {
            delete def.metadata.stats;
          }
        },
      });

      // Quit Option
      options.push(quit(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };

};
