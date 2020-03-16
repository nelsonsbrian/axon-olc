'use strict';

const { Broadcast: B, PlayerRoles, Room } = require('ranvier');
const SU = require('../lib/StringUtil');
const DU = require('../lib/DisplayUtil');
const EU = require('../lib/EntityUtil');

module.exports = () => {

  return {
    requiredRole: PlayerRoles.BUILDER,
    usage: 'redit <ER> || save <area>',
    command: (state) => (args, player, arg0) => {

      let targetDef = null;
      let saving = false;
      let area;
      let created = false;
      const type = 'Room';
      if (!args) {
        targetDef = player.room.def;
        area = player.room.area;
      } else {

        let [tarER, arg2] = args.split(' ');
        console.log(tarER, arg2);
        if (tarER === 'save') {
          saving = true;
          tarER = arg2;
          if (!tarER) {
            return B.sayAt(player, `Which area would you like to save?`);
          }
        }

        if (tarER === '.') {
          area = player.room.area;
          targetDef = player.room.def;
        }

        if (!area) {

          const { target, area: resultArea, idNum } = SU.findER(state, player, 'room', tarER);
          area = resultArea;
          targetDef = target && target.def;

          if (!area) {
            return B.sayAt(player, `Can't find the area: '${tarER}'.`);
          }

          if (!targetDef && !saving) {
            targetDef = EU.createRoomDefinition(state, area, { id: idNum }, player)
            created = true;

            if (!targetDef) {
              return B.sayAt(player, `Could not create the room '${tarER}'.`);
            }
            created = true;
          }
        }
      }

      // Alreadying Editing
      if (saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area);
        if (alreadyEditing) {
          return B.sayAt(player, `Can't save '<b><yellow>${area.name}'</yellow></b> as it is currently being edited.`);
        }
        return DU.saveOLC(state, player, area, type);
      }

      const er = state.ItemFactory.createEntityRef(area.name, targetDef.id);
      if (!saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === targetDef);
        if (alreadyEditing) {
          return B.sayAt(player, `The entity: ${er} is already being edited.`);
        }

        function save() {
          if (created) {
            const newRoom = new Room(area, targetDef);
            area.addRoom(newRoom);
            state.RoomManager.addRoom(newRoom);
            newRoom.hydrate(state);
          } else {
            EU.reloadFromRoomDefinition(state.RoomManager.getRoom(er), targetDef);
          }
          area.changesMade ? area.changesMade.room = true : area.changesMade = { room: true };
        }

        targetDef = JSON.parse(JSON.stringify(targetDef)); // Make sure it's clean object.
        DU.enterOLC(player,
          {
            def: targetDef,
            er,
            type,
            area,
            save,
            editor: 'room-editor',
            created,
            loggerName: targetDef.name || targetDef.title || `a new room`,
          }
        );
      }

    }
  }
};
