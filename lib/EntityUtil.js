'use strict';

const { Broadcast: B, Logger, Data, ItemType } = require('ranvier');

exports.save = (state, area, type, callback) => {
  switch (type.toLowerCase()) {
    case 'room':
      const r = __dirname + `/../../${area.bundle}/areas/${area.name}/rooms.yml`;
      Logger.log(r);
      const rooms = [];
      for (const [id, room] of [...area.rooms.entries()]) {
        const defToSave = JSON.parse(JSON.stringify(room.def));
        delete defToSave.entityReference;
        rooms.push(defToSave);
      }
      Data.saveFile(r, rooms, callback);
      area.changesMade.room = false;
      break;
    case 'area':
      const m = __dirname + `/../../${area.bundle}/areas/${area.name}/manifest.yml`;
      Logger.log(m);
      const data = {
        title: area.title,
        metadata: area.metadata || {},
        script: area.script || ''
      };
      Data.saveFile(m, data, callback);
      area.changesMade.manifest = false;
      break;
    case 'npc':
      const n = __dirname + `/../../${area.bundle}/areas/${area.name}/npcs.yml`;
      Logger.log(n);
      const npcs = [];
      for (const [mobER, mobDef] of [...state.MobFactory.entities.entries()]) {
        if (mobER.split(':')[0] === area.name) {
          const data = JSON.parse(JSON.stringify(mobDef));
          delete data.entityReference;
          npcs.push(data);
        }
      }
      Data.saveFile(n, npcs, callback);
      area.changesMade.npc = false;
      break;
    case 'item':
      const i = __dirname + `/../../${area.bundle}/areas/${area.name}/items.yml`;
      Logger.log(i);
      const items = [];
      for (const [itemER, itemDef] of [...state.ItemFactory.entities.entries()]) {
        if (itemER.split(':')[0] === area.name) {
          const data = JSON.parse(JSON.stringify(itemDef));
          delete data.entityReference;
          items.push(data);
        }
      }
      Data.saveFile(i, items, callback);
      area.changesMade.item = false;
      break;
    case 'quest':
      const q = __dirname + `/../../${area.bundle}/areas/${area.name}/quests.yml`;
      Logger.log(q);
      const quests = [];
      for (const [id, questDef] of [...state.QuestFactory.quests.entries()]) {
        if (questDef.area === area.name) {
          const defToSave = JSON.parse(JSON.stringify(questDef.config));
          delete defToSave.entityReference;
          quests.push(defToSave);
        }
      }
      Data.saveFile(q, quests, callback);
      area.changesMade.quest = false;
      break;
  }
}

exports.reloadFromRoomDefinition = (room, newDef) => {
  room.title = newDef.title;
  room.description = newDef.description;
  // room.behaviors = newDef.behaviors;
  room.defaultNpcs = newDef.npcs || [];
  room.defaultItems = newDef.items || [];
  room.defaultDoors = newDef.doors || {};
  room.exits = newDef.exits || [];
  room.def = newDef;
}

exports.createRoomDefinition = (state, area, config = {}, player) => {
  if (config.id) {
    const existingRoom = state.RoomManager.getRoom(this.title + ":" + config.id);
    if (existingRoom) {
      Logger.warn(`Can't create a new room definition in AreaEx, ID:[${config.id}] already exists.`);
      return false;
    }
  } else {
    const newId = nextId([...area.rooms.keys()]);
    if (isNaN(newId)) {
      Logger.warn(`Can't create find a nextRoomId for a new room definition in AreaEx, ID:[${config.id}].`);
      return false;
    }
    config.id = newId;
  }

  const createdByName = player ? ` created by ${player.capName}` : '';

  return {
    id: config.room && config.room.id || config.id || 0,
    title: config.room && config.room.title || config.title || `An Unfinished Room`,
    description: config.room && config.room.description || config.description || `An unfinished description${createdByName}.`,
    coordinates: config.room && config.room.coordinates || config.coordinates || [],
    exits: config.room && config.room.exits || config.exits || [],
    items: config.room && config.room.items || config.items || [],
    npcs: config.room && config.room.npcs || config.npcs || [],

    metadata: {},
  };
}

exports.createItemDefinition = (state, area, config = {}, player) => {
  if (config.id) {
    const existingItem = state.ItemFactory.entities.has(area.name + ':' + config.id);
    if (existingItem) {
      Logger.warn(`Can't create a new item definition, ID:[${config.id}] already exists.`);
      return false;
    }
  } else {
    const newId = nextId([...state.ItemFactory.entities.keys()]);
    if (isNaN(newId)) {
      Logger.warn(`Can't create find a newId for a new item definition, ID:[${config.id}].`);
      return false;
    }
    config.id = newId;
  }

  const createdByName = player ? ` created by ${player.capName}` : '';

  return {
    id: config.item && config.item.id || config.id || 0,
    name: config.item && config.item.name || config.name || `an unfinished item`,
    description: config.item && config.item.description || config.description || ``,
    // behaviors: config.item && config.item.behaviors || config.behaviors || {},
    keywords: config.item && config.item.keywords || config.keywords || ['item', 'unfinished'],
    roomDesc: config.item && config.item.roomDesc || config.roomDesc || `An uninished item${createdByName} is here.`,
    type: config.item && config.item.type || config.type || ItemType.OBJECT,
    items: config.room && config.room.items || config.items || [],

    closeable: config.closeable && config.item.closeable || config.closeable || false,
    closed: config.closed && config.item.closed || config.closed || false,
    locked: config.locked && config.item.locked || config.locked || false,
    lockedBy: config.lockedBy && config.item.lockedBy || config.lockedBy || null,
    maxItems: config.maxItems && config.item.maxItems || config.maxItems || Infinity,

    metadata: {},
  };
}

exports.createNpcDefinition = (state, area, config = {}, player) => {
  if (config.id) {
    const existingItem = state.MobFactory.entities.has(area.name + ':' + config.id);
    if (existingItem) {
      Logger.warn(`Can't create a new npc definition, ID:[${config.id}] already exists.`);
      return false;
    }
  } else {
    const newId = nextId([...state.MobFactory.entities.keys()]);
    if (isNaN(newId)) {
      Logger.warn(`Can't create find a newId for a new npc definition, ID:[${config.id}].`);
      return false;
    }
    config.id = newId;
  }

  const createdByName = player ? ` created by ${player.capName}` : '';

  const newMeta = Object.assign({
  }, config.mob && config.mob.metadata || {}, config.metadata || {});

  const newAttributes = Object.assign({
  }, config.mob && config.mob.attributes || {}, config.attributes || {});

  return {
    id: config.npc && config.npc.id || config.id || 0,
    name: config.npc && config.npc.name || config.name || `an unfinished mob`,
    description: config.mob && config.mob.description || config.description || `An unfinished description${createdByName}.`,
    keywords: config.mob && config.mob.keywords || config.keywords || ['mob', 'unfinished'],
    level: config.mob && config.mob.level || config.level || 0,
    // behaviors: config.npc && config.npc.behaviors || config.behaviors || {},
    items: config.mob && config.mob.items || config.items || {},
    quests: config.mob && config.mob.quests || config.quests || [],

    metadata: newMeta,
    attributes: newAttributes,
  };
}

exports.createQuestDefinition = (state, area, config = {}, player) => {
  if (config.id) {
    const existingItem = state.QuestFactory.quests.has(area.name + ':' + config.id);
    if (existingItem) {
      Logger.warn(`Can't create a new quest definition, ID:[${config.id}] already exists.`);
      return false;
    }
  } else {
    const newId = nextId(state.QuestFactory.quests.values().map(q => q.id));
    if (isNaN(newId)) {
      Logger.warn(`Can't create find a newId for a new quest definition, ID:[${config.id}].`);
      return false;
    }
    config.id = newId;
  }

  const createdByName = player ? ` created by ${player.capName}` : '';

  return {
    id: config.id,
    area: area.name,
    config: {

      title: config.quest && config.quest.title || config.title || `An unfinished quest${createdByName}`,
      description: config.quest && config.quest.description || config.description || ``,
      completionMessage: config.quest && config.quest.completionMessage || config.completionMessage || ``,

      level: config.quest && config.quest.level || config.level || 1,

      autoComplete: config.quest && config.quest.autoComplete || config.autoComplete || false,
      repeatable: config.quest && config.quest.repeatable || config.repeatable || false,
      requires: config.quest && config.quest.requires || config.requires || [],

      goals: config.quest && config.quest.goals || config.goals || [],
      rewards: config.quest && config.quest.rewards || config.rewards || [],
    }
  };
}


// Hard limit of 1000, but can change if more are needed.
function nextId(idArray = []) {
  for (let i = 0; i < 1000; i++) {
    if (!idArray.includes(i)) {
      return i;
    }
  }
  Logger.warn(`Can't find a new ID.`);
  return false;
}