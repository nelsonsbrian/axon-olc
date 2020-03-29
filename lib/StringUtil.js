'use strict';

const { Logger } = require('ranvier');
const indefiniteArticle = require('indefinite-article');

/**
 * Returns the string prefixed with the proper indefinite article.
 * @example "an(hat)" => "a hat"
 * @example "an(old shoe)" => "an old shoe"
 * @example "an(honor)" => "an honor"
 * @param {string} string to prefix
 * @return {string} prefixed string
 */
exports.an = function (str) {
  return `${indefiniteArticle(str)} ${str}`;
};

exports.capitalize = function (str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
};

exports.titleCase = function (str) {
  return str ? str.toLowerCase().replace(/\w\S*/g, exports.capitalize) : str;
};

/**
 * Determine if a given input to look for is an abbreviation of the target string.
 * Works with multiple words separated by spaces.
 * @example "c p f h" is an abbreviation of "cast protection from heat"
 * @param {string} abbreviation string to check as an abbreviated version
 * @param {string} unabbreviated unabbreviated string
 * @return {number} Offset into abbreviation that was stopped at on success, or 0 if no match
 */
exports.isAbbrev = function (abbreviation, unabbreviated) {
  return exports.eachSectionMatches(abbreviation, (unabbreviated && unabbreviated.split(' ')));
};

exports.eachSectionMatches = function (abbreviation, keywords) {
  if (!abbreviation || !keywords) {
    return 0;
  }

  abbreviation = abbreviation.trimLeft().replace(/\s{2,}/g, ' ').toLowerCase();
  if (abbreviation.length === 0) {
    return 0;
  }

  const unabbreviated = keywords.map(word => word.trimLeft().replace(/\s{2,}/g, ' ').toLowerCase());
  const abbrevWords = abbreviation.split(' ');
  return unabbreviated.reduce((sum, word, idx) => {
    return sum + (word.startsWith(abbrevWords[idx]) ? abbrevWords[idx].length + (idx > 0 ? 1 : 0) : 0);
  }, 0);
}

exports.isKeyword = function (abbreviation, keywords) {
  if (!abbreviation || !keywords) {
    return false;
  }

  const search = abbreviation.trimLeft().toLowerCase();
  return keywords.map(word => word.toString().trimLeft().toLowerCase()).some(keyword => keyword.startsWith(search));
}

exports.bestMatch = function (search, list) {
  let bestMatch = -1;
  let matchingItem = null;

  for (const item of list) {
    const match = exports.isAbbrev(search, item);
    if (match) {
      if (match > bestMatch) {
        bestMatch = match;
        matchingItem = item;
      }
    }
  }

  return matchingItem;
}

exports.searchKeywords = function (search, list, returnIndex = false) {
  let bestMatch = -1;
  let matchingItem = null;
  let bestIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const match = exports.isKeyword(search, item);
    if (match) {
      if (match > bestMatch) {
        bestMatch = match;
        matchingItem = item;
        bestIndex = i;
      }
    }
  }

  return returnIndex ? bestIndex : matchingItem;
}

exports.comma = function (num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
};

exports.objClass = function (object) {
  return (object && object.constructor) ? object.constructor.name.replace(/(Ex)$/g, '') : null;
};

exports.getUncoloredLength = function (string) {
  const regex = /\<[^<>]*\>/g;
  return string.toString().replace(regex, "").length;
}

exports.removeBrackets = function (string) {
  const regex = /[<>"/>"]/g;
  return string.toString().replace(regex, " ").split(" ").filter(x => x);
}

/**
 * @param {string} text text to limit to a max length
 * @param {number} max length to limit to
 * @param {number} ending text if you want to replace the ending
 * @return {string} truncated string.
 */
exports.truncateWithEnding = (text, max, ending = '...') => {
  return text.length > max ? text.substr(0, max - ending.length) + ending : text;
};

/**
 * @param {string} erStr entityRefence to limit to a max length
 * @param {number} max length to limit to
 * @return {string} truncated string.
 */
exports.truncateER = (erStr, max) => {
  const refId = erStr.split(':')[1];
  return exports.truncateWithEnding(erStr, max, ':' + refId);
};

exports.findER = (state, player, type, search) => {
  let findAreaPartial, area, target, idNum;

  if (!state || !player || !type || !search) {
    Logger.warn(`StringUtil .findER() not supplied with proper args.`);
    return { target, area, idNum };
  }

  // replace brackets for lazy gods to copy paste entityReferences
  search = search.toLowerCase().replace(/[><\[\]]+/g, '');

  if (search.includes(':')) { //'caymus_harbor:1'
    const [areaSearch, splitId] = search.split(":");
    findAreaPartial = exports.bestMatch(areaSearch, [...state.AreaManager.areas.keys()]);
    idNum = isNaN(splitId) ? splitId : parseInt(splitId);
    area = state.AreaManager.getArea(findAreaPartial);
  } else if (!isNaN(search)) { // '1'
    findAreaPartial = player.room.area.name;
    idNum = parseInt(search);
    area = player.room.area;
  } else { // 'caymus_harbor'
    findAreaPartial = exports.bestMatch(search, [...state.AreaManager.areas.keys()]);
    idNum = '';
    area = state.AreaManager.getArea(findAreaPartial);
  }

  if (!area || idNum === '') {
    return { target, area, idNum };
  }

  switch (type.toLowerCase()) {
    case 'room':
      target = state.RoomManager.getRoom(findAreaPartial + ':' + idNum);
      break;
    case 'npc':
      target = state.MobFactory.getDefinition(findAreaPartial + ':' + idNum);
      break;
    case 'item':
      target = state.ItemFactory.getDefinition(findAreaPartial + ':' + idNum);
      break;
    case 'quest':
      target = state.QuestFactory.get(findAreaPartial + ':' + idNum);
      break;
    case 'area':
      return { target, area, idNum };
      break;
    default:
      Logger.warn(`StringUtil .findER() bad type arg.`);
      return { target, area, idNum };
  }

  return { target, area, idNum };

}
