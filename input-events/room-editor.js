'use strict';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const Joi = require('@hapi/joi');

module.exports = (srcPath, bundlesPath) => {
  const B = require(srcPath + 'Broadcast');
  const { oppositeDirections } = require(bundlesPath + 'exile-lib/lib/Constants');
  const EventUtil = require(srcPath + 'EventUtil');
  const { capitalize: cap, objClass } = require(bundlesPath + 'exile-lib/lib/StringUtil');
  const Roomflag = require(bundlesPath + 'exile-olc/lib/RoomFlag');
  const Mapflag = require(bundlesPath + 'exile-olc/lib/MapFlag');
  const NameEvents = require(bundlesPath + 'exile-olc/lib/NameEvents');
  const DU = require(bundlesPath + 'exile-olc/lib/DisplayUtil');
  const OLC = require(bundlesPath + 'exile-olc/lib/OlcOptions');

  return {
    event: state => (player, inputConfig) => {
      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);
      const fileName = path.basename(__filename, '.js');

      inputConfig = Object.assign({
        menuMap: new Map(),
        eventStack: [],
        none: `<red>None</red>`,
      }, inputConfig);
      inputConfig.def = inputConfig.entity.defEdit;
      inputConfig.fileName = fileName;

      let { entity, eventStack, menuMap, def, none } = inputConfig;

      let options = [];
      options.push({
        display: 'Name',
        displayValues: `<yellow>${def.name}</yellow>`,
        key: '1',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: def.name,
            schema: Joi.string().min(1).max(75).required(),
            displayProperty: 'Room Name',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.name = optionConfig.text;
        }
      });

      options.push({
        display: 'Description',
        displayValues: `\r\n` + DU.editorTextDisplayValue(def.description),
        key: '2',
        onSelect: (choice) => {
          menuMap.set('editor-text', {
            text: def.description,
            params: {
              min: 0,
              max: 2100
            },
            displayProperty: 'Description',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('editor-text', player, inputConfig);
        },
        onExit: (optionConfig, cmd) => {
          if (cmd === '@s') {
            def.description = optionConfig.text;
          }
        }
      });

      const flags = def.metadata.flags || [];
      options.push({
        display: 'Flags',
        displayValues: flags.length ? [...flags].join(' ') : none,
        key: '3',
        onSelect: (choice) => {
          menuMap.set('toggleable', {
            current: new Set([...flags]),
            selections: new Set([...Object.keys(Roomflag)]),
            displayProperty: choice.display,
            columns: 2,
            minWidth: 10,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('toggleable', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.flags = [...optionConfig.current];
        }
      });

      const mapFlags = def.metadata.mapFlags || [];
      options.push({
        display: 'Map Flags',
        displayValues: mapFlags.length ? [...mapFlags].join(' ') : none,
        key: '4',
        onSelect: (choice) => {
          menuMap.set('toggleable', {
            current: new Set([...mapFlags]),
            selections: new Set([...Object.keys(Mapflag)]),
            displayProperty: choice.display,
            columns: 2,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('toggleable', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.mapFlags = [...optionConfig.current];
        }
      });

      options.push({
        display: 'Custom Map',
        displayValues: ``,
        key: '5',
        onSelect: (choice) => {
          menuMap.set('map-custom', {
          });
          eventStack.push(fileName);
          player.socket.emit('map-custom', player, inputConfig);
        },
      });

      const movementCost = def.metadata.movementCost || 0;
      options.push({
        display: 'Move Cost',
        displayValues: movementCost,
        key: '6',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: movementCost,
            schema: Joi.number().integer().min(0).max(500).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.movementCost = optionConfig.text;
        }
      });

      const regen = def.metadata.regen || 0;
      options.push({
        display: 'Regen',
        displayValues: regen,
        key: '7',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: regen,
            schema: Joi.number().integer().min(0).max(5).required(),
            displayProperty: choice.display,
            onExit: choice.onExit,
            required: true
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.metadata.regen = optionConfig.text;
        }
      });

      def.metadata.altNames = def.metadata.altNames || {};
      options.push({
        display: 'Alt Names',
        displayValues: '',
        key: '8',
        onSelect: (choice) => {
          menuMap.set('alt-names', {
            selections: new Set([...Object.keys(NameEvents)]),
            displayProperty: choice.display,
            columns: 5,
          });
          eventStack.push(fileName);
          player.socket.emit('alt-names', player, inputConfig);
        },
      });

      def.extraDescriptions = def.extraDescriptions || {};
      options.push({
        display: 'Extra Descriptions',
        displayValues: '',
        key: '9',
        onSelect: (choice) => {
          eventStack.push(fileName);
          player.socket.emit('extra-description', player, inputConfig);
        },
      });

      // All Exits
      for (const direction of Object.keys(oppositeDirections)) {
        const exit = def.exits.find(ex => ex.direction === direction);
        const exitRoom = exit && state.RoomManager.getRoom(exit.roomId);
        options.push({
          display: cap(direction),
          displayValues: (exit && `${exit.roomId} - ${exitRoom.name}`) || none,
          key: direction[0],
          onSelect: () => {
            inputConfig.menuMap.set('room-exit', {
              direction,
            });
            eventStack.push(fileName);
            player.socket.emit('room-exit', player, inputConfig);
          }
        });
      }

      const quests = def.quests || [];
      options.push({
        display: 'Quests',
        displayValues: quests.length || none,
        key: 'A',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...quests],
            displayProperty: choice.display,
            getCurrent: (er) => state.QuestFactory.get(er),
            currentDisplay: (foundDef) => foundDef ? `Lvl${foundDef.config.level} ${foundDef.config.title}` : 'No Info',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'quest',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.quests = [...optionConfig.current];
        }
      });

      const behaviors = def.behaviors;
      const behaviorKeys = [...Object.keys(def.behaviors)];
      options.push({
        display: 'Behaviors',
        displayValues: `${behaviorKeys.length ? behaviorKeys.join(' ') : none}`,
        key: 'b',
        onSelect: (choice) => {
          menuMap.set('behaviors', {
            manager: state.RoomBehaviorManager,
          });
          eventStack.push(fileName);
          player.socket.emit('behaviors', player, inputConfig);
        },
      });

      const comment = def.comment || '';
      options.push({
        display: 'Comment',
        displayValues: `<yellow>${comment.length ? comment : none}</yellow>`,
        key: 'c',
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: comment,
            schema: Joi.string().empty('').min(0).max(150),
            displayProperty: choice.display,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.comment = optionConfig.text;
        }
      });

      const items = def.items || [];
      options.push({
        display: 'Default Items',
        displayValues: items.length || none,
        key: 'i',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...items],
            displayProperty: choice.display,
            getCurrent: (er) => state.ItemFactory.getDefinition(er),
            currentDisplay: (foundDef) => foundDef ? `${foundDef.level ? `Lvl${foundDef.level}` : ''} ${foundDef.name || ''}` : '',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'item',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.items = [...optionConfig.current];
        }
      });

      const npcs = def.npcs || [];
      options.push({
        display: 'Default Npcs',
        displayValues: npcs.length || none,
        key: 'm',
        onSelect: (choice) => {
          menuMap.set('list-text', {
            current: [...npcs],
            displayProperty: choice.display,
            getCurrent: (er) => state.MobFactory.getDefinition(er),
            currentDisplay: (foundDef) => foundDef ? `${foundDef.level ? `Lvl${foundDef.level}` : ''} ${foundDef.name || ''}` : '',
            columns: 1,
            showChoice: false,
            schema: Joi.string().empty(''),
            params: {
              type: 'entityReference',
              entityType: 'npc',
            },
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('list-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          def.npcs = [...optionConfig.current];
        }
      });

      options.push({
        display: 'Copy Room',
        displayValues: '',
        key: 'w',
        bottomMenu: true,
        onSelect: (choice) => {
          menuMap.set('input-text', {
            text: '',
            params: {
              type: 'entityReference',
              entityType: 'room',
            },
            displayProperty: 'Room EntityReference',
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('input-text', player, inputConfig);
        },
        onExit: (optionConfig) => {
          const text = optionConfig.text;
          if (text.length && text !== none) {
            DU.copyRoomDefinition(def, state.RoomManager.getRoom(text).def);
            say(`Copied Room ${text} to this one.`);
          } else {
            say(`Copy Room Canceled.`);
          }
        }
      });

      options.push({
        display: 'Delete Room',
        displayValues: '',
        key: 'x',
        bottomMenu: true,
        onSelect: (choice) => {
          menuMap.set('confirm-action', {
            response: '',
            displayProperty: 'Delete Room',
            fullword: true,
            exitOlc: true,
            onExit: choice.onExit,
          });
          eventStack.push(fileName);
          player.socket.emit('confirm-action', player, inputConfig);
        },
        onExit: (optionConfig) => {
          const response = optionConfig.response;
          if (response) {
            say(`<b><green>Room ${entity.entityReference} deleted</green></b>.`);
            say(`<b><green>Changes saved to memory.</green></b>`);
            entity.deleteEntity();
            entity.area.unsavedChanges(objClass(entity));
            DU.leaveOLC(state, player);
          } else {
            say(`<red>Delete Room Canceled.</red>`);
          }
        }
      });

      options.push({
        display: 'Quit',
        displayValues: '',
        key: 'q',
        bottomMenu: true,
        onSelect: () => {
          eventStack.push(fileName);
          player.socket.emit('exit-olc', player, inputConfig);
        }
      });

      // Show the Menu
      DU.showMenu(player, inputConfig, options);

    }
  };
};
