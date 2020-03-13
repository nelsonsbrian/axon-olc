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

      const { rewards } = menuMap.get(fileName);
      console.log(rewards);
      let options = [];

      rewards.forEach(({ type, config }, i) => {

        const rewardClass = state.QuestRewardManager.get(type);
        const hasConfig = rewardClass && QU[type] && QU[type].configOptions;
        const displayVal = hasConfig ? '' : 'No Config ';
        let configDisplay = '';
        try {
          if (hasConfig && rewardClass.display) {
            configDisplay += rewardClass.display(state, {
              id: er, config: { level: def.config.level }
            }, config, player);
          }
        } catch (e) { configDisplay = ''; }

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
              rewards.splice(i, 1);
            }
          }
        });

      });

      [...state.QuestRewardManager.keys()].forEach((rewardName, i) => {
        options.push({
          display: `Add a <yellow>${rewardName}</yellow>`,
          displayValues: ``,
          bottomMenu: true,
          key: String.fromCharCode(65 + i), // 65=A
          onSelect: () => {
            const rewardClass = state.QuestRewardManager.get(rewardName);
            const hasConfig = rewardClass && QU[rewardName] && QU[rewardName].configOptions;
            if (hasConfig) {
              rewards.push({ type: rewardName, config: hasConfig(state, player, inputConfig) });
            } else {
              say(`<red>${rewardName} does not have a config file to edit.</red>`);
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
