'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, Logger} = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass } = require('../lib/StringUtil');

/**
 * Main command loop. All player input after login goes through here.
 * If you want to swap out the command parser this is the place to do it
 */
module.exports = () => {

  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { entity, area, menuMap, eventStack, save } = inputConfig;
      const optionConfig = Object.assign({
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      inputConfig.fileName = fileName;

      say(`<cyan>|</cyan>`);
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' Y ', `Yes, save changes`));
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' N ', `No, revert changes`));
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' C ', `Cancel, go to Editor`));
      say('<cyan>|\r\n`-></cyan> Confirm changes:');

      socket.once('data', data => {
        data = data.toString().trim().toLowerCase();
        console.log(fileName, data);

        if (data === 'y' || data === 'ye' || data === 'yes') {
          say(`<b><green>Changes saved to memory.</green></b>`);
          save && save(inputConfig);
          return socket.emit('commands', player);

        } else if (data === 'n' || data === 'no') {
          say(`<red>Changes <b>NOT</b> saved.</red>`);
          DU.leaveOLC(state, player);
          return socket.emit('commands', player);

        } else if (data === 'c' || 'cancel'.startsWith(data)) {
          say(`<b><green>Back to Editing.</green></b>`);
          return socket.emit(eventStack.pop(), player, inputConfig);

        } else {
          say(`Invalid selection!`);
          return socket.emit(fileName, player, inputConfig);
        }

      });

    }
  };
};
