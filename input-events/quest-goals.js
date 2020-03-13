'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const QU = require('../lib/QuestUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {

  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig.fileName = fileName;

      let { eventStack, menuMap, def, none, er } = inputConfig;

      const { goals } = menuMap.get(fileName);
      console.log(goals);
      let options = [];

      goals.forEach(({ type, config }, i) => {

        const goalClass = state.QuestGoalManager.get(type);
        const hasConfig = goalClass && QU[type] && QU[type].configOptions;
        const displayVal = hasConfig ? '' : 'No Config ';
        let configDisplay = '';
        console.log(type, QU[type])
        try {
          if (hasConfig && QU[type].display) {
            configDisplay += QU[type].display(state, { id: er }, config, player);
          }
        } catch (e) { configDisplay = '' }

        options.push({
          display: type,
          displayValues: displayVal + configDisplay,
          key: (i + 1).toString(),
          onSelect: (choice) => {
            if (!hasConfig) {
              say(`<red>${type} does not have a config file to edit.</red>`);
              return socket.emit(fileName, player, inputConfig);
            }
            inputConfig.menuMap.set('config-edit', {
              type,
              config,
              configOptions: hasConfig || null,
              onExit: choice.onExit,
            });
            eventStack.push(fileName);
            socket.emit('config-edit', player, inputConfig);
          },
          onExit: (optionConfig) => {
            // delete the config in the array
            if (optionConfig.toDelete) {
              goals.splice(i, 1);
            }
          }
        });

      });

      [...state.QuestGoalManager.keys()].forEach((goalName, i) => {
        options.push({
          display: `Add a <yellow>${goalName}</yellow>`,
          displayValues: ``,
          bottomMenu: true,
          key: String.fromCharCode(65 + i), // 65=A
          onSelect: () => {
            const goalClass = state.QuestGoalManager.get(goalName);
            const hasConfig = goalClass && QU[goalName] && QU[goalName].configOptions;
            if (hasConfig) {
              goals.push({ type: goalName, config: hasConfig(state, player, inputConfig) });
            } else {
              say(`<red>${goalName} does not have a config file to edit.</red>`);
            }
            socket.emit(fileName, player, inputConfig);
          },
        });

      });

      options.push(back(player, inputConfig));

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
