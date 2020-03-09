'use strict';

const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');
const DU = require('../lib/DisplayUtil');

module.exports = () => {

  return {
    requiredRole: PlayerRoles.BUILDER,
    usage: 'redit <ER> || save <area>',
    command: (state) => (args, player, arg0) => {


      let targetRoom = null;
      let saving = false;
      let area;
      let newRoom = false;
      if (!args) {
        targetRoom = player.room;
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
          targetRoom = player.room;
        }

        if (!area) {

          const { target, area: resultArea, idNum } = SU.findER(state, player, 'room', tarER);
          area = resultArea;
          targetRoom = target;

          if (!area) {
            return B.sayAt(player, `Can't find the area: '${tarER}'.`);
          }
          if (!targetRoom && !saving) {

            // const newRoomDef = area.createRoomDefinition(state, { id: idNum }, player);
            // targetRoom = area.createRoom(state, newRoomDef);

            if (!targetRoom) {
              return B.sayAt(player, `Could not create the room '${tarER}'.`);
            }
            newRoom = true;
          }
        }
      }

      // Alreadying Editing
      if (saving) {
        return;
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area);
        if (alreadyEditing) {
          return B.sayAt(player, `Can't save '<b><yellow>${area.name}'</yellow></b> as it is currently being edited.`);
        }
        return DU.saveOLC(state, player, area, 'room');
      }

      if (!saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === targetRoom);
        if (alreadyEditing) {
          return B.sayAt(player, `The entity: ${targetRoom.entityReference} is already being edited.`);
        }

        function save() {
          DU.leaveOLC(state, player);
          targetRoom.reloadFromDefinition(targetRoom.defEdit, state);
          area.unsavedChanges(objClass(targetRoom));
        }

        targetRoom.defEdit = JSON.parse(JSON.stringify(targetRoom.def));

        return DU.enterOLC(state, player, { entity: targetRoom, area, save, editor: 'room-editor' }, newRoom);
      }

    }
  }
};
