'use strict';

const { Broadcast: B, Logger, EventUtil } = require('ranvier');

const sprintf = require('sprintf-js').sprintf;
const Joi = require('@hapi/joi');
const { capitalize: cap, objClass, getUncoloredLength, truncateER, truncateWithEnding, bestMatch } = require('./StringUtil');

const menuSchema = Joi.string().max(25)
  .messages({
    "string.max": `Inputs into OLC editor regular menues are limited to a length of {#limit} characters.`,
  });

exports.olcHeader = function (player, inputConfig) {
  let { eventStack, fileName, er, entClass } = inputConfig;
  const socket = player.socket;
  const say = EventUtil.genSay(socket);
  const write = EventUtil.genWrite(socket);
  const stack = eventStack.map(st => `<yellow>${st}</yellow> > `).join('') + `<b><yellow>${fileName}</yellow></b>`;
  say(`<cyan>,${B.line(80, '-')},</cyan>`);
  const erString = er ? truncateER(er, 15) : '';
  say(sprintf(`<cyan>|</cyan> <b><yellow>%s:</yellow></b> <b><white>[<magenta>%-15s</magenta>]:</white></b> %s`, cap(entClass), erString, stack.toUpperCase()));
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

exports.leaveOLC = (state, player) => {
  const { area, entClass, er } = player.olc;

  player.olc = null;
  Logger.verbose(`[ (OLC): ${player.name} stopped editing ${entClass}: ${er}. ]`);

  B.prompt(player, "You exit the OLC.");
  B.sayAtExcept(player.room, `${player.name} exits the OLC.`, player);
}

exports.enterOLC = (state, player, data, entityCreated = false) => {
  data.entClass = data.entClass || objClass(data.entity);
  data.er = data.entity ? data.entity.entityReference : data.def.entityReference;
  const { entity, area, editor, er, def, entClass } = data;
  B.sayAtExcept(player.room, `${player.name} enters the OLC.`, player);

  player.otherInput = true;
  player.olc = { er, entity, area, entClass };

  const action = entityCreated ? `creates the` : `starts editing`;
  Logger.verbose(`[ (OLC): ${player.name} ${action} ${entClass}: ${er}. ]`);
  return player.socket.emit(editor, player, data);
}

exports.saveOLC = (state, player, area, type) => {
  exports.save(state, area, type, callback);
  Logger.verbose(`[ (OLC): ${player.name} saves ${type} in ${area.title}. ]`);
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


exports.copyRoomDefinition = (config, toConfig) => {
  toConfig = JSON.parse(JSON.stringify(toConfig));
  config.name = toConfig.name;
  config.description = toConfig.description;
  config.metadata.flags = toConfig.metadata.flags;
  config.metadata.mapFlags = toConfig.metadata.mapFlags;
  config.extraDescriptions = toConfig.extraDescriptions;

}

exports.copyItemDefinition = (config, toConfig) => {
  const newDef = JSON.parse(JSON.stringify(toConfig));
  const id = config.id;
  const er = config.entityReference;
  config = newDef;
  config.id = id;
  config.entityReference = er;
  return config;
}


exports.save = (state, area, type, callback) => {
  switch (type.toLowerCase()) {
    case 'room':
      const r = __dirname + `/../../${area.bundle}/areas/${area.name}/rooms.yml`;
      console.log(r);
      const rooms = [];
      for (const [id, room] of [...area.rooms.entries()]) {
        // rooms.push(room.saveDefinition());
      }
      // Data.saveFile(r, rooms, callback);
      // area.changesMade.room = false;
      break;
    case 'area':
      const m = __dirname + `/../../${area.bundle}/areas/${area.name}/manifest.yml`;
      console.log(m);
      // Data.saveFile(m, area.saveDefinition(), callback);
      // area.changesMade.manifest = false;
      break;
    case 'npc':
      const n = __dirname + `/../../${area.bundle}/areas/${area.name}/npcs.yml`;
      console.log(n);
      const npcs = [];
      for (const mobER of [...area.defaultEntities.npcs]) {
        const mob = state.MobFactory.create(area, mobER);
        // npcs.push(mob.saveDefinition());
      }
      // Data.saveFile(n, npcs, callback);
      // area.changesMade.npc = false;
      break;
    case 'item':
      const i = __dirname + `/../../${area.bundle}/areas/${area.name}/items.yml`;
      console.log(i);
      const items = [];
      for (const itemER of [...area.defaultEntities.items]) {
        const item = state.ItemFactory.create(area, itemER);
        // items.push(item.saveDefinition());
      }
      // Data.saveFile(i, items, callback);
      // area.changesMade.item = false;
      break;
    case 'quest':
      const q = __dirname + `/../../${area.bundle}/areas/${area.name}/quests.yml`;
      console.log(q);
      const quests = [];
      for (const [id, questDef] of [...state.QuestFactory.quests.entries()]) {
        if (questDef.area === area.name) {
          // const defToSave = JSON.parse(JSON.stringify(questDef.config));
          // delete defToSave.entityReference;
          // quests.push(defToSave);
        }
      }
      // Data.saveFile(q, quests, callback);
      // area.changesMade.quest = false;
      break;
  }
}
