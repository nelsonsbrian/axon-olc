'use strict';

const { Broadcast: B, Logger, EventUtil } = require('ranvier');

const sprintf = require('sprintf-js').sprintf;
const Joi = require('@hapi/joi');
const { capitalize: cap, objClass, getUncoloredLength, truncateER, truncateWithEnding, bestMatch } = require('./StringUtil');
const { save } = require('./EntityUtil');

const menuSchema = Joi.string().max(25)
  .messages({
    "string.max": `Inputs into OLC editor regular menues are limited to a length of {#limit} characters.`,
  });

exports.olcHeader = function (player, inputConfig) {
  let { eventStack, fileName, er, type } = inputConfig;
  const socket = player.socket;
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);
  const stack = eventStack.map(st => `<yellow>${st}</yellow> > `).join('') + `<b><yellow>${fileName}</yellow></b>`;
  say(`<cyan>,${B.line(80, '-')},</cyan>`);
  const erString = er ? truncateER(er, 15) : '';
  say(sprintf(`<cyan>|</cyan> <b><yellow>%s:</yellow></b> <b><white>[<magenta>%-15s</magenta>]:</white></b> %s`, cap(type), erString, stack.toUpperCase()));
  say(`<cyan>,${B.line(80, '-')}'</cyan>`);
};

/**
 * Displays the entire olc menu
 */
exports.showMenu = function (player, inputConfig, options) {
  let { eventStack, fileName, menuMap } = inputConfig;
  const socket = player.socket;
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);

  let { minWidth, showChoice = true } = menuMap.get(fileName) || {};
  minWidth = minWidth || 10;

  const displayOptions = { minWidth };

  const visOptions = options.filter(opt => !opt.hide || (opt.hide && !opt.hide()));

  // Standard OLC Header
  exports.olcHeader(player, inputConfig);

  // Display options: Regular options first and bottom ones like back/quit/clear etc  
  exports.showOptions(visOptions.filter(opt => !opt.bottomMenu), player, displayOptions);
  say('<cyan>|</cyan>');
  exports.showOptions(visOptions.filter(opt => opt.bottomMenu), player, displayOptions);

  write('<cyan>|\r\n`-></cyan> Enter Choice:');

  // Add commands listener for next player keyboard input.
  if (showChoice) {
    exports.makeChoice(player, options, inputConfig);
  }

}

exports.makeChoice = function (player, options, inputConfig) {
  let { eventStack, fileName, menuMap } = inputConfig;
  const socket = player.socket;
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);

  const optionConfig = Object.assign({
    returnToOriginal: false,
  }, menuMap.get(fileName));

  let { returnToOriginal } = optionConfig;

  socket.once('data', data => {
    data = data.toString().trim();
    console.log(fileName, data)


    if (menuSchema) {
      const validate = menuSchema.validate(data, { abortEarly: false });
      if (validate.error) {
        validate.error.details.forEach(er => say(`<red>${er.message}. Try Again.</red>`))
        return socket.emit(fileName, player, inputConfig);
      }
    }

    const visChoices = options.filter(opt => opt.key.length && !opt.hide || (opt.hide && !opt.hide()));
    const other = visChoices.map(opt => opt.key);
    const key = bestMatch(data, other);
    const choice = visChoices.find(opt => opt.key === key);

    let emit;
    if (returnToOriginal || data.length || eventStack.length === 0) {
      emit = () => socket.emit(fileName, player, inputConfig);
    } else {
      emit = () => socket.emit(eventStack.pop(), player, inputConfig);
    }

    if (!data.length) {
      say('');
      return emit();
    }

    if (!choice) {
      say('Invalid Choice!');
      return emit();
    }

    say('');
    return choice.onSelect(choice);

  });
}


exports.showOptions = function (options, player, displayOptions) {
  const socket = player.socket;
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);


  const singleOpts = {
    columns: 1,
    minWidth: displayOptions.minWidth,
    keyLen: options.filter(opt => opt.key.length && !opt.columns || opt.columns <= 1)
      .reduce((len, opt) => Math.max(len, opt.key.length), 1),
    displayLen: options.filter(opt => opt.key.length && !opt.columns || opt.columns <= 1)
      .reduce((len, opt) => Math.max(len, getUncoloredLength(opt.display)), 1)
  }

  const columnConfigs = [];
  let colGroup = [];
  for (const opt of options) {
    const { columns } = opt;

    if (!colGroup.length) {
      colGroup.push(opt);
    }
    else if (!columns || columns <= 1 || colGroup[0].columns !== columns) {
      columnConfigs.push(colGroup);
      colGroup = [];
      colGroup.push(opt);
    } else {
      colGroup.push(opt);
    }
  }
  if (colGroup.length) { columnConfigs.push(colGroup) };

  for (const group of columnConfigs) {
    if (!group[0].columns || group[0].columns < 2) {
      group.forEach(opt => say(exports.showSingle(opt, singleOpts)));
    } else {
      const newOpts = {
        columns: group[0].columns,
        minWidth: displayOptions.minWidth,
        keyLen: group.reduce((len, opt) => Math.max(len, getUncoloredLength(opt.key)), 0),
        displayLen: group.reduce((len, opt) => Math.max(len, getUncoloredLength(opt.display)), 0)
      }
      say(exports.multipleColumn(group, newOpts))
    }
  }
}

exports.showSingle = function (option, displayOptions) {
  const { key, fieldChanged, display, displayValues } = option;
  const { keyLen, displayLen } = displayOptions;
  const displayValue = typeof displayValues === 'function' ? displayValues() :
    displayValues !== undefined ? displayValues : '';
  const colon = displayValue.toString().length ? ':' : ' ';
  if (!key.length) {
    return sprintf(`<cyan>|</cyan> %-${displayLen}s`, display);
  }
  return sprintf(`<cyan>|</cyan> <cyan>[<yellow>%${keyLen}s</yellow>]</cyan> %-${displayLen}s${colon} <cyan>%s</cyan>`, cap(key), display, displayValue);
}

exports.multipleColumn = function (options, displayOptions) {
  const { columns, minWidth, keyLen, displayLen } = displayOptions;
  let width = options.reduce((len, opt) => {
    const { key, display, displayValues } = opt;
    const displayValue = displayValues && typeof displayValues === 'function' ? displayValues() : displayValues || '';
    return Math.max(len, getUncoloredLength(displayValue), minWidth);
  }, 1);
  width = options.some(opt => opt.displayValues) ? width : 0;
  let msgs = [];
  options.forEach((opt) => {
    const { key, display, displayValues, openCol = '<white>', closeCol = '</white>' } = opt;
    const displayValue = displayValues && typeof displayValues === 'function' ? displayValues() : displayValues || '';
    const colon = displayValue.toString().length ? ':' : ' ';
    msgs.push(sprintf(`<cyan>[<yellow>%${keyLen}s</yellow>]</cyan> ${openCol}%-${displayLen}s${closeCol}${colon} <cyan>%-${width}s</cyan>`, cap(key), display, displayValue));
  });

  let shownMsg = '<cyan>|</cyan> ';
  for (let i = 0; i < msgs.length; i++) {
    shownMsg += msgs[i];

    if (i % columns === (columns - 1) && i > 0) {
      if (msgs[i + 1]) {
        shownMsg += '\r\n';
        shownMsg += `<cyan>|</cyan> `;
      }
    }
  }

  return shownMsg;

};

exports.leaveOLC = (player) => {
  const { area, type, er } = player.olc;

  player.olc = null;
  Logger.verbose(`[ (OLC-${type}): ${player.name} stopped editing ${er}. ]`);

  B.prompt(player, "You exit the OLC.");
  B.sayAtExcept(player.room, `${player.name} exits the OLC.`, player);
}

exports.enterOLC = (player, data) => {
  const { area, editor, er, type, def, loggerName, created, save } = data;

  B.sayAtExcept(player.room, `${player.name} enters the OLC.`, player);

  player.otherInput = true;
  player.olc = { er, area, type };

  const action = created ? `creates the` : `starts editing`;
  Logger.verbose(`[ (OLC-${type}): ${player.name} ${action} '${loggerName}': ${er}. ]`);
  return player.socket.emit(editor, player, data);
}

exports.saveOLC = (state, player, area, type, callback) => {
  save(state, area, type, callback);
  Logger.verbose(`[ (OLC-${type}): ${player.name} saves ${type} in ${area.title}. ]`);
  return B.sayAt(player, `Saving all ${type}s in ${area.title}.`);
}


exports.editorTextDisplayValue = function (text = '', c = 'yellow') {
  return text.split('\r\n').map(l => `<cyan>|</cyan> <${c}>${l}</${c}>`).join('\r\n');
};

/**
 * Helper Function for 'editor-text' input-event.
 * Makes the string back into a paragraph for viewing. 
 */
exports.editorTextWithLineNumbers = function (text = '', c = 'yellow') {
  return text.split('\r\n').map((l, i) => `<cyan>|</cyan> <yellow>${(i + 1).toString().padStart(2, ' ')}</yellow><cyan>]</cyan> <${c}>${l}</${c}>`).join('\r\n');
};


