'use strict';

const { Broadcast: B, Logger, EventUtil } = require('ranvier');

const sprintf = require('sprintf-js').sprintf;
const Joi = require('@hapi/joi');
const { capitalize: cap, objClass, getUncoloredLength, truncateER, truncateWithEnding, bestMatch } = require('./StringUtil');


exports.toDirections = {
  'north': 'the north',
  'south': 'the south',
  'east': 'the east',
  'west': 'the west',
  'up': 'above',
  'down': 'below',

  'northeast': 'the northeast',
  'southeast': 'the southeast',
  'northwest': 'the northwest',
  'southwest': 'the southwest',
};


/**
 * @params {Object} 
 */
exports.RoomExits = (config = {}) => {

  let newConfig = {
    roomId: config.roomId || config.exit && config.exit.roomId || null,
    direction: config.direction || config.exit && config.exit.direction || null,
    leaveMessage: config.exit && config.exit.leaveMessage || config.leaveMessage || '',
  }

  return newConfig;
};

exports.RoomDoors = (config = {}) => {

  let newConfig = {
    lockedBy: config.door && config.door.lockedBy || config.lockedBy || '',
    closed: config.door && config.door.closed || config.closed || false,
    locked: config.door && config.door.locked || config.locked || false,
  }

  return newConfig;
};

exports.itemSlots = [
  'finger',
  'neck',
  'chest',
  'head',
  'legs',
  'feet',
  'hands',
  'arms',
  'waist',
  'wrist',
  'wield',
  'shield',
];

exports.itemQuality = [
  'poor',
  'common',
  'epic',
  'rare',
];

exports.defaultAttributes = [
  'health',
  'strength',
  'agility',
  'intellect',
  'stamina',
  'armor',
  'critical',
];

exports.currencyType = [
  'gold'
];