'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, ItemType } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const { itemSlots } = require('../lib/Constants');

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

      let { entity, eventStack, menuMap, def, none } = inputConfig;
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
          console.log(optionConfig.selection)
          def.type = optionConfig.selection.type;
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


      const slotSelections = itemSlots.map(slot => {
        return {
          display: cap(slot),
          slot,
        }
      });
      const slot = def.metadata.slot || '';
      options.push({
        display: 'Slot',
        displayValues: slot.length || none,
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
            def.items = [];
            return true;
          }
        },
      });

      // const speed = def.metadata.speed || 1;
      // const { min: speedMin, max: speedMax } = convertSpeed(attackType);
      // options.push({
      //   display: 'Speed',
      //   displayValues: speed,
      //   key: 'L',
      //   onSelect: (choice) => {
      //     if (!def.override) {
      //       say(`<red>Item property 'Override' needs to be true to set this property.</red>`);
      //       return socket.emit(fileName, player, inputConfig);
      //     }
      //     menuMap.set('input-text', {
      //       text: speed,
      //       schema: Joi.number().precision(2).min(speedMin).max(speedMax).required(),
      //       displayProperty: choice.display,
      //       onExit: choice.onExit,
      //     });
      //     eventStack.push(fileName);
      //     player.socket.emit('input-text', player, inputConfig);
      //   },
      //   onExit: (optionConfig) => {
      //     const inputSpeed = parseFloat(optionConfig.text);
      //     def.metadata.speed = inputSpeed;
      //   },
      //   hide: () => {
      //     return !(defType[def.type] && defType[def.type].hasOwnProperty('speed'));
      //   },
      // });

      const minDamage = def.metadata.minDamage || 1;
      options.push({
        display: 'Min Damage',
        displayValues: minDamage,
        key: 'M',
        onSelect: (choice) => {
          if (!def.override) {
            say(`<red>Item property 'Override' needs to be true to set this property.</red>`);
            return socket.emit(fileName, player, inputConfig);
          }
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

      // options.push({
      //   display: 'Stats',
      //   displayValues: '',
      //   key: 'S',
      //   onSelect: () => {
      //     inputConfig.menuMap.set('item-stats', {
      //       scaled: {},
      //     });
      //     eventStack.push(fileName);
      //     player.socket.emit('item-stats', player, inputConfig);
      //   },
      //   hide: () => {
      //     return !(defType[def.type] && defType[def.type].hasOwnProperty('stats'));
      //   },
      // });

      // // Get .olc function in behavior config files.
      // if (defType[def.type]) {
      //   [...Object.entries(defType[def.type])].filter(([key,]) => key.startsWith('behavior-')).forEach(([key, value]) => {
      //     const behaviorName = key.split('-')[1]; // syntax 'behavior-<name>' ie 'behavior-trap'
      //     const behaviorOlcConfig = state.ItemBehaviorManager.getOlcConfig(behaviorName);
      //     if (behaviorOlcConfig) {
      //       behaviorOlcConfig(player, inputConfig, options);
      //     }
      //   });
      // }

      options.push({
        display: 'Quit',
        displayValues: '',
        key: 'q',
        bottomMenu: true,
        onSelect: () => {
          // updateDef(def);
          eventStack.push(fileName);
          player.socket.emit('exit-olc', player, inputConfig);
        }
      });

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };


  // function updateDef(def) {
  //   if (!def.override) {
  //     let { itemLevel, level, speed, attackType, min, max, avg } = def.metadata;
  //     if (typeof itemLevel !== 'undefined' && !isNaN(itemLevel)) {
  //       def.metadata.itemLevel = level * 5;
  //     }
  //     if (typeof speed !== 'undefined' && !isNaN(speed)) {
  //       const type = def.metadata.customFlags.includes('2_HANDED') ? '2_HANDED' : attackType;
  //       def.metadata.speed = Math.trunc(convertSpeed(type).avg * 100) / 100;
  //     }

  //     if (typeof min !== 'undefined' && !isNaN(min)) {
  //       def.metadata.min = Math.trunc(def.metadata.itemLevel / 2 + 1);
  //     }
  //     if (typeof max !== 'undefined' && !isNaN(max)) {
  //       def.metadata.max = Math.trunc(def.metadata.itemLevel / 2 + def.metadata.itemLevel * .10);
  //     }
  //     if (typeof avg !== 'undefined' && !isNaN(avg)) {
  //       def.metadata.avg = Math.trunc((def.metadata.min + def.metadata.max) / 2);
  //     }
  //   }

  // }
};
