'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, Logger, EventUtil, PlayerRoles } = require('ranvier');

module.exports = () => {
  return {
    usage: 'olc',
    requiredRole: PlayerRoles.BUILDER,
    command: (state) => (args, player, arg0) => {

      const anyChanges = [...state.AreaManager.areas.values()].filter(area => (
        area.changesMade && Object.values(area.changesMade).some(value => value === true)
      ));
      if (!anyChanges.length) {
        return B.sayAt(player, `All world files are up to date.`);
      }


      B.sayAt(player, `The following files need saving:`);
      for (const area of anyChanges) {

        for (const [ent, val] of Object.entries(area.changesMade)) {
          if (!val) { continue; }
          B.sayAt(player, sprintf(`- <b><cyan>%-8s</cyan></b> files in <b><yellow>%s</yellow></b>`, ent, area.name))
        }
      }

    }
  }
};