'use strict';

const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');
const DU = require('../lib/DisplayUtil');
const EU = require('../lib/EntityUtil');

module.exports = () => {

  return {
    requiredRole: PlayerRoles.BUILDER,
    usage: 'zedit [save] <area>',
    command: (state) => (args, player, arg0) => {

      let targetDef = null;
      let saving = false;
      let area;
      let created = false;
      const type = 'Area';

      if (!args) {
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
        }

        if (!area) {
          const { target, area: resultArea, idNum } = SU.findER(state, player, type, tarER);
          area = resultArea;

          if (!area) {
            return B.sayAt(player, `Can't find the area: '${tarER}'.`);
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

      const er = area.name;
      if (!saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area && pl.olc.er === er);
        if (alreadyEditing) {
          return B.sayAt(player, `The entity: ${er} is already being edited.`);
        }

        function save() {
          // Add Logic here to expand on area saving.
          area.changesMade ? area.changesMade.area = true : area.changesMade = { area: true };
        }

        targetDef = {
          title: area.title,
          metadata: area.metadata,
          script: area.script
        };
        DU.enterOLC(player,
          {
            def: targetDef,
            er,
            type,
            area,
            save,
            editor: 'area-editor',
            created,
            loggerName: targetDef.name || targetDef.title || `a new area`,
          }
        );
      }

    }
  }
};
