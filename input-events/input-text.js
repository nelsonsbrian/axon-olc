'use strict';

const sprintf = require('sprintf-js').sprintf;
const pluralize = require('pluralize');
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass, findER } = require('../lib/StringUtil');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { entity, menuMap, eventStack } = inputConfig;
      const optionConfig = Object.assign({
        text: '',
        params: { type: 'string', min: 0, max: Infinity, integer: true, entityType: null, wordCount: Infinity, alphaText: false, goBackOnBlank: false },
        displayProperty: 'Message',
        schema: null,
        required: false,
        headerMessage: '',
      }, menuMap.get(fileName));

      inputConfig.fileName = fileName;
      let { text, displayProperty, onExit, required, params, schema, headerMessage } = optionConfig;
      let { type, min, max, integer, entityType, wordCount, alphaText, goBackOnBlank } = params;

      DU.olcHeader(player, inputConfig);
      say('<cyan>|</cyan>');
      if (headerMessage.length) {
        headerMessage.split('\r\n').forEach(msg => say(`<cyan>|</cyan> <green>${msg}</green>`));
      }
      say(`<cyan>|</cyan> Current: <green>${text}</green>`);
      let minMaxStr = `${!isNaN(min) && min > 0 ? `min: ${min}` : ''} ${!isNaN(max) && max < Infinity ? `max: ${max}` : ''}`;
      minMaxStr = minMaxStr.length > 2 ? ` (${minMaxStr})` : '';
      write(`<cyan>|\r\n\`-></cyan> Enter ${displayProperty}${minMaxStr}:`);

      socket.once('data', data => {
        data = data.toString().trim();
        console.log(fileName, data);

        if (schema) {
          const validate = schema.validate(data, { abortEarly: false });
          if (validate.error) {
            validate.error.details.forEach(er => say(`<red>${er.message}. Try Again.</red>`))
            return socket.emit(fileName, player, inputConfig);
          }
        }

        if (!data.length && required) {
          say(`<red>${displayProperty} can't be blank. Try again.</red>`);
          return socket.emit(fileName, player, inputConfig);
        }

        if (data.split(' ').length > wordCount) {
          say(`<red>${displayProperty} can't be longer than ${wordCount} ${pluralize('word', wordCount)}. Try again.</red>`);
          return socket.emit(fileName, player, inputConfig);
        }

        if (alphaText && !(/^[a-zA-Z ]*$/).test(data)) {
          say(`<red>${displayProperty} must contain only letters. Try again.</red>`);
          return socket.emit(fileName, player, inputConfig);
        }

        if (data.length) {
          switch (type) {
            case 'string':
              if (data.length < min || data.length > max) {
                say(`<red>${displayProperty} length must be between ${min} and ${max} characters. Try again.</red>`);
                return socket.emit(fileName, player, inputConfig);
              }
              break;
            case 'number':
              data = parseInt(data, 10);
              if (isNaN(data) || data < min || data > max) {
                say(`<red>${displayProperty} must be a number whose value is between ${min} and ${max}. Try again.</red>`);
                return socket.emit(fileName, player, inputConfig);
              }
              if (integer && !Number.isInteger(data)) {
                say(`<red>${displayProperty} must be a integer number. Try again.</red>`);
                return socket.emit(fileName, player, inputConfig);
              }
              break;

            case 'entityReference':
              const { target, area, idNum } = findER(state, player, entityType, data);
              if (entityType === 'area') {
                if (!area) {
                  say(`<red>${displayProperty} must be a valid entry. Try again.</red>`);
                  return socket.emit(fileName, player, inputConfig);
                }
                data = area.name;
              } else {
                if (!target) {
                  say(`<red>${displayProperty} must be a valid entry. Try again.</red>`);
                  return socket.emit(fileName, player, inputConfig);
                }
                data = target.entityReference;
              }
              break;

          }
        }

        optionConfig.text = data;
        onExit(optionConfig);
        menuMap.delete(fileName);

        if (data.length < 1 && goBackOnBlank) {
          eventStack.pop();
          return socket.emit(eventStack.pop(), player, inputConfig);
        }

        socket.emit(eventStack.pop(), player, inputConfig);

      });

    }
  };
};
