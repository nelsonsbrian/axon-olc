'use strict';

const sprintf = require('sprintf-js').sprintf;
const pluralize = require('pluralize');
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, Logger } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass, findER, truncateER, bestMatch } = require('../lib/StringUtil');
const OLC = require('../lib/OlcOptions');

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
        params: {
          type: 'string',
          min: 0, max: Infinity,
          integer: true,
          entityType: null,
          wordCount: Infinity,
          alphaText: false,
          goBackOnBlank: false,
          acceptBoolean: false,
          allowDuplicates: true,
        },
        showTitle: true,
        schema: null,
        required: false,
        showTitle: true,
        displayProperty: 'Message',
        current: [],
        returnToOriginal: true,
        columns: 2,
        showChoice: false,
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      inputConfig.fileName = fileName;
      let { current, displayProperty, columns } = optionConfig;
      let { text, onExit, showTitle, required, params, schema, returnToOriginal, currentDisplay, getCurrent } = optionConfig;
      let { type, min, max, integer, entityType, wordCount, alphaText, goBackOnBlank, acceptBoolean, allowDuplicates } = params;


      const options = [];

      options.push({
        key: '',
        display: `Enter in ${displayProperty}:`
      });

      if (acceptBoolean) {
        options.push({
          display: `<b><green>True</green></b>`,
          key: 'T',
          columns,
          onSelect: () => {
            optionConfig.text = true;
            onExit(optionConfig);
            menuMap.delete(fileName);
            socket.emit(eventStack.pop(), player, inputConfig);
          }
        });
        options.push({
          display: `<b><red>False</red></b>`,
          key: 'F',
          columns,
          onSelect: () => {
            optionConfig.text = false;
            onExit(optionConfig);
            menuMap.delete(fileName);
            socket.emit(eventStack.pop(), player, inputConfig);
          }
        });
      }

      const selLen = [...current].reduce((acc, sel) => {
        sel = typeof sel === 'string' ? sel : sel.id;
        return Math.max(acc, truncateER(sel, 22).length);
      }, 0);
      // List current selections
      [...current].forEach((sel, i) => {
        sel = typeof sel === 'string' ? sel : sel.id;
        options.push({
          display: sprintf(`<b><magenta>%-${selLen}s</magenta></b> ${currentDisplay(getCurrent(sel))}`, truncateER(sel, 22)),
          key: (i + 1).toString(),
          columns,
          onSelect: (choice) => {
            current.splice(i, 1);
            socket.emit(fileName, player, inputConfig);
          }
        });
      });

      options.push({
        display: 'Clear All',
        key: 'X',
        bottomMenu: true,
        onSelect: () => {
          optionConfig.current = [];
          socket.emit(fileName, player, inputConfig);
        }
      });

      options.push(OLC.back(player, inputConfig));

      DU.showMenu(player, inputConfig, options);

      socket.once('data', data => {
        data = data.toString().trim();
        console.log(fileName, data);

        if (data.length === 0) {
          // optionConfig.text = data;
          onExit(optionConfig);
          menuMap.delete(fileName);

          if (goBackOnBlank) {
            eventStack.pop();
          }

          return socket.emit(eventStack.pop(), player, inputConfig);
        }

        const visChoices = options.filter(opt => opt.key.length && !opt.hide || (opt.hide && !opt.hide()));
        const choicesWithKey = visChoices.map(opt => opt.key);
        const key = bestMatch(data, choicesWithKey);
        const choice = visChoices.find(opt => opt.key === key);

        let emit;
        if (returnToOriginal) {
          emit = () => socket.emit(fileName, player, inputConfig);
        } else {
          emit = () => socket.emit(eventStack.pop(), player, inputConfig);
        }

        if (choice) {
          return choice.onSelect(choice);
        }

        if (schema) {
          const validate = schema.validate(data, { abortEarly: false });
          if (validate.error) {
            validate.error.details.forEach(er => say(`<red>${er.message}. Try Again.</red>`))
            return emit();
          }
        }

        if (!data.length && required) {
          say(`<red>${displayProperty} can't be blank. Try again.</red>`);
          return emit();
        }

        if (data.split(' ').length > wordCount) {
          say(`<red>${displayProperty} can't be longer than ${wordCount} ${pluralize('word', wordCount)}. Try again.</red>`);
          return emit();
        }

        if (alphaText && !(/^[a-zA-Z ]*$/).test(data)) {
          say(`<red>${displayProperty} must contain only letters. Try again.</red>`);
          return emit();
        }

        if (data.length) {
          switch (type) {
            case 'string':
              if (data.length < min || data.length > max) {
                say(`<red>${displayProperty} length must be between ${min} and ${max} characters. Try again.</red>`);
                return emit();
              }
              break;
            case 'number':
              data = parseInt(data, 10);
              if (isNaN(data) || data < min || data > max) {
                say(`<red>${displayProperty} must be a number whose value is between ${min} and ${max}. Try again.</red>`);
                return emit();
              }
              if (integer && !Number.isInteger(data)) {
                say(`<red>${displayProperty} must be a integer number. Try again.</red>`);
                return emit();
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
                if (entityType === 'quest') {
                  data = target.config.entityReference;
                } else {
                  data = target.entityReference;
                }
              }
              break;

          }
        }

        if (!allowDuplicates && current.includes(data)) {
          say(`<red>${displayProperty} already has the entry '${data}' and doesn't allow duplicates. Try again.</red>`);
          return emit();
        }

        current.push(data);
        return socket.emit(fileName, player, inputConfig);
      });

    }
  };
};
