'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');

module.exports = () => {
  return {
    usage: 'mlist [area]',
    requiredRole: PlayerRoles.BUILDER,
    command: (state) => (args, player, arg0) => {


      let [areaSearch,] = args.split(' ');
      let padChar = '.', area;

      if (areaSearch) {
        const { target, area: resultArea, idNum } = SU.findER(state, player, 'area', areaSearch);
        area = resultArea;
      } else {
        area = player.room.area;
      }

      if (!area) {
        return B.sayAt(player, `Can't find the area of ${areaSearch}.`);
      }

      const idLength = [...state.MobFactory.entities.values()]
        .filter(mob => mob.entityReference.split(':')[0] === area.name)
        .reduce((acc, mob) => Math.max(mob.id.toString().length, acc), 10);

      let i = 0;
      let msg = `<green>%4d</green><white>. [</white><green>%${idLength}s</green><white>]</white> <cyan>%-50s</cyan>`;
      B.sayAt(player, sprintf(`<green>%4s</green><white>)</white> <green>%${idLength + 2}s</green> <cyan>%-50s</cyan>`, '#', 'ID', 'Npc Name'));
      B.sayAt(player, `<white>----- ${B.line(idLength + 2, '-')} -------------------------------------------------</white>`);
      [...state.MobFactory.entities.values()].forEach((mob, key, map) => {
        if (mob.entityReference.split(':')[0] === area.name) {
          i += 1;
          let name = sprintf('%-50s', mob.name).replace(/\s{1}(?=\s)/g, i % 2 ? ' ' : padChar);
          B.sayAt(player, sprintf(msg, i, mob.id, name));
        }
      });
    }
  }
};