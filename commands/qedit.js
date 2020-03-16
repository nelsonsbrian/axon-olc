'use strict';

const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');
const DU = require('../lib/DisplayUtil');
const EU = require('../lib/EntityUtil');

module.exports = () => {

  return {
    requiredRole: PlayerRoles.BUILDER,
    usage: 'qedit <ER> || save <area>',
    command: (state) => (args, player, arg0) => {

      if (!args) {
        return B.sayAt(player, 'Usage:  ' + state.CommandManager.get(arg0).usage);
      }

      let targetDef = null;
      let saving = false;
      let area, id;
      let created = false;
      const type = 'Quest';

      let [tarER, arg2] = args.split(' ');
      console.log(tarER, arg2);
      if (tarER === 'save') {
        saving = true;
        tarER = arg2;
        if (!tarER) {
          return B.sayAt(player, `Which area would you like to save?`);
        }
      }

      if (saving && tarER === '.') {
        area = player.room.area;
      }

      if (!area) {
        const { target, area: resultArea, idNum } = SU.findER(state, player, type, tarER);
        area = resultArea;
        targetDef = target;
        id = idNum;

        if (!area) {
          return B.sayAt(player, `Can't find the area: '${tarER}'.`);
        }

        if (idNum === '') {
          return B.sayAt(player, `Must supply an id value to create a resource.`);
        }

        if (!targetDef && !saving) {
          targetDef = EU.createQuestDefinition(state, area, { id: idNum }, player);
          created = true;

          if (!targetDef) {
            return B.sayAt(player, `Could not create the quest '${tarER}'.`);
          }
        }
      }

      if (!targetDef && !saving) {
        return B.sayAt(player, `Could not find the quest '${tarER}'.`);
      }

      // Alreadying Editing
      if (saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area);
        if (alreadyEditing) {
          return B.sayAt(player, `Can't save '<b><yellow>${area.name}'</yellow></b> as it is currently being edited.`);
        }
        return DU.saveOLC(state, player, area, type);
      }

      const er = state.QuestFactory.makeQuestKey(targetDef.area, targetDef.id);
      if (!saving) {
        const alreadyEditing = [...state.PlayerManager.players.values()].some(pl => pl.olc && pl.olc.area === area && pl.olc.er === er);
        if (alreadyEditing) {
          return B.sayAt(player, `The entity: ${er} is already being edited.`);
        }

        function save() {
          state.QuestFactory.add(targetDef.area, targetDef.id, targetDef.config);
          area.changesMade ? area.changesMade.quest = true : area.changesMade = { quest: true };
        }

        targetDef = JSON.parse(JSON.stringify(targetDef)); // Make sure it's clean object.
        DU.enterOLC(player,
          {
            def: targetDef.config,
            er,
            type,
            area,
            save,
            editor: 'quest-editor',
            created,
            loggerName: targetDef.config.title || `a new quest`,
          }
        );
      }

    }
  }
};
