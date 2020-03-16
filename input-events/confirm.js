'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, Logger } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap } = require('../lib/StringUtil');
const QU = require('../lib/QuestUtil');
const { back } = require('../lib/OlcOptions');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { area, menuMap, eventStack, type, er } = inputConfig;
      const optionConfig = Object.assign({
        confirm: _ => _,
        deny: _ => _,
        cancel: _ => _,
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      const { confirm, deny, cancel } = optionConfig;
      inputConfig.fileName = fileName;

      say(`<cyan>|</cyan>`);
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' Y ', `Yes, save changes`));
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' N ', `No, revert changes`));
      say(sprintf(`<cyan>|</cyan> <cyan>[<yellow>%3s</yellow>]</cyan> %s`, ' C ', `Cancel, go to Editor`));
      say('<cyan>|\r\n`-></cyan> Confirm changes:');

      socket.once('data', data => {
        data = data.toString().trim().toLowerCase();
        Logger.log('OLC Saved:', fileName, er, type);

        if (data === 'y' || data === 'ye' || data === 'yes') {
          menuMap.delete(fileName);
          confirm(data);
        } else if (data === 'n' || data === 'no') {
          menuMap.delete(fileName);
          deny(data);
        } else if (data === 'c' || 'cancel'.startsWith(data)) {
          menuMap.delete(fileName);
          cancel(data);
        } else {
          say(`Invalid selection!`);
          return socket.emit(fileName, player, inputConfig);
        }

      });

    }
  };
};
