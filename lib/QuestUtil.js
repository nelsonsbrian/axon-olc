'use strict';

const { Broadcast: B, Logger, EventUtil } = require('ranvier');

const sprintf = require('sprintf-js').sprintf;
const Joi = require('@hapi/joi');
const { capitalize: cap, objClass } = require('./StringUtil');
const { itemSlots, currencyType } = require('../lib/Constants');
const { booleanColors } = require('../lib/ColorUtil');

exports.KillGoal = {
  display: (GameState, quest, config, player, col1 = 'cyan', col2 = 'yellow') => {
    config = Object.assign({
      title: 'Kill Enemy',
      targets: [],
      count: 1
    }, config);

    const { title, targets, count } = config;

    return `<${col1}>${cap(title)}: <${col2}>${count}x - ${targets.join(' ')}</${col2}></${col1}>`;
  },


  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);


    if (!options) {
      config = Object.assign({
        title: 'Kill Enemy',
        targets: [],
        count: 1
      }, config);
      return config;
    } // Create initial/default values for config

    const { title, targets, count } = config;

    options.push({
      display: 'Title',
      displayValues: `<yellow>${title}</yellow>`,
      key: '1',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: def.title,
          schema: Joi.string().min(1).max(75).required(),
          displayProperty: 'Goal Title',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.title = optionConfig.text;
      }
    });

    options.push({
      display: 'Count',
      displayValues: count,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: count,
          schema: Joi.number().integer().min(1).max(9999).required(),
          displayProperty: choice.display,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        const inputCount = parseInt(optionConfig.text);
        config.count = inputCount;
      },
    });

    options.push({
      display: 'Target Npcs',
      displayValues: targets.length ? targets.join(' ') : none,
      key: '3',
      onSelect: (choice) => {
        menuMap.set('list-text', {
          current: [...targets],
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
        config.targets = [...optionConfig.current];
      }
    });
  }
}

exports.FetchGoal = {
  display: (GameState, quest, config, player, col1 = 'cyan', col2 = 'yellow') => {
    config = Object.assign({
      title: 'Retrieve Item',
      removeItem: false,
      count: 1,
      item: null
    }, config);

    const { title, item, count, removeItem } = config;

    return `<${col1}>${cap(title)}: <${col2}>${count}x - Remove?:${removeItem.toString()} ${item}</${col2}></${col1}>`;
  },


  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);


    if (!options) {
      config = Object.assign({
        title: 'Find Room',
        item: null,
        count: 1,
        removeItem: false,
      }, config);
      return config;
    } // Create initial/default values for config

    const { title, item, count, removeItem = false } = config;

    options.push({
      display: 'Title',
      displayValues: `<yellow>${title}</yellow>`,
      key: '1',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: config.title,
          schema: Joi.string().min(1).max(75).required(),
          displayProperty: 'Goal Title',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.title = optionConfig.text;
      }
    });

    options.push({
      display: 'Count',
      displayValues: count,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: count,
          schema: Joi.number().integer().min(1).max(9999).required(),
          displayProperty: choice.display,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.count = parseInt(optionConfig.text);
      },
    });

    const itemDef = state.ItemFactory.getDefinition(item);
    options.push({
      display: 'Target Item',
      displayValues: itemDef ? `${item} - ${itemDef.name}` : none,
      key: '3',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: item || none,
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
        if (optionConfig.text.length && optionConfig.text !== none) {
          config.item = optionConfig.text;
        }
      }
    });

    const { open: o, close: c } = booleanColors(removeItem) || { open: '', close: '' };
    options.push({
      display: 'Destroy on Complete',
      displayValues: `${o}${cap(removeItem.toString())}${c}`,
      key: '4',
      onSelect: () => {
        config.removeItem = !removeItem;
        socket.emit(fileName, player, inputConfig);
      },
    });

  }
}

exports.BountyGoal = {
  display: (GameState, quest, config, player, col1 = 'cyan', col2 = 'yellow') => {
    config = Object.assign({
      title: 'Locate NPC',
      npc: null, // NPC ID to capture
      home: null // Area ID to return to
    }, config);

    const { title, npc, home } = config;

    return `<${col1}>${cap(title)}: <${col2}>${npc ? `NPC: ${npc} ` : ''}${home ? `ReturnTo: ${home}` : ''} </${col2}></${col1}>`;
  },

  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);


    if (!options) {
      config = Object.assign({
        title: 'Locate NPC',
        npc: null, // NPC ID to capture
        home: null // Area ID to return to
      }, config);
      return config;
    } // Create initial/default values for config

    const { title, npc, home } = config;

    options.push({
      display: 'Title',
      displayValues: `<yellow>${title}</yellow>`,
      key: '1',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: def.title,
          schema: Joi.string().min(1).max(75).required(),
          displayProperty: 'Goal Title',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.title = optionConfig.text;
      }
    });

    const mobDef = state.MobFactory.getDefinition(npc);
    options.push({
      display: 'Target Npc',
      displayValues: mobDef ? `${npc} - Lvl${mobDef.level} ${mobDef.name}` : none,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: npc || none,
          params: {
            type: 'entityReference',
            entityType: 'npc',
          },
          displayProperty: 'Npc EntityReference',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        if (optionConfig.text.length && optionConfig.text !== none) {
          config.npc = optionConfig.text;
        }
      }
    });

    options.push({
      display: 'Target Home Area',
      displayValues: home || none,
      key: '3',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: home || none,
          params: {
            type: 'entityReference',
            entityType: 'area',
          },
          displayProperty: 'Area Name',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        if (optionConfig.text.length && optionConfig.text !== none) {
          config.home = optionConfig.text;
        } else {
          config.home = null;
        }
      }
    });
  }
}

exports.EquipGoal = {
  display: (GameState, quest, config, player, col1 = 'cyan', col2 = 'yellow') => {
    config = Object.assign({
      title: 'Equip Item',
      slot: [],
    }, config);

    const { title, slot } = config;

    return `<${col1}>${cap(title)}: <${col2}>${slot}</${col2}></${col1}>`;
  },

  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);


    if (!options) {
      config = Object.assign({
        title: 'Equip Item',
        slot: 'head',
      }, config);
      return config;
    } // Create initial/default values for config

    const { title, slot } = config;

    options.push({
      display: 'Title',
      displayValues: `<yellow>${title}</yellow>`,
      key: '1',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: def.title,
          schema: Joi.string().min(1).max(75).required(),
          displayProperty: 'Goal Title',
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.title = optionConfig.text;
      }
    });

    options.push({
      display: 'Slot',
      displayValues: slot || none,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('select-one', {
          text: slot || none,
          selections: [...itemSlots]
            .map((slot) => ({ display: cap(slot), slot })),
          columns: 2,
          minWidth: 0,
          displayProperty: choice.display,
          required: true,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('select-one', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.slot = optionConfig.selection.slot;
      },
    });

  }
}

exports.ExperienceReward = {

  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);

    if (!options) {
      config = Object.assign({
        amount: 1,
        leveledTo: 'QUEST',
      }, config);
      return config;
    } // Create initial/default values for config

    const { amount, leveledTo } = config;

    const help = [
      `Amount: number, Either a static amount or a multipler to use for leveledTo`,
      `LeveledTo: PLAYER | QUEST | STATIC - static/null rewards the 'amount'.`,
      `Otherwise to reward preset amount according to quest or player level multiplied by the amount`
    ];

    help.forEach(h => {
      options.push({
        key: '',
        display: `<green>${h}</green>`
      });
    });

    options.push({
      display: 'Level To',
      displayValues: leveledTo,
      key: '1',
      onSelect: (choice) => {
        menuMap.set('select-one', {
          text: leveledTo || '',
          selections: ["PLAYER", "QUEST", 'STATIC'].map(type => ({ display: type, type })),
          columns: 1,
          displayProperty: choice.display,
          required: true,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        player.socket.emit('select-one', player, inputConfig);
      },
      onExit: (optionConfig) => {
        if (optionConfig.selection.type === "STATIC") {
          config.leveledTo = '';
        } else {
          config.leveledTo = optionConfig.selection.type;
        }
      },
    });


    options.push({
      display: 'Amount',
      displayValues: amount,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: amount,
          schema: Joi.number().integer().min(1).max(99999999).required(),
          displayProperty: choice.display,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.amount = parseInt(optionConfig.text);
      },
    });
  }
}

exports.CurrencyReward = {
  // display: (GameState, quest, config, player, col1 = 'cyan', col2 = 'yellow') => {

  //   config = Object.assign({
  //     amount: 100,
  //     currency: 'gold',
  //   }, config);

  //   const { amount, currency } = config;
  //   return `<${col1}>${cap(currency)}: <${col2}>${amount}</${col2}></${col1}>`;

  // },

  configOptions: (state, player, inputConfig, options) => {
    const socket = player.socket;
    let { eventStack, fileName, menuMap, def, none } = inputConfig;
    let { config } = menuMap.get(fileName);

    if (!options) {
      config = Object.assign({
        amount: 100,
        currency: 'gold',
      }, config);
      return config;
    } // Create initial/default values for config

    const { amount, currency } = config;

    const currencySelections = currencyType.map(currencyType => {
      return {
        display: `${cap(currencyType.toLowerCase().replace('_', ''))}`,
        currencyType,
      }
    });
    options.push({
      display: 'Currency',
      displayValues: currency,
      key: '1',
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
        config.currency = optionConfig.selection.currencyType;
      },
    });

    options.push({
      display: 'Amount',
      displayValues: amount,
      key: '2',
      onSelect: (choice) => {
        menuMap.set('input-text', {
          text: amount,
          schema: Joi.number().integer().invalid(0).min(-1).max(9999999).required(),
          displayProperty: choice.display + ` (-1 for auto)`,
          onExit: choice.onExit,
        });
        eventStack.push(fileName);
        socket.emit('input-text', player, inputConfig);
      },
      onExit: (optionConfig) => {
        config.amount = parseInt(optionConfig.text);
      },
    });

  }
}