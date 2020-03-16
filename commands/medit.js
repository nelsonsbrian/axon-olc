'use strict';

const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');
const DU = require('../lib/DisplayUtil');
const EU = require('../lib/EntityUtil');

module.exports = () => {

  return {
    requiredRole: PlayerRoles.BUILDER,
    usage: 'medit <ER> || save <area>',
    command: (state) => (args, player, arg0) => {

      if (!args) {
        return B.sayAt(player, 'Usage:  ' + state.CommandManager.get(arg0).usage);
      }

      let targetDef = null;
      let saving = false;
      let area;
      let created = false;
      const type = 'Npc';

      let [tarER, arg2] = args.split(' ');
      console.log(tarER, arg2);
      if (tarER === 'save') {
        saving = true;
        tarER = arg2;
        if (!tarER) {
          return B.sayAt(player, `Which mob would you like to save?`);
        }
        if (tarER === '.') {
          area = player.room.area;
        }
      }

      if (!area) {
        const { target, area: resultArea, idNum } = SU.findER(state, player, type, tarER);
        area = resultArea;
        targetDef = target;

        if (!area) {
          return B.sayAt(player, `Can't find the area: '${tarER}'.`);
        }

        if (idNum === '') {
          return B.sayAt(player, `Must supply an id value to create a resource.`);
        }

        if (!targetDef && !saving) {
          targetDef = EU.createNpcDefinition(state, area, { id: idNum }, player);
          created = true;

          if (!targetDef) {
            return B.sayAt(player, `Could not create the ${type} '${tarER}'.`);
          }
        }
      }

      if (!targetDef && !saving) {
        return B.sayAt(player, `Could not find the mob '${tarER}'.`);
      }

      // Alreadying Editing
      if (saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area);
        if (alreadyEditing) {
          return B.sayAt(player, `Can't save '<b><yellow>${area.name}'</yellow></b> as it is currently being edited.`);
        }
        return DU.saveOLC(state, player, area, type);
      }

      const er = state.MobFactory.createEntityRef(area.name, targetDef.id);
      if (!saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area && pl.olc.er === er);
        if (alreadyEditing) {
          return B.sayAt(player, `The entity: ${er} is already being edited.`);
        }

        function save() {
          state.MobFactory.setDefinition(er, targetDef);
          area.changesMade ? area.changesMade.npc = true : area.changesMade = { npc: true };
        }

        targetDef = JSON.parse(JSON.stringify(targetDef)); // Make sure it's clean object.
        DU.enterOLC(player,
          {
            def: targetDef,
            er,
            type,
            area,
            save,
            editor: 'npc-editor',
            created,
            loggerName: targetDef.name || targetDef.title || `a new mob`,
          }
        );
      }

    }
  }
};
