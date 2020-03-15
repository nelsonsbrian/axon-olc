'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass } = require('../lib/StringUtil');
const { toDirections } = require('../lib/Constants');
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

      let { er, eventStack, menuMap, def, none } = inputConfig;
      let options = [];

      options.push({
        display: 'Title',
        displayValues: `<yellow>${def.title}</yellow>`,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.title,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Quest Title',
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
            displayProperty: choice.display,
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

      options.push({
        display: 'Completion Message',
        displayValues: `\r\n` + DU.editorTextDisplayValue(def.completionMessage),
        key: '3',
        onSelect: (choice) => {
          menuMap.set('editor-text', {
            text: def.completionMessage,
            params: {
              min: 0,
              max: 2100
            },
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('editor-text', player, inputConfig);
        },
        onExit: (optionConfig, cmd) => {
          if (cmd === '@s') {
            def.completionMessage = optionConfig.text;
          }
        }
      });

      options.push({
        display: 'Level',
        displayValues: def.level,
        key: '8',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.level,
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

      // Boolean Properties
      [{
        prop: 'autoComplete',
        display: 'Auto Complete'
      }, {
        prop: 'repeatable',
        display: 'Repeatable'
      },
      ].forEach(({ prop, display }, i) => {
        def[prop] = typeof def[prop] === 'undefined' ? false : def[prop];
        const { open: o, close: c } = booleanColors(def[prop]) || { open: '', close: '' };
        options.push({
          display,
          displayValues: `${o}${cap(def[prop].toString())}${c}`,
          key: String.fromCharCode(65 + i), // 65=A
          onSelect: () => {
            def[prop] = !def[prop];
            socket.emit(fileName, player, inputConfig);
          },
        });
      })

      const requires = def.requires || [];
      options.push({
        display: 'Previous Quests',
        displayValues: requires.length ? requires.join(' ') : none,
        key: 'P',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...requires],
            displayProperty: choice.display,
            getCurrent: (er) => state.QuestFactory.get(er),
            currentDisplay: (foundDef) => foundDef && foundDef.config ? `${foundDef.config.level ? `Lvl${foundDef.config.level}` : ''} ${foundDef.config.title || ''}` : '',
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
          def.requires = [...optionConfig.current];
        }
      });

      const rewards = def.rewards || [];
      options.push({
        display: `Rewards`,
        displayValues: rewards.length || none,
        key: 'R',
        onSelect: () => {
          inputConfig.menuMap.set('quest-rewards', {
            rewards,
          });
          eventStack.push(fileName);
          player.socket.emit('quest-rewards', player, inputConfig);
        }
      });

      const goals = def.goals || [];
      options.push({
        display: `Goals`,
        displayValues: goals.length || none,
        key: 'S',
        onSelect: () => {
          inputConfig.menuMap.set('quest-goals', {
            goals,
          });
          eventStack.push(fileName);
          player.socket.emit('quest-goals', player, inputConfig);
        }
      });

      // Quit Option
      options.push(quit(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };

};
